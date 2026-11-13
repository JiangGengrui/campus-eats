// 登录限流单测：只统计失败响应，同一账号第 11 次失败触发 429（本文件不引 helpers，独立控制 env）
process.env.RATE_LIMIT_DISABLED = "off";
process.env.JWT_SECRET = "test-secret-key";

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@xiaowei/shared";

const { loginRateLimit } = await import("../src/middleware/rate-limit.js");

function fakeReq(username: string, ip = "10.0.0.1"): Request {
  return { ip, method: "POST", baseUrl: "/api/auth", path: "/login", body: { username, password: "x" } } as unknown as Request;
}

/** 假响应：记录 finish 回调，用于模拟「请求处理完成、状态码已知」 */
function fakeRes(statusCode: number): { res: Response; finish: () => void } {
  const handlers: Array<() => void> = [];
  const res = {
    statusCode,
    on(event: string, cb: () => void) {
      if (event === "finish") {
        handlers.push(cb);
      }
      return res;
    },
  } as unknown as Response;
  return { res, finish: () => handlers.forEach((cb) => cb()) };
}

/** 走一次中间件，返回 next 收到的错误（undefined 表示放行）；fail=true 时模拟认证失败 */
function run(mw: ReturnType<typeof loginRateLimit>, username: string, ip: string, fail: boolean): unknown {
  let err: unknown;
  const { res, finish } = fakeRes(fail ? 401 : 200);
  mw(fakeReq(username, ip), res, ((e?: unknown) => {
    err = e;
  }) as NextFunction);
  if (err === undefined) {
    finish();
  }
  return err;
}

describe("loginRateLimit", () => {
  it("同一账号连续 10 次失败后，第 11 次失败抛 RATE_LIMITED/429", () => {
    const mw = loginRateLimit();
    for (let i = 0; i < 10; i++) {
      expect(run(mw, "victim", "10.0.0.1", true)).toBeUndefined();
    }
    expect(run(mw, "victim", "10.0.0.1", true)).toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
      httpStatus: 429,
    });
  });

  it("成功登录不消耗配额：连续 20 次成功仍放行", () => {
    const mw = loginRateLimit();
    for (let i = 0; i < 20; i++) {
      expect(run(mw, "happy", "10.0.0.2", false)).toBeUndefined();
    }
  });

  it("同一 IP 下不同账号互不影响", () => {
    const mw = loginRateLimit();
    for (let i = 0; i < 10; i++) {
      run(mw, "bad", "10.0.0.3", true);
    }
    expect(run(mw, "bad", "10.0.0.3", true)).toMatchObject({ code: ERROR_CODES.RATE_LIMITED });
    expect(run(mw, "good", "10.0.0.3", false)).toBeUndefined();
  });

  it("不同 IP 互不影响", () => {
    const mw = loginRateLimit();
    expect(run(mw, "someone", "10.0.0.99", true)).toBeUndefined();
  });
});
