import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({
  children,
  roles,
  page,
  permission = "can_view",
}) {
  const { user, isAuthenticated } = useAuth();

  // 🚪 إذا لم يسجّل الدخول
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // ✅ إذا تم تمرير roles بشكل صريح
  if (roles && !roles.some((role) => user.roles?.includes(role))) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600 text-lg">
        🚫 لا تملك صلاحية الوصول إلى هذه الصفحة
      </div>
    );
  }

  // ✅ التحقق من صلاحية الصفحة من قاعدة البيانات
  if (page && user.permissions) {
    const found = user.permissions.find((p) => p.page.toLowerCase() === page.toLowerCase());
    if (!found || !found[permission]) {
      return (
        <div className="flex h-screen items-center justify-center text-gray-600 text-lg">
          🚫 لا تملك صلاحية الوصول إلى هذه الصفحة
        </div>
      );
    }
  }

  // ✅ السماح بالوصول
  return children;
}
