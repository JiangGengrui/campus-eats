import type { ApiResponse } from "@xiaowei/shared";
import type { AuthUser } from "../stores/auth.js";
import { http } from "./client.js";

interface LoginData {
  token: string;
  user: AuthUser;
}

export async function register(username: string, password: string): Promise<LoginData> {
  const response = await http.post<ApiResponse<LoginData>>("/auth/register", { username, password });
  return response.data.data;
}

export async function login(username: string, password: string): Promise<LoginData> {
  const response = await http.post<ApiResponse<LoginData>>("/auth/login", { username, password });
  return response.data.data;
}

export async function adminLogin(username: string, password: string): Promise<LoginData> {
  const response = await http.post<ApiResponse<LoginData>>("/admin/auth/login", { username, password });
  return response.data.data;
}
