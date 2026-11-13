// 订单控制器：zod 校验 + 响应壳
import type { Request, Response } from "express";
import {
  createOrderSchema,
  idParamSchema,
  isOrderStatus,
  orderStatusQuerySchema,
  pageSchema,
  transitionSchema,
} from "@xiaowei/shared";
import type { OrderStatus } from "@xiaowei/shared";
import * as service from "./orders.service.js";

function toStatusFilter(status: string | undefined): OrderStatus | null {
  return status !== undefined && status !== "all" && isOrderStatus(status) ? status : null;
}

export function create(req: Request, res: Response): void {
  const input = createOrderSchema.parse(req.body);
  const result = service.createOrder(req.auth!.uid, input);
  res.status(201).json({ code: 0, message: "ok", data: result });
}

export function list(req: Request, res: Response): void {
  const { status } = orderStatusQuerySchema.parse(req.query);
  const { page, pageSize } = pageSchema.parse(req.query);
  res.json({ code: 0, message: "ok", data: service.listOrders(req.auth!.uid, toStatusFilter(status), page, pageSize) });
}

export function detail(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  res.json({ code: 0, message: "ok", data: service.getOrderDetail(req.auth!.uid, id) });
}

export function cancel(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  service.cancelOrder(req.auth!.uid, id);
  res.json({ code: 0, message: "ok", data: null });
}

export function adminList(req: Request, res: Response): void {
  const { status } = orderStatusQuerySchema.parse(req.query);
  const { page, pageSize } = pageSchema.parse(req.query);
  res.json({ code: 0, message: "ok", data: service.listOrdersForAdmin(toStatusFilter(status), page, pageSize) });
}

export function transition(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  const { to } = transitionSchema.parse(req.body);
  service.transitionOrder(id, to);
  res.json({ code: 0, message: "ok", data: null });
}
