// E2E 公共步骤：用户注册/登录、管理员登录（演示账号见 SPEC F8）
import type { Page } from "@playwright/test";

let seq = 0;

/** 注册全新用户并回到指定页面（注册成功自动登录） */
export async function registerUser(page: Page, redirect = "/"): Promise<string> {
  seq += 1;
  const username = `e2e_${Date.now()}_${seq}`;
  await page.goto("/login");
  await page.getByText("注册一个").click();
  await page.locator("#username").fill(username);
  await page.locator("#password").fill("123456");
  await page.getByRole("button", { name: "注册并登录" }).click();
  await page.waitForURL(`**${redirect}`);
  return username;
}

export async function loginUser(page: Page, username: string, password = "123456"): Promise<void> {
  await page.goto("/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** 管理员登录（admin / 123456，SPEC F8） */
export async function loginAdmin(page: Page): Promise<void> {
  await page.goto("/login?admin=1");
  await page.locator("#username").fill("admin");
  await page.locator("#password").fill("123456");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL("**/admin/orders");
}
