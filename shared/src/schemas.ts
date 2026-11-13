// 入参校验 schema：前端表单与后端 controller 共用同一份（ARCHITECTURE §7）
import { z } from "zod";
import type { OrderStatus } from "./order-status.js";
import { ORDER_STATUSES } from "./order-status.js";

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "用户名至少 2 个字符")
  .max(20, "用户名最多 20 个字符");

export const passwordSchema = z
  .string()
  .min(6, "密码至少 6 位")
  .max(32, "密码最多 32 位");

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const phoneSchema = z.string().regex(/^1\d{10}$/, "手机号格式不正确");

export const addressSchema = z.object({
  receiver: z.string().trim().min(1, "请填写收货人").max(20),
  phone: phoneSchema,
  building: z.string().trim().min(1, "请填写宿舍楼").max(30),
  room: z.string().trim().min(1, "请填写房间号").max(30),
  isDefault: z.boolean().optional().default(false),
});

export const createOrderSchema = z.object({
  addressId: z.number().int().positive(),
  remark: z.string().trim().max(100, "备注最多 100 字").optional().default(""),
  items: z
    .array(
      z.object({
        dishId: z.number().int().positive(),
        quantity: z.number().int().min(1, "数量至少 1").max(99, "单菜最多 99 份"),
      })
    )
    .min(1, "购物车为空")
    .max(50),
});

export const transitionSchema = z.object({
  to: z.enum(ORDER_STATUSES as unknown as [OrderStatus, ...OrderStatus[]]),
});

// —— 管理后台 upsert schema（价格以分传入，客户端完成元→分换算） ——
export const shopUpsertSchema = z.object({
  name: z.string().trim().min(1, "请填写店名").max(30),
  categoryId: z.number().int().positive(),
  description: z.string().trim().max(200).optional().default(""),
  minPriceCents: z.number().int().min(0).max(100000),
  deliveryFeeCents: z.number().int().min(0).max(20000),
  logoUrl: z.string().trim().max(200).nullish(),
  isActive: z.boolean().optional().default(true),
});

export const dishUpsertSchema = z.object({
  shopId: z.number().int().positive(),
  name: z.string().trim().min(1, "请填写菜名").max(30),
  dishGroup: z.string().trim().min(1, "请选择菜品分类").max(20),
  priceCents: z.number().int().min(0).max(100000),
  imageUrl: z.string().trim().max(200).nullish(),
  isActive: z.boolean().optional().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "请填写分类名").max(10),
});

export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// 供后端 params 校验使用
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const orderStatusQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "all" || (ORDER_STATUSES as readonly string[]).includes(v), {
      message: "非法订单状态",
    }),
});
