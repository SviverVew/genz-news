import { Service } from "typedi";
import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { News } from "../entities/NewEntity";
import { User } from "../entities/UserEntity";
import { Comment } from "../entities/CommentEntity";
import { NewDto } from "../dtos/NewDto";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { redis, updateCache } from "../utils/redisClient";

@Service()
export class NewsService {
  private newsRepo = AppDataSource.getRepository(News);
  private userRepo = AppDataSource.getRepository(User);
  private commentRepo = AppDataSource.getRepository(Comment);

  async createNews(dto: any, userId: number) {
    const newsDto = plainToInstance(NewDto, dto, { excludeExtraneousValues: true });
    await validateOrReject(newsDto);

    const user = await this.userRepo.findOneBy({ userId });
    if (!user) throw new Error("User không tồn tại");
    if (user.role !== "Admin" && user.role !== "Moderator")
      throw new Error("Không có quyền đăng bài");

    const news = this.newsRepo.create({
      ...newsDto,
      datetime: new Date(newsDto.datetime),
      user,
    });

    const saved = await this.newsRepo.save(news);
    await redis.set(`news:${saved.newsId}`, saved, { ex: 86400 });

    return saved;
  }

  async updateNews(newsId: number, payload: Partial<News>, currentUser: User) {
    if (!currentUser) throw new Error("Unauthorized");
    if (currentUser.role !== "Admin" && currentUser.role !== "Moderator")
      throw new Error("Permission denied");

    const existing = await this.newsRepo.findOne({ where: { newsId } });
    if (!existing) throw new Error("News not found");

    const allowed = [
      "title",
      "content",
      "thumbnail",
      "category",
      "datetime",
      "tags",
      "status",
      "description",
    ];

    for (const field of allowed) {
      if ((payload as any)[field] !== undefined) {
        (existing as any)[field] = (payload as any)[field];
      }
    }

    const updated = await this.newsRepo.save(existing);
    await updateCache(`news:${newsId}`, updated);

    return updated;
  }

  async getNewsDetail(newsId: number) {
    const cacheKey = `news:${newsId}`;
    let news = await redis.get<News>(cacheKey);

    if (!news) {
      news = await this.newsRepo.findOne({
        where: { newsId },
        relations: ["user"],
      });
      if (!news) throw new Error("News not found");
      await redis.set(cacheKey, news, { ex: 86400 });
    }

    await this.newsRepo.increment({ newsId }, "viewCount", 1);
    news.viewCount = (news.viewCount || 0) + 1;

    const totalComment = await this.commentRepo.count({
      where: { news: { newsId }, isHidden: false },
    });

    await redis.set(cacheKey, news, { ex: 86400 });

    return { ...news, totalComment };
  }

  async getNewsByCategory(category: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [newsList, total] = await this.newsRepo.findAndCount({
      where: { category, status: "Xuất bản" },
      relations: ["user"],
      order: { datetime: "DESC" },
      skip,
      take: limit,
    });

    const data = await Promise.all(
      newsList.map(async (news) => {
        const totalComment = await this.commentRepo.count({
          where: { news: { newsId: news.newsId }, isHidden: false },
        });

        return {
          newsId: news.newsId,
          title: news.title,
          description: news.description,
          thumbnail: news.thumbnail,
          author: news.user.name,
          totalComment,
        };
      })
    );

    return { data, pagination: { page, limit, total } };
  }

  private viewedKey(userId: number) {
    return `user:${userId}:viewedNews`;
  }

  private savedKey(userId: number) {
    return `user:${userId}:savedNews`;
  }

  async addViewedNews(userId: number, newsId: number) {
    const key = this.viewedKey(userId);
    await redis.lpush(key, newsId.toString());
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, 60 * 60 * 24 * 30);
  }

  async getViewedNews(userId: number, page: number, limit: number) {
    const key = this.viewedKey(userId);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const ids = await redis.lrange(key, start, end);
    if (ids.length === 0) return [];

    const news = await this.newsRepo.find({
      where: { newsId: In(ids.map(Number)) },
    });

    const map = new Map(news.map(n => [n.newsId, n]));
    return ids.map(id => map.get(Number(id))).filter(Boolean);
  }

  async saveNews(userId: number, newsId: number) {
    const key = this.savedKey(userId);
    await redis.sadd(key, newsId.toString());
    await redis.expire(key, 60 * 60 * 24 * 30);
  }

  async getSavedNews(userId: number, page: number, limit: number) {
    const key = this.savedKey(userId);
    const ids = await redis.smembers(key);
    if (ids.length === 0) return [];

    const sliced = ids
      .map(Number)
      .slice((page - 1) * limit, page * limit);

    return this.newsRepo.find({ where: { newsId: In(sliced) } });
  }
}
