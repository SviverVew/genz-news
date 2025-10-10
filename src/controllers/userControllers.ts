import {
  JsonController, Get, Post, Put, Delete, Param, Body,
  UseBefore
} from "routing-controllers";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { UserService } from "../services/userService";
import { CreateUserDTO, UpdateUserDTO,ChangePasswordDTO } from "../dtos/UserDTO";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { Service } from "typedi";
@Service()
@JsonController("/users")
export class UserController {
  constructor(private userService:UserService) {}
  @Put("/:id")
  @UseBefore(AuthMiddleware)
  async update(@Param("id") id: number, @Body() body: UpdateUserDTO) {
    const dto = plainToInstance(UpdateUserDTO, body);
      console.log("Looking for user", id);

    await validateOrReject(dto);
    return this.userService.update(id, dto);
  }

  @Put("/change-password/:id")
  @UseBefore(AuthMiddleware)
  async changePassword(
    @Param("id") id: number,
    @Body() body: ChangePasswordDTO
  ) {
    return this.userService.changePassword(id, body);
  }
}