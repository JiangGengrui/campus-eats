// 幂等 seed：清库重建（SPEC F8）。运行：npm run seed
import bcrypt from "bcryptjs";
import type { OrderStatus } from "@xiaowei/shared";
import { config } from "../config.js";
import { db } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { beijingDateTime } from "../utils/time.js";

runMigrations(db);

interface SeedDish {
  name: string;
  group: string;
  priceCents: number;
  sales: number;
}

interface SeedShop {
  name: string;
  category: string;
  description: string;
  minPriceCents: number;
  deliveryFeeCents: number;
  rating: number;
  monthlySales: number;
  dishes: SeedDish[];
}

const CATEGORIES = ["奶茶", "快餐", "面食", "烧烤", "甜品", "简餐"];

const SHOPS: SeedShop[] = [
  {
    name: "茶百道", category: "奶茶", description: "鲜果与茶，现摇现做", minPriceCents: 1000, deliveryFeeCents: 100, rating: 4.9, monthlySales: 888,
    dishes: [
      { name: "招牌杨枝甘露", group: "招牌", priceCents: 1600, sales: 312 },
      { name: "珍珠奶茶", group: "招牌", priceCents: 1200, sales: 203 },
      { name: "芋泥波波奶茶", group: "奶茶", priceCents: 1400, sales: 198 },
      { name: "豆乳玉麒麟", group: "奶茶", priceCents: 1300, sales: 121 },
      { name: "茉莉奶绿", group: "奶茶", priceCents: 1100, sales: 145 },
      { name: "黑糖波波鲜奶", group: "奶茶", priceCents: 1500, sales: 94 },
      { name: "满杯百香果", group: "果茶", priceCents: 1300, sales: 156 },
      { name: "草莓牛奶麻薯", group: "果茶", priceCents: 1500, sales: 98 },
      { name: "翡翠柠檬茶", group: "果茶", priceCents: 1200, sales: 110 },
      { name: "超级杯水果茶", group: "果茶", priceCents: 1700, sales: 87 },
      { name: "芋泥啵啵绿茶", group: "果茶", priceCents: 1400, sales: 102 },
      { name: "双拼奶茶", group: "奶茶", priceCents: 1200, sales: 133 },
    ],
  },
  {
    name: "麻辣香锅小灶", category: "快餐", description: "自选称重，现炒出锅", minPriceCents: 1500, deliveryFeeCents: 200, rating: 4.8, monthlySales: 999,
    dishes: [
      { name: "自选麻辣烫", group: "招牌", priceCents: 1600, sales: 287 },
      { name: "麻辣拌", group: "招牌", priceCents: 1300, sales: 187 },
      { name: "香锅肥牛煲", group: "香锅", priceCents: 2600, sales: 121 },
      { name: "香锅虾滑煲", group: "香锅", priceCents: 2800, sales: 98 },
      { name: "午餐肉拼盘", group: "加料", priceCents: 600, sales: 154 },
      { name: "宽粉加份", group: "加料", priceCents: 300, sales: 231 },
      { name: "鹌鹑蛋加份", group: "加料", priceCents: 400, sales: 176 },
      { name: "冰镇酸梅汤", group: "饮品", priceCents: 600, sales: 143 },
      { name: "米饭", group: "主食", priceCents: 200, sales: 402 },
      { name: "番茄浓汤", group: "饮品", priceCents: 500, sales: 88 },
    ],
  },
  {
    name: "兰州拉面", category: "面食", description: "一清二白三红四绿", minPriceCents: 1200, deliveryFeeCents: 100, rating: 4.7, monthlySales: 666,
    dishes: [
      { name: "牛肉面", group: "招牌", priceCents: 1500, sales: 301 },
      { name: "骨汤麻辣烫", group: "招牌", priceCents: 1500, sales: 210 },
      { name: "牛肉粉", group: "粉面", priceCents: 1600, sales: 132 },
      { name: "酸辣粉", group: "粉面", priceCents: 1200, sales: 118 },
      { name: "炸酱面", group: "面食", priceCents: 1300, sales: 96 },
      { name: "西红柿鸡蛋面", group: "面食", priceCents: 1200, sales: 104 },
      { name: "凉皮", group: "小食", priceCents: 1000, sales: 87 },
      { name: "肉夹馍", group: "小食", priceCents: 900, sales: 165 },
      { name: "卤蛋", group: "小食", priceCents: 200, sales: 240 },
      { name: "涮豆皮", group: "小食", priceCents: 600, sales: 77 },
    ],
  },
  {
    name: "炸鸡星球", category: "快餐", description: "出锅即响的脆皮", minPriceCents: 2000, deliveryFeeCents: 300, rating: 4.6, monthlySales: 456,
    dishes: [
      { name: "炸鸡全家福", group: "招牌", priceCents: 3600, sales: 201 },
      { name: "劲脆炸鸡", group: "招牌", priceCents: 2000, sales: 156 },
      { name: "香辣鸡腿堡", group: "汉堡", priceCents: 1800, sales: 134 },
      { name: "奥尔良烤翅", group: "小食", priceCents: 1500, sales: 122 },
      { name: "鸡翅 4 只", group: "小食", priceCents: 1600, sales: 110 },
      { name: "鸡米花", group: "小食", priceCents: 1200, sales: 143 },
      { name: "鸡块", group: "小食", priceCents: 1000, sales: 98 },
      { name: "薯条", group: "小食", priceCents: 800, sales: 187 },
      { name: "柠檬茶", group: "饮品", priceCents: 900, sales: 121 },
      { name: "可乐", group: "饮品", priceCents: 600, sales: 256 },
    ],
  },
  {
    name: "阿姨水饺", category: "面食", description: "现包现煮，皮薄馅大", minPriceCents: 800, deliveryFeeCents: 100, rating: 4.8, monthlySales: 521,
    dishes: [
      { name: "猪肉白菜水饺", group: "招牌", priceCents: 1200, sales: 231 },
      { name: "韭菜鸡蛋水饺", group: "招牌", priceCents: 1200, sales: 187 },
      { name: "三鲜水饺", group: "水饺", priceCents: 1500, sales: 143 },
      { name: "玉米猪肉饺", group: "水饺", priceCents: 1500, sales: 121 },
      { name: "酸汤水饺", group: "水饺", priceCents: 1400, sales: 165 },
      { name: "荠菜馄饨", group: "馄饨", priceCents: 1300, sales: 98 },
      { name: "红油抄手", group: "馄饨", priceCents: 1400, sales: 134 },
      { name: "蒸饺", group: "蒸点", priceCents: 1300, sales: 87 },
      { name: "紫菜蛋花汤", group: "汤品", priceCents: 600, sales: 210 },
      { name: "凉拌黄瓜", group: "凉菜", priceCents: 500, sales: 132 },
    ],
  },
  {
    name: "果哇水果捞", category: "甜品", description: "当季鲜果，酸奶现浇", minPriceCents: 900, deliveryFeeCents: 200, rating: 4.7, monthlySales: 388,
    dishes: [
      { name: "招牌水果捞", group: "招牌", priceCents: 2200, sales: 176 },
      { name: "酸奶水果捞", group: "招牌", priceCents: 2000, sales: 154 },
      { name: "芒果班戟", group: "甜品", priceCents: 1800, sales: 98 },
      { name: "双皮奶", group: "甜品", priceCents: 1200, sales: 132 },
      { name: "椰奶清补凉", group: "甜品", priceCents: 1600, sales: 87 },
      { name: "杨梅冰粉", group: "冰品", priceCents: 1000, sales: 143 },
      { name: "凉糕", group: "冰品", priceCents: 800, sales: 76 },
      { name: "草莓杯", group: "鲜果", priceCents: 1800, sales: 91 },
      { name: "混合果切", group: "鲜果", priceCents: 1500, sales: 118 },
      { name: "西瓜汁", group: "饮品", priceCents: 900, sales: 164 },
    ],
  },
  {
    name: "烧烤研究所", category: "烧烤", description: "炭火现串，撒料自由", minPriceCents: 2500, deliveryFeeCents: 300, rating: 4.6, monthlySales: 342,
    dishes: [
      { name: "羊肉串 x5", group: "招牌", priceCents: 2000, sales: 187 },
      { name: "蒜蓉生蚝", group: "招牌", priceCents: 2500, sales: 98 },
      { name: "烤翅中", group: "肉类", priceCents: 1800, sales: 132 },
      { name: "烤面筋", group: "素串", priceCents: 600, sales: 210 },
      { name: "烤韭菜", group: "素串", priceCents: 800, sales: 154 },
      { name: "烤茄子", group: "素串", priceCents: 1200, sales: 121 },
      { name: "锡纸金针菇", group: "素串", priceCents: 1000, sales: 143 },
      { name: "烤冷面", group: "主食", priceCents: 1000, sales: 165 },
      { name: "烤玉米", group: "素串", priceCents: 700, sales: 98 },
      { name: "冰镇酸梅汤", group: "饮品", priceCents: 800, sales: 176 },
    ],
  },
  {
    name: "二食堂简餐", category: "简餐", description: "一荤一素，管饱管快", minPriceCents: 1000, deliveryFeeCents: 100, rating: 4.7, monthlySales: 477,
    dishes: [
      { name: "台式卤肉饭", group: "招牌", priceCents: 1600, sales: 198 },
      { name: "番茄肥牛饭", group: "招牌", priceCents: 1800, sales: 176 },
      { name: "黑椒鸡排饭", group: "饭类", priceCents: 1700, sales: 154 },
      { name: "咖喱牛肉饭", group: "饭类", priceCents: 1900, sales: 121 },
      { name: "糖醋里脊饭", group: "饭类", priceCents: 1800, sales: 132 },
      { name: "青椒肉丝饭", group: "饭类", priceCents: 1400, sales: 110 },
      { name: "麻婆豆腐饭", group: "饭类", priceCents: 1300, sales: 143 },
      { name: "蛋炒饭", group: "饭类", priceCents: 1000, sales: 165 },
      { name: "冬瓜排骨汤", group: "汤品", priceCents: 700, sales: 98 },
      { name: "凉拌木耳", group: "凉菜", priceCents: 600, sales: 87 },
    ],
  },
];

