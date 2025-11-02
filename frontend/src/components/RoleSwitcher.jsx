import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Building2, Home, User, Shield } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";

export default function RoleSwitcher() {
  const { user, setUserRoleView, refreshUser } = useAuth();
  const [activeRole, setActiveRole] = useState(user?.activeRole || user?.roles?.[0]);
  const [loadingRole, setLoadingRole] = useState(null);

  useEffect(() => {
    if (user && !user.activeRole && user.roles?.length) {
      setUserRoleView(user.roles[0]);
    }
  }, [user]);

  if (!user?.roles?.length) return null;

  const icons = {
    owner: <Home className="w-4 h-4" />,
    tenant: <User className="w-4 h-4" />,
    office: <Building2 className="w-4 h-4" />,
    admin: <Shield className="w-4 h-4" />,
    office_admin: <Shield className="w-4 h-4" />,
  };

  const labels = {
    owner: "مالك",
    tenant: "مستأجر",
    office: "مكتب",
    admin: "مشرف عام",
    office_admin: "مشرف مكتب",
  };

  // 🔄 تبديل الدور من السيرفر مباشرة
  const handleSwitch = async (role) => {
    if (role === activeRole) return; // لا حاجة لو نفس الدور

    setLoadingRole(role);
    try {
      const res = await fetch(`${API_URL}/auth/switch-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ activeRole: role }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success(data.message || "تم تبديل الدور بنجاح");
      setActiveRole(role);
      setUserRoleView(role);
      refreshUser?.(); // لتحديث الصلاحيات من السيرفر
    } catch (err) {
      console.error("❌ switch role error:", err);
      toast.error(err.message || "فشل تبديل الدور");
    } finally {
      setLoadingRole(null);
    }
  };

  // ✨ إخفاء أدوار المكتب لو كانت موقوفة
  const filteredRoles = user.roles.filter((r) => {
    if (user.office_status === "suspended" || user.office_status === "موقوف") return false;
    if (user.office_is_active === false && ["office", "office_admin"].includes(r)) return false;
    return true;
  });

  return (
    <div className="flex items-center gap-2 bg-white/80 border border-gray-100 rounded-xl px-3 py-2 shadow-sm backdrop-blur-sm">
      <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
        الوضع الحالي:
      </span>
      <div className="flex gap-1">
        {filteredRoles.map((role) => {
          const isActive = role === activeRole;
          const isLoading = loadingRole === role;

          return (
            <motion.div
              key={role}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleSwitch(role)}
                disabled={isLoading}
                className={`flex items-center gap-1 text-sm rounded-lg px-3 py-1.5 transition ${
                  isActive
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {isLoading ? (
                  <span className="animate-pulse text-xs text-gray-400">جاري...</span>
                ) : (
                  <>
                    {icons[role]}
                    {labels[role]}
                  </>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
