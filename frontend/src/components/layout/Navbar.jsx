import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  LogOut,
  Menu,
  User,
  Languages,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
      {/* 👤 معلومات المستخدم */}
      <div className="flex flex-col">
        <span className="text-base font-semibold text-primary">
          {user?.name || (i18n.language === "ar" ? "مستخدم النظام" : "User")}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {user?.role || ""}
        </span>
      </div>

      {/* 📌 القائمة المنسدلة */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            <User size={16} />
            <ChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-48"
        >
          {/* 🔁 تغيير اللغة */}
          <DropdownMenuItem onClick={onToggleLang} className="cursor-pointer flex gap-2">
            <Languages size={16} />
            {i18n.language === "ar" ? "English" : "العربية"}
          </DropdownMenuItem>

          {/* 🌙 الوضع الليلي */}
          <DropdownMenuItem onClick={toggleDarkMode} className="cursor-pointer flex gap-2">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode
              ? i18n.language === "ar" ? "الوضع النهاري" : "Light Mode"
              : i18n.language === "ar" ? "الوضع الليلي" : "Dark Mode"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 🚪 تسجيل الخروج */}
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-600 flex gap-2 font-semibold"
          >
            <LogOut size={16} />
            {i18n.language === "ar" ? "تسجيل الخروج" : "Logout"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
