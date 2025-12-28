import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  Shield, 
  BarChart3, 
  FileText, 
  CreditCard, 
  LayoutDashboard,
  Activity
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Import your tab components
import OfficesTab from "./tabs/OfficesTab";
import UsersTab from "./tabs/UsersTab";
import RolesTab from "./tabs/RolesTab";
import ReportsTab from "./tabs/ReportsTab";
import AuditTab from "./tabs/AuditTab";
import SubscriptionsTab from "./tabs/SubscriptionsTab";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("offices");

  // Configuration for tabs to keep JSX clean
  const tabConfig = [
    { id: "offices", label: "المكاتب العقارية", icon: Building2, component: <OfficesTab /> },
    { id: "subscriptions", label: "إدارة الاشتراكات", icon: CreditCard, component: <SubscriptionsTab /> },
    { id: "users", label: "المستخدمين", icon: Users, component: <UsersTab /> },
    { id: "roles", label: "الصلاحيات والأدوار", icon: Shield, component: <RolesTab /> },
    { id: "reports", label: "التقارير والإحصائيات", icon: BarChart3, component: <ReportsTab /> },
    { id: "audit", label: "سجل العمليات (Audit)", icon: Activity, component: <AuditTab /> },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 max-w-[1600px] mx-auto" dir="rtl">
        
        {/* 🟢 Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="text-emerald-600" /> لوحة تحكم المسؤول
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              مركز التحكم لإدارة النظام، المكاتب، الاشتراكات، وصلاحيات المستخدمين.
            </p>
          </div>
        </div>

        {/* 🧭 Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          
          {/* Tab List - Scrollable on mobile */}
          <div className="relative">
            <TabsList className="h-auto p-1 bg-gray-100/80 rounded-xl flex justify-start overflow-x-auto w-full no-scrollbar gap-1">
              {tabConfig.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  <tab.icon size={16} />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* 📦 Tab Content Area */}
          <div className="min-h-[500px]">
            {tabConfig.map((tab) => (
              <TabsContent 
                key={tab.id} 
                value={tab.id} 
                className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {tab.component}
              </TabsContent>
            ))}
          </div>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}