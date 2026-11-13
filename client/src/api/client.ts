// axios 单例：统一注入 token / 解包响应壳 / 401 处理（CODEBUDDY §6）
import axios from "axios";
import type { AxiosError } from "axios";
import type { ApiResponse } from "@xiaowei/shared";
import { useAuthStore } from "../stores/auth.js";

export const http = axios.create({ baseURL: "/api", timeout: 10_000 });

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token !== null) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status;
    if (status === 401) {
      useAuthStore.getState().clear();
      if (!window.location.pathname.startsWith("/login")) {
        // 用 URLSearchParams 拼 query，避免 /login?admin=1 再拼 ?redirect= 出现双问号
        const params = new URLSearchParams();
        if (window.location.pathname.startsWith("/admin")) {
          params.set("admin", "1");
        }
        params.set("redirect", window.location.pathname + window.location.search);
        window.location.assign(`/login?${params.toString()}`);
      }
    }
    return Promise.reject(error);
  }
);

/** 解包响应壳，业务错误时抛出带 code/message 的异常 */
export async function request<T>(config: Parameters<typeof http.request>[0]): Promise<T> {
  const response = await http.request<ApiResponse<T>>(config);
  const body = response.data;
  if (body.code !== 0) {
    throw Object.assign(new Error(body.message), { code: body.code });
  }
  return body.data;
}
