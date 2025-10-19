import React from "react";
import {
  Home,
  FileText,
  Building,
  DollarSign,
  Wrench,
  Receipt,
  Settings,
  ClipboardList,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();

  // 🧭 تعريف القوائم
  const menu = [
    {
      icon: <Home size={18} />,
      label: t("menu_dashboard"),
      path: "/dashboard",
    },
    {
      icon: <FileText size={18} />,
      label: t("menu_contracts"),
      path: "/contracts",
    },
    {
      icon: <Building size={18} />,
      label: t("menu_properties"),
      path: "/properties",
    },

    {
      icon: <DollarSign size={18} />,
      label: t("menu_payments"),
      path: "/payments",
    },
    {
      icon: <Receipt size={18} />,
      label: t("menu_receipts"),
      path: "/receipts",
    },
    {
      icon: <Wrench size={18} />,
      label: t("menu_expenses"),
      path: "/expenses",
    },
    {
      icon: <Settings size={18} />,
      label: t("menu_settings"),
      path: "/settings",
    },
  ];

  // 🔍 التحقق من المسار الحالي (يشمل المسارات الفرعية)
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <aside className="h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      {/* 🔹 العنوان */}
      <div className="text-center py-5 text-xl font-bold text-primary border-b border-sidebar-border">
        🏠 Property System
      </div>

      {/* 🔹 القوائم */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        {menu.map((item, idx) => {
          const active = isActive(item.path);
          return (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary"
              }`}
            >
              <span className="flex items-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 🔹 تذييل جانبي */}
      <div className="p-4 text-xs text-center text-gray-400 border-t border-sidebar-border">
        © {new Date().getFullYear()} Property System
      </div>
    </aside>
  );
}
