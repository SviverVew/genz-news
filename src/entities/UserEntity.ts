import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, CreateDateColumn, UpdateDateColumn
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { UserAdvance } from "./UserAdvanceEntity";
@Entity("User")
export class User {
  @PrimaryGeneratedColumn("uuid")
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ length: 32 })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: "boolean", default: false })
  isVerified!: boolean;


  @OneToOne(() => UserAdvance, (userAdvance) => userAdvance.user, { cascade: true })
  userAdvance: UserAdvance;
}