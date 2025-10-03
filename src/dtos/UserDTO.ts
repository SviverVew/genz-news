import { IsString, IsEmail, MinLength, IsOptional, IsDate } from "class-validator";
import { Exclude, Expose } from "class-transformer";
@Exclude()
export class CreateUserDTO{
    @Expose()
    @IsEmail()
    @IsString()
    email!: string;

    @Expose()
    @IsString()
    @MinLength(6)
    password!: string;

    @Expose()
    @IsString()
    name!:string;
}
export class LoginUserDTO{
    @Expose()
    @IsEmail()
    @IsString()
    email!: string;

    @Expose()
    @IsString()
    @MinLength(6)
    password!: string;
}
export class UpdateUserDTO{
    @Expose()
    @IsOptional()
    @IsEmail()
    @IsString()
    email?: string;

    @Expose()
    @IsOptional()
    @IsString()
    name!:string;

    @Expose()
    @IsOptional()
    @IsString()
    avatar!:string;

    @Expose()
    @IsOptional()
    @IsString()
    fullName!:string;

    @Expose()
    @IsOptional()
    @IsDate()
    dob!:Date;

    @Expose()
    @IsOptional()
    @IsString()
    phone!:string;
}
export class VerifyUserDTO{
    @Expose()
    @IsEmail()
    @IsString()
    email?: string;

    @Expose()
    @IsString()
    otp!: string;
}
export class ChangePasswordDTO{
    @Expose()
    @IsString()
    oldPassword!: string;

    @Expose()
    @IsString()
    @MinLength(6)
    password?: string;
}