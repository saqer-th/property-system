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
  User,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/logo.png"; 
import "@/i18n"; // Ensure i18n is initialized


// 🆕 Accepting `isCollapsed` prop
export default function Sidebar({ mobile, isCollapsed = false }) {
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
    <div className={`flex flex-col h-full bg-white transition-all duration-300 ${mobile ? "w-full" : "w-full"}`}>
      
      {/* 🟢 Brand Header */}
      <div className={`h-16 flex items-center border-b border-gray-50 flex-shrink-0 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "px-6 justify-start"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 flex-shrink-0">
             <img src={logo} alt="S" className="w-6 h-6 object-contain" />
          </div>
          {/* Hide Text when Collapsed */}
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"}`}>
            <h1 className="font-bold text-xl text-gray-900 tracking-tight whitespace-nowrap">SaqrON</h1>
            <p className="text-[10px] text-emerald-600 font-bold tracking-widest whitespace-nowrap">PropertyON</p>
          </div>
        </div>
      </div>

      {/* 🧭 Navigation Scroll Area */}
      {/* NOTE: ScrollArea handles mobile scrolling issues automatically */}
      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-6">
          {menuGroups.map((group, idx) => (
            <div key={idx} className={isCollapsed ? "text-center" : ""}>
              
              {/* Group Title (Hidden when collapsed) */}
              {!isCollapsed && (
                <h3 className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 transition-opacity duration-300">
                  {group.title}
                </h3>
              )}
              
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={itemIdx}
                      to={item.path}
                      title={isCollapsed ? item.label : ""} // Show tooltip on hover when collapsed
                      className={`
                        group flex items-center rounded-xl text-sm font-medium transition-all duration-200 relative
                        ${isCollapsed ? "justify-center p-3" : "justify-between px-3 py-2.5"}
                        ${active 
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-200" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                        <item.icon size={20} className={`flex-shrink-0 ${active ? "text-white" : "text-gray-400 group-hover:text-emerald-600 transition-colors"}`} />
                        
                        {/* Label (Hidden when collapsed) */}
                        {!isCollapsed && (
                          <span className="whitespace-nowrap transition-all duration-300">{item.label}</span>
                        )}
                      </div>
                      
                      {/* Chevron (Hidden when collapsed) */}
                      {active && !isCollapsed && <ChevronRight size={14} className="text-white/80" />}

                      {/* Optional: Dot indicator for collapsed state active items */}
                      {isCollapsed && active && (
                        <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 👤 User Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/30 flex-shrink-0">
        <div className={`flex items-center rounded-xl bg-white border border-gray-100 shadow-sm transition-all duration-300 ${isCollapsed ? "justify-center p-2" : "justify-between gap-3 p-2"}`}>
          
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? "justify-center w-full" : ""}`}>
            <Avatar className="h-9 w-9 border border-gray-100 flex-shrink-0">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
              </AvatarFallback>
            </Avatar>
            
            {/* User Details (Hidden when collapsed) */}
            {!isCollapsed && (
              <div className="flex-1 min-w-0 transition-all duration-300">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name || "Guest"}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email || user?.phone || "No ID"}</p>
              </div>
            )}
          </div>
          
          {/* Logout Button */}
          {!isCollapsed && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout} 
              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title={t("logout")}
            >
              <LogOut size={16} />
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}