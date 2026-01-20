import {JsonController, QueryParams,Post, Body, CurrentUser, UseBefore, Param, Get, QueryParam, Patch, HttpCode } from "routing-controllers";
import { Service } from "typedi";
import { NewsService } from "../services/newService";
import { NewDto ,UpdateNewsDTO} from "../dtos/NewDto";
import { UpdateUserDTO } from "../dtos/UserDTO";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { User } from "../entities/UserEntity";
@Service()
@JsonController("/news")
export class NewsController {
  constructor(private newsService: NewsService) {}
  
  @Post("/")
  @UseBefore(AuthMiddleware)
  async create(@Body() body: NewDto, @CurrentUser() user: any) {
    // giả sử middleware auth đã inject userId vào @CurrentUser
    return this.newsService.createNews(body, user.userId);
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
  @Patch("/:id")
  @UseBefore(AuthMiddleware)
  async update(
    @Param("id") newsId: number,
    @Body() body: UpdateNewsDTO,
    @CurrentUser() user: User
  ) {
    return this.newsService.updateNews(newsId, body, user);
  }

  @Get("/:id")
  async getDetail(@Param("id") id: number) {
    const newsDetail = await this.newsService.getNewsDetail(id);
    return newsDetail;
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
}
