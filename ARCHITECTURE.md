# ARCHITECTURE：校味（校园外卖平台）系统架构

> 版本：v1.0 ｜ 日期：2026-11-08 ｜ 状态：已定稿
> 依据：SPEC.md v1.0、PROTOTYPE_DECISIONS.md v1.0
> 技术栈：React + Express + SQLite，全 TypeScript
> 范围：阶段一（基础功能）为主，标注阶段二接入点

---

## 1. 架构总览

经典三层单体架构：**React SPA（用户端 + 管理后台同构双入口） → Express REST API → SQLite 单文件库**。

```
┌─────────────────────────── Browser ───────────────────────────┐
│  用户端 SPA (/)              管理后台 SPA (/admin)              │
│  React 19 + Vite             同一 React 工程，路由分区          │
└──────────────┬────────────────────────────┬───────────────────┘
               │  JSON over HTTP (JWT)      │
┌──────────────▼────────────────────────────▼───────────────────┐
│                    Express 5 (Node 22 LTS)                     │
│  routes → controllers → services → repositories                │
│  中间件：helmet · cors · json · 鉴权(jwt) · 角色 · 错误兜底      │
│  静态服务：/uploads 图片 · client 构建产物（生产模式）            │
└──────────────┬─────────────────────────────────────────────────┘
               │ better-sqlite3（同步，事务）
┌──────────────▼─────────────────────────────────────────────────┐
│        SQLite 单文件 (data/app.db) · WAL 模式                   │
│  users / admins / shops / dishes / addresses / orders / items  │
└────────────────────────────────────────────────────────────────┘
```

**关键决策一览（ADR 摘要）**

| # | 决策 | 选择 | 理由（备选已评估并否决） |
|---|---|---|---|
| ADR-1 | 工程结构 | npm workspaces 单仓三包 | client/server/shared 类型零拷贝；否决单包全栈（构建纠缠）、独立两仓（类型重复） |
| ADR-2 | SQLite 访问层 | better-sqlite3 + 手写 SQL + Repository 层 | 同步 API 简单可靠、事务直观、答辩可讲每条 SQL；否决 Prisma/Drizzle（抽象过重、Windows 原生依赖风险） |
| ADR-3 | 前端样式 | 视觉稿 CSS 体系直迁（tokens + 语义 class） | 与 `mockup/` 视觉稿 1:1 对应，零转换成本；否决 Tailwind/CSS Modules |
| ADR-4 | 认证 | JWT（无状态，24h）+ 角色字段 | 课程设计无需 refresh token 黑名单（SPEC F1.3） |
| ADR-5 | 密码哈希 | bcryptjs（纯 JS 实现） | 规避 Windows 原生编译风险，接口与 bcrypt 一致 |
| ADR-6 | 全局状态 | Zustand | 购物车/登录态两个轻 store，免 Redux 样板代码 |
| ADR-7 | 构建 | Vite（client）+ tsx（server 开发热载） | Vite 是 React 事实标准；tsx 免编译直跑 TS |

## 2. 工程结构（monorepo）

```
takeaway/
├── package.json               # workspaces: ["client","server","shared"]
├── .env.example               # JWT_SECRET、PORT、DB_PATH
├── client/                    # React 19 + Vite + TS
│   ├── src/
│   │   ├── main.tsx           # 入口，挂 RouterProvider
│   │   ├── router.tsx         # 路由表 + 守卫（RequireAuth / RequireAdmin）
│   │   ├── api/               # axios 实例、拦截器、各模块 API 函数
│   │   ├── stores/            # authStore / cartStore (Zustand, persist 会话)
│   │   ├── pages/             # home/ search/ shop/ checkout/ orders/
│   │   │                      # order-detail/ address/ login
│   │   │                      # admin/ orders-kanban/ shops/ dishes/
│   │   ├── components/        # ShopRow, DishRow, CartPanel, StatusStamp, Timeline…
│   │   └── styles/            # tokens.css（自 mockup 迁移）+ 全局语义 class
│   └── vite.config.ts         # dev 代理 /api,/uploads → server
├── server/
│   ├── src/
│   │   ├── index.ts           # 装配中间件与路由
│   │   ├── config.ts          # 读取 .env，集中校验
│   │   ├── db/
│   │   │   ├── connection.ts  # better-sqlite3 实例，WAL，外键开启
│   │   │   ├── migrate.ts     # 启动时执行 schema.sql + 增量迁移
│   │   │   └── schema.sql     # 全部 DDL（见 §4）
│   │   ├── middleware/        # auth(解析JWT+挂角色) · requireAdmin · errorHandler
│   │   ├── modules/           # 按业务域垂直切分，每个模块同构四件套：
│   │   │   ├── auth/          #   *.routes.ts  *.controller.ts
│   │   │   ├── shops/         #   *.service.ts *.repo.ts
│   │   │   ├── dishes/        # 路由只做参数校验与分发，事务只写在 service
│   │   │   ├── addresses/
│   │   │   └── orders/        # 含状态机推进（§5）
│   │   └── seed/seed.ts       # 一键种子（npm run seed，幂等重建）
│   └── uploads/               # multer 落盘点，Express 静态托管
└── shared/
    └── src/
        ├── types.ts           # Shop/Dish/Order/Address/User 等 DTO 接口
        ├── order-status.ts    # 状态机枚举 + 合法迁移表（前后端共用）
        └── api-contract.ts    # 响应壳 ApiResponse<T> 与错误码枚举
```

