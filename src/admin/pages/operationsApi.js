import { get, post, put } from "../app/axiosWrapper.js";

export const getCoupons = () => get("admin/coupons?recordPerPage=100");
export const getPromotions = () => get("admin/promotions?recordPerPage=100");
export const getAbandonedCarts = () => get("admin/abandoned-carts?recordPerPage=100");
export const sendCartRecovery = (sessionId) => post(`admin/abandoned-carts/${sessionId}/recover`, {});
export const getAuditHistory = () => get("admin/audit-log?recordPerPage=100");
export const getInventoryVariants = () => get("admin/inventory?recordPerPage=100");
export const createCoupon = (coupon) => post("admin/coupons", coupon);
export const createPromotion = (promotion) => post("admin/promotions", promotion);
export const updateCoupon = (id, values) => put(`admin/coupons/${id}`, values);
export const updatePromotion = (id, values) => put(`admin/promotions/${id}`, values);
