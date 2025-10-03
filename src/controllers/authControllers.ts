import { JsonController, Post, Body } from "routing-controllers";
import { AuthService } from "../services/authService";
import { Service } from "typedi";
import { CreateUserDTO, LoginUserDTO, VerifyUserDTO } from "../dtos/UserDTO";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { Verify } from "crypto";
@Service()
@JsonController("/auth")
export class AuthController {
  // private authService = new AuthService();
  constructor(private authService:AuthService) {}

  @Post("/login")
  async login(@Body() body: LoginUserDTO) {
    const { email, password } = body;
    console.log(body);
    return this.authService.login(email, password);
  }

  @Post("/verify")
  async verify(@Body() body: VerifyUserDTO) {
    const { email, otp } = body;
    console.log("Verify body:", body);
    return this.authService.verify(email, otp);
  }

  @Post("/register")
  async register(@Body() body: CreateUserDTO) {
    const dto = plainToInstance(CreateUserDTO, body);
    await validateOrReject(dto);
    return this.authService.register(dto);
  }



  @Post("/logout")
  async logout(@Body() body: any) {
    const { accessToken } = body;
    return this.authService.logout(accessToken);
  }

  @Post("/refresh")
  async refresh(@Body() body: any) {
    const { refreshToken } = body;
    return this.authService.refreshToken(refreshToken);
  }
}
