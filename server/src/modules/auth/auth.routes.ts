import { Router } from "express";
import { loginRateLimit } from "../../middleware/rate-limit.js";
import * as controller from "./auth.controller.js";

export const authRouter = Router();
authRouter.post("/register", loginRateLimit(), controller.register);
authRouter.post("/login", loginRateLimit(), controller.login);

export const adminAuthRouter = Router();
adminAuthRouter.post("/login", loginRateLimit(), controller.adminLogin);
