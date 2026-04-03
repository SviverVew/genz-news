import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./UserEntity";

@Entity("journalist_rating")
@Index(["ratedBy", "journalist"], { unique: true })
export class JournalistRating {
  @PrimaryGeneratedColumn()
  ratingId!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "journalistId" })
  journalist!: User;

  @Column()
  journalistId!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ratedById" })
  ratedBy!: User;

  @Column()
  ratedById!: number;

  @Column({ type: "int" })
  rating!: number; // 1-5 stars

  @Column({ type: "text", nullable: true })
  comment!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;
}
