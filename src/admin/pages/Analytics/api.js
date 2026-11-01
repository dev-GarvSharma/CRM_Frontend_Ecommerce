import { get, post } from "../../app/axiosWrapper.js";

export const getAnalytics = async (period = "30d") =>
  await get(`admin/analytics?period=${period}`);
export const exportAnalyticsReport = async (period = "30d") =>
  await post("admin/analytics/export", { period });
