import React from "react";
import {
  Home,
  FileText,
  Building,
  DollarSign,
  Wrench,
  Receipt,
  Settings,
  Shield,
  ClipboardList,
  Users,
  Briefcase,
  UserPlus,
  Bell,
  MessageCircle,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();

  // ✅ لتحديد العنصر النشط في القائمة
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  // 📋 القوائم العامة (لكل المستخدمين)
  const generalMenu = [
    { icon: <Home size={18} />, label: t("menu_dashboard") || "لوحة التحكم", path: "/dashboard" },
    { icon: <FileText size={18} />, label: t("menu_contracts") || "العقود", path: "/contracts" },
    { icon: <Building size={18} />, label: t("menu_properties") || "الأملاك", path: "/properties" },
    { icon: <DollarSign size={18} />, label: t("menu_payments") || "المدفوعات", path: "/payments" },
    { icon: <Receipt size={18} />, label: t("menu_receipts") || "السندات", path: "/receipts" },
    { icon: <Wrench size={18} />, label: t("menu_expenses") || "المصروفات", path: "/expenses" },
  ];

  // 🏢 قائمة المكاتب
  const officeId = user?.office_id || user?.id || 0;
  const officeMenu = [
    {
      icon: <Briefcase size={18} />,
      label: t("menu_office_panel") || "لوحة المكتب",
      path: `/offices/${officeId}`,
    },
  ];



  // 🔔 قسم التذكيرات — متاح للمكتب والمشرف
  if (["office", "office_admin"].includes(user?.activeRole)) {
    officeMenu.push(
      { divider: true },

      {
        icon: <Clock size={18} />,
        label: t("menu_reminders") || "التذكيرات",
        path: "/office/reminders/log",
      }

    );
  }

  // 🛡️ قائمة الأدمن
  const adminMenu = [
    {
      icon: <Shield size={18} />,
      label: t("menu_admin_dashboard") || "لوحة الأدمن",
      path: "/admin/dashboard",
    },
    {
      icon: <Users size={18} />,
      label: t("menu_admin_users") || "إدارة المستخدمين",
      path: "/admin/users",
    },
    {
      icon: <ClipboardList size={18} />,
      label: t("menu_admin_audit") || "سجل العمليات",
      path: "/admin/audit",
    },
  ];

  // ⚙️ الإعدادات العامة
  const settingsMenu = [
    {
      icon: <Settings size={18} />,
      label: t("menu_settings") || "الإعدادات",
      path: "/settings",
    },
  ];

  // 🧱 بناء القائمة النهائية
  let finalMenu = [...generalMenu];

  // 📦 إضافة قائمة المكتب
  if (["office", "office_admin"].includes(user?.activeRole)) {
    finalMenu.push({ divider: true }, ...officeMenu);
  }

  // 📦 إضافة قائمة الأدمن
  if (user?.activeRole === "admin") {
    finalMenu.push({ divider: true }, ...adminMenu);
  }

  // ⚙️ إضافة الإعدادات
  finalMenu.push({ divider: true }, ...settingsMenu);

  return (
    <aside className="h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      {/* 🏠 العنوان */}
      <div className="text-center py-5 text-xl font-bold text-primary border-b border-sidebar-border">
        🏠 Property System
      </div>

      {/* 📋 القوائم */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        {finalMenu.map((item, idx) => {
          if (item.divider) {
            return (
              <div
                key={`divider-${idx}`}
                className="my-3 border-t border-sidebar-border opacity-60"
              />
            );
          }

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

      {/* ⚙️ التذييل */}
      <div className="p-4 text-xs text-center text-gray-400 border-t border-sidebar-border">
        © {new Date().getFullYear()} Property System
      </div>
    </aside>
  );
}
