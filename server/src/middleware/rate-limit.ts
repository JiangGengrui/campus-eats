// 登录限流：内存滑动窗口（CODEBUDDY §7 安全清单补充）
// 口径：只统计失败响应（401/403），成功登录不消耗配额，避免多人共用出口 IP 时互相踢下线；
// 双层桶：单账号 10 次/5 分钟（防撞库），单 IP 30 次/5 分钟（防同源刷多个账号）。
// 课程项目级防护；多实例部署需换 Redis 等共享存储（内存窗口不互通）。
import type { RequestHandler } from "express";
import { ERROR_CODES } from "@xiaowei/shared";
import { config } from "../config.js";
import { AppError } from "../errors.js";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILURES_PER_ACCOUNT = 10;
const MAX_FAILURES_PER_IP = 30;
const PRUNE_THRESHOLD = 5_000;

const failures = new Map<string, number[]>();

function usernameOf(body: unknown): string {
  const username = (body as { username?: unknown } | null | undefined)?.username;
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length === 0) {
    failures.delete(key);
  } else {
    failures.set(key, list);
  }
  return list;
}

/** 键数量超阈值时清掉整窗过期的条目（而不是整表清空，避免瞬间全量放行） */
function prune(now: number): void {
  if (failures.size < PRUNE_THRESHOLD) {
    return;
  }
  for (const [key, list] of failures) {
    if (list.every((t) => now - t >= WINDOW_MS)) {
      failures.delete(key);
    }
  }
}

export function loginRateLimit(): RequestHandler {
  return (req, res, next) => {
    if (config.rateLimitDisabled) {
      next();
      return;
    }
    const now = Date.now();
    const ip = req.ip ?? "unknown";
    const accountKey = `${ip}:${usernameOf(req.body)}`;
    const ipKey = `ip:${ip}`;

    if (
      recent(accountKey, now).length >= MAX_FAILURES_PER_ACCOUNT ||
      recent(ipKey, now).length >= MAX_FAILURES_PER_IP
    ) {
      next(new AppError(ERROR_CODES.RATE_LIMITED, "尝试过于频繁，请 5 分钟后再试", 429));
      return;
    }

    // 响应完成后按结果记账：只有认证失败才计入，避免正常登录被误伤
    res.on("finish", () => {
      if (res.statusCode !== 401 && res.statusCode !== 403) {
        return;
      }
      const at = Date.now();
      for (const key of [accountKey, ipKey]) {
        const list = recent(key, at);
        list.push(at);
        failures.set(key, list);
      }
      prune(at);
    });

    next();
  };
}
