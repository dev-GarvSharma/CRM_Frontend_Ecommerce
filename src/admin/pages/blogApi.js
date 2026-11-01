import { get, patch, postMultipart, putMultipart, remove } from "../app/axiosWrapper.js";

export const getBlogPosts = () => get("admin/blogs?recordPerPage=100");
export const getBlogPost = (id) => get(`admin/blogs/${id}`);
export const createBlogPost = (data) => postMultipart("admin/blogs", data);
export const updateBlogPost = (id, data) => putMultipart(`admin/blogs/${id}`, data);
export const deleteBlogPost = (id) => remove(`admin/blogs/${id}`);
export const getBlogComments = (blogPostId) =>
  get(`admin/blog-comments?recordPerPage=100&blogPostId=${encodeURIComponent(blogPostId)}`);
export const moderateBlogComment = (id, status) => patch(`admin/blog-comments/${id}`, { status });
