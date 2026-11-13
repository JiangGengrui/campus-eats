// seed 幂等与规格符合性（SPEC F8）：空库执行成功、重复执行清库重建、数据量达验收下限
import { describe, expect, it, vi } from "vitest";
import { loadDb } from "./helpers.js";

const db = await loadDb();

function counts() {
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    categories: one("SELECT COUNT(*) AS n FROM shop_categories"),
    shops: one("SELECT COUNT(*) AS n FROM shops"),
    dishes: one("SELECT COUNT(*) AS n FROM dishes"),
    users: one("SELECT COUNT(*) AS n FROM users"),
    admins: one("SELECT COUNT(*) AS n FROM admins"),
    orders: one("SELECT COUNT(*) AS n FROM orders"),
    orderItems: one("SELECT COUNT(*) AS n FROM order_items"),
  };
}

describe("seed（SPEC F8）", () => {
  it("空库执行一次成功且达到验收下限（8 店 / 5+ 分类 / 每店 10+ 菜品 / 2 用户 / 1 管理员 / 30 天 300+ 单）", async () => {
    await import("../src/seed/seed.js"); // 模块顶层执行 seedAll
    const c = counts();
    expect(c.shops).toBeGreaterThanOrEqual(8);
    expect(c.categories).toBeGreaterThanOrEqual(5);
    expect(c.users).toBeGreaterThanOrEqual(2);
    expect(c.admins).toBeGreaterThanOrEqual(1);
    expect(c.orders).toBeGreaterThanOrEqual(300);
    expect(c.orderItems).toBeGreaterThanOrEqual(c.orders); // 每单至少 1 行明细

    const minDishesPerShop = (
      db.prepare("SELECT MIN(cnt) AS m FROM (SELECT COUNT(*) AS cnt FROM dishes GROUP BY shop_id)").get() as { m: number }
    ).m;
    expect(minDishesPerShop).toBeGreaterThanOrEqual(10);

    // 近 30 天：最早订单不早于 30 天前
    const earliest = (db.prepare("SELECT MIN(created_at) AS t FROM orders").get() as { t: string }).t;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    expect(new Date(earliest.replace(" ", "T")) >= thirtyDaysAgo).toBe(true);
  });

  it("演示账号密码为哈希非明文", () => {
    const row = db.prepare("SELECT password_hash FROM users WHERE username = 'zhangsan'").get() as
      | { password_hash: string }
      | undefined;
    expect(row).toBeDefined();
    expect(row!.password_hash).not.toBe("123456");
    expect(row!.password_hash.startsWith("$2")).toBe(true);
  });

  it("重复执行清库重建成功：固定实体数量一致，历史订单重新随机但仍达下限（幂等）", async () => {
    const first = counts();
    vi.resetModules(); // 清模块缓存，让 seed 模块再次执行
    await import("../src/seed/seed.js");
    const second = counts();
    // 固定实体必须精确一致；订单数每次随机生成，只要求仍达 SPEC 下限且不重复累积
    expect(second.categories).toBe(first.categories);
    expect(second.shops).toBe(first.shops);
    expect(second.users).toBe(first.users);
    expect(second.admins).toBe(first.admins);
    expect(second.orders).toBeGreaterThanOrEqual(300);
    expect(second.orders).toBeLessThan(first.orders * 1.2); // 清库重建而非累加
  });
});
