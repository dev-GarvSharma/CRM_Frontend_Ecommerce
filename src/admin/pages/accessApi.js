import { get, post, put } from "../app/axiosWrapper.js";

export const getRoles = () => get("admin/roles");
export const getPermissions = () => get("admin/permissions");
export const createRole = (role) => post("admin/roles", role);
export const updateRole = (roleId, role) => put(`admin/roles/${roleId}`, role);
export const assignUserRoles = (userId, roleIds) =>
  put(`admin/users/${userId}/roles`, { roleIds });
export const getUserPermissions = (userId) =>
  get(`admin/users/${userId}/permissions`);
export const updateUserPermissions = (userId, permissions) =>
  put(`admin/users/${userId}/permissions`, { permissions });
export const getUsers = async (page = 1, records = 100) => {
  const result = await get(`admin/users?page=${page}&recordPerPage=${records}`);
  if (result.success) return result;
  const fallback = await get(`admin/customers?page=${page}&recordPerPage=${records}`);
  return fallback.success ? fallback : result;
};
