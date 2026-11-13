// API 集成测试（supertest）：响应壳 / 鉴权分层 401-403 / 校验码 / 软删除可见性 / 上传魔数
import request from "supertest";
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { loadDb } from "./helpers.js";

const db = await loadDb();
const { app } = await import("../src/app.js");

// —— fixture ——
const categoryId = Number(db.prepare("INSERT INTO shop_categories (name) VALUES ('奶茶')").run().lastInsertRowid);
const insertShop = db.prepare(`
  INSERT INTO shops (name, logo_url, description, category_id, min_price_cents, delivery_fee_cents, rating, monthly_sales, is_active)
  VALUES (?, NULL, '', ?, 1000, 100, 4.8, 100, ?)`);
const shopAId = Number(insertShop.run("茶百道", categoryId, 1).lastInsertRowid);
const shopOffId = Number(insertShop.run("已下架店", categoryId, 0).lastInsertRowid);
const insertDish = db.prepare(`
  INSERT INTO dishes (shop_id, name, image_url, price_cents, dish_group, monthly_sales, is_active)
  VALUES (?, ?, NULL, ?, '招牌', 10, ?)`);
const dishA1 = Number(insertDish.run(shopAId, "珍珠奶茶", 1200, 1).lastInsertRowid);
insertDish.run(shopAId, "下架菜品", 500, 0);
const adminHash = bcrypt.hashSync("admin123", 4);
db.prepare("INSERT INTO admins (username, password_hash) VALUES ('admin', ?)").run(adminHash);

let userSeq = 0;
async function userToken(): Promise<string> {
  userSeq += 1;
  const res = await request(app).post("/api/auth/register").send({ username: `student${userSeq}`, password: "123456" });
  return res.body.data.token as string;
}

async function adminToken(): Promise<string> {
  const res = await request(app).post("/api/admin/auth/login").send({ username: "admin", password: "admin123" });
  return res.body.data.token as string;
}

describe("响应壳与注册登录", () => {
  it("注册成功返回统一响应壳 code=0 + 201", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "newbie", password: "123456" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ code: 0, message: "ok" });
    expect(res.body.data.user.role).toBe("user");
  });

  it("重复用户名 409/1001；错误密码 401/1002", async () => {
    const dup = await request(app).post("/api/auth/register").send({ username: "newbie", password: "123456" });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe(1001);
    const bad = await request(app).post("/api/auth/login").send({ username: "newbie", password: "wrong" });
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe(1002);
  });

  it("非法 JSON 请求体返回 400/1003", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not-json");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(1003);
  });

  it("不存在的接口返回 404/4040", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(4040);
  });
});

describe("公开浏览接口（SPEC F2.3 软删除不可见）", () => {
  it("店铺列表只含营业中店铺", async () => {
    const res = await request(app).get("/api/shops");
    expect(res.status).toBe(200);
    const ids = res.body.data.map((s: { id: number }) => s.id);
    expect(ids).toContain(shopAId);
    expect(ids).not.toContain(shopOffId);
  });

  it("店铺详情排除已下架菜品", async () => {
    const res = await request(app).get(`/api/shops/${shopAId}`);
    const groups = Object.values(res.body.data.dishGroups).flat() as { name: string }[];
    expect(groups.some((d) => d.name === "珍珠奶茶")).toBe(true);
    expect(groups.some((d) => d.name === "下架菜品")).toBe(false);
  });

  it("已下架店铺详情返回 404", async () => {
    const res = await request(app).get(`/api/shops/${shopOffId}`);
    expect(res.status).toBe(404);
  });

  it("搜索：命中返回；LIKE 通配符按字面匹配（% 不再匹配全部）", async () => {
    const hit = await request(app).get("/api/shops/search").query({ keyword: "奶茶" });
    expect(hit.body.data.shops.length + hit.body.data.dishes.length).toBeGreaterThan(0);
    const wildcard = await request(app).get("/api/shops/search").query({ keyword: "%" });
    expect(wildcard.body.data.shops).toHaveLength(0);
    expect(wildcard.body.data.dishes).toHaveLength(0);
  });
});

