import { JsonController, Post, Patch, Delete, Param, Body, Get, UseBefore, CurrentUser } from "routing-controllers";
import { CommentService } from "../services/commentService";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { User } from "../entities/UserEntity";
import { Service } from "typedi";
@Service()
@JsonController("/comments")
export class CommentController {
  private commentService = new CommentService();

  // Tạo comment hoặc reply
  @Post("/:newsId")
  @UseBefore(AuthMiddleware)
  async createComment(
    @Param("newsId") newsId: number,
    @Body() body: { content: string; parentCommentId?: number },
    @CurrentUser() user: User
  ) {
    return this.commentService.create(newsId, body, user);
  }

  // Update comment
  @Patch("/:id")
  @UseBefore(AuthMiddleware)
  async updateComment(
    @Param("id") id: number,
    @Body() body: { content: string },
    @CurrentUser() user: User
  ) {
    return this.commentService.update(id, body, user);
  }

  // Delete comment
  @Delete("/:id")
  @UseBefore(AuthMiddleware)
  async deleteComment(@Param("id") id: number, @CurrentUser() user: User) {
    return this.commentService.delete(id, user);
  }

  // Admin/Mod hide comment
  @Patch("/:id/hide")
  @UseBefore(AuthMiddleware)
  async hideComment(@Param("id") id: number, @CurrentUser() user: User) {
    return this.commentService.hide(id, user);
  }

  // Lấy danh sách comment theo news
  @Get("/news/:newsId")
  async getComments(@Param("newsId") newsId: number) {
    return this.commentService.getByNews(newsId);
  }
}
