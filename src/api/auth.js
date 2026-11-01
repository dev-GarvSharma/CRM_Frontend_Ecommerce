import { post } from '../admin/app/axiosWrapper.js';

export const login = (credentials) => post('auth/login', credentials);
export const confirmVerification = (challenge) => post('auth/verification/confirm', challenge);
export const logout = () => post('auth/logout', {});

export const isAdminAccount = (user = {}) => {
  const role = user.role?.name || user.role?.type || user.roleName || user.role;
  return user.isAdmin === true || String(role || '').toLowerCase() === 'admin' ||
    user.roles?.some((item) => String(item?.name || item?.role?.name || item).toLowerCase() === 'admin');
};
