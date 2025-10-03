import { ExpressErrorMiddlewareInterface, Middleware } from "routing-controllers";
import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { ValidationError } from "class-validator";
import { Service } from "typedi";
@Service()
@Middleware({ type: "after" })
export class GlobalHandler implements ExpressErrorMiddlewareInterface {
  error(error: any, req: Request, res: Response, next: (err?: any) => any) {
    let status = error.httpCode || error.status || 500;
    let message = error.message || "Internal Server Error";

    // Validation errors (class-validator)
    if (Array.isArray(error.errors) && error.errors[0] instanceof ValidationError) {
      status = 400;
      message = error.errors
        .map((e: ValidationError) => Object.values(e.constraints || {}).join(", "))
        .join("; ");
    }

    // Route not found
    if (status === 404 || error.name === "NotFoundError") {
      status = 404;
      message = "Route not found";
    }

    return res.status(status).json(
      ApiResponse.error(message, status, {
        path: req.path,
        method: req.method,
      })
    );
  }
}