**开发运行**：根目录 `npm run dev`（concurrently 并行 `client: vite` + `server: tsx watch`），Vite 代理 `/api` 与 `/uploads`。
**生产运行**：`npm run build`（client 产 dist）→ Express 托管 dist + /api + /uploads，单进程单端口。

## 3. 前端架构

- **路由**（react-router v7 data mode）：
  - 公开：`/` `/search` `/shop/:id` `/login`
  - 需登录（RequireAuth 守卫，未登录跳 `/login?redirect=`）：`/checkout` `/orders` `/orders/:id` `/address`
  - 后台（RequireAdmin 守卫，校验 store.role === 'admin'）：`/admin` `/admin/orders` `/admin/shops` `/admin/dishes`；后台 token 过期跳 `/login?admin=1`（login 页据此高亮管理员入口），不与用户登录分流混淆
- **状态**：
  - `authStore`：token + 用户信息 + role，persist 到 localStorage
  - `cartStore`：单店模型（shopId + items[]），**不持久化**（SPEC F4.3 明确刷新即空）
- **请求层**：单一 axios 实例；请求拦截器注入 `Authorization: Bearer <token>`；响应拦截器统一解包 `ApiResponse`，401 → 清登录态跳登录，业务错误码 → 全局 toast
- **样式**：`tokens.css` + 全局语义 class 直接来自 `mockup/css/site.css`；组件使用相同 class 名（`.shop-row`、`.stamp`、`.kan-card`…），保证视觉稿 1:1

## 4. 数据库设计（SQLite DDL 概要）

```sql
-- 账户（双表隔离，SPEC F7.1）
CREATE TABLE users (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE admins (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL);

CREATE TABLE shop_categories (
  id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);

CREATE TABLE shops (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  logo_url TEXT, description TEXT DEFAULT '',
  category_id INTEGER NOT NULL REFERENCES shop_categories(id),
  min_price_cents INTEGER NOT NULL, delivery_fee_cents INTEGER NOT NULL,
  rating REAL NOT NULL DEFAULT 0,          -- 阶段一 seed 固定值；阶段二改聚合（SPEC §7.5）
  monthly_sales INTEGER NOT NULL DEFAULT 0,-- 仅 seed 展示兜底；P1.1 起改用"近30天真实销量"聚合（JOIN order_items），本字段不再更新
  is_active INTEGER NOT NULL DEFAULT 1);   -- 软删除开关（F7.3）

CREATE TABLE dishes (
  id INTEGER PRIMARY KEY, shop_id INTEGER NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL, image_url TEXT, price_cents INTEGER NOT NULL,
  dish_group TEXT NOT NULL,                -- 菜品分组（招牌/奶茶/果茶…）
  monthly_sales INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1);

CREATE TABLE addresses (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  receiver TEXT NOT NULL, phone TEXT NOT NULL,
  building TEXT NOT NULL, room TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0);  -- 默认地址唯一性由 service 层事务保证

-- 订单：四态状态机（SPEC F5.1，枚举一次定稿）
CREATE TABLE orders (
  id INTEGER PRIMARY KEY, order_no TEXT UNIQUE NOT NULL,  -- 幂等键（F5.3）
  user_id INTEGER NOT NULL REFERENCES users(id),
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  -- 下单时地址快照：结构化列（呼应 SPEC §7.2 纪律，展示只读冗余，随单固化）
  receiver TEXT NOT NULL, phone TEXT NOT NULL, building TEXT NOT NULL, room TEXT NOT NULL,
  remark TEXT DEFAULT '',
  total_cents INTEGER NOT NULL, delivery_fee_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid'      -- paid|delivering|completed|cancelled
    CHECK (status IN ('paid','delivering','completed','cancelled')),
  paid_at TEXT NOT NULL, accepted_at TEXT, delivered_at TEXT, completed_at TEXT,
  cancelled_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));

-- 订单明细：结构化逐行，禁止 JSON（SPEC §7.2，阶段二评价/推荐/可视化的数据底座）
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id),
  dish_id INTEGER NOT NULL REFERENCES dishes(id),
  dish_name TEXT NOT NULL,   -- 快照：菜名/单价随单固化
  unit_price_cents INTEGER NOT NULL,  quantity INTEGER NOT NULL);

CREATE INDEX idx_orders_user   ON orders(user_id, status, created_at DESC);
CREATE INDEX idx_items_order   ON order_items(order_id);
CREATE INDEX idx_dishes_shop   ON dishes(shop_id, is_active);
CREATE INDEX idx_shops_cat     ON shops(category_id, is_active);
```

