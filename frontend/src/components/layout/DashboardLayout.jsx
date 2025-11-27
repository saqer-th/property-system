import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useAuth } from "@/context/AuthContext";

// UI Components
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import { 
  LogOut, 
  Menu, 
  Bell, 
  Globe, 
  User, 
  Settings,
  ChevronDown,
  Search,
  Sun,
  Moon,
  CreditCard,
  LayoutDashboard
} from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardLayout({ children }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const isRtl = i18n.language === "ar";
  const [isDark, setIsDark] = useState(false);

  // 🔍 Generate Page Title from Path
  const getPageTitle = () => {
    const path = location.pathname.split("/")[1];
    if (!path) return t("dashboard") || "لوحة التحكم";
    return t(`menu_${path}`) || path.charAt(0).toUpperCase() + path.slice(1);
  };

  // 🌐 Toggle Language
  const toggleLang = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  // 🌗 Toggle Theme
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  // 🚪 Logout
  const handleLogout = () => {
    logout();
    toast.success(t("logoutSuccess") || "تم تسجيل الخروج");
    setTimeout(() => window.location.href = "/login", 500);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50/50 text-gray-900" dir={isRtl ? "rtl" : "ltr"}>
      {/* 🧭 Sidebar (Desktop) */}
      <aside className="hidden md:flex md:w-72 flex-col fixed inset-y-0 z-50 border-r bg-white h-full shadow-sm transition-all">
        <Sidebar />
      </aside>

      {/* 🧱 Main Content Area */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isRtl ? "md:mr-72" : "md:ml-72"}`}>
        
        {/* 🔝 Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-white/80 px-6 backdrop-blur-md">
          
          {/* Left: Mobile Trigger & Title/Search */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-gray-500 hover:bg-gray-100">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRtl ? "right" : "left"} className="p-0 w-72">
                <Sidebar mobile />
              </SheetContent>
            </Sheet>

            {/* Page Title (Mobile/Tablet) */}
            <h2 className="text-lg font-semibold text-gray-800 md:hidden">
              {getPageTitle()}
            </h2>

            {/* 🔍 Global Search (Desktop) */}
            <div className="hidden md:flex items-center relative w-full max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
              <Input 
                placeholder={t("searchPlaceholder") || "بحث في العقود، الوحدات، المستأجرين..."} 
                className="pl-10 bg-gray-100/50 border-transparent focus:bg-white focus:border-emerald-200 focus:ring-emerald-200 transition-all h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Role Switcher (Desktop) */}
            <div className="hidden lg:block">
               <RoleSwitcher />
            </div>

            {/* Language */}
            <Button onClick={toggleLang} variant="ghost" size="icon" className="rounded-full text-gray-500 hover:bg-gray-100 hover:text-emerald-600">
              <Globe size={18} />
            </Button>

            {/* Theme */}


            {/* 🔔 Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-gray-500 hover:bg-gray-100 relative">
                  <Bell size={20} />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 border-gray-200 shadow-xl rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50 rounded-t-xl">
                  <span className="font-semibold text-sm">الإشعارات</span>
                  <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">3 جديدة</Badge>
                </div>
                <ScrollArea className="h-[300px]">
                  {[1, 2, 3].map((_, i) => (
                    <DropdownMenuItem key={i} className="p-3 cursor-pointer border-b last:border-0 focus:bg-emerald-50">
                      <div className="flex gap-3 items-start w-full">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-gray-900 leading-none">تم تسجيل عقد جديد #102{i}</p>
                          <p className="text-xs text-gray-500">منذ {i + 2} ساعات • بواسطة أحمد</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
                <div className="p-2 border-t bg-gray-50/50 rounded-b-xl text-center">
                   <Button variant="link" size="sm" className="text-xs text-emerald-600 h-auto p-0">عرض كل الإشعارات</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 👤 User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 pl-2 pr-1 gap-2 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all ml-1">
                  <Avatar className="h-8 w-8 border border-gray-200 shadow-sm">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold text-xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start text-xs">
                     <span className="font-bold text-gray-800 max-w-[100px] truncate">{user?.name || "User"}</span>
                     <span className="text-gray-500 capitalize font-medium">{user?.activeRole || "Guest"}</span>
                  </div>
                  <ChevronDown size={14} className="text-gray-400 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.email || user?.phone}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                     <Link to="/settings" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4" /> <span>{t("settings") || "الإعدادات"}</span>
                     </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                {/* Mobile Role Switcher (Inside Menu) */}
                <div className="lg:hidden">
                   <DropdownMenuSeparator />
                   <div className="p-2">
                      <RoleSwitcher />
                   </div>
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-medium">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("logout") || "تسجيل الخروج"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 🧱 Content Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
}