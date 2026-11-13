# CODEBUDDY.md —— 校味（CAMPUS EATS）代码规范

> 依据 ARCHITECTURE.md v1.1 与 SPEC.md v1.0 制定。本文件是本仓库的强约束：与代码冲突时，以「更符合下述规范的一方」为准修正另一方。
> 质量门禁：`npm run typecheck` 与 `npm run lint` 必须全仓 0 error 才算编码完成。

## 1. 工程结构与包边界

- 单仓三包：`client/`（React SPA）、`server/`（Express API）、`shared/`（前后端共用源码）。
- **依赖方向单向**：`client → shared ← server`。client 永远不 import server；server 永远不 import client。
- `shared/src` 只放三类内容：DTO 类型（types.ts）、业务规则（order-status.ts、error-codes.ts）、入参校验 schema（schemas.ts）。**禁止**在 shared 写运行时业务逻辑、DB 访问或依赖 express/react 的代码。
- shared 以源码形态被两端消费（`exports: "./src/index.ts"`），**改 shared 类型/schema 后必须跑一次全仓 typecheck**。

## 2. TypeScript 规范

- `strict: true` 全开；**禁止 `any`**（确需逃生用 `unknown` + 收窄，并写注释说明原因）。
- 跨包导入类型一律 `import type { ... }`。
- 金额（价格/合计/配送费）一律 **INTEGER 分**（`*_cents`），禁止 REAL/FLOAT 存钱，展示层 ÷100。任何"金额计算"不得出现小数中间值。
- 命名：文件 kebab-case（`order-status.ts`）、类型/组件 PascalCase、变量函数 camelCase、常量 SCREAMING_SNAKE_CASE、React 组件文件 PascalCase.tsx。
- 导出优先命名导出；每个文件单一职责，>200 行考虑拆分。

## 3. 服务端分层（四件套）

每个业务域一个目录 `server/src/modules/<域>/`，职责边界：

| 层 | 职责 | 禁止 |
|---|---|---|
| `<域>.routes.ts` | 挂载路径、套中间件、zod 校验入参 | 业务逻辑、直接访问 db |
| `<域>.controller.ts` | 调 service、组装响应壳 | SQL、事务 |
| `<域>.service.ts` | 业务规则、**事务边界**（`db.transaction` 只允许出现在这里） | 写 SQL 字符串细节 |
| `<域>.repo.ts` | 手写参数化 SQL（prepared statements） | 业务判断、读 req/res |

- **SQL 全部参数化**，禁止任何字符串拼接进 SQL（包括 ORDER BY 白名单外的动态片段）。
- 错误处理：service 抛 `AppError(code, message, httpStatus)`（shared 错误码枚举），由全局 errorHandler 统一转响应壳；**禁止在 controller 里 try/catch 吞错**。
- 响应壳统一 `{ code: 0, message: 'ok', data: T }`；业务错误码必须来自 `shared/error-codes.ts`，禁止裸数字。
- 鉴权：`requireAuth`（校验 JWT 签名并透传 claim）、`requireAdmin`（只认 `role === 'admin'`）——**中间件不回查数据库**；role 由登录端点按所用表（users/admins）写死签发。
- 配置（端口/JWT 密钥/DB 路径）只能从 `config.ts` 读取，禁止散落 `process.env`。

## 4. 订单状态机（强约束）

- 状态机唯一事实源：`shared/src/order-status.ts` 的 `ORDER_FLOW`。前端按钮显隐、后端推进校验都必须引用它，**任何一处不得硬编码状态迁移**。
- 推进入口唯一：`OrderService.transition(orderId, from, to)`，事务内执行 `UPDATE orders SET status=:to WHERE id=:id AND status=:from`，影响行数为 0 → 抛 3001/409。
- 取消订单仅允许 `paid` 状态；管理员跳序推进必须被拒绝。

## 5. 数据库规范

- 建表 DDL 唯一入口：`server/src/db/schema.sql`；改表 = 改 schema.sql + seed 幂等重建，阶段内**禁止**手写零散 ALTER。
- 软删除：店铺/菜品用 `is_active`，**禁止**物理 DELETE 已有订单引用的行。
- 订单明细 `order_items` 必须结构化逐行（dish_name/unit_price_cents 快照），**禁止 JSON 存业务明细**。
- 下单事务：同一事务内完成「菜品有效性校验（在售、同店）→ 计算 total_cents → 建 order + order_items」，价格以数据库现价为准，**不信任前端金额**。
- 订单号生成 `yyyyMMdd + 6 位随机数字`，UNIQUE 冲突重试上限 3 次。

## 6. 前端规范

- 页面放 `client/src/pages/<域>/`，可复用组件放 `components/`；页面文件名与路由一一对应。
- **样式直迁 mockup/ 设计体系**：只使用 `styles/tokens.css` 的 token 与 `styles/site.css` 的语义 class（`.shop-row`、`.stamp`、`.kan-card` 等），**禁止内联颜色/字号/阴影**；需要新样式时先加 token 或语义 class，再使用。
- 状态管理：仅两个 Zustand store——`authStore`（token+用户+role，localStorage 持久化）、`cartStore`（单店模型，**不持久化**）。禁止把服务端列表数据塞进 store（请求期内局部 state 即可）。
- 请求必须走 `client/src/api/` 下的 axios 单例：拦截器统一注入 Bearer token、解包响应壳、401 跳登录（后台会话跳 `/login?admin=1`）。**组件内禁止裸 axios/fetch**。
- 路由守卫：`RequireAuth` / `RequireAdmin` 包裹受保护路由，守卫逻辑只读 authStore。
- 文案中的破折号用「，」或括号，不用 `—`；价格展示用 `.price` class + 像素字体。

## 7. 安全清单

- 密码：bcryptjs 加盐哈希；登录失败统一返回 1002，不区分"用户不存在/密码错误"。
- 图片上传：multer 白名单 jpg/png/webp、≤2MB、重命名 `Date.now()-random.ext`；`uploads/` 由 Express 静态托管。
- 中间件链固定顺序：`helmet → cors → express.json({limit:'1mb'}) → 路由 → errorHandler`。
- 日志：morgan（请求）+ errorHandler（错误含堆栈）；**禁止**在日志中输出密码/token。

## 8. Git 与协作约定

- 提交信息中文、一行说明 + 空行 + 要点（如 `订单模块：事务化下单与状态机推进`）。
- 提交前必须通过：`npm run typecheck` + `npm run lint`。
- 阶段二（评价/推荐/可视化）**只允许新增表/文件**，禁止修改既有表结构与既有字段语义（SPEC 成功指标）。
