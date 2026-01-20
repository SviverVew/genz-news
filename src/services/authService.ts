import jwt from "jsonwebtoken";
import { Service } from "typedi";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { User } from "../entities/UserEntity";
import {redis} from "../utils/redisClient";
import { emailQueue } from "../queues/EmailQueue"; 
@Service()
export class AuthService {
  private userRepo = AppDataSource.getRepository(User);

  async register(data: Partial<User>) {
  const existingUser = await this.userRepo.findOne({ where: { email: data.email } });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password nếu có
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
  }

  // Sinh OTP 4 số
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  // Lưu user + OTP tạm vào Redis 5 phút
  await redis.setex(
    `pendingUser:${data.email}`, 
    300, 
    JSON.stringify({ ...data, otp })
  );

  // Gửi mail OTP qua queue
  await emailQueue.add("send-otp-email", {
    to: data.email,
    otp,
    subject: "Verify your account",
    text: `Hello ${data.name}, your OTP code is: ${otp}`,
  });

  return { message: "User registered. Please check email for OTP." };
}


  async verify(email: string, otp: string) {
  const pendingUserStr = await redis.get(`pendingUser:${email}`);
  if (!pendingUserStr) throw new Error("OTP expired or not found");

  const pendingUser = JSON.parse(pendingUserStr as string);

  if (pendingUser.otp !== otp) throw new Error("Invalid OTP");

  // Xóa tạm khỏi Redis
  await redis.del(`pendingUser:${email}`);

  // Tạo user mới trong DB
  const newUser = this.userRepo.create({
    email: pendingUser.email,
    password: pendingUser.password,
    name: pendingUser.name,
    isVerified: true,
  });
  const savedUser = await this.userRepo.save(newUser);

  return { message: "Account verified successfully", user: savedUser };
}


  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    // Access Token (hết hạn nhanh, 30s)
    const accessToken = jwt.sign(
      { userId: user.userId , role: user.role},
      process.env.JWT_SECRET!,
      { expiresIn: "100s" }
    );

    // Refresh Token (hết hạn lâu hơn,5 ngày)
    const refreshToken = jwt.sign(
      { userId: user.userId , role: user.role},
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "5m" }
    );
      await redis.set(`accessToken:${accessToken}`, user.userId.toString(), { ex: 30 });
      await redis.set(`refreshToken:${refreshToken}`, user.userId.toString(), { ex: 60 * 5 });
    return { name: user.name,
    email: user.email,
    accessToken,
    refreshToken, };
  }

  async logout(accessToken:string){
    await redis.del(`accessToken:${accessToken}`);
    return {message:"Logged out successfully"};
  }

  async refreshToken(refreshToken: string) {
    const userId = await redis.get(`refreshToken:${refreshToken}`);
    if (!userId) throw new Error("Invalid or expired refresh token");

    jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET!);
    const newAccessToken = jwt.sign(
      { userId: parseInt(userId as string) },
      process.env.JWT_SECRET!,
      { expiresIn: "100s" }
    );
    await redis.set(`accessToken:${newAccessToken}`, userId, { ex: 30 });
    return { accessToken: newAccessToken };
  }


  
  validateAccessToken(token: string) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (e) {
      throw new Error("Invalid or expired token");
    }
  }
}