> **阶段二兼容承诺**：评价（reviews 表挂 order_id）、推荐（读 orders+order_items）、可视化（读历史订单）均**只增表、不改列**，满足 SPEC 成功指标"0 次表结构变更"。

**三条数据契约（评审 A1/A2/A5 修订）**
1. **金额一律 INTEGER 存"分"**（`*_cents`），前端展示时 ÷100；避免 SQLite REAL 浮点累加误差导致合计与明细对不上。
2. **不建模库存**：校园外卖语义为"窗口出餐，无库存"。下单事务内做**菜品有效性校验**（在售、属于同一店铺），不通过即回滚并报 2001；"扣减"语义已从 SPEC 移除。
3. **订单号生成**：`yyyyMMdd + 6 位随机数字`（如 `20261108372164`），命中 UNIQUE 冲突则重试（上限 3 次）；用户端展示缩写为 `#后4位`。

## 5. 订单状态机（shared 单一事实源）

```ts
// shared/src/order-status.ts —— 前后端共用，前端按钮显隐与后端推进校验同源
export const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  paid:       ['delivering', 'cancelled'],
  delivering: ['completed'],
  completed:  [],
  cancelled:  [],
};
```

- 用户侧可见文案：`paid → 待接单`（SPEC F5.1 注）
- 取消仅 `paid` 可发起（F5.6）；管理员按 `ORDER_FLOW` 推进，跳序返回 409
- 推进入口唯一：`OrderService.transition(orderId, from, to)`，事务内 `UPDATE ... WHERE status = :from`，影响行数为 0 即并发冲突，报 409 —— 同时解决"快速双击支付"幂等（订单号唯一约束 + 前端按钮防重）

## 6. API 设计（REST，统一响应壳）

```
响应壳：{ code: 0, message: 'ok', data: T }   // code≠0 为业务错误，HTTP 状态码同步表达
```

| 模块 | 端点 | 鉴权 | 说明 |
|---|---|---|---|
| auth | POST /api/auth/register · /login | 公开 | 返回 token + role |
| shops | GET /api/categories · GET /api/shops?categoryId=&keyword= | 公开 | keyword 同时 LIKE 店名（F3.1） |
| shops | GET /api/shops/:id（含分组菜品） | 公开 | 仅 is_active |
| dishes | GET /api/shops/:id/dishes | 公开 | 按分组返回 |
| addresses | GET/POST/PUT/DELETE /api/addresses · PUT /api/addresses/:id/default | 用户 | 删默认后自动补位（F6.2） |
| orders | POST /api/orders | 用户 | 事务建单+明细，服务端以库内现价结算（F4.4），订单号唯一幂等 |
| orders | GET /api/orders?status=&page=&pageSize= · GET /api/orders/:id | 用户 | 详情含明细与时间线字段；非本人返回 404 |
| orders | POST /api/orders/:id/cancel | 用户 | 仅 paid；否则 409 |
| admin | POST /api/admin/auth/login | 公开 | 独立 admins 表 |
| admin | POST /api/admin/orders/:id/transition {to} | 管理员 | 校验 ORDER_FLOW |
| admin | CRUD /api/admin/shops · /api/admin/dishes · /api/admin/categories | 管理员 | 上/下架为 PUT is_active；列表接口统一分页 `page/pageSize`（默认 10，B1）；删除被店铺引用的分类返回 409（B3） |
| admin | POST /api/admin/upload | 管理员 | multer 单图 ≤2MB（jpg/png/webp，SPEC 开放问题#1 定稿） |

**错误码约定**（shared/api-contract.ts）：`1001 用户名已存在`、`1002 凭证错误`、`2001 菜品已下架`、`2002 低于起送价`、`2003 购物车为空`、`3001 状态不允许该操作`、`4001 无权限`…前端按码映射 toast 文案。

## 6a. 非功能需求（NFR，课程设计口径）

