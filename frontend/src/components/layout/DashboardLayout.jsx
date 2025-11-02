import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useTranslation } from "react-i18next";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardLayout({ children }) {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language || "ar");
  const { user, logout } = useAuth();

  // ===============================
  // 🌐 تبديل اللغة
  // ===============================
  const toggleLang = () => {
    const newLang = lang === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
    setLang(newLang);
  };

  // ===============================
  // 🚪 تسجيل الخروج
  // ===============================
  const handleLogout = () => {
    logout();
    toast.success("🚪 تم تسجيل الخروج بنجاح");
    setTimeout(() => {
      window.location.href = "/login";
    }, 500);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* 🧭 الشريط الجانبي */}
      <Sidebar />

      {/* ===============================
          🧱 المحتوى الرئيسي
          =============================== */}
      <div className="flex-1 flex flex-col">
        {/* 🔝 شريط علوي */}
        <header className="flex items-center justify-between bg-white border-b shadow-sm px-6 py-3">
          {/* 🌍 التحكم في اللغة + الأدوار */}
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleLang}
              size="sm"
              variant="outline"
              className="text-sm"
            >
              {lang === "ar" ? "EN" : "AR"}
            </Button>

            {/* 🔄 مبدل الأدوار */}
            <RoleSwitcher />
          </div>

          {/* 👤 معلومات المستخدم */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="text-sm text-gray-700 text-end">
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-gray-500">
                  {user.activeRole === "owner"
                    ? "مالك"
                    : user.activeRole === "tenant"
                    ? "مستأجر"
                    : user.activeRole === "office"
                    ? "مكتب عقاري"
                    : "مشرف"}
                </div>
              </div>
            )}

            {/* 🚪 زر الخروج */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* 🧱 محتوى الصفحة */}
        <main className="flex-1 p-6 bg-background text-foreground overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
