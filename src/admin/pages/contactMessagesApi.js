import { get, patch } from "../app/axiosWrapper.js";

export const getContactMessages = () => get("admin/contact-messages?recordPerPage=100");
export const updateContactMessage = (id, changes) => patch(`admin/contact-messages/${id}`, changes);
