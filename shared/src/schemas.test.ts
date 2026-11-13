// 入参校验单元测试：前后端共用 schema 的边界值
import { describe, expect, it } from "vitest";
import {
  addressSchema,
  createOrderSchema,
  idParamSchema,
  loginSchema,
  pageSchema,
  passwordSchema,
  phoneSchema,
  registerSchema,
  shopUpsertSchema,
  transitionSchema,
  usernameSchema,
} from "./schemas.js";

describe("账户 schema", () => {
  it("用户名 2-20 字符，超长拒绝", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(true);
    expect(usernameSchema.safeParse("a").success).toBe(false);
    expect(usernameSchema.safeParse("x".repeat(21)).success).toBe(false);
  });

  it("密码 6-32 位", () => {
    expect(passwordSchema.safeParse("123456").success).toBe(true);
    expect(passwordSchema.safeParse("12345").success).toBe(false);
  });

  it("注册入参会 trim 用户名", () => {
    const parsed = registerSchema.parse({ username: "  zhangsan  ", password: "123456" });
    expect(parsed.username).toBe("zhangsan");
  });
});

describe("地址 schema", () => {
  it("手机号必须是 1 开头的 11 位数字", () => {
    expect(phoneSchema.safeParse("13812345678").success).toBe(true);
    expect(phoneSchema.safeParse("23812345678").success).toBe(false);
    expect(phoneSchema.safeParse("1381234567").success).toBe(false);
    expect(phoneSchema.safeParse("13812345678a").success).toBe(false);
  });

  it("isDefault 缺省为 false", () => {
    const parsed = addressSchema.parse({ receiver: "张三", phone: "13812345678", building: "1 号楼", room: "101" });
    expect(parsed.isDefault).toBe(false);
  });
});

describe("下单 schema", () => {
  it("items 至少 1 项（空购物车拒绝）", () => {
    expect(createOrderSchema.safeParse({ addressId: 1, items: [] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ addressId: 1, items: [{ dishId: 1, quantity: 1 }] }).success).toBe(true);
  });

  it("数量 1-99，0 或 100 拒绝", () => {
    const base = { addressId: 1 };
    expect(createOrderSchema.safeParse({ ...base, items: [{ dishId: 1, quantity: 0 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, items: [{ dishId: 1, quantity: 100 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, items: [{ dishId: 1, quantity: 99 }] }).success).toBe(true);
  });

  it("remark 缺省为空串且超 100 字拒绝", () => {
    const parsed = createOrderSchema.parse({ addressId: 1, items: [{ dishId: 1, quantity: 1 }] });
    expect(parsed.remark).toBe("");
    expect(createOrderSchema.safeParse({ addressId: 1, remark: "x".repeat(101), items: [{ dishId: 1, quantity: 1 }] }).success).toBe(false);
  });
});

describe("后台 upsert schema", () => {
  it("金额为分且非负，有上限", () => {
    expect(shopUpsertSchema.safeParse({ name: "店", categoryId: 1, minPriceCents: 0, deliveryFeeCents: 0 }).success).toBe(true);
    expect(shopUpsertSchema.safeParse({ name: "店", categoryId: 1, minPriceCents: -1, deliveryFeeCents: 0 }).success).toBe(false);
    expect(shopUpsertSchema.safeParse({ name: "店", categoryId: 1, minPriceCents: 100001, deliveryFeeCents: 0 }).success).toBe(false);
  });
});

describe("其他 schema", () => {
  it("transitionSchema 只接受四态枚举", () => {
    expect(transitionSchema.safeParse({ to: "delivering" }).success).toBe(true);
    expect(transitionSchema.safeParse({ to: "pending" }).success).toBe(false);
  });

  it("pageSchema 默认 page=1 pageSize=10，pageSize 上限 50", () => {
    expect(pageSchema.parse({})).toEqual({ page: 1, pageSize: 10 });
    expect(pageSchema.safeParse({ pageSize: 51 }).success).toBe(false);
  });

  it("idParamSchema 用 coerce 接受字符串数字", () => {
    expect(idParamSchema.parse({ id: "12" }).id).toBe(12);
    expect(idParamSchema.safeParse({ id: "abc" }).success).toBe(false);
  });

  it("loginSchema 拒绝空密码", () => {
    expect(loginSchema.safeParse({ username: "a", password: "" }).success).toBe(false);
  });
});
