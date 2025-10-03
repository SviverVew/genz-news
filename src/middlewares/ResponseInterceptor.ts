import { Action, Interceptor, InterceptorInterface } from "routing-controllers";
import { Service } from "typedi";
@Service()
@Interceptor()
export class ResponseInterceptor implements InterceptorInterface {
  intercept(action: Action, content: any) {
    if (content === null || content === undefined) {
      const err: any = new Error("Resource not found");
      err.httpCode = 404;
      throw err; // ✅ ném về GlobalHandler
    }

    return {
      data: content,
      error: null,
      pagination: null,
      metadata: {
        timestamp: new Date().toISOString(),
        path: action.request.path,
        method: action.request.method,
      },
    };
  }
}
