import Redis from "ioredis";

export const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

redis.info().then((info) => {
  const version = info.match(/redis_version:(\d+\.\d+\.\d+)/);
  console.log("🔗 Connected to Redis version:", version ? version[1] : "unknown");
}).catch((err) => {
  console.error("❌ Redis connection error:", err);
});
// Hàm set cache có TTL
export async function setCache(key: string, value: any, ttlSeconds: number = 60 * 60 * 24) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

// Hàm get cache
export async function getCache<T = any>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? (JSON.parse(data) as T) : null;
}

// Hàm xóa cache
export async function delCache(key: string) {
  await redis.del(key);
}

// Hàm update cache (xóa rồi set lại)
export async function updateCache(key: string, value: any, ttlSeconds: number = 60 * 60 * 24) {
  await delCache(key);
  await setCache(key, value, ttlSeconds);
}
