import {
  get,
  patch,
  put,
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

export const getProductReviews = async (
  page = 1,
  records = 20,
  status = "",
  productId = "",
) =>
  await get(
    `admin/product-reviews?page=${page}&recordPerPage=${records}${status ? `&status=${encodeURIComponent(status)}` : ""}${productId ? `&productId=${encodeURIComponent(productId)}` : ""}`,
  );
export const moderateProductReview = async (reviewId, status) =>
  await patch(`admin/product-reviews/${reviewId}`, { status });
export const createProductReview = async (review) =>
  await post("admin/product-reviews", review);
export const getRazorpayMode = async () => await get("admin/razorpay/mode");
export const setRazorpayMode = async (mode) =>
  await put("admin/razorpay/mode", { mode });
export const getRazorpayTestOrders = async (page = 1, records = 20) =>
  await get(`admin/razorpay/test-orders?page=${page}&recordPerPage=${records}`);
