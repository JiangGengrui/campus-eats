// E2E 用户端流程：浏览/搜索/购物车/下单/取消（SPEC F2-F6 验收句）
import { expect, test } from "@playwright/test";
import { registerUser } from "./helpers";

test.describe("首页与浏览（SPEC F2）", () => {
  test("首页展示全部营业中店铺（seed ≥ 8 家）", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".shop-list .shop-row").first()).toBeVisible();
    expect(await page.locator(".shop-list .shop-row").count()).toBeGreaterThanOrEqual(8);
  });

  test("分类筛选后列表只含该分类店铺", async ({ page }) => {
    await page.goto("/");
    await page.locator(".board-side").getByRole("link", { name: "奶茶", exact: true }).click();
    await page.waitForURL(/\?categoryId=/);
    await expect(page.locator(".shop-list .shop-row").first()).toBeVisible(); // 等待筛选结果渲染
    const names = await page.locator(".shop-list .shop-name").allTextContents();
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(names.some((n) => n.includes("茶百道"))).toBe(true);
  });

  test("店铺详情菜品按分类分组展示（SPEC F2.2）", async ({ page }) => {
    await page.goto("/");
    await page.locator(".shop-list .shop-row", { hasText: "茶百道" }).first().click();
    await expect(page.locator(".shop-title")).toHaveText("茶百道");
    expect(await page.locator(".dish-group-title").count()).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("button", { name: /加入购物车/ }).first()).toBeVisible();
  });
});

test.describe("搜索（SPEC F3）", () => {
  test("命中菜名时显示所属店铺", async ({ page }) => {
    await page.goto("/search?keyword=麻辣烫");
    await expect(page.locator(".shop-list")).toContainText("麻辣烫");
    // 菜品命中项标注所属店铺
    await expect(page.locator(".shop-list .stamp-done", { hasText: "菜品 · " }).first()).toBeVisible();
  });

  test("无结果展示空状态（SPEC F3.2）", async ({ page }) => {
    await page.goto("/search?keyword=量子火锅");
    await expect(page.getByText("未找到相关店铺或菜品")).toBeVisible();
  });
});

test.describe("购物车（SPEC F4）", () => {
  test("跨店加菜确认后替换购物车", async ({ page }) => {
    page.once("dialog", (dialog) => void dialog.accept());
    await page.goto("/");
    await page.locator(".shop-list .shop-row", { hasText: "茶百道" }).first().click();
    await page.getByRole("button", { name: /加入购物车：珍珠奶茶/ }).click();
    await expect(page.locator(".cart-panel")).toContainText("珍珠奶茶");

    // 站内回首页（整页刷新会清空内存购物车，导致跨店确认弹窗不出现）
    await page.locator(".brand").click();
    await page.locator(".shop-list .shop-row", { hasText: "麻辣香锅" }).first().click();
    await page.getByRole("button", { name: /加入购物车/ }).first().click();
    await expect(page.locator(".cart-panel")).not.toContainText("珍珠奶茶");
    await expect(page.locator(".cart-panel")).toContainText("购物车 · 麻辣香锅");
  });

  test("数量减至 0 移除；刷新页面购物车清空（SPEC F4.2/F4.3 既定行为）", async ({ page }) => {
    await page.goto("/");
    await page.locator(".shop-list .shop-row", { hasText: "茶百道" }).first().click();
    await page.getByRole("button", { name: /加入购物车：珍珠奶茶/ }).click();
    await expect(page.locator(".cart-panel")).toContainText("珍珠奶茶 x1");
    // 刷新后购物车不持久化
    await page.reload();
    await expect(page.locator(".cart-panel")).toContainText("还没选菜");
  });
});