function localDateTime(date: Date): string {
  return beijingDateTime(date);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(list: readonly T[]): T {
  const index = randomInt(0, list.length - 1);
  const value = list[index];
  if (value === undefined) {
    throw new Error(`随机挑选越界：index=${index} length=${list.length}`);
  }
  return value;
}

const clearTables = db.transaction(() => {
  for (const table of ["order_items", "orders", "addresses", "dishes", "shops", "shop_categories", "users", "admins"]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
});

const seedAll = db.transaction(() => {
  // 账号（SPEC F8.1：2 演示用户 + 1 管理员）
  const adminHash = bcrypt.hashSync(config.adminInitialPassword, 10);
  const adminResult = db.prepare("INSERT INTO admins (username, password_hash) VALUES ('admin', ?)").run(adminHash);
  void adminResult;
  const userStmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
  const zhangsanId = Number(userStmt.run("zhangsan", bcrypt.hashSync("123456", 10)).lastInsertRowid);
  const lisiId = Number(userStmt.run("lisi", bcrypt.hashSync("123456", 10)).lastInsertRowid);

  const addressStmt = db.prepare(
    "INSERT INTO addresses (user_id, receiver, phone, building, room, is_default) VALUES (?, ?, ?, ?, ?, ?)"
  );
  addressStmt.run(zhangsanId, "张三", "13800001234", "1 号宿舍楼", "302（楼下货架自取）", 1);
  addressStmt.run(lisiId, "李四", "13900005678", "5 号宿舍楼", "108", 1);

  // 分类与店铺
  const categoryStmt = db.prepare("INSERT INTO shop_categories (name) VALUES (?)");
  const categoryIds = new Map<string, number>();
  for (const name of CATEGORIES) {
    categoryIds.set(name, Number(categoryStmt.run(name).lastInsertRowid));
  }

  const shopStmt = db.prepare(`
    INSERT INTO shops (name, logo_url, description, category_id, min_price_cents, delivery_fee_cents, rating, monthly_sales, is_active)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1)`);
  const dishStmt = db.prepare(`
    INSERT INTO dishes (shop_id, name, image_url, price_cents, dish_group, monthly_sales, is_active)
    VALUES (?, ?, NULL, ?, ?, ?, 1)`);

  interface SeededDish {
    id: number;
    shopId: number;
    priceCents: number;
  }
  const allDishes: SeededDish[] = [];
  const shopIds: number[] = [];

  for (const shop of SHOPS) {
    const shopId = Number(
      shopStmt.run(shop.name, shop.description, categoryIds.get(shop.category), shop.minPriceCents, shop.deliveryFeeCents, shop.rating, shop.monthlySales).lastInsertRowid
    );
    shopIds.push(shopId);
    for (const dish of shop.dishes) {
      const dishId = Number(dishStmt.run(shopId, dish.name, dish.priceCents, dish.group, dish.sales).lastInsertRowid);
      allDishes.push({ id: dishId, shopId, priceCents: dish.priceCents });
    }
  }

  // 历史订单：近 30 天 ≥300 条（SPEC F8.2，供阶段二可视化）
  const orderStmt = db.prepare(`
    INSERT INTO orders (order_no, user_id, shop_id, receiver, phone, building, room, remark, total_cents, delivery_fee_cents,
      status, created_at, paid_at, accepted_at, delivered_at, completed_at, cancelled_at)
    VALUES (@orderNo, @userId, @shopId, @receiver, @phone, @building, @room, @remark, @totalCents, @deliveryFeeCents,
      @status, @createdAt, @paidAt, @acceptedAt, @deliveredAt, @completedAt, @cancelledAt)`);
  const itemStmt = db.prepare(
    "INSERT INTO order_items (order_id, dish_id, dish_name, unit_price_cents, quantity) VALUES (?, (SELECT id FROM dishes WHERE id = ?), (SELECT name FROM dishes WHERE id = ?), (SELECT price_cents FROM dishes WHERE id = ?), ?)"
  );

  const users = [
    { id: zhangsanId, receiver: "张三", phone: "13800001234", building: "1 号宿舍楼", room: "302（楼下货架自取）" },
    { id: lisiId, receiver: "李四", phone: "13900005678", building: "5 号宿舍楼", room: "108" },
  ];
  const remarks = ["", "", "", "放楼下货架第三层", "多要一双筷子", "不要辣"];
  const now = new Date();
  let orderCount = 0;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const dayOrders = dayOffset === 0 ? randomInt(8, 12) : randomInt(9, 12);
    for (let i = 0; i < dayOrders; i++) {
      const user = pick(users);
      const shopId = pick(shopIds);
      const shopDishes = allDishes.filter((dish) => dish.shopId === shopId);
      const itemCount = randomInt(1, 3);
      const chosen = new Map<number, number>();
      for (let j = 0; j < itemCount; j++) {
        const dish = pick(shopDishes);
        chosen.set(dish.id, (chosen.get(dish.id) ?? 0) + randomInt(1, 2));
      }

      const day = new Date(now);
      day.setDate(day.getDate() - dayOffset);
      day.setHours(randomInt(10, 20), randomInt(0, 59), randomInt(0, 59), 0);
      const createdAt = localDateTime(day);

      // 今天留几张未完结的票给看板演示
      let status: OrderStatus;
      if (dayOffset === 0 && orderCount % 4 === 0) status = "paid";
      else if (dayOffset === 0 && orderCount % 4 === 1) status = "delivering";
      else status = Math.random() < 0.92 ? "completed" : "cancelled";

      const shopRow = db.prepare("SELECT delivery_fee_cents, min_price_cents FROM shops WHERE id = ?").get(shopId) as
        | { delivery_fee_cents: number; min_price_cents: number }
        | undefined;
      const deliveryFeeCents = shopRow?.delivery_fee_cents ?? 100;
      let subtotal = 0;
      for (const [dishId, quantity] of chosen) {
        const price = shopDishes.find((dish) => dish.id === dishId)?.priceCents ?? 0;
        subtotal += price * quantity;
      }
      if (subtotal < (shopRow?.min_price_cents ?? 0)) {
        subtotal += 800; // 保底凑过起送价
      }
      const totalCents = subtotal + deliveryFeeCents;

      const acceptedAt = status === "paid" ? null : createdAt;
      const deliveredAt = status === "completed" ? createdAt : null;
      const completedAt = status === "completed" ? createdAt : null;
      const cancelledAt = status === "cancelled" ? createdAt : null;

      const result = orderStmt.run({
        orderNo: `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, "0")}${String(day.getDate()).padStart(2, "0")}${String(orderCount % 1_000_000).padStart(6, "0")}${randomInt(0, 99)}`,
        userId: user.id,
        shopId,
        receiver: user.receiver,
        phone: user.phone,
        building: user.building,
        room: user.room,
        remark: pick(remarks),
        totalCents,
        deliveryFeeCents,
        status,
        createdAt,
        paidAt: createdAt,
        acceptedAt,
        deliveredAt,
        completedAt,
        cancelledAt,
      });
      const orderId = Number(result.lastInsertRowid);
      for (const [dishId, quantity] of chosen) {
        itemStmt.run(orderId, dishId, dishId, dishId, quantity);
      }
      orderCount++;
    }
  }

  console.log(`[seed] 完成：${SHOPS.length} 家店铺、${allDishes.length} 个菜品、${orderCount} 条历史订单`);
  console.log("[seed] 演示账号：zhangsan / 123456，lisi / 123456，admin / 123456（管理员）");
});

clearTables();
seedAll();
