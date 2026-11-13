// 地址业务规则：默认地址唯一性（SPEC F6.2），事务只在此层（CODEBUDDY §3）
import type { Address } from "@xiaowei/shared";
import { db } from "../../db/connection.js";
import { notFound } from "../../errors.js";
import { ERROR_CODES } from "@xiaowei/shared";
import * as repo from "./addresses.repo.js";

export function listAddresses(userId: number): Address[] {
  return repo.listAddresses(userId);
}

export function createAddress(
  userId: number,
  input: { receiver: string; phone: string; building: string; room: string; isDefault: boolean }
): Address {
  const create = db.transaction(() => {
    // 首个地址强制设为默认；设为默认前先清掉旧默认，保证全局唯一
    const shouldBeDefault = input.isDefault || !repo.hasAny(userId);
    if (shouldBeDefault) {
      repo.clearDefaultFlags(userId);
    }
    const id = repo.insertAddress(userId, { ...input, isDefault: shouldBeDefault });
    return repo.getAddress(id, userId) as Address;
  });
  return create();
}

export function updateAddress(
  userId: number,
  id: number,
  input: { receiver: string; phone: string; building: string; room: string; isDefault: boolean }
): Address {
  const update = db.transaction(() => {
    const existing = repo.getAddress(id, userId);
    if (existing === undefined) {
      throw notFound(ERROR_CODES.ADDRESS_NOT_FOUND);
    }
    repo.updateAddress(id, userId, input);
    if (input.isDefault) {
      repo.clearDefaultFlags(userId);
      repo.setDefaultFlag(id, true);
    } else if (existing.isDefault) {
      // 把原默认改成非默认后，自动补位最早的地址（SPEC F6.2）
      repo.setDefaultFlag(id, false);
      repo.promoteEarliestAsDefault(userId);
    }
    return repo.getAddress(id, userId) as Address;
  });
  return update();
}

export function deleteAddress(userId: number, id: number): void {
  const remove = db.transaction(() => {
    const existing = repo.getAddress(id, userId);
    if (existing === undefined) {
      throw notFound(ERROR_CODES.ADDRESS_NOT_FOUND);
    }
    repo.deleteAddress(id, userId);
    if (existing.isDefault && repo.hasAny(userId) && !repo.hasDefault(userId)) {
      repo.promoteEarliestAsDefault(userId);
    }
  });
  remove();
}

export function setDefaultAddress(userId: number, id: number): Address {
  const setDefault = db.transaction(() => {
    const existing = repo.getAddress(id, userId);
    if (existing === undefined) {
      throw notFound(ERROR_CODES.ADDRESS_NOT_FOUND);
    }
    repo.clearDefaultFlags(userId);
    repo.setDefaultFlag(id, true);
    return repo.getAddress(id, userId) as Address;
  });
  return setDefault();
}
