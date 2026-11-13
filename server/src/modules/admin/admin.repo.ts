// 管理后台数据访问（含未上架数据）
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
    monthlySales: row.monthly_sales,
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

const allShopsStmt = db.prepare(`
  SELECT s.*, c.name AS category_name FROM shops s JOIN shop_categories c ON c.id = s.category_id
  WHERE (? IS NULL OR s.category_id = ?) AND (? IS NULL OR s.name LIKE '%' || ? || '%' ESCAPE '\\')
  ORDER BY s.id ASC`);

/** LIKE 通配符转义：关键字中的 %/_ 按字面匹配 */
function escapeLike(keyword: string): string {
  return keyword.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
const allDishesStmt = db.prepare(`
  SELECT * FROM dishes WHERE (@shopId IS NULL OR shop_id = @shopId) ORDER BY shop_id ASC, id ASC`);
const shopExistsStmt = db.prepare("SELECT 1 FROM shops WHERE id = ?");
const dishExistsStmt = db.prepare("SELECT 1 FROM dishes WHERE id = ?");
const insertShopStmt = db.prepare(`
  INSERT INTO shops (name, logo_url, description, category_id, min_price_cents, delivery_fee_cents, is_active)
  VALUES (@name, @logoUrl, @description, @categoryId, @minPriceCents, @deliveryFeeCents, @isActive)`);
const updateShopStmt = db.prepare(`
  UPDATE shops SET name = @name, logo_url = @logoUrl, description = @description, category_id = @categoryId,
    min_price_cents = @minPriceCents, delivery_fee_cents = @deliveryFeeCents, is_active = @isActive
  WHERE id = @id`);
const setShopActiveStmt = db.prepare("UPDATE shops SET is_active = ? WHERE id = ?");
const insertDishStmt = db.prepare(`
  INSERT INTO dishes (shop_id, name, image_url, price_cents, dish_group, is_active)
  VALUES (@shopId, @name, @imageUrl, @priceCents, @dishGroup, @isActive)`);
const updateDishStmt = db.prepare(`
  UPDATE dishes SET shop_id = @shopId, name = @name, image_url = @imageUrl, price_cents = @priceCents,
    dish_group = @dishGroup, is_active = @isActive WHERE id = @id`);
const setDishActiveStmt = db.prepare("UPDATE dishes SET is_active = ? WHERE id = ?");
const categoriesStmt = db.prepare("SELECT id, name FROM shop_categories ORDER BY id ASC");
const insertCategoryStmt = db.prepare("INSERT INTO shop_categories (name) VALUES (?)");
const deleteCategoryStmt = db.prepare("DELETE FROM shop_categories WHERE id = ?");
const categoryInUseStmt = db.prepare("SELECT COUNT(*) AS n FROM shops WHERE category_id = ?");
const categoryByIdStmt = db.prepare("SELECT id, name FROM shop_categories WHERE id = ?");

export const adminRepo = {
  listAllShops(categoryId: number | null, keyword: string | null): Shop[] {
    const kw = keyword === null ? null : escapeLike(keyword);
    return (allShopsStmt.all(categoryId, categoryId, kw, kw) as ShopRow[]).map(toShop);
  },
  listAllDishes(shopId: number | null): Dish[] {
    return (allDishesStmt.all({ shopId }) as DishRow[]).map(toDish);
  },
  shopExists(id: number): boolean {
    return shopExistsStmt.get(id) !== undefined;
  },
  dishExists(id: number): boolean {
    return dishExistsStmt.get(id) !== undefined;
  },
  insertShop(input: {
    name: string; logoUrl: string | null; description: string; categoryId: number;
    minPriceCents: number; deliveryFeeCents: number; isActive: boolean;
  }): number {
    return Number(insertShopStmt.run(input).lastInsertRowid);
  },
  updateShop(id: number, input: {
    name: string; logoUrl: string | null; description: string; categoryId: number;
    minPriceCents: number; deliveryFeeCents: number; isActive: boolean;
  }): void {
    updateShopStmt.run({ ...input, id });
  },
  setShopActive(id: number, isActive: boolean): void {
    setShopActiveStmt.run(isActive ? 1 : 0, id);
  },
  insertDish(input: {
    shopId: number; name: string; imageUrl: string | null; priceCents: number; dishGroup: string; isActive: boolean;
  }): number {
    return Number(insertDishStmt.run(input).lastInsertRowid);
  },
  updateDish(id: number, input: {
    shopId: number; name: string; imageUrl: string | null; priceCents: number; dishGroup: string; isActive: boolean;
  }): void {
    updateDishStmt.run({ ...input, id });
  },
  setDishActive(id: number, isActive: boolean): void {
    setDishActiveStmt.run(isActive ? 1 : 0, id);
  },
  listCategories(): ShopCategory[] {
    return categoriesStmt.all() as ShopCategory[];
  },
  insertCategory(name: string): number {
    return Number(insertCategoryStmt.run(name).lastInsertRowid);
  },
  categoryById(id: number): ShopCategory | undefined {
    return categoryByIdStmt.get(id) as ShopCategory | undefined;
  },
  categoryInUse(id: number): boolean {
    return (categoryInUseStmt.get(id) as { n: number }).n > 0;
  },
  deleteCategory(id: number): boolean {
    return deleteCategoryStmt.run(id).changes > 0;
  },
};
