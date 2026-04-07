import {JsonController, Post, Body, CurrentUser, UseBefore, Param, Get, QueryParam, Patch, UploadedFile, Delete } from "routing-controllers";
import { Service } from "typedi";
import { NewsService } from "../services/newService";
import { NewDto ,UpdateNewsDTO} from "../dtos/NewDto";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { User } from "../entities/UserEntity";
import multer from "multer";
@Service()
@JsonController("/news")
export class NewsController {
  constructor(private newsService: NewsService) {}
  
  @Post("/")
  @UseBefore(AuthMiddleware)
  async create(
    @Body() body: NewDto,
    @CurrentUser() user: any,
    @UploadedFile("thumbnail", { options: { storage: multer.memoryStorage() }, required: false }) file?: Express.Multer.File
  ) {
    if (file) {
      body.thumbnail = await this.newsService.uploadImage(file);
    }
    return this.newsService.createNews(body, user.userId);
  }

  @Post("/upload-image")
  @UseBefore(AuthMiddleware)
  async uploadImage(@UploadedFile("image", { options: { storage: multer.memoryStorage() } }) file: Express.Multer.File) {
    if (!file) throw new Error("No file uploaded");
    const imageUrl = await this.newsService.uploadImage(file);
    return { imageUrl };
  }

@Post("/viewed/:newsId")
  @UseBefore(AuthMiddleware)
  async addViewedNews(
    @Param("newsId") newsId: number,
    @CurrentUser() user: User
  ) {
    await this.newsService.addViewedNews(user.userId, newsId);
    return { message: "Đã thêm vào danh sách tin đã xem" };
  }

  @Get("/viewed")
  @UseBefore(AuthMiddleware)
  async getViewedNews(
    @CurrentUser() user: User,
    @QueryParam("page") page: number = 1,
    @QueryParam("limit") limit: number = 10
  ) {
    const data = await this.newsService.getViewedNews(user.userId, page, limit);
    return { data, page, limit };
  }

  @Post("/saved/:newsId")
  @UseBefore(AuthMiddleware)
  async saveNews(
    @Param("newsId") newsId: number,
    @CurrentUser() user: User
  ) {
    await this.newsService.saveNews(user.userId, newsId);
    return { message: "Đã lưu tin thành công" };
  }

  @Get("/saved")
  @UseBefore(AuthMiddleware)
  async getSavedNews(
    @CurrentUser() user: User,
    @QueryParam("page") page: number = 1,
    @QueryParam("limit") limit: number = 10
  ) {
    const data = await this.newsService.getSavedNews(user.userId, page, limit);
    return { data, page, limit };
  }

  @Get("/my-news")
  @UseBefore(AuthMiddleware)
  async getMyNews(
    @CurrentUser() user: User,
    @QueryParam("page") page: number = 1,
    @QueryParam("limit") limit: number = 10
  ) {
    const data = await this.newsService.getMyNews(user.userId, page, limit);
    return { data, page, limit };
  }

  @Get("/")
  async getNews(
    @QueryParam("cursor") cursor?: string,
    @QueryParam("limit") limit?: number,
  ) {
    const limitNum = limit ? Number(limit) : 6;
    return this.newsService.getNewsWithCursor(cursor, limitNum);
  }
  @Get("/category")
  async getByCategory(
    @QueryParam("category") category: string,
    @QueryParam("page") page: number,
    @QueryParam("limit") limit: number
  ) {
    if (!category) throw new Error("Category is required");
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 10;

    return this.newsService.getNewsByCategory(category, pageNum, limitNum);
  }

  @Get("/search")
  async searchNews(
    @QueryParam("q") query: string,
    @QueryParam("page") page: number,
    @QueryParam("limit") limit: number
  ) {
    if (!query) throw new Error("Query parameter 'q' is required");
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 10;

    return this.newsService.searchNews(query, pageNum, limitNum);
  }
  @Patch("/:id")
  @UseBefore(AuthMiddleware)
  async update(
    @Param("id") newsId: number,
    @Body() body: UpdateNewsDTO,
    @CurrentUser() user: User
  ) {
    return this.newsService.updateNews(newsId, body, user);
  }

  @Delete("/:id")
  @UseBefore(AuthMiddleware)
  async delete(
    @Param("id") newsId: number,
    @CurrentUser() user: User
  ) {
    return this.newsService.deleteNews(newsId, user);
  }

  @Get("/:id")
  async getDetail(@Param("id") id: number) {
    const newsDetail = await this.newsService.getNewsDetail(id);
    return newsDetail;
  }

  // Nhà báo uy tín
  @Get("/trending/journalists-by-news")
  async getTopJournalistsByNews(@QueryParam("limit") limit: number = 10) {
    return this.newsService.getTopJournalistsByNewsCount(limit);
  }

  @Get("/trending/journalists-by-rating")
  async getTopJournalistsByRating(@QueryParam("limit") limit: number = 10) {
    return this.newsService.getTopJournalistsByRating(limit);
  }

  @Post("/rating/journalist/:journalistId")
  @UseBefore(AuthMiddleware)
  async rateJournalist(
    @Param("journalistId") journalistId: number,
    @Body() body: { rating: number; comment?: string },
    @CurrentUser() user: User
  ) {
    const result = await this.newsService.rateJournalist(
      journalistId,
      user.userId,
      body.rating,
      body.comment
    );
    return { message: "Đánh giá nhà báo thành công", data: result };
  }

  @Get("/rating/journalist/:journalistId")
  async getJournalistStats(@Param("journalistId") journalistId: number) {
    return this.newsService.getJournalistRatingStats(journalistId);
  }
}

