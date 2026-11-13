// Express 应用装配（与监听分离：index.ts 负责 listen，supertest 直接挂 app）
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { db } from "./db/connection.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { adminAuthRouter, authRouter } from "./modules/auth/auth.routes.js";
import { addressesRouter } from "./modules/addresses/addresses.routes.js";
import { shopsRouter } from "./modules/shops/shops.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

export const app = express();

// 云托管经网关单跳转发：信任第一层代理后 req.ip 才是真实客户端，
// 否则所有访客共用一个网关地址，登录限流会退化成全站共用配额
app.set("trust proxy", 1);

// 云端部署时由本进程同域托管前端构建产物，默认 CSP 会拦截 Vite 预加载脚本与内联样式，故关闭
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(config.isProduction ? "combined" : "dev"));

// 图片静态托管（multer 落盘点，ARCHITECTURE §6）
app.use("/uploads", express.static(path.resolve(config.uploadDir)));

// 健康检查：db 探活用 SELECT 1（ARCHITECTURE §6b）
app.get("/api/health", (_req, res) => {
  const row = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
  res.json({ code: 0, message: "ok", data: { db: row?.ok === 1 ? "up" : "down", uptime: process.uptime() } });
});

app.use("/api/auth", authRouter);
app.use("/api/admin/auth", adminAuthRouter);
app.use("/api/addresses", addressesRouter);
app.use("/api/shops", shopsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);

// 生产部署：同域托管 client/dist（构建产物），SPA 深链接回退到 index.html
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log(`[server] 已托管前端构建产物：${clientDist}`);
}

app.use(notFoundHandler);
app.use(errorHandler);
