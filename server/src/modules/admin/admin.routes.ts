import { Router } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { requireAdmin } from "../../middleware/auth.js";
import * as controller from "./admin.controller.js";
import { adminOrdersRouter } from "../orders/orders.routes.js";

// multer 只负责写文件、不会创建目录：容器首次启动时目录不存在会直接 ENOENT 500
const uploadDir = path.resolve(config.uploadDir);

function ensureUploadDir(): string {
  mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}

// 白名单 jpg/png/webp、≤2MB、随机重命名（CODEBUDDY §7）
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      // 首次上传时补建目录，避免空库部署后第一张图就 500
      callback(null, ensureUploadDir());
    },
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    },
  }),
  limits: { fileSize: config.uploadMaxBytes },
  fileFilter: (_req, file, callback) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      callback(null, true);
      return;
    }
    callback(null, false); // 拒收：controller 统一返回 5001
  },
});

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.use("/orders", adminOrdersRouter);

adminRouter.get("/shops", controller.listShops);
adminRouter.post("/shops", controller.createShop);
adminRouter.put("/shops/:id", controller.updateShop);
adminRouter.put("/shops/:id/active", controller.setShopActive);

adminRouter.get("/dishes", controller.listDishes);
adminRouter.post("/dishes", controller.createDish);
adminRouter.put("/dishes/:id", controller.updateDish);
adminRouter.put("/dishes/:id/active", controller.setDishActive);

adminRouter.get("/categories", controller.listCategories);
adminRouter.post("/categories", controller.createCategory);
adminRouter.delete("/categories/:id", controller.deleteCategory);

adminRouter.post("/upload", upload.single("file"), controller.uploadDone);
