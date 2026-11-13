// 服务端启动入口：监听 + 优雅退出 + P1.2 自动接单定时器（应用装配见 app.ts）
import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db/connection.js";
import { ensureSeedData } from "./seed/auto-seed.js";
import * as orderService from "./modules/orders/orders.service.js";

// 部署自举：空库自动灌演示数据（本地已有数据的库不会被改动）
if (config.autoSeed) {
  await ensureSeedData();
}

const server = app.listen(config.port, () => {
  console.log(`[server] 校味 API 已启动：http://localhost:${config.port}`);
});

// 滚动更新/缩容时平台发 SIGTERM：先停止接收新请求，再 checkpoint 并关闭数据库，最后退出
let closing = false;
function shutdown(signal: string): void {
  if (closing) {
    return;
  }
  closing = true;
  console.log(`[server] 收到 ${signal}，停止接收新请求`);
  server.close(() => {
    db.close();
    console.log("[server] 数据库连接已关闭，退出");
    process.exit(0);
  });
  // 兜底：10 秒内未排空则强制结束，避免平台等待超时直接 SIGKILL
  setTimeout(() => {
    console.error("[server] 优雅退出超时，强制结束");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// P1.2 模拟自动接单（SPEC P1.2，默认关，.env AUTO_ACCEPT_ENABLED=on 开启）
// 推进逻辑收敛在 OrderService.autoAdvanceOldestOrder（CODEBUDDY §4 推进入口唯一）
if (config.autoAcceptEnabled) {
  const timer = setInterval(() => {
    try {
      if (orderService.autoAdvanceOldestOrder()) {
        console.log("[auto-accept] 已推进一单");
      }
    } catch (err) {
      console.error("[auto-accept] 推进失败：", err);
    }
  }, config.autoAcceptIntervalSeconds * 1000);
  timer.unref();
}
