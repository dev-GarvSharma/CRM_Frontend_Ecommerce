import {
  get,
  patch,
  post,
  postMultipart,
  putMultipart,
  remove,
} from "../../app/axiosWrapper.js";

export const getAllProducts = async (page = 1, records = 20) =>
  await get(`admin/products?page=${page}&recordPerPage=${records}`);
export const getProductDetails = async (productId) =>
  await get(`admin/products/${productId}`);
export const createProduct = async (data) =>
  postMultipart("admin/products", data);
export const updateProduct = async (productId, data) =>
  putMultipart(`admin/products/${productId}`, data);
export const updateProductsVisibility = async (productIds, showOnShop) =>
  await patch("admin/products/visibility", { productIds, showOnShop });
export const deleteProduct = async (productId) =>
  await remove(`admin/products/${productId}`);
export const exportProducts = async () =>
  await post("admin/products/export?page=1&recordPerPage=100", {});
