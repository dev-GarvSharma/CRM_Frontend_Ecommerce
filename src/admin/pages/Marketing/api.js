import { get, post, put, remove } from "../../app/axiosWrapper.js";

export const getMarketingOverview = async () => await get("admin/marketing");
export const getMarketingCampaigns = async (page = 1, records = 20, search = "", status = "") => {
  const params = new URLSearchParams({ page, recordPerPage: records });
  if (search) params.set("search", search);
  if (status && status !== "All campaigns") params.set("status", status);
  return get(`admin/marketing/campaigns?${params.toString()}`);
};
export const getCampaignDetails = async (campaignId) =>
  await get(`admin/marketing/campaigns/${campaignId}`);
export const getMarketingSubscribers = async (page = 1, records = 20, search = "") => {
  const params = new URLSearchParams({ page, recordPerPage: records });
  if (search) params.set("search", search);
  return get(`admin/marketing/subscribers?${params.toString()}`);
};
export const createCampaign = async (campaign) =>
  await post("admin/marketing/campaigns", campaign);
export const updateCampaign = async (campaignId, campaign) =>
  await put(`admin/marketing/campaigns/${campaignId}`, campaign);
export const sendCampaign = async (campaignId) =>
  await post(`admin/marketing/campaigns/${campaignId}/send`, {});
export const deleteCampaign = async (campaignId) =>
  await remove(`admin/marketing/campaigns/${campaignId}`);
