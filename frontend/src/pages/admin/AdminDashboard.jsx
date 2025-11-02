import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Building2, Shield, BarChart3, FileText } from "lucide-react";
import OfficesTab from "./tabs/OfficesTab";
import UsersTab from "./tabs/UsersTab";
import RolesTab from "./tabs/RolesTab";
import ReportsTab from "./tabs/ReportsTab";
import AuditTab from "./tabs/AuditTab";
import SubscriptionsTab from "./tabs/SubscriptionsTab";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("offices");

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-semibold mb-6">لوحة تحكم الأدمن</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-2 mb-4">
          <TabsTrigger value="offices" className="flex items-center gap-2">
            <Building2 size={18} /> المكاتب
          </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Building2 size={18} /> الاشتراكات
            </TabsTrigger>

          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users size={18} /> المستخدمين
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield size={18} /> الصلاحيات
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 size={18} /> التقارير
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText size={18} /> الأوديت
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offices">
          <OfficesTab />
        </TabsContent>

        <TabsContent value="subscriptions">
            <SubscriptionsTab  />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
