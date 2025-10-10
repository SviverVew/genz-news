import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, CreateDateColumn, UpdateDateColumn,OneToMany
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Exclude, Expose ,Type} from 'class-transformer';
import { UserAdvance } from "./UserAdvanceEntity";
import { News } from "./NewEntity";
@Entity("User")
export class User {
  @PrimaryGeneratedColumn("uuid")
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ length: 32 })
  email: string;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @Column({ length: 128 })
  name: string;

  @Column({ default: "User" })
  role!: "Admin" | "Moderator" | "User";

  @Column({ type: "boolean", default: false })
  isVerified!: boolean;


  @OneToOne(() => UserAdvance, (userAdvance) => userAdvance.user, { cascade: true })
  userAdvance: UserAdvance;
  @OneToMany(() => News, (news) => news.user)
  news: News[];
}