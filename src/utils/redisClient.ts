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
