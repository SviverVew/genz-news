import { Queue } from "bullmq";
import { redis } from "../utils/redisClient";

export const emailQueue = new Queue("email-queue", {
  connection: redis.options, // dùng lại connection Redis
});
