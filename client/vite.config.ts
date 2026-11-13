import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 开发期代理：/api 与 /uploads 转发到 Express（ARCHITECTURE §2）
const proxy = {
  "/api": "http://localhost:3000",
  "/uploads": "http://localhost:3000",
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy,
  },
  // E2E 用生产构建产物（dev 模式下每个新浏览器上下文冷加载数百个 ESM 模块，单页约 10s）
  preview: {
    port: 5173,
    strictPort: true,
    proxy,
  },
});
