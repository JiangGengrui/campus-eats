// 地址 service 集成测试：默认地址唯一性 / 补位规则 / 归属隔离（SPEC F6）
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@xiaowei/shared";
import { loadDb } from "./helpers.js";

const db = await loadDb();
const service = await import("../src/modules/addresses/addresses.service.js");

const userId = Number(db.prepare("INSERT INTO users (username, password_hash) VALUES ('zhangsan', 'x')").run().lastInsertRowid);
const otherUserId = Number(db.prepare("INSERT INTO users (username, password_hash) VALUES ('lisi', 'x')").run().lastInsertRowid);

const input = (room: string, isDefault = false) => ({
  receiver: "张三",
  phone: "13812345678",
  building: "1 号楼",
  room,
  isDefault,
});

describe("默认地址唯一性（SPEC F6.2）", () => {
  it("首个地址强制设为默认", () => {
    const first = service.createAddress(userId, input("101", false));
    expect(first.isDefault).toBe(true);
  });

  it("设新默认后原默认自动取消，全局仅一个默认", () => {
    const a = service.createAddress(userId, input("102", false));
    const b = service.createAddress(userId, input("103", true));
    const list = service.listAddresses(userId);
    expect(list.filter((addr) => addr.isDefault)).toHaveLength(1);
    expect(list.find((addr) => addr.isDefault)?.id).toBe(b.id);
    expect(list.find((addr) => addr.id === a.id)?.isDefault).toBe(false);
  });

  it("取消默认（isDefault=false）后自动补位最早地址", () => {
    const listBefore = service.listAddresses(userId);
    const currentDefault = listBefore.find((addr) => addr.isDefault)!;
    const earliestOther = [...listBefore].filter((a) => a.id !== currentDefault.id).sort((x, y) => x.id - y.id)[0]!;
    service.updateAddress(userId, currentDefault.id, { ...input(currentDefault.room, false) });
    const list = service.listAddresses(userId);
    expect(list.filter((addr) => addr.isDefault)).toHaveLength(1);
    expect(list.find((addr) => addr.isDefault)?.id).toBe(earliestOther.id);
  });

  it("删除默认地址后自动指定最早一条为默认", () => {
    const list = service.listAddresses(userId);
    const currentDefault = list.find((addr) => addr.isDefault)!;
    const restEarliest = [...list].filter((a) => a.id !== currentDefault.id).sort((x, y) => x.id - y.id)[0]!;
    service.deleteAddress(userId, currentDefault.id);
    const after = service.listAddresses(userId);
    expect(after.find((addr) => addr.isDefault)?.id).toBe(restEarliest.id);
  });

  it("setDefaultAddress 幂等切换", () => {
    const list = service.listAddresses(userId);
    const target = list[list.length - 1]!;
    const result = service.setDefaultAddress(userId, target.id);
    expect(result.isDefault).toBe(true);
    expect(service.listAddresses(userId).filter((a) => a.isDefault)).toHaveLength(1);
  });

  it("不同用户的默认地址互不影响", () => {
    const other = service.createAddress(otherUserId, input("201", true));
    expect(other.isDefault).toBe(true);
    const mine = service.listAddresses(userId).filter((a) => a.isDefault);
    expect(mine).toHaveLength(1);
  });
});

describe("归属与边界", () => {
  it("操作他人地址返回 ADDRESS_NOT_FOUND", () => {
    const mine = service.createAddress(userId, input("301", false));
    expect(() => service.updateAddress(otherUserId, mine.id, input("302", false))).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.ADDRESS_NOT_FOUND })
    );
    expect(() => service.deleteAddress(otherUserId, mine.id)).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.ADDRESS_NOT_FOUND })
    );
    expect(() => service.setDefaultAddress(otherUserId, mine.id)).toThrowError(
      expect.objectContaining({ code: ERROR_CODES.ADDRESS_NOT_FOUND })
    );
  });

  it("列表按默认优先 + id 升序", () => {
    service.createAddress(userId, input("401", false));
    const list = service.listAddresses(userId);
    expect(list[0]!.isDefault).toBe(true);
    const restIds = list.slice(1).map((addr) => addr.id);
    expect([...restIds].sort((x, y) => x - y)).toEqual(restIds);
  });
});
