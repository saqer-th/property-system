import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProtectedRoute({
  children,
  roles,
  page,
  permission = "can_view",
}) {
  const { user, isAuthenticated, loading } = useAuth(); // Ensure your AuthContext exposes 'loading'
  const location = useLocation();
  const navigate = useNavigate();

  // ⏳ 1. Loading State (Prevents flickering)
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // 🚪 2. Authentication Check
  if (!isAuthenticated) {
    // Save the location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 🛡️ 3. Role-Based Access Control (RBAC)
  // We check against the user's *Active Role* to ensure context isolation
  if (roles && roles.length > 0) {
    const hasRole = roles.some((role) => {
      // Check activeRole first (if your app supports switching), otherwise check all roles
      return user.activeRole === role || user.roles?.includes(role);
    });

    if (!hasRole) {
      return <UnauthorizedView message="لا تملك الدور الوظيفي المناسب لدخول هذه الصفحة." />;
    }
  }

  // 🔐 4. Permission-Based Access Control
  if (page && user?.permissions) {
    // Case-insensitive check
    const pagePermission = user.permissions.find(
      (p) => p.page?.toLowerCase() === page.toLowerCase()
    );

    if (!pagePermission || !pagePermission[permission]) {
      return <UnauthorizedView message="عذراً، ليس لديك صلاحية للقيام بهذا الإجراء." />;
    }
  }

  // ✅ Access Granted
  return children;
}

// --- 🚫 Unauthorized UI Component ---
function UnauthorizedView({ message }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-red-100 shadow-lg">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">تم رفض الوصول</h1>
          <p className="text-gray-500 mb-6">{message}</p>

          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} className="mr-2" /> رجوع
            </Button>
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
              onClick={() => navigate("/")}
            >
              الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}