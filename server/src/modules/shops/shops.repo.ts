// 店铺/分类/菜品数据访问（公开接口只读 is_active 数据，SPEC F2.3）
import { db } from "../../db/connection.js";
import type { Dish, Shop, ShopCategory } from "@xiaowei/shared";

interface ShopRow {
  id: number;
  name: string;
  logo_url: string | null;
  description: string;
  category_id: number;
  category_name: string;
  min_price_cents: number;
  delivery_fee_cents: number;
  rating: number;
  monthly_sales: number;
  is_active: number;
  real_sales?: number;
}

interface DishRow {
  id: number;
  shop_id: number;
  name: string;
  image_url: string | null;
  price_cents: number;
  dish_group: string;
  monthly_sales: number;
  is_active: number;
}

export interface ShopWithDishCount extends Shop {
  dishName: string | null;
}

function toShop(row: ShopRow): Shop {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    minPriceCents: row.min_price_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    rating: row.rating,
    // P1.1：优先用近 30 天真实销量聚合
    monthlySales: row.real_sales !== undefined && row.real_sales > 0 ? row.real_sales : row.monthly_sales,
    isActive: row.is_active === 1,
  };
}

function toDish(row: DishRow): Dish {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    imageUrl: row.image_url,
    priceCents: row.price_cents,
    dishGroup: row.dish_group,
    monthlySales: row.monthly_sales,
    isActive: row.is_active === 1,
  };
}

const categoriesStmt = db.prepare("SELECT id, name FROM shop_categories ORDER BY id ASC");
// P1.1：月销量改为"近 30 天真实销量"聚合（SPEC P1.1），seed 的 monthly_sales 仅作展示兜底
const REAL_SALES_30D = `(
  SELECT COALESCE(SUM(oi.quantity), 0)
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.dish_id IN (SELECT id FROM dishes WHERE shop_id = s.id)
    AND o.status IN ('paid','delivering','completed')
    AND o.created_at >= datetime('now','+8 hours','-30 days')
)`;
const shopsByCategoryStmt = db.prepare(`
  SELECT s.*, c.name AS category_name, ${REAL_SALES_30D} AS real_sales
  FROM shops s JOIN shop_categories c ON c.id = s.category_id
  WHERE s.is_active = 1 AND (? IS NULL OR s.category_id = ?)
  ORDER BY real_sales DESC, s.id ASC`);
const shopByIdStmt = db.prepare(`
  SELECT s.*, c.name AS category_name, ${REAL_SALES_30D} AS real_sales
  FROM shops s JOIN shop_categories c ON c.id = s.category_id
  WHERE s.id = ? AND s.is_active = 1`);
const dishesByShopStmt = db.prepare(
  "SELECT * FROM dishes WHERE shop_id = ? AND is_active = 1 ORDER BY id ASC"
);
const searchShopsStmt = db.prepare(`
  SELECT DISTINCT s.*, c.name AS category_name
  FROM shops s
  JOIN shop_categories c ON c.id = s.category_id
  LEFT JOIN dishes d ON d.shop_id = s.id AND d.is_active = 1
  WHERE s.is_active = 1 AND (s.name LIKE '%' || ? || '%' ESCAPE '\\' OR d.name LIKE '%' || ? || '%' ESCAPE '\\')
  ORDER BY s.monthly_sales DESC, s.id ASC`);
const searchDishesStmt = db.prepare(`
  SELECT d.*, s.name AS shop_name
  FROM dishes d JOIN shops s ON s.id = d.shop_id
  WHERE d.is_active = 1 AND s.is_active = 1 AND d.name LIKE '%' || ? || '%' ESCAPE '\\'
  ORDER BY d.monthly_sales DESC, d.id ASC
  LIMIT 20`);

/** LIKE 通配符转义：用户输入的 %/_ 按字面匹配，不当通配符 */
function escapeLike(keyword: string): string {
  return keyword.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function listCategories(): ShopCategory[] {
  return categoriesStmt.all() as ShopCategory[];
}

export function listActiveShops(categoryId: number | null): Shop[] {
  const rows = shopsByCategoryStmt.all(categoryId, categoryId) as ShopRow[];
  return rows.map(toShop);
}

const dishByIdStmt = db.prepare("SELECT * FROM dishes WHERE id = ? AND is_active = 1");

export function getActiveDishById(id: number): Dish | undefined {
  const row = dishByIdStmt.get(id) as DishRow | undefined;
  return row === undefined ? undefined : toDish(row);
}

export function getActiveShop(id: number): Shop | undefined {
  const row = shopByIdStmt.get(id) as ShopRow | undefined;
  return row === undefined ? undefined : toShop(row);
}

export function listActiveDishesByShop(shopId: number): Dish[] {
  return (dishesByShopStmt.all(shopId) as DishRow[]).map(toDish);
}

export function searchShops(keyword: string): Shop[] {
  const kw = escapeLike(keyword);
  return (searchShopsStmt.all(kw, kw) as ShopRow[]).map(toShop);
}

export interface DishWithShop extends Dish {
  shopName: string;
}

export function searchDishes(keyword: string): DishWithShop[] {
  return (searchDishesStmt.all(escapeLike(keyword)) as (DishRow & { shop_name: string })[]).map((row) => ({
    ...toDish(row),
    shopName: row.shop_name,
  }));
}
