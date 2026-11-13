// 账户 service 集成测试：哈希落库 / 统一登录错误 / 双表隔离（SPEC F1）
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { ERROR_CODES } from "@xiaowei/shared";
import { loadDb } from "./helpers.js";

const db = await loadDb();
const auth = await import("../src/modules/auth/auth.service.js");

describe("注册（SPEC F1.1）", () => {
  it("注册成功自动返回 token 与 user，密码以 bcrypt 哈希落库", () => {
    const result = auth.register("zhangsan", "123456");
    expect(result.user.role).toBe("user");
    expect(result.token.split(".")).toHaveLength(3);
    const row = db.prepare("SELECT password_hash FROM users WHERE username = 'zhangsan'").get() as {
      password_hash: string;
    };
    expect(row.password_hash).not.toBe("123456");
    expect(row.password_hash.startsWith("$2")).toBe(true);
  });

  it("重复用户名抛 1001/409", () => {
    expect(() => auth.register("zhangsan", "abcdef")).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.USERNAME_TAKEN, httpStatus: 409 })
    );
  });
});

describe("登录（SPEC F1.2：统一错误不区分用户不存在/密码错误）", () => {
  it("正确密码签发 user 角色 token", () => {
    const result = auth.login("zhangsan", "123456");
    expect(result.user.role).toBe("user");
  });

  it("密码错误与用户不存在返回同一错误码 1002/401", () => {
    const wrongPassword = () => auth.login("zhangsan", "wrong-pass");
    const noSuchUser = () => auth.login("nobody", "123456");
    expect(wrongPassword).toThrowError(expect.objectContaining({ code: ERROR_CODES.INVALID_CREDENTIALS, httpStatus: 401 }));
    expect(noSuchUser).toThrowError(expect.objectContaining({ code: ERROR_CODES.INVALID_CREDENTIALS, httpStatus: 401 }));
  });
});

describe("管理员登录（双表隔离）", () => {
  it("users 表账号不能登录后台；admins 表账号可以", () => {
    // admins 表 fixture（低 cost 加速测试；bcrypt 校验仍走 service 真实路径）
    const hash = bcrypt.hashSync("admin123", 4);
    db.prepare("INSERT INTO admins (username, password_hash) VALUES ('admin', ?)").run(hash);

    expect(() => auth.adminLogin("zhangsan", "123456")).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.INVALID_CREDENTIALS })
    );
    const result = auth.adminLogin("admin", "admin123");
    expect(result.user.role).toBe("admin");
  });
});
