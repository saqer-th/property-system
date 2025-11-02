import React, { createContext, useContext, useState, useEffect } from "react";
import { API_URL, API_KEY } from "@/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧠 استرجاع المستخدم من التخزين المحلي عند أول تحميل
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.token) {
          setUser(parsed);
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to restore user:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ هل المستخدم مسجّل دخول؟
  const isAuthenticated = !!user?.token;

  // =====================================================
  // 🔐 تسجيل الدخول
  // =====================================================
  const login = (data) => {
    if (!data || !data.token) {
      console.error("❌ بيانات الدخول غير صحيحة:", data);
      return;
    }

    const userData = {
      id: data.id,
      name: data.name || "مستخدم",
      phone: data.phone,
      roles: data.roles || [],
      role_id: data.role_id,
      token: data.token,
      activeRole: data.activeRole || data.roles?.[0] || "tenant",
      permissions: data.permissions || [],
    };

    // 🕓 نحفظ المستخدم فورًا
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));

    // ⚙️ نحمل الصلاحيات في الخلفية بدون تأخير التنقل
    fetch(`${API_URL}/admin/user/permissions`, {
      headers: {
        "x-api-key": API_KEY,
        Authorization: `Bearer ${data.token}`,
        "x-active-role": userData.activeRole,
      },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.permissions?.length) {
          const rolePerms = result.permissions.filter(
            (p) => p.role_id === data.role_id
          );
          const updated = { ...userData, permissions: rolePerms };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
        }
      })
      .catch((err) =>
        console.warn("⚠️ لم يتم تحميل صلاحيات المستخدم:", err.message)
      );
  };

  // =====================================================
  // 🔄 تبديل الدور النشط
  // =====================================================
  const setUserRoleView = async (role) => {
    if (!user) return;

    try {
      // ✅ استدعاء الـ API لإصدار توكن جديد
      const res = await fetch(`${API_URL}/auth/switch-role`, {  // ❌ إزالة /api
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
        },
        credentials: "include",
        body: JSON.stringify({ activeRole: role }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error("❌ Switch role failed:", data);
        alert(data.message || "❌ فشل تبديل الدور");
        return;
      }

      // ✅ تحديث المستخدم بالتوكن الجديد
      const updated = {
        ...user,
        activeRole: data.activeRole,
        token: data.token,
        permissions: data.permissions,
        role_id: data.role_id,
      };

      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));

      console.log("✅ Role switched successfully to:", data.activeRole);

      // ✅ إعادة تحميل الصفحة لتطبيق التغييرات
      window.location.reload();
    } catch (err) {
      console.error("❌ Error switching role:", err);
      alert("حدث خطأ أثناء تبديل الدور: " + err.message);
    }
  };

  // =====================================================
  // 🚪 تسجيل الخروج
  // =====================================================
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  // =====================================================
  // ⏰ التحقق من انتهاء الجلسة تلقائيًا
  // =====================================================
  useEffect(() => {
    if (user?.token) {
      const payload = parseJwt(user.token);
      if (payload?.exp && payload.exp * 1000 < Date.now()) {
        console.warn("⏰ انتهت صلاحية الجلسة، تم تسجيل الخروج تلقائيًا");
        logout();
      }
    }
  }, [user]);

  // =====================================================
  // 🧩 دالة مساعدة لقراءة بيانات الـ JWT
  // =====================================================
  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  };

  // 🚀 أثناء تحميل البيانات من التخزين، لا نعرض الواجهة
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        ⏳ جارٍ التحميل...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        setUserRoleView,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ===========================
// 🪄 هوك جاهز للاستخدام
// ===========================
export function useAuth() {
  return useContext(AuthContext);
}
