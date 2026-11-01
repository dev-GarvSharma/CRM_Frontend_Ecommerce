import { get, patch, post } from "../../app/axiosWrapper.js";

export const getInventory = async (page = 1, records = 20) =>
  await get(`admin/inventory?page=${page}&recordPerPage=${records}`);
export const updateInventory = async (productId, quantity) =>
  await patch(`admin/inventory/${productId}`, { quantity });
export const restockInventory = async (productId, quantity) =>
  await post(`admin/inventory/${productId}/restock`, { quantity });
export const exportInventoryReport = async () =>
  await post("admin/inventory/export?page=1&recordPerPage=100", {});
