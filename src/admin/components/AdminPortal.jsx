import { createPortal } from "react-dom";

export default function AdminPortal({ children }) {
  return createPortal(children, document.body);
}
