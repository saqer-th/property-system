import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar({ onToggleLang }) {
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = React.useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-background border-b">
      {/* 👤 المستخدم */}
      <div className="flex flex-col">
        <span className="text-base font-semibold text-primary">
          {user?.name || (i18n.language === "ar" ? "مستخدم النظام" : "User")}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {user?.role || ""}
        </span>
      </div>

      {/* 🌐 الأزرار */}
      <div className="flex items-center gap-3">
        {/* 🔁 تبديل اللغة */}
        <Button
          onClick={onToggleLang}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {i18n.language === "ar" ? "English" : "العربية"}
        </Button>

        {/* 🌙 الوضع الداكن */}
        <Button
          onClick={toggleDarkMode}
          className="bg-muted text-foreground hover:bg-muted-foreground/20"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* 🚪 تسجيل الخروج */}
        <Button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
        >
          <LogOut size={16} />
          {i18n.language === "ar" ? "تسجيل الخروج" : "Logout"}
        </Button>
      </div>
    </header>
  );
}
