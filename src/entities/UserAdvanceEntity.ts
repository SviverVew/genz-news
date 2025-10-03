import {
  Entity, PrimaryColumn, Column,
  OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn
} from "typeorm";
import { User } from "./UserEntity";
@Entity("UserAdvance")
export class UserAdvance {
  @PrimaryColumn()
  userId: number;
  
  @Column({ length: 256, nullable: true })
  avatar:string;

  @Column({ length: 128 })
  fullName: string;

  @Column({type: "date", nullable: true })
  dob: Date;

  @Column({
  type: "enum",
  enum: ["Male", "Female", "Other"],
  default: "Other",
  nullable: true,
  })
  gender?: string;

  @Column({ length:30, nullable: true })
  phone?: string;

  @Column({ length: 256, nullable: true })
  address?: string;

  @OneToOne(() => User, (user) => user.userAdvance)
  @JoinColumn({ name: "userId" })
  user: User;
}