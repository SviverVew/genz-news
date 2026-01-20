import { Worker } from "bullmq";
import { redis } from "../utils/redisClient";
import { MailService } from "../services/mailService";

const mailService = new MailService();

export const emailWorker = new Worker(
  "email-queue",
  async job => {
    if (job.name === "send-otp-email") {
      const { to, otp } = job.data;
      await mailService.sendOtpMail(to, otp);
      console.log(`OTP đã được gửi tới ${to}`);
    }
  },
  {
    connection: {
      host: 'safe-molly-35788.upstash.io',
      port: 6379,
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      tls: {},
    },
  }
);
