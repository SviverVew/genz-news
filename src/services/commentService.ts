import { AppDataSource } from "../data-source";
import { Comment } from "../entities/CommentEntity";
import { User } from "../entities/UserEntity";
import { News } from "../entities/NewEntity";
import { Service } from "typedi";
import { ForbiddenError, NotFoundError, BadRequestError } from "routing-controllers";
@Service()
export class CommentService {
  private commentRepo = AppDataSource.getRepository(Comment);
  private newsRepo = AppDataSource.getRepository(News);

  // Tạo comment hoặc reply
  async create(newsId: number, body: { content: string; parentCommentId?: number }, user: User) {
    if (!body.content || body.content.length > 250) {
      throw new BadRequestError("Nội dung không hợp lệ (<= 250 ký tự)");
    }

    const news = await this.newsRepo.findOne({ where: { newsId } });
    if (!news) throw new NotFoundError("Bài viết không tồn tại");

    // Nếu không có parent => comment gốc
    if (!body.parentCommentId) {
      const existingComment = await this.commentRepo.findOne({
        where: { user: { userId: user.userId }, news: { newsId }, parentComment: null },
      });
      if (existingComment) {
        throw new BadRequestError("Bạn chỉ được bình luận 1 lần trên bài viết này");
      }
      console.log("CurrentUser:", user);
      const comment = this.commentRepo.create({
            content: body.content,
            user: { userId: user.userId },   // 👈 chỉ cần id
            news: { newsId: news.newsId },   // 👈 chỉ cần id
            });
      return await this.commentRepo.save(comment);
    }

    // Nếu có parent => reply
    const parent = await this.commentRepo.findOne({
      where: { commentId: body.parentCommentId, news: { newsId } },
      relations: ["parentComment"],
    });
    if (!parent) throw new NotFoundError("Parent comment không tồn tại");

    // Nếu parent là reply thì trỏ về comment gốc
    const finalParent = parent.parentComment ? parent.parentComment : parent;

    const reply = this.commentRepo.create({
        content: body.content,
        user: { userId: user.userId },
        news: { newsId: news.newsId },
        parentComment: { commentId: finalParent.commentId },
        });
    return await this.commentRepo.save(reply);
  }

  // Update comment
  async update(id: number, body: { content: string }, user: User) {
    const comment = await this.commentRepo.findOne({ where: { commentId: id }, relations: ["user"] });
    if (!comment) throw new NotFoundError("Comment không tồn tại");

    if (comment.user.userId !== user.userId) throw new ForbiddenError("Không có quyền sửa comment này");

    comment.content = body.content;
    return await this.commentRepo.save(comment);
  }

  // Delete comment
  async delete(id: number, user: User) {
    const comment = await this.commentRepo.findOne({ where: { commentId: id }, relations: ["user"] });
    if (!comment) throw new NotFoundError("Comment không tồn tại");

    if (comment.user.userId !== user.userId) throw new ForbiddenError("Không có quyền xóa comment này");

    await this.commentRepo.remove(comment);
    return { message: "Xóa comment thành công" };
  }

  // Hide comment (Admin/Mod)
  async hide(id: number, user: User) {
    if (!["admin", "mod"].includes(user.role)) {
      throw new ForbiddenError("Bạn không có quyền ẩn comment");
    }

    const comment = await this.commentRepo.findOne({ where: { commentId: id } });
    if (!comment) throw new NotFoundError("Comment không tồn tại");

    comment.isHidden = true;
    return await this.commentRepo.save(comment);
  }

  // Lấy danh sách comment theo news
  async getByNews(newsId: number) {
    const comments = await this.commentRepo.find({
      where: { news: { newsId }, parentComment: null, isHidden: false },
      relations: ["user", "replies", "replies.user"],
      order: { created_at: "ASC" },
    });

    // Filter bỏ các reply hidden
    return comments.map((c) => ({
      ...c,
      replies: c.replies.filter((r) => !r.isHidden),
    }));
  }
}
