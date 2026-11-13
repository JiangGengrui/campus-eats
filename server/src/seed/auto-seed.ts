// 部署自举：数据库不存在或为空时灌入演示数据；已有数据则原样保留，避免重启清空线上订单
// 建表由 db/connection.ts 在开库时完成，此处只判断是否需要灌数据
import { db } from "../db/connection.js";

export async function ensureSeedData(): Promise<void> {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number } | undefined;
  if ((row?.n ?? 0) > 0) {
    console.log(`[seed] 库中已有 ${row?.n} 个用户，跳过自动灌入`);
    return;
  }
  console.log("[seed] 检测到空库，正在灌入演示数据");
  // seed.ts 是「清库重建」脚本，顶层即执行，动态引入即完成初始化
  await import("./seed.js");
}