describe("鉴权分层（SPEC F1.4 / F7.6）", () => {
  it("未带 token 访问受保护接口返回 401", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(1004);
  });

  it("用户 token 访问后台接口返回 403（不是 401）", async () => {
    const token = await userToken();
    const res = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(4001);
  });

  it("普通接口接受 admin token（403 分层正确）", async () => {
    const token = await adminToken();
    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("下单闭环（HTTP 层）", () => {
  it("完整链路：建地址 → 下单 → 列表可见 → 取消 → 重复取消 409/3001", async () => {
    const token = await userToken();
    const addr = await request(app)
      .post("/api/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({ receiver: "张三", phone: "13812345678", building: "1 号楼", room: "101", isDefault: true });
    expect(addr.status).toBe(201);

    const created = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ addressId: addr.body.data.id, remark: "少冰", items: [{ dishId: dishA1, quantity: 2 }] });
    expect(created.status).toBe(201);
    expect(created.body.data.totalCents).toBe(2500); // 1200*2 + 配送费 100

    const list = await request(app).get("/api/orders?status=paid").set("Authorization", `Bearer ${token}`);
    expect(list.body.data.list.some((o: { id: number }) => o.id === created.body.data.orderId)).toBe(true);

    const cancelled = await request(app)
      .post(`/api/orders/${created.body.data.orderId}/cancel`)
      .set("Authorization", `Bearer ${token}`);
    expect(cancelled.status).toBe(200);

    const again = await request(app)
      .post(`/api/orders/${created.body.data.orderId}/cancel`)
      .set("Authorization", `Bearer ${token}`);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe(3001);
  });

  it("空 items 被 zod 拦截 400/1003", async () => {
    const token = await userToken();
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ addressId: 1, items: [] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(1003);
  });
});

describe("管理后台（SPEC F7）", () => {
  it("管理员推进订单：接单 → 送达；跳序被拒", async () => {
    const user = await userToken();
    const addr = await request(app)
      .post("/api/addresses")
      .set("Authorization", `Bearer ${user}`)
      .send({ receiver: "李四", phone: "13912345678", building: "2 号楼", room: "202" });
    const created = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${user}`)
      .send({ addressId: addr.body.data.id, items: [{ dishId: dishA1, quantity: 1 }] });
    const admin = await adminToken();

    const skip = await request(app)
      .post(`/api/admin/orders/${created.body.data.orderId}/transition`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ to: "completed" });
    expect(skip.status).toBe(409);
    expect(skip.body.code).toBe(3001);

    const accept = await request(app)
      .post(`/api/admin/orders/${created.body.data.orderId}/transition`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ to: "delivering" });
    expect(accept.status).toBe(200);

    const deliver = await request(app)
      .post(`/api/admin/orders/${created.body.data.orderId}/transition`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ to: "completed" });
    expect(deliver.status).toBe(200);
  });

  it("上传魔数校验：伪造图片内容被拒 5001，真实 PNG 头通过", async () => {
    const admin = await adminToken();
    const fake = await request(app)
      .post("/api/admin/upload")
      .set("Authorization", `Bearer ${admin}`)
      .attach("file", Buffer.from("this is not an image"), "fake.jpg");
    expect(fake.status).toBe(400);
    expect(fake.body.code).toBe(5001);

    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
    const real = await request(app)
      .post("/api/admin/upload")
      .set("Authorization", `Bearer ${admin}`)
      .attach("file", pngHeader, "real.png");
    expect(real.status).toBe(201);
    expect(real.body.data.url).toMatch(/^\/uploads\/.+\.png$/);
  });

  it("非图片扩展名在 fileFilter 被拒 400/5001", async () => {
    const admin = await adminToken();
    const res = await request(app)
      .post("/api/admin/upload")
      .set("Authorization", `Bearer ${admin}`)
      .attach("file", Buffer.from("x"), "evil.exe");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(5001);
  });
});
