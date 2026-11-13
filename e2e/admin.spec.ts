// E2E 管理端流程：登录守卫、看板推进、用户端同步（SPEC F7 验收句）
import { expect, test } from "@playwright/test";
import { loginAdmin, registerUser } from "./helpers";

test.describe("后台守卫（SPEC F7.6）", () => {
  test("未登录访问 /admin 跳管理员登录入口", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/login\?admin=1/);
    await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  });

  test("普通用户访问 /admin 不进入后台", async ({ page }) => {
    await registerUser(page);
    await page.goto("/admin/orders");
    // 前端守卫把非管理员挡在登录入口
    await expect(page).toHaveURL(/\/login\?admin=1/);
  });
});

test.describe("订单看板（SPEC F7.4）", () => {
  test("管理员接单 → 送达，用户端状态与时间线同步；终态按钮禁用", async ({ page, browser }) => {
    // 用户端下一单
    await registerUser(page);
    await page.locator(".shop-list .shop-row", { hasText: "茶百道" }).first().click();
    await page.getByRole("button", { name: /加入购物车：珍珠奶茶/ }).click();
    await page.getByRole("link", { name: "去结算" }).click();
    await page.getByRole("link", { name: "去新增一个" }).click();
    await page.locator("#receiver").fill("王五");
    await page.locator("#phone").fill("13712345678");
    await page.locator("#building").fill("3 号宿舍楼");
    await page.locator("#room").fill("301");
    await page.getByRole("button", { name: "保存地址" }).click();
    await expect(page.locator(".addr-card")).toHaveCount(1);
    // 购物车仅存内存（SPEC F4.3），必须走站内跳转，整页刷新会清空
    await page.locator(".cart-link").click();
    await expect(page).toHaveURL(/\/checkout/);
    await page.getByRole("button", { name: /模拟支付/ }).click();
    await expect(page).toHaveURL(/\/orders\/\d+\?created=1/);

    // 管理端推进（独立上下文，避免互相顶掉登录态）
    const adminPage = await (await browser.newContext()).newPage();
    await loginAdmin(adminPage);
    // 按收货人锁定本单卡片（seed 历史订单可能还有其他待接单，不能整列断言）
    const paidCol = adminPage.locator(".kan-col", { hasText: "待接单" });
    const ourCard = paidCol.locator(".kan-card", { hasText: "王五" });
    await expect(ourCard).toBeVisible();
    await ourCard.getByRole("button", { name: "接单" }).click();
    await expect(ourCard).toHaveCount(0);

    // 用户端刷新同步为配送中（页面已在该订单详情）
    await page.reload();
    await expect(page.locator(".stamp").first()).toHaveText("配送中");

    // 管理端送达
    const delivCol = adminPage.locator(".kan-col", { hasText: "配送中" });
    const movingCard = delivCol.locator(".kan-card", { hasText: "王五" });
    await movingCard.getByRole("button", { name: "送达" }).click();
    await expect(movingCard).toHaveCount(0);

    // 用户端同步为已完成，时间线全亮，无取消按钮
    await page.reload();
    await expect(page.locator(".stamp").first()).toHaveText("已完成");
    expect(await page.locator(".timeline li.on").count()).toBe(5);
    await expect(page.getByRole("button", { name: "取消订单" })).toHaveCount(0);

    // 管理端已完成列：本单「已完结」禁用（无可用操作）
    const doneCol = adminPage.locator(".kan-col", { hasText: "已完成" });
    await expect(doneCol.locator(".kan-card", { hasText: "王五" }).getByRole("button", { name: "已完结" })).toBeDisabled();
    await adminPage.context().close();
  });

  test("看板四列对应状态机四态", async ({ page }) => {
    await loginAdmin(page);
    const heads = await page.locator(".kan-head").allTextContents();
    for (const label of ["待接单", "配送中", "已完成", "已取消"]) {
      expect(heads.some((h) => h.includes(label))).toBe(true);
    }
  });
});
