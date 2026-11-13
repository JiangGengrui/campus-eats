import { Router } from "express";
import * as controller from "./shops.controller.js";

export const shopsRouter = Router();
shopsRouter.get("/categories", controller.listCategories);
shopsRouter.get("/search", controller.search);
shopsRouter.get("/", controller.listShops);
shopsRouter.get("/:id", controller.getShop);
