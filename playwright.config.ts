// Playwright E2E 配置（SPEC M4 验收）：自动起 server（先 seed）+ client 生产构建预览
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000, // 复杂用例含多页跳转与双端同步，留足余量
  retries: 1,
  workers: 1, // 共享同一数据库，串行避免用例间相互影响
  expect: { timeout: 8_000 },
  // trace/screenshot 写系统临时目录：仓库位于 OneDrive 同步盘，流式写入会被同步阻塞拖慢用例
  outputDir: path.join(os.tmpdir(), "xiaowei-e2e"),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      // seed 幂等重建，保证每次验收跑在同一初始数据上（SPEC F8）
      command: "npm run seed -w server && npm run dev -w server",
      url: "http://localhost:3000/api/health",
      env: { RATE_LIMIT_DISABLED: "on" }, // E2E 反复登录，关闭限流（限流由集成测试覆盖）
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // 生产构建 + preview：dev 模式每个新 context 冷拉数百个 ESM 模块（单页≈10s）会导致超时
      command: "npm run build -w client && npm run preview -w client",
      url: "http://localhost:5173",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
