// 根 vitest 配置：shared 单元测试 + server 集成测试（CODEBUDDY：测试与门禁并列）
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // shared 以源码形态消费（与 tsconfig paths / 服务端运行时一致）
    alias: { "@xiaowei/shared": fileURLToPath(new URL("./shared/src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["shared/src/**/*.test.ts", "server/test/**/*.test.ts"],
    // 每个测试文件独立模块注册表（进程级），配合 helpers.ts 实现 DB 隔离
    pool: "forks",
  },
});
