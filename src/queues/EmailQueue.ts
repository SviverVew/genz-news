import { Queue } from "bullmq";
import { redis } from "../utils/redisClient";

export const emailQueue = new Queue("email-queue", {
  connection: {
    host: 'safe-molly-35788.upstash.io',
    port: 6379,
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
    tls: {},
  },
});
