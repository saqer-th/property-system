import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building2, 
  Home, 
  User, 
  Shield, 
  Check, 
  ChevronsUpDown, 
  Loader2 
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export default function RoleSwitcher() {
  const { t } = useTranslation();
  const { user, setUserRoleView, refreshUser } = useAuth();
  const [activeRole, setActiveRole] = useState(user?.activeRole || user?.roles?.[0]);
  const [loadingRole, setLoadingRole] = useState(null);

  // 🎨 Role Configuration (Icons, Colors, Labels)
  const roleConfig = {
    admin: { 
      label: t("admin"), 
      icon: <Shield className="w-4 h-4" />, 
      color: "bg-purple-100 text-purple-700 border-purple-200",
      iconColor: "text-purple-600"
    },
    office: { 
      label: t("office"), 
      icon: <Building2 className="w-4 h-4" />, 
      color: "bg-blue-100 text-blue-700 border-blue-200",
      iconColor: "text-blue-600"
    },
    office_admin: { 
      label: t("office_admin"), 
      icon: <Shield className="w-4 h-4" />, 
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      iconColor: "text-indigo-600"
    },
    owner: { 
      label: t("owner"), 
      icon: <Home className="w-4 h-4" />, 
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      iconColor: "text-emerald-600"
    },
    tenant: { 
      label: t("tenant"), 
      icon: <User className="w-4 h-4" />, 
      color: "bg-amber-100 text-amber-700 border-amber-200",
      iconColor: "text-amber-600"
    },
    self_office_admin: { 
      label: t("self_office_admin"), 
      icon: <Shield className="w-4 h-4" />,
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      iconColor: "text-indigo-600"
    }
  };

  useEffect(() => {
    if (user && !user.activeRole && user.roles?.length) {
      setUserRoleView(user.roles[0]);
    }
  }, [user]);

  // 🛑 If no roles, don't render
  if (!user?.roles?.length) return null;

  // 🔄 Handle Switch Logic
  const handleSwitch = async (role) => {
    if (role === activeRole) return;

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

      toast.success(data.message || t("roleSwitchedSuccessfully") || "تم تبديل الدور بنجاح");
      setActiveRole(role);
      setUserRoleView(role);
      if (refreshUser) refreshUser(); 
    } catch (err) {
      console.error("❌ switch role error:", err);
      toast.error(err.message || t("roleSwitchFailed") || "فشل تبديل الدور");
    } finally {
      setLoadingRole(null);
    }
  };

  // ✨ Filter suspended office roles
  const availableRoles = user.roles.filter((r) => {
    if (user.office_status === "suspended" || user.office_status === "موقوف") return false;
    if (user.office_is_active === false && ["office", "office_admin"].includes(r)) return false;
    return true;
  });

  // Get current role details
  const currentConfig = roleConfig[activeRole] || roleConfig.default;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="lg"
          className="h-10 pl-2 pr-3 gap-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm bg-white"
        >
          {/* Current Role Icon Badge */}
          <div className={`flex items-center justify-center w-6 h-6 rounded-md ${currentConfig.color}`}>
            {currentConfig.icon}
          </div>
          
          <div className="flex flex-col items-start text-xs hidden md:flex">
            <span className="text-gray-500 font-normal leading-none mb-0.5">{t("currentRole") || "الدور الحالي"}</span>
            <span className="font-bold text-gray-900 leading-none">{currentConfig.label}</span>
          </div>

          <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-2">
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal px-2 py-1.5">
          {t("switchAccount") || "تبديل الحساب"}
        </DropdownMenuLabel>
        
        {availableRoles.map((role) => {
          const config = roleConfig[role] || roleConfig.default;
          const isActive = role === activeRole;
          const isLoading = loadingRole === role;

          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleSwitch(role)}
              disabled={isLoading || isActive}
              className={`
                flex items-center justify-between cursor-pointer rounded-lg px-2 py-2 mb-1 last:mb-0 transition-colors
                ${isActive ? "bg-gray-50" : "hover:bg-gray-50"}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${config.color}`}>
                  {config.icon}
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-600"}`}>
                  {config.label}
                </span>
              </div>

              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              {isActive && !isLoading && <Check className="w-4 h-4 text-emerald-600" />}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
           <Badge variant="outline" className="w-full justify-center text-gray-400 font-normal text-[10px]">
              {user.phone}
           </Badge>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}