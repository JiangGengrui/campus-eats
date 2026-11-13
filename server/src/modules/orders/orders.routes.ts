import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as controller from "./orders.controller.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);
ordersRouter.post("/", controller.create);
ordersRouter.get("/", controller.list);
ordersRouter.get("/:id", controller.detail);
ordersRouter.post("/:id/cancel", controller.cancel);

// 管理端接口（adminList/transition）：由 adminRouter 的 requireAdmin 统一守卫（ARCHITECTURE §6）
export const adminOrdersRouter = Router();
adminOrdersRouter.get("/", controller.adminList);
adminOrdersRouter.post("/:id/transition", controller.transition);
