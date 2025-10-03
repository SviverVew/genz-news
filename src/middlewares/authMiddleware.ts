// src/middlewares/AuthMiddleware.ts
import { ExpressMiddlewareInterface } from "routing-controllers";
import jwt from "jsonwebtoken";
import { redis } from "../utils/redisClient";
import { Service } from "typedi";

@Service()
export class AuthMiddleware implements ExpressMiddlewareInterface {
  async use(req: any, res: any, next: (err?: any) => any) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ message: "Missing token" });

    const token = authHeader.split(" ")[1]; // Bearer xxx
    if (!token) return res.status(401).json({ message: "Invalid token format" });

    try {
      // Check Redis
      const userId = await redis.get(`accessToken:${token}`);
      if (!userId) return res.status(401).json({ message: "Token expired or not found" });

      // Verify token
      const payload = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
}
