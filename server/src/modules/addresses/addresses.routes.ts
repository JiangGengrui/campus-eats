import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as controller from "./addresses.controller.js";

export const addressesRouter = Router();
addressesRouter.use(requireAuth);
addressesRouter.get("/", controller.list);
addressesRouter.post("/", controller.create);
addressesRouter.put("/:id", controller.update);
addressesRouter.delete("/:id", controller.remove);
addressesRouter.put("/:id/default", controller.setDefault);
