import { Service } from "typedi";
import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { News } from "../entities/NewEntity";
import { User } from "../entities/UserEntity";
import { Comment } from "../entities/CommentEntity";
import { JournalistRating } from "../entities/JournalistRatingEntity";
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
  private ratingRepo = AppDataSource.getRepository(JournalistRating);

  async createNews(dto: any, userId: number) {
    const newsDto = plainToInstance(NewDto, dto, { excludeExtraneousValues: true });
    await validateOrReject(newsDto);

    const user = await this.userRepo.findOneBy({ userId });
    if (!user) throw new Error("User không tồn tại");

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

    const existing = await this.newsRepo.findOne({ where: { newsId }, relations: ["user"] });
    if (!existing) throw new Error("News not found");

    // Cho phép chủ bài viết, Admin hoặc Moderator sửa
    const isOwner = existing.user?.userId === currentUser.userId;
    const isAdminOrModerator = currentUser.role === "Admin" || currentUser.role === "Moderator";
    if (!isOwner && !isAdminOrModerator) {
      throw new Error("Permission denied");
    }

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

  async deleteNews(newsId: number, currentUser: User) {
    if (!currentUser) throw new Error("Unauthorized");

    const existing = await this.newsRepo.findOne({ where: { newsId }, relations: ["user"] });
    if (!existing) throw new Error("News not found");

    // Cho phép chủ bài viết, Admin hoặc Moderator xóa
    const isOwner = existing.user?.userId === currentUser.userId;
    const isAdminOrModerator = currentUser.role === "Admin" || currentUser.role === "Moderator";
    if (!isOwner && !isAdminOrModerator) {
      throw new Error("Permission denied");
    }

    // Soft delete: update status thành "Xóa"
    existing.status = "Xóa";
    const updated = await this.newsRepo.save(existing);
    await redis.del(`news:${newsId}`);

    return { message: "Đã xóa bài viết thành công" };
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

  // Lấy top 10 nhà báo đăng nhiều bài báo nhất
  async getTopJournalistsByNewsCount(limit = 10) {
    const cacheKey = "top:journalists:by:news:count";
    let cached = await redis.get<any>(cacheKey);

    if (cached) return cached;

    const journalists = await this.newsRepo
      .createQueryBuilder("news")
      .select("news.userId", "userId")
      .addSelect("user.name", "name")
      .addSelect("COUNT(news.newsId)", "newsCount")
      .leftJoin("news.user", "user")
      .where("news.status = :status", { status: "Xuất bản" })
      .groupBy("news.userId")
      .orderBy("COUNT(news.newsId)", "DESC")
      .limit(limit)
      .getRawMany();

    const result = journalists.map(j => ({
      userId: j.userId,
      name: j.name,
      newsCount: parseInt(j.newsCount),
    }));

    await redis.set(cacheKey, result, { ex: 3600 }); // Cache 1 giờ
    return result;
  }

  // Lấy top 10 nhà báo được xếp hạng tốt nhất
  async getTopJournalistsByRating(limit = 10) {
    const cacheKey = "top:journalists:by:rating";
    let cached = await redis.get<any>(cacheKey);

    if (cached) return cached;

    const journalists = await this.ratingRepo
      .createQueryBuilder("rating")
      .select("rating.journalistId", "journalistId")
      .addSelect("user.name", "name")
      .addSelect("AVG(rating.rating)", "avgRating")
      .addSelect("COUNT(rating.ratingId)", "totalRatings")
      .leftJoin("rating.journalist", "user")
      .groupBy("rating.journalistId")
      .having("COUNT(rating.ratingId) >= 3") // Tối thiểu 3 đánh giá
      .orderBy("AVG(rating.rating)", "DESC")
      .limit(limit)
      .getRawMany();

    const result = journalists.map(j => ({
      journalistId: j.journalistId,
      name: j.name,
      avgRating: parseFloat(j.avgRating).toFixed(2),
      totalRatings: parseInt(j.totalRatings),
    }));

    await redis.set(cacheKey, result, { ex: 3600 }); // Cache 1 giờ
    return result;
  }

  // User xếp hạng nhà báo
  async rateJournalist(
    journalistId: number,
    ratedById: number,
    rating: number,
    comment?: string
  ) {
    if (rating < 1 || rating > 5) throw new Error("Rating phải trong khoảng 1-5");
    if (journalistId === ratedById)
      throw new Error("Không thể tự xếp hạng");

    const journalist = await this.userRepo.findOneBy({ userId: journalistId });
    if (!journalist) throw new Error("Nhà báo không tồn tại");

    const ratedBy = await this.userRepo.findOneBy({ userId: ratedById });
    if (!ratedBy) throw new Error("User không tồn tại");

    // Kiểm tra xem user đã xếp hạng nhà báo này chưa
    let ratingRecord = await this.ratingRepo.findOne({
      where: { journalistId, ratedById },
    });

    if (!ratingRecord) {
      ratingRecord = this.ratingRepo.create({
        journalist,
        journalistId,
        ratedBy,
        ratedById,
        rating,
        comment: comment || "",
      });
    } else {
      ratingRecord.rating = rating;
      ratingRecord.comment = comment || "";
    }

    const saved = await this.ratingRepo.save(ratingRecord);

    // Xóa cache khi có thay đổi
    await redis.del("top:journalists:by:rating");

    return saved;
  }

  // Lấy thống kê xếp hạng của nhà báo
  async getJournalistRatingStats(journalistId: number) {
    const stats = await this.ratingRepo
      .createQueryBuilder("rating")
      .select("AVG(rating.rating)", "avgRating")
      .addSelect("COUNT(rating.ratingId)", "totalRatings")
      .where("rating.journalistId = :journalistId", { journalistId })
      .getRawOne();

    const journalist = await this.userRepo.findOneBy({ userId: journalistId });
    const newsCount = await this.newsRepo.count({
      where: { user: { userId: journalistId }, status: "Xuất bản" },
    });

    const reviews = await this.ratingRepo.find({
      where: { journalistId },
      relations: ["ratedBy"],
      order: { created_at: "DESC" },
      take: 10,
    });

    return {
      journalist: {
        userId: journalist?.userId,
        name: journalist?.name,
      },
      newsCount,
      rating: {
        avgRating: stats.avgRating ? parseFloat(stats.avgRating).toFixed(2) : 0,
        totalRatings: stats.totalRatings || 0,
      },
      recentReviews: reviews.map(r => ({
        ratingId: r.ratingId,
        rating: r.rating,
        comment: r.comment,
        ratedBy: r.ratedBy.name,
        date: r.created_at,
      })),
    };
  }
}
