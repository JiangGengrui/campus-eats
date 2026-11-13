// 业务错误：service 层抛出，全局 errorHandler 统一转响应壳（CODEBUDDY §3）
import { ERROR_MESSAGES, type ErrorCodeValue } from "@xiaowei/shared";

export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly httpStatus: number;

  constructor(code: ErrorCodeValue, message?: string, httpStatus = 400) {
    super(message ?? ERROR_MESSAGES[code] ?? "业务处理失败");
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** 404 资源类错误的便捷构造 */
export function notFound(code: ErrorCodeValue = 4040, message?: string): AppError {
  return new AppError(code, message, 404);
}
