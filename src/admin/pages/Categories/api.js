import { get, postMultipart, putMultipart, remove } from "../../app/axiosWrapper.js";

export const getAllCategories = async (page = 1, records = 20) =>
  await get(`admin/categories?page=${page}&recordPerPage=${records}`);
export const getCategoryDetails = async (categoryId) =>
  await get(`admin/categories/${categoryId}`);
export const createCategory = async (category) =>
  await postMultipart("admin/categories", category);
export const updateCategory = async (categoryId, category) =>
  await putMultipart(`admin/categories/${categoryId}`, category);
export const deleteCategory = async (categoryId) =>
  await remove(`admin/categories/${categoryId}`);