| 维度 | 目标 | 手段 |
|---|---|---|
| 并发 | 演示/答辩 ≤ 10 人同时在线可用 | 单进程 Express + SQLite WAL 足够 |
| 延迟 | 本地演示下接口 P95 < 100ms（不含图片传输） | SQLite 同步读 + 参数化查询 + 命中索引 |
| 数据量 | 订单 ≤ 1 万条、菜品 ≤ 500 条内性能不退化 | §4 索引覆盖主要查询路径 |
| 可用性 | 答辩全程不宕机 | 无外部依赖（无第三方服务），进程内自愈；无分布式故障面 |
| 可恢复 | 数据库文件可拷贝迁移 | 单文件 db，seed 幂等可重建 |

**显式不做（Scale & Reliability 表态）**
- **缓存层（N/A）**：SQLite 本地读即为微秒级，演示规模无热点；若阶段二可视化聚合变慢，再考虑物化汇总表而非引入 Redis
- **消息队列（N/A）**：订单流转为同步事务，无异步解耦诉求；"自动接单"（P1.2）用进程内 setInterval 即可，不引入 BullMQ
- **水平扩展（不做）**：单机单文件库决定了纵向单实例；若真实运营需迁移 PostgreSQL，Repository 层已隔离 SQL，迁移面可控

## 6b. 可观测性

- **请求日志**：morgan（dev 短格式）输出到控制台；错误统一进 errorHandler 时打 `console.error` 含堆栈
- **健康检查**：GET `/api/health` 返回 `{ code:0, data:{ db:'up', uptime } }`，db 探活用 `SELECT 1`，答辩前自检用
- **慢查询标记（P2）**：better-sqlite3 同步执行天然可见卡顿；若单接口 > 50ms，在 repo 层打点 console.warn

## 7. 安全与校验

- 中间件链：`helmet → cors(白名单) → express.json({limit:'1mb'}) → 路由`
- **JWT payload 契约（评审 A4）**：`{ uid: number, role: 'user' | 'admin' }`；role 由登录端点按所用表（users/admins）**写死签发**，鉴权中间件只校验签名并透传 claim、不回查数据库（与"无状态 JWT"声明自洽）；`RequireAdmin` 中间件只认 `role === 'admin'`
- 输入校验：zod schema 定义在 shared（前端表单与后端 controller 共用同一份）
- SQL 全部参数化（better-sqlite3 prepared statements），无字符串拼接
- 上传：multer 文件类型白名单 + 大小限制 + 重命名（`Date.now()-random.ext`），拒绝可执行扩展名

## 8. 质量门禁与测试策略（对齐 SPEC 成功指标）

- **静态**：根目录 `npm run lint`（eslint9 flat config，前后端共用）+ `npm run typecheck`（tsc --noEmit ×3 包）；CI/演示前必跑，0 error
- **单元/集成**（vitest + supertest）：状态机迁移合法性、订单结算金额、默认地址唯一性、下单幂等
- **E2E**（Playwright，M4 阶段）：覆盖 SPEC §5 全部 P0 验收 checklist，产验收报告

## 9. 阶段二接入点（本期只留口，不实现）

| 功能 | 接入点 |
|---|---|
| 评价 | 新增 reviews 表（order_id 唯一）；`completed` 状态已可识别；详情页时间线末节点已预留文案位 |
| 推荐 | 读 orders+order_items 用户历史；首页 shop-list 的排序键从 seed 月销切换为推荐分，UI 不变 |
| 可视化 | seed 已含 300+ 条 30 天历史订单；新增 /admin/stats 页 + 聚合 SQL/图表库即可，不动现有表 |

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| better-sqlite3 在部分 Windows/Node 版本需预编译 | 锁 Node 22 LTS；若安装失败降级方案为 node:sqlite 内置模块（API 相近，仅影响 1 个文件） |
| SQLite 并发写（演示场景无虞） | WAL 模式 + 写事务短小；课程设计规模（<千级订单）足够 |
| 前后端类型漂移 | shared 包单一来源 + tsc 全仓 typecheck 门禁 |

## 11. 架构评审记录（2026-11-08）

**已采纳并落入正文**：A1 金额分存储（§4 契约1）｜A2 无库存模型（§4 契约2 + SPEC F5.3 已同步修订）｜A3 地址快照结构化四列（§4）｜A4 JWT payload 契约（§7）｜A5 订单号生成规则（§4 契约3）｜B1 全端统一分页（§6）｜B2 月销量双源切换点（§4 注释：P1.1 起改近30天真实聚合，字段仅 seed 兜底）｜B3 分类删除引用校验（§6）｜B4 后台登录分流（§3）。

**C 类：仅记录，暂不实现**
- C1 订单操作日志表（order_logs）：`accepted_at` 等时间戳已有，无操作者维度；如答辩需要"审计"叙事再加，只增表
- C2 uploads 文件无清理策略：下架/删除菜品不删磁盘文件，演示场景可接受
- C3 下单失败（2001 菜品已下架）后的购物车处置：保留购物车并高亮失效项，不清空，由用户重新确认
