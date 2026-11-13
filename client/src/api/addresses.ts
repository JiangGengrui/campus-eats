import type { Address } from "@xiaowei/shared";
import { request } from "./client.js";

export interface AddressInput {
  receiver: string;
  phone: string;
  building: string;
  room: string;
  isDefault: boolean;
}

export const addressApi = {
  list: () => request<Address[]>({ method: "GET", url: "/addresses" }),
  create: (input: AddressInput) => request<Address>({ method: "POST", url: "/addresses", data: input }),
  update: (id: number, input: AddressInput) =>
    request<Address>({ method: "PUT", url: `/addresses/${id}`, data: input }),
  remove: (id: number) => request<null>({ method: "DELETE", url: `/addresses/${id}` }),
  setDefault: (id: number) => request<Address>({ method: "PUT", url: `/addresses/${id}/default` }),
};
