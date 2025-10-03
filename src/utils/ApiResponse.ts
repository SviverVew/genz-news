// src/utils/ApiResponse.ts
export class ApiResponse {
  static success(data: any, pagination: any = null, meta: any = {}) {
    return {
      data,
      error: null,
      pagination,
      metadata: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  static error(message: string, code: number = 500, meta: any = {}) {
    return {
      data: null,
      error: { message, code }, // ✅ luôn có error object khi lỗi
      pagination: null,
      metadata: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }
}
