// 统一错误处理（CODEBUDDY §3/§7）：AppError → 业务码；zod → 1003；其余 → 500
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ERROR_CODES, ERROR_MESSAGES } from "@xiaowei/shared";
import { AppError } from "../errors.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ code: ERROR_CODES.NOT_FOUND, message: `接口不存在：${req.method} ${req.path}`, data: null });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({ code: err.code, message: err.message, data: null });
    return;
  }
  // multer 错误（CODEBUDDY §7：上传白名单/大小限制）
  if (typeof err === "object" && err !== null && "code" in err) {
    if ((err as { code: string }).code === "LIMIT_FILE_SIZE") {
      res
        .status(400)
        .json({ code: ERROR_CODES.UPLOAD_TOO_LARGE, message: ERROR_MESSAGES[ERROR_CODES.UPLOAD_TOO_LARGE], data: null });
      return;
    }
  }
  // body-parser JSON 解析失败（entity.parse.failed，带 statusCode 400）→ 1003，不落到 500
  if (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    (err as { statusCode?: number }).statusCode === 400
  ) {
    res.status(400).json({ code: ERROR_CODES.VALIDATION_FAILED, message: "请求体不是合法 JSON", data: null });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: first ? `${first.path.join(".") || "参数"}：${first.message}` : "输入不合法",
      data: null,
    });
    return;
  }
  console.error("[error] 未处理异常：", err);
  res
    .status(500)
    .json({ code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR], data: null });
};
