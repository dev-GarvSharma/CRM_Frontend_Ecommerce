import { get, post, put, remove } from "../../app/axiosWrapper.js";

export const getAllCustomers = async (page = 1, records = 20) =>
  await get(`admin/customers?page=${page}&recordPerPage=${records}`);
export const getCustomerDetails = async (customerId) =>
  await get(`admin/customers/${customerId}`);
export const getCustomerOrders = async (customerId, page = 1, records = 20) =>
  await get(
    `admin/customers/${customerId}/orders?page=${page}&recordPerPage=${records}`,
  );
export const createCustomer = async (customer) =>
  await post("admin/customers", customer);
export const updateCustomer = async (customerId, customer) =>
  await put(`admin/customers/${customerId}`, customer);
export const deleteCustomer = async (customerId) =>
  await remove(`admin/customers/${customerId}`);
export const exportCustomers = async () =>
  await post("admin/customers/export?page=1&recordPerPage=100", {});
