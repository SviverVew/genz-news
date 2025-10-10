import { IsDate, MaxLength, IsEnum,IsString,IsOptional } from 'class-validator';
import { Exclude, Expose ,Type} from 'class-transformer';

export enum NewsStatus {
  Draft = "Nháp",
  Published = "Xuất bản",
  Deleted = "Xóa"
}

@Exclude()
export class NewDto {
  @Expose()
  @MaxLength(250)
  title!: string;

  @Expose()
  @MaxLength(20000)
  content!: string;

  @Expose()
  @MaxLength(2048)
  thumbnail!: string;

  @Expose()
  @MaxLength(125)
  category!: string;

  @Expose()
  @Type(() => Date)
  @IsDate()
  datetime!: Date;

  @Expose()
  @MaxLength(125)
  author!: string;

  @Expose()
  tag!: JSON;

  @Expose()
  @IsEnum(NewsStatus)
  status!: NewsStatus;

  @Expose()
  @MaxLength(500)
  description!: string;
  
}
@Exclude()
export class UpdateNewsDTO {
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  title?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  thumbnail?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(125)
  category?: string;

  @Expose()
  @IsOptional()
  @IsDate()
  datetime?: Date;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(125)
  author?: string;

  @Expose()
  @IsOptional()
  tags?: string[];

  @Expose()
  @IsOptional()
  @IsString()
  status?: "Nháp" | "Xuất bản" | "Xóa";

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}