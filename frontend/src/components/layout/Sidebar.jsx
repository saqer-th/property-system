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
  FileSpreadsheet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  // -----------------------------
  // 1️⃣ القائمة العامة
  // -----------------------------
  const generalMenu = [
    { icon: <Home size={18} />, label: t("menu_dashboard") || "لوحة التحكم", path: "/dashboard" },
    { icon: <FileText size={18} />, label: t("menu_contracts") || "العقود", path: "/contracts" },
    { icon: <Building size={18} />, label: t("menu_properties") || "الأملاك", path: "/properties" },
    { icon: <DollarSign size={18} />, label: t("menu_payments") || "المدفوعات", path: "/payments" },
    { icon: <Receipt size={18} />, label: t("menu_receipts") || "السندات", path: "/receipts" },
    { icon: <Wrench size={18} />, label: t("menu_expenses") || "المصروفات", path: "/expenses" },
  ];

  // -----------------------------
  // 2️⃣ قائمة المكتب
  // -----------------------------
  const officeId = user?.office_id || user?.id || 0;

  const officeMenu = [];

  if (["office", "office_admin", "admin"].includes(user?.activeRole)) {
    officeMenu.push({
      icon: <Briefcase size={18} />,
      label: t("menu_office_panel") || "لوحة المكتب",
      path: `/offices/${officeId}`,
    });
  }

  // -----------------------------
  // 3️⃣ قائمة التذكيرات (منفصلة)
  // -----------------------------
  const reminderMenu = [];

  if (["office", "office_admin", "admin", "self_office_admin"].includes(user?.activeRole)) {
    reminderMenu.push({
      icon: <Clock size={18} />,
      label: t("menu_reminders") || "التذكيرات",
      path: "/office/reminders/log",
    });
  }

  // -----------------------------
  // 4️⃣ التقارير
  // -----------------------------
  const reportMenu = [];

  if (["office", "office_admin", "admin", "self_office_admin"].includes(user?.activeRole)) {
    reportMenu.push({
      icon: <FileSpreadsheet size={18} />,
      label: t("menu_reports") || "التقارير",
      path: "/reports",
    });
  }

  // -----------------------------
  // 5️⃣ الأدمن
  // -----------------------------
  const adminMenu = [];

  if (user?.activeRole === "admin") {
    adminMenu.push({
      icon: <Shield size={18} />,
      label: t("menu_admin_dashboard") || "لوحة الأدمن",
      path: "/admin/dashboard",
    });
  }

  // -----------------------------
  // 6️⃣ الإعدادات
  // -----------------------------
  const settingsMenu = [
    {
      icon: <Settings size={18} />,
      label: t("menu_settings") || "الإعدادات",
      path: "/settings",
    },
  ];

  // -----------------------------
  // بناء القائمة النهائية
  // -----------------------------
  let finalMenu = [...generalMenu];

  if (officeMenu.length > 0) {
    finalMenu.push({ divider: true }, ...officeMenu);
  }

  if (reminderMenu.length > 0) {
    finalMenu.push({ divider: true }, ...reminderMenu);
  }

  if (reportMenu.length > 0) {
    finalMenu.push({ divider: true }, ...reportMenu);
  }

  if (adminMenu.length > 0) {
    finalMenu.push({ divider: true }, ...adminMenu);
  }

  finalMenu.push({ divider: true }, ...settingsMenu);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <aside className="h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      <div className="text-center py-5 text-xl font-bold text-primary border-b border-sidebar-border">
        🏠 Property System
      </div>

      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        {finalMenu.map((item, idx) =>
          item.divider ? (
            <div key={`divider-${idx}`} className="my-3 border-t border-sidebar-border opacity-60" />
          ) : (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        )}
      </nav>

      <div className="p-4 text-xs text-center text-gray-400 border-t border-sidebar-border">
        © {new Date().getFullYear()} Property System
      </div>
    </aside>
  );
}
