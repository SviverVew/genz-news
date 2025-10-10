import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/UserEntity";
import { UserAdvance } from "./entities/UserAdvanceEntity";
import { config } from "./config";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: false,   
  logging: false,
  entities: [__dirname + "/entities/*.{ts,js}"],
  migrations: process.env.NODE_ENV === "production"
    ? ["dist/migrations/**/*.js"]
    : ["src/migrations/**/*.ts"],
  subscribers: [],
});
