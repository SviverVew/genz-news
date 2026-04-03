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
import { cloudinary } from "../utils/cloudinary";

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

  async uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'news-thumbnails' },
        (error, result) => {
          if (error) {
            reject(new Error('Upload failed: ' + error.message));
          } else {
            resolve(result!.secure_url);
          }
        }
      );
      stream.end(file.buffer);
    });
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

  async getNewsWithCursor(cursor?: string, limit = 6) {
    const qb = this.newsRepo
      .createQueryBuilder("news")
      .leftJoinAndSelect("news.user", "user")
      .where("news.status = :status", { status: "Xuất bản" })
      .orderBy("news.datetime", "DESC")
      .addOrderBy("news.newsId", "DESC")
      .take(limit);

    if (cursor) {
      const cursorId = Number(cursor);
      if (!Number.isFinite(cursorId) || cursorId <= 0) {
        throw new Error("Invalid cursor. Expected last item's newsId.");
      }

      const cursorNews = await this.newsRepo.findOne({
        where: { newsId: cursorId, status: "Xuất bản" },
        select: ["newsId", "datetime"],
      });
      if (!cursorNews) throw new Error("Cursor news not found");

      qb.andWhere(
        "(news.datetime < :cursorDatetime OR (news.datetime = :cursorDatetime AND news.newsId < :cursorId))",
        {
          cursorDatetime: cursorNews.datetime,
          cursorId,
        }
      );
    }

    const newsList = await qb.getMany();

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

    const lastItem = newsList[newsList.length - 1];
    const nextCursor = lastItem ? String(lastItem.newsId) : null;

    return {
      data,
      nextCursor,
      hasMore: !!nextCursor,
    };
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

  async searchNews(query: string, page = 1, limit = 10) {
    if (!query || query.trim().length === 0) {
      throw new Error("Query is required");
    }

    const skip = (page - 1) * limit;

    const qb = this.newsRepo
      .createQueryBuilder("news")
      .leftJoinAndSelect("news.user", "user")
      .where("news.status = :status", { status: "Xuất bản" })
      .andWhere("MATCH(news.title, news.content) AGAINST(:query IN NATURAL LANGUAGE MODE)", { query })
      .orderBy("news.datetime", "DESC")
      .skip(skip)
      .take(limit);

    const [newsList, total] = await qb.getManyAndCount();

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

  async getMyNews(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [newsList, total] = await this.newsRepo.findAndCount({
      where: { user: { userId }, status: "Xuất bản" },
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
    await redis.lrem(key, 0, newsId.toString());
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
