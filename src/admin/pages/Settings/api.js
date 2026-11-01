import { get, put } from "../../app/axiosWrapper.js";

const settingKeys = {
  storeName: "store_name",
  supportEmail: "support_email",
  description: "store_description",
  onlineStore: "online_store",
  orderNotifications: "order_notifications",
  emailNotifications: "email_notifications",
  lowStockNotifications: "low_stock_notifications",
  guestCheckout: "guest_checkout",
  requirePhone: "require_phone",
  paymentTerms: "payment_terms",
  currency: "currency",
  timezone: "timezone",
  lowStockThreshold: "low_stock_threshold",
};

export const getStoreSettings = async () => {
  const result = await get("admin/settings");
  if (!result.success) return result;
  const settings = result.data?.data || {};
  const mapped = Object.fromEntries(
    Object.entries(settingKeys).map(([clientKey, apiKey]) => [
      clientKey,
      settings[apiKey] ?? settings[clientKey],
    ]),
  );
  return { ...result, data: { ...result.data, data: mapped } };
};

export const saveStoreSettings = async (settings) =>
  put(
    "admin/settings",
    Object.fromEntries(
      Object.entries(settingKeys)
        .filter(([clientKey]) => settings[clientKey] !== undefined)
        .map(([clientKey, apiKey]) => [apiKey, settings[clientKey]]),
    ),
  );
