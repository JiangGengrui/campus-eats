// 地址数据访问（参数化 SQL）
import { db } from "../../db/connection.js";
import type { Address } from "@xiaowei/shared";

interface AddressRow {
  id: number;
  user_id: number;
  receiver: string;
  phone: string;
  building: string;
  room: string;
  is_default: number;
}

function toAddress(row: AddressRow): Address {
  return {
    id: row.id,
    userId: row.user_id,
    receiver: row.receiver,
    phone: row.phone,
    building: row.building,
    room: row.room,
    isDefault: row.is_default === 1,
  };
}

const listStmt = db.prepare(
  "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC"
);
const getByIdStmt = db.prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?");
const insertStmt = db.prepare(
  "INSERT INTO addresses (user_id, receiver, phone, building, room, is_default) VALUES (?, ?, ?, ?, ?, ?)"
);
const updateStmt = db.prepare(
  "UPDATE addresses SET receiver = ?, phone = ?, building = ?, room = ? WHERE id = ? AND user_id = ?"
);
const setDefaultFlagStmt = db.prepare("UPDATE addresses SET is_default = ? WHERE id = ?");
const clearDefaultStmt = db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?");
const countDefaultStmt = db.prepare("SELECT COUNT(*) AS n FROM addresses WHERE user_id = ? AND is_default = 1");
const countStmt = db.prepare("SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?");
const earliestStmt = db.prepare("SELECT id FROM addresses WHERE user_id = ? ORDER BY id ASC LIMIT 1");
const deleteStmt = db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?");

export function listAddresses(userId: number): Address[] {
  return (listStmt.all(userId) as AddressRow[]).map(toAddress);
}

export function getAddress(id: number, userId: number): Address | undefined {
  const row = getByIdStmt.get(id, userId) as AddressRow | undefined;
  return row === undefined ? undefined : toAddress(row);
}

export function insertAddress(
  userId: number,
  input: { receiver: string; phone: string; building: string; room: string; isDefault: boolean }
): number {
  const result = insertStmt.run(userId, input.receiver, input.phone, input.building, input.room, input.isDefault ? 1 : 0);
  return Number(result.lastInsertRowid);
}

export function updateAddress(
  id: number,
  userId: number,
  input: { receiver: string; phone: string; building: string; room: string }
): boolean {
  return updateStmt.run(input.receiver, input.phone, input.building, input.room, id, userId).changes > 0;
}

export function setDefaultFlag(id: number, isDefault: boolean): void {
  setDefaultFlagStmt.run(isDefault ? 1 : 0, id);
}

export function clearDefaultFlags(userId: number): void {
  clearDefaultStmt.run(userId);
}

export function hasDefault(userId: number): boolean {
  return (countDefaultStmt.get(userId) as { n: number }).n > 0;
}

export function hasAny(userId: number): boolean {
  return (countStmt.get(userId) as { n: number }).n > 0;
}

/** F6.2：无默认时自动指定最早一条为默认 */
export function promoteEarliestAsDefault(userId: number): void {
  const row = earliestStmt.get(userId) as { id: number } | undefined;
  if (row !== undefined) {
    setDefaultFlagStmt.run(1, row.id);
  }
}

export function deleteAddress(id: number, userId: number): boolean {
  return deleteStmt.run(id, userId).changes > 0;
}
