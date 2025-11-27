import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  FileText,
  Building2,
  CreditCard,
  Receipt,
  Wrench,
  Briefcase,
  Clock,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/logo.png"; 

export default function Sidebar({ mobile }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Check active route
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  // 🧠 Generate Menu based on Roles
  const menuGroups = useMemo(() => {
    const role = user?.activeRole;
    const groups = [];

    // 1. General (Everyone)
    groups.push({
      title: t("menu_general") || "العامة",
      items: [
        { icon: Home, label: t("menu_dashboard") || "الرئيسية", path: "/dashboard" },
        { icon: FileText, label: t("menu_contracts") || "العقود", path: "/contracts" },
        { icon: Building2, label: t("menu_properties") || "الأملاك", path: "/properties" },
        { icon: CreditCard, label: t("menu_payments") || "المدفوعات", path: "/payments" },
        { icon: Receipt, label: t("menu_receipts") || "السندات", path: "/receipts" },
        { icon: Wrench, label: t("menu_expenses") || "المصروفات", path: "/expenses" },
      ],
    });

    // 2. Office Management (Admins & Offices)
    if (["office", "office_admin", "admin"].includes(role)) {
      groups.push({
        title: t("menu_office") || "إدارة المكتب",
        items: [
          { icon: Briefcase, label: t("menu_office_panel") || "ملف المكتب", path: `/offices/${user?.office_id || user?.id}` },
          { icon: Clock, label: t("menu_reminders") || "التذكيرات", path: "/office/reminders/log" },
          { icon: BarChart3, label: t("menu_reports") || "التقارير", path: "/reports" },
        ],
      });
    }

    // 3. System Admin (Super Admin Only)
    if (role === "admin") {
      groups.push({
        title: t("menu_admin") || "إدارة النظام",
        items: [
          { icon: Shield, label: t("menu_admin_dashboard") || "لوحة المسؤول", path: "/admin/dashboard" },
        ],
      });
    }

    // 4. Settings (Everyone)
    groups.push({
      title: t("menu_system") || "النظام",
      items: [
        { icon: Settings, label: t("menu_settings") || "الإعدادات", path: "/settings" },
      ],
    });

    return groups;
  }, [user, t]);

  return (
    <div className={`flex flex-col h-full bg-white ${mobile ? "w-full" : "w-full border-r border-gray-100"}`}>
      
      {/* 🟢 Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
             <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 tracking-tight">SaqrON</h1>
            <p className="text-[10px] text-emerald-600 font-bold  tracking-widest">PropertyON</p>
          </div>
        </div>
      </div>

      {/* 🧭 Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-6 custom-scrollbar">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={itemIdx}
                    to={item.path}
                    className={`
                      group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${active 
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-200" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={active ? "text-white" : "text-gray-400 group-hover:text-emerald-600 transition-colors"} />
                      <span>{item.label}</span>
                    </div>
                    {active && <ChevronRight size={14} className="text-white/80" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 👤 User Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/30">
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-gray-100 shadow-sm group hover:border-emerald-200 transition-colors">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-9 w-9 border border-gray-100">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name || "Guest"}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email || user?.phone || "No ID"}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout} 
            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t("logout")}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>

    </div>
  );
}