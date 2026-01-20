import {
  JsonController, Get, Post, Put, Delete, Param, Body,
  UseBefore
} from "routing-controllers";
import { AppDataSource } from "../data-source";
import { ChangePasswordDTO } from "../dtos/UserDTO";
import { User } from "../entities/UserEntity";
import bcrypt from "bcrypt";
import { Service ,} from "typedi";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { redis } from "../utils/redisClient";
import jwt from "jsonwebtoken";
import { UserAdvance } from "../entities/UserAdvanceEntity";
export class UserService {

  @Service()
  private userRepo = AppDataSource.getRepository(User);
  private userAdvanceRepo = AppDataSource.getRepository(UserAdvance);
  async update(id: number, data: Partial<UserAdvance>) {
    await this.userAdvanceRepo.update(id, data);
    return this.userAdvanceRepo.findOne({ where: { userId: id } });
  }

    async changePassword(userId: number, data: ChangePasswordDTO) {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new Error("User not found");

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(data.oldPassword, user.password);
    if (!isMatch) throw new Error("Old password is incorrect");

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(data.password!, salt);

    // Cập nhật mật khẩu mới
    await this.userRepo.save(user);

    // Xoá tất cả accessToken và refreshToken cũ của user trong Redis
    const accessKeys = await redis.keys("accessToken:*");
    const refreshKeys = await redis.keys("refreshToken:*");

    for (const key of accessKeys) {
      const uid = await redis.get(key);
      if (uid === user.userId.toString()) await redis.del(key);
    }

    for (const key of refreshKeys) {
      const uid = await redis.get(key);
      if (uid === user.userId.toString()) await redis.del(key);
    }

    // Sinh token mới
    const accessToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "30s" }
    );
    const refreshToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "5m" }
    );

    // Lưu token mới vào Redis
    await redis.set(`accessToken:${accessToken}`, user.userId.toString(), { ex: 30 });
    await redis.set(`refreshToken:${refreshToken}`, user.userId.toString(), { ex: 5 * 60 });

    return {
      message: "Password changed successfully",
      accessToken,
      refreshToken,
    };
  }


}

