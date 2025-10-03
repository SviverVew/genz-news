import "reflect-metadata";
// import { createExpressServer } from "routing-controllers";
import { useContainer as routingUseContainer, createExpressServer } from "routing-controllers";
import { AppDataSource } from "./data-source";
import { config } from "./config";
import { GlobalHandler  } from "./middlewares/GlobalHandler";
import { ResponseInterceptor } from "./middlewares/ResponseInterceptor";
import { useContainer as typeormUseContainer } from "typeorm";
import {Container} from "typedi";


AppDataSource.initialize()
  .then(() => {
    console.log("Database connected!");
    routingUseContainer(Container);
    typeormUseContainer(Container);
    const app = createExpressServer({
      routePrefix: "/api", // tất cả route bắt đầu /api
      controllers: [__dirname + "/controllers/*.{ts,js}"], // auto load controllers
      middlewares: [GlobalHandler], // bật global error handler
      interceptors: [ResponseInterceptor], // bật global response wrapper
      defaultErrorHandler: false, // tắt handler mặc định để dùng cái custom
    });

    app.listen(config.app.port, () => {
      console.log(`Server running on port ${config.app.port}`);
    });
  })
  .catch((err) => console.error("Database connection failed:", err));
