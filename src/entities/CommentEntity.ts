import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { User } from "./UserEntity";
import { News } from "./NewEntity";

@Entity("comment")
export class Comment {
  @PrimaryGeneratedColumn()
  commentId: number;

  @ManyToOne(() => News, { onDelete: "CASCADE" })
  @JoinColumn({ name: "newsId" })
  news: News;

  @Column()
  newsId: number;   // 👈 thêm

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  userId: number;   // 👈 thêm


  @Column({ length: 250 })
  content: string;

  @ManyToOne(() => Comment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "parentCommentId" })
  parentComment: Comment;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[];

  @Column({ type: "boolean", default: false })
  isHidden: boolean;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;
}
