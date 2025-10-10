import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { User } from "./UserEntity";

@Entity("News")
export class News {
  @PrimaryGeneratedColumn()
  newsId: number;

  @Column({ length: 250 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ length: 2048, nullable: true })
  thumbnail: string;

  @Column({ length: 125, nullable: true })
  category: string;

  @Column({ type: "datetime" })
  datetime: Date;

  @ManyToOne(() => User, (user) => user.news, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User; 

  @Column({ type: "json", nullable: true })
  tags: string[];

  @Column({
    type: "enum",
    enum: ["Nháp", "Xuất bản", "Xóa"],
    default: "Nháp",
  })
  status: "Nháp" | "Xuất bản" | "Xóa";

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ type: "int", default: 0 })
  viewCount: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;
}
