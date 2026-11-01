import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="crm-loading">Opening your workspace…</div>}>
      <Routes>
        <Route path="/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Suspense>
  );
}
