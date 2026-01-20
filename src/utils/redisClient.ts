import { Redis } from "@upstash/redis";
import { Container } from "typedi";

// Khởi tạo Redis từ env
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
Container.set("redis", redis);

// Test kết nối
(async () => {
  try {
    await redis.ping();
    console.log("🔗 Connected to Upstash Redis successfully");
  } catch (err) {
    console.error("❌ Redis connection error:", err);
  }
})();

// ================== CACHE HELPERS ==================

// Set cache có TTL (mặc định 1 ngày)
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 60 * 60 * 24
) {
  await redis.set(key, value, { ex: ttlSeconds });
}

// Get cache
export async function getCache<T = any>(key: string): Promise<T | null> {
  const data = await redis.get<T>(key);
  return data ?? null;
}

// Xóa cache
export async function delCache(key: string) {
  await redis.del(key);
}

// Update cache
export async function updateCache(
  key: string,
  value: any,
  ttlSeconds: number = 60 * 60 * 24
) {
  await redis.set(key, value, { ex: ttlSeconds });
}
