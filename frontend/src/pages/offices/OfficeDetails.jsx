import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Users, Home, Loader2, ShieldAlert } from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import OfficeEmployees from "./OfficeEmployees";
import toast, { Toaster } from "react-hot-toast";

export default function OfficeDetails() {
  const { user } = useAuth();
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("details");

  async function fetchOffice() {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/offices/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "فشل تحميل بيانات المكتب");
      setOffice(data.data);
    } catch (err) {
      console.error("❌ Error fetching office:", err);
      setError(err.message || "فشل تحميل بيانات المكتب");
      toast.error(err.message || "فشل تحميل بيانات المكتب");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffice();
  }, []);

  // 🌀 حالة التحميل
  if (loading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          جاري تحميل بيانات المكتب...
        </div>
      </DashboardLayout>
    );

  // ⚠️ حالة الخطأ
  if (error)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-red-600">
          <ShieldAlert size={36} className="mb-2" />
          <p>{error}</p>
        </div>
      </DashboardLayout>
    );

  // 🚫 المستخدم لا يملك مكتب
  if (!office)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-600">
          <ShieldAlert size={36} className="mb-2 text-gray-400" />
          <p>لا يوجد مكتب مرتبط بهذا الحساب</p>
        </div>
      </DashboardLayout>
    );

  // ✅ عرض بيانات المكتب
  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-6 space-y-6">
        <Card className="shadow-md border rounded-xl">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
              <Building2 /> {office?.name || "مكتب عقاري"}
            </CardTitle>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                office?.status === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {office?.status === "approved" ? "نشط" : "موقوف"}
            </span>
          </CardHeader>

          <CardContent className="text-gray-700 grid md:grid-cols-2 gap-3">
            <p>
              <b>اسم المالك:</b> {office?.owner_name || "—"}
            </p>
            <p>
              <b>رقم السجل التجاري:</b> {office?.commercial_reg || "—"}
            </p>
            <p>
              <b>رقم الترخيص:</b> {office?.license_no || "—"}
            </p>
            <p>
              <b>رقم الهاتف:</b> {office?.phone || "—"}
            </p>
            <p>
              <b>البريد الإلكتروني:</b> {office?.email || "—"}
            </p>
            <p>
              <b>تاريخ الإنشاء:</b>{" "}
              {office?.created_at
                ? new Date(office.created_at).toLocaleDateString("en-GB").replace(/\//g, "-")
                : "—"}
            </p>
          </CardContent>
        </Card>

        {/* 🧭 التبويبات */}
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="flex gap-4 border-b border-gray-200">
            <TabsTrigger
              value="details"
              className={`px-4 py-2 text-sm font-medium ${
                tab === "details"
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "text-gray-500"
              }`}
            >
              <Building2 className="inline-block mr-1" size={16} /> تفاصيل المكتب
            </TabsTrigger>

            <TabsTrigger
              value="employees"
              className={`px-4 py-2 text-sm font-medium ${
                tab === "employees"
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "text-gray-500"
              }`}
            >
              <Users className="inline-block mr-1" size={16} /> الموظفين
            </TabsTrigger>

            <TabsTrigger
              value="properties"
              className={`px-4 py-2 text-sm font-medium ${
                tab === "properties"
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "text-gray-500"
              }`}
            >
              <Home className="inline-block mr-1" size={16} /> العقارات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-4">
            <p className="text-gray-600">
              {office?.description || "لا توجد تفاصيل إضافية."}
            </p>
          </TabsContent>

          <TabsContent value="employees" className="pt-4">
            <OfficeEmployees officeId={office?.id} />
          </TabsContent>

          <TabsContent value="properties" className="pt-4">
            <p className="text-gray-500">🔧 قريبًا سيتم عرض العقارات التابعة للمكتب هنا</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
