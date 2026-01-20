import { Service } from "typedi";
import { Repository, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { News } from "../entities/NewEntity";
import { User } from "../entities/UserEntity";
import { Comment } from "../entities/CommentEntity";
import { NewDto } from "../dtos/NewDto";
import { RedisClientType } from "redis";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { InjectRepository } from "typeorm-typedi-extensions";
import { updateCache ,redis} from "../utils/redisClient";
export class NewsService {
  @Service()
  private newsRepo = AppDataSource.getRepository(News);
  private userRepo = AppDataSource.getRepository(User);
  private commentRepo = AppDataSource.getRepository(Comment);
   constructor(
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>,
    private readonly redis: RedisClientType
  ) {}
  async createNews(dto: any, userId: number) {
    // validate DTO
    const newsDto = plainToInstance(NewDto, dto, { excludeExtraneousValues: true });
    await validateOrReject(newsDto);

    // check user role
    const user = await this.userRepo.findOneBy({ userId });
    if (!user) throw new Error("User không tồn tại");
    if (user.role !== "Admin" && user.role !== "Moderator") throw new Error("Không có quyền đăng bài");

    // tạo entity
    const news = this.newsRepo.create({
      ...newsDto,
      datetime: new Date(newsDto.datetime),
      user: user,
    });

    const saved = await this.newsRepo.save(news);

    // cache Redis
    await redis.set(`news:${saved.newsId}`, JSON.stringify(saved), { ex: 60 * 60 * 24 });

    return saved;
  }
  
    async updateNews(newsId: number, payload: Partial<News>, currentUser: User) {
    // Kiểm tra quyền
    if (!currentUser) throw new Error("Unauthorized");
    if (currentUser.role !== "Admin" && currentUser.role !== "Moderator") {
      throw new Error("Permission denied");
    }
    const existing = await this.newsRepo.findOne({ where: { newsId } });
    if (!existing) throw new Error("News not found");

    // Chỉ update những field có trong body
    const allowed = ["title","content","thumbnail","category","datetime","tags","status","description"];
    for (const field of allowed) {
      if ((payload as any)[field] !== undefined) {
        (existing as any)[field] = (payload as any)[field];
      }
    }

  const updated = await this.newsRepo.save(existing);
   console.log(">>> CurrentUser:", currentUser);
  // update cache
  await updateCache(`news:${newsId}`, updated);

  return updated;
  }


   async getNewsDetail(newsId: number) {
    const cacheKey = `news:${newsId}`;

    // 1️⃣ Kiểm tra cache
    let cached = await redis.get(cacheKey);
    let news: News | null;

    if (cached) {
      news = JSON.parse(cached as string);
    } else {
      // 2️⃣ Query DB nếu cache không có
      news = await this.newsRepo.findOne({
        where: { newsId },
        relations: ["user"], // lấy thông tin author nếu cần
      });
      if (!news) throw new Error("News not found");

      // Lưu cache 1 ngày
      await redis.set(cacheKey, JSON.stringify(news), { ex: 60 * 60 * 24 });
    }

    // 3️⃣ Tăng viewCount
    await this.newsRepo.increment({ newsId }, "viewCount", 1);
    news.viewCount = (news.viewCount || 0) + 1;

    // 4️⃣ Đếm số bình luận (dùng QueryBuilder tránh lỗi TypeORM)
    const totalComment = await this.commentRepo
      .createQueryBuilder("comment")
      .where("comment.newsId = :newsId", { newsId })
      .andWhere("comment.isHidden = 0")
      .getCount();

    // 5️⃣ Cập nhật lại cache sau khi tăng viewCount
    await redis.set(cacheKey, JSON.stringify(news), { ex: 60 * 60 * 24 });

    // 6️⃣ Trả về
    return {
      ...news,
      totalComment,
    };
  }

   async getNewsByCategory(category: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // 1️⃣ Lấy danh sách bài viết theo category, chỉ bài "Xuất bản"
    const [newsList, total] = await this.newsRepo.findAndCount({
      where: { category, status: "Xuất bản" },
      relations: ["user"],
      order: { datetime: "DESC" },
      skip,
      take: limit,
    });

    // 2️⃣ Map ra chỉ các thông tin cần thiết và đếm số bình luận
    const result = await Promise.all(
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

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }
   private viewedKey(userId: number) {
    return `user:${userId}:viewedNews`;
  }

  private savedKey(userId: number) {
    return `user:${userId}:savedNews`;
  }

  /** ========================
   *  3.5 Danh sách tin đã xem
   *  ======================== */
  async addViewedNews(userId: number, newsId: number) {
    const key = this.viewedKey(userId);
    await this.redis.lPush(key, newsId.toString()); // thêm vào đầu danh sách
    await this.redis.lTrim(key, 0, 999); // giữ tối đa 1000 bản ghi gần nhất
    await this.redis.expire(key, 60 * 60 * 24 * 30); // expire 30 ngày
  }

  async getViewedNews(userId: number, page: number, limit: number) {
    const key = this.viewedKey(userId);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const newsIds = await this.redis.lRange(key, start, end);
    if (newsIds.length === 0) return [];

    // query DB để lấy thông tin bài viết
    const news = await this.newsRepository.find({
      where: { newsId: In(newsIds.map(id => +id)) },
    });

    // giữ đúng thứ tự như trong Redis
    const map = new Map(news.map(n => [n.newsId, n]));
    return newsIds.map(id => map.get(+id)).filter(Boolean);
  }

  /** ========================
   *  3.6 Danh sách tin đã lưu
   *  ======================== */
  async saveNews(userId: number, newsId: number) {
    const key = this.savedKey(userId);
    await this.redis.SADD(key, newsId.toString());
    await this.redis.expire(key, 60 * 60 * 24 * 30); // expire 30 ngày
  }

  async getSavedNews(userId: number, page: number, limit: number) {
    const key = this.savedKey(userId);
    const allIds = await this.redis.sMembers(key);
    if (allIds.length === 0) return [];

    const newsIds = allIds
      .map(id => +id)
      .slice((page - 1) * limit, page * limit);

    const news = await this.newsRepository.find({
      where: { newsId: In(newsIds) },
    });
    return news;
  }
}
