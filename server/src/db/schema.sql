-- 校味 · 全量建表 DDL（唯一入口，ARCHITECTURE §4 v1.1）
-- 改表 = 改本文件 + seed 幂等重建（CODEBUDDY §5）

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);

CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shop_categories (
  id   INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS shops (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,
  logo_url          TEXT,
  description       TEXT NOT NULL DEFAULT '',
  category_id       INTEGER NOT NULL REFERENCES shop_categories(id),
  min_price_cents   INTEGER NOT NULL,
  delivery_fee_cents INTEGER NOT NULL,
  rating            REAL NOT NULL DEFAULT 0,   -- 阶段一 seed 固定值；阶段二改聚合（SPEC §7.5）
  monthly_sales     INTEGER NOT NULL DEFAULT 0,-- 仅 seed 展示兜底；P1.1 起改近30天真实聚合
  is_active         INTEGER NOT NULL DEFAULT 1 -- 软删除开关（SPEC F7.3）
);

CREATE TABLE IF NOT EXISTS dishes (
  id            INTEGER PRIMARY KEY,
  shop_id       INTEGER NOT NULL REFERENCES shops(id),
  name          TEXT NOT NULL,
  image_url     TEXT,
  price_cents   INTEGER NOT NULL,
  dish_group    TEXT NOT NULL,
  monthly_sales INTEGER NOT NULL DEFAULT 0,    -- 仅 seed 展示兜底；P1.1 同上
  is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS addresses (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  receiver   TEXT NOT NULL,
  phone      TEXT NOT NULL,
  building   TEXT NOT NULL,
  room       TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);

-- 订单：四态状态机（SPEC F5.1，枚举一次定稿，阶段二只增表不改列）
CREATE TABLE IF NOT EXISTS orders (
  id                 INTEGER PRIMARY KEY,
  order_no           TEXT UNIQUE NOT NULL,       -- yyyyMMdd + 6位随机，幂等键（ARCHITECTURE §4 契约3）
  user_id            INTEGER NOT NULL REFERENCES users(id),
  shop_id            INTEGER NOT NULL REFERENCES shops(id),
  -- 下单时地址快照：结构化四列（评审 A3，随单固化，只读展示）
  receiver           TEXT NOT NULL,
  phone              TEXT NOT NULL,
  building           TEXT NOT NULL,
  room               TEXT NOT NULL,
  remark             TEXT NOT NULL DEFAULT '',
  total_cents        INTEGER NOT NULL,
  delivery_fee_cents INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'paid'
                     CHECK (status IN ('paid','delivering','completed','cancelled')),
  created_at         TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
  paid_at            TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
  accepted_at        TEXT,
  delivered_at       TEXT,
  completed_at       TEXT,
  cancelled_at       TEXT
);

-- 订单明细：结构化逐行，禁止 JSON（SPEC §7.2，阶段二评价/推荐/可视化数据底座）
CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id),
  dish_id          INTEGER NOT NULL REFERENCES dishes(id),
  dish_name        TEXT NOT NULL,   -- 快照：菜名随单固化
  unit_price_cents INTEGER NOT NULL,-- 快照：单价随单固化
  quantity         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_items_dish  ON order_items(dish_id);   -- P1.1 近30天销量聚合子查询
CREATE INDEX IF NOT EXISTS idx_dishes_shop ON dishes(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_shops_cat   ON shops(category_id, is_active);
