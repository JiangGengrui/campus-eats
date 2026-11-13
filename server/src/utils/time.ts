// 北京时间口径（CODEBUDDY §3 唯一入口）：
// 容器基础镜像 node:22-slim 不带 tzdata，`datetime('now','localtime')` 实际等于 UTC，
// 因此不依赖进程/系统时区，统一按固定 +8 小时偏移换算，保证本地开发与云端表现一致。
export const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** SQL 侧等价写法：datetime('now','+8 hours')，与 BEIJING_OFFSET_MS 必须同时修改 */
export const BEIJING_SQL_MODIFIER = "+8 hours";

/** 返回"北京墙上时间"的 Date；读取时刻一律用 getUTC* 系列，避免再次叠加进程时区 */
export function beijingDate(now: Date = new Date()): Date {
  return new Date(now.getTime() + BEIJING_OFFSET_MS);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** yyyyMMdd（北京日期，订单号前缀） */
export function beijingYmd(now: Date = new Date()): string {
  const date = beijingDate(now);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

/** yyyy-MM-dd HH:mm:ss（北京墙上时间，写入 SQLite TEXT 列） */
export function beijingDateTime(now: Date = new Date()): string {
  const date = beijingDate(now);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
