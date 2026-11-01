import { get, post } from "../../app/axiosWrapper.js";

export const getDashboardOverview = async () => await get("admin/dashboard");
export const exportDashboardReport = async (period = "7d") =>
  await post("admin/dashboard/export", { period });
