import { get, patch, post } from "../../app/axiosWrapper.js";

export const getOrderDetails = async (orderId) =>
  await get(`admin/orders/${orderId}`);
export const getAllOrders = async (page = 1, records = 10) =>
  await get(`admin/orders?page=${page}&recordPerPage=${records}`);
export const updateOrderStatus = async (orderId, status) =>
  await patch(`admin/orders/${orderId}/status`, { status });
export const exportOrders = async () =>
  await post("admin/orders/export?page=1&recordPerPage=100", {});