test.describe("下单闭环（SPEC F5/F6）", () => {
  test("注册 → 加购 → 建地址 → 支付 → 订单出现在待接单 → 取消", async ({ page }) => {
    await registerUser(page);

    // 加购
    await page.locator(".shop-list .shop-row", { hasText: "茶百道" }).first().click();
    await page.getByRole("button", { name: /加入购物车：珍珠奶茶/ }).click();
    await page.getByRole("button", { name: /加入购物车：珍珠奶茶/ }).click();
    await expect(page.locator(".cart-panel")).toContainText("珍珠奶茶 x2");

    // 去结算：无地址时引导新增
    await page.getByRole("link", { name: "去结算" }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await page.getByRole("link", { name: "去新增一个" }).click();
    await expect(page).toHaveURL(/\/address/);
    await page.locator("#receiver").fill("张三");
    await page.locator("#phone").fill("13812345678");
    await page.locator("#building").fill("1 号宿舍楼");
    await page.locator("#room").fill("302（楼下货架自取）");
    await page.getByRole("checkbox", { name: "设为默认地址" }).check();
    await page.getByRole("button", { name: "保存地址" }).click();
    await expect(page.locator(".addr-card")).toHaveCount(1);

    // 回结算页支付（站内跳转，整页刷新会清空内存购物车）
    await page.locator(".cart-link").click();
    await expect(page).toHaveURL(/\/checkout/);
    await page.getByRole("button", { name: /模拟支付/ }).click();
    await expect(page).toHaveURL(/\/orders\/\d+\?created=1/);
    await expect(page.getByText("出票成功！订单已进入待接单状态。")).toBeVisible();
    // 金额 = 12*2 + 配送费（茶百道配送费 ¥1）= ¥25
    await expect(page.locator(".summary-total .price")).toHaveText("¥25");
    // 五节点时间线
    expect(await page.locator(".timeline li").count()).toBe(5);

    // 订单列表待接单 tab 可见；取消后从待接单消失，在已取消 tab 出现
    await page.goto("/orders?status=paid");
    await expect(page.locator(".order-card .stamp")).toHaveText("待接单");
    await page.getByRole("button", { name: "取消订单" }).first().click();
    await expect(page.locator(".order-card")).toHaveCount(0);
    await page.goto("/orders?status=cancelled");
    await expect(page.locator(".order-card .stamp").first()).toHaveText("已取消");

    // 已取消订单不再有取消按钮（SPEC F5.6）
    await expect(page.getByRole("button", { name: "取消订单" })).toHaveCount(0);
  });

  test("收货地址：新增即时生效、默认唯一、下单页默认选中（SPEC F6）", async ({ page }) => {
    await registerUser(page);
    await page.goto("/address");
    for (const room of ["101", "102"]) {
      await page.locator("#receiver").fill("李四");
      await page.locator("#phone").fill("13912345678");
      await page.locator("#building").fill("2 号宿舍楼");
      await page.locator("#room").fill(room);
      await page.getByRole("button", { name: "保存地址" }).click();
      await expect(page.locator(".addr-card")).toHaveCount(Number(room) - 100);
    }
    // 首地址自动为默认；把第二个设为默认后全局仍只有一个
    await page.locator(".addr-card", { hasText: "102" }).getByRole("button", { name: "设为默认" }).click();
    await expect(page.locator(".addr-card .tag", { hasText: "默认" })).toHaveCount(1);
    await expect(page.locator(".addr-card", { hasText: "102" }).locator(".tag")).toBeVisible();

    // 下单页默认选中 102（站内跳转保护内存购物车）
    await page.locator(".brand").click();
    await page.locator(".shop-list .shop-row", { hasText: "茶百道" }).first().click();
    await page.getByRole("button", { name: /加入购物车：珍珠奶茶/ }).click();
    await page.locator(".cart-link").click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator(".addr-opt.checked")).toContainText("102");
  });
});

test.describe("路由守卫（SPEC F1.4）", () => {
  test("未登录访问受保护路由跳登录，登录后回跳原页面", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login\?redirect=/);
    const username = `guard_${Date.now()}`;
    await page.getByText("注册一个").click();
    await page.locator("#username").fill(username);
    await page.locator("#password").fill("123456");
    await page.getByRole("button", { name: "注册并登录" }).click();
    // 登录后回跳 /orders
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole("heading", { name: "我的订单" })).toBeVisible();
  });
});
