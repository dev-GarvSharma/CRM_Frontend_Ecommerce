import { get, patch } from "../../app/axiosWrapper.js";

export const getAllNotifications = async () => await get("admin/notifications");
export const markAllNotificationsRead = async (notificationIds = []) =>
  await patch("admin/notifications/read", { notificationIds });
