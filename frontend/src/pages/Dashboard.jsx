import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===============================
  // 🔹 Fetch contracts & payments
  // ===============================
  useEffect(() => {
    if (!user?.token) {
      console.log("⏳ Waiting for user...");
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);

        const headers = {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        };

        // ✅ التصحيح هنا — نمرر الكائن مباشرة بدون {} داخل {}
        const [contractsRes, paymentsRes] = await Promise.all([
          fetch(`${API_URL}/contracts/my`, { headers, credentials: "include" }),
          fetch(`${API_URL}/payments/my`, { headers, credentials: "include" }),
        ]);

        const contractsJson = await contractsRes.json();
        const paymentsJson = await paymentsRes.json();

        console.log("📄 Contracts:", contractsJson);
        console.log("💰 Payments:", paymentsJson);

        if (!contractsJson.success)
          throw new Error(contractsJson.message || "فشل تحميل العقود");
        if (!paymentsJson.success)
          throw new Error(paymentsJson.message || "فشل تحميل الدفعات");

        setContracts(contractsJson.data || []);
        setPayments(paymentsJson.data || []);
      } catch (err) {
        console.error("❌ Error loading dashboard data:", err);
        toast.error(err.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // ===============================
  // 🧮 Summary
  // ===============================
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(
    (c) => c.status === "active" || c.contract_status === "نشط"
  ).length;
  const expiredContracts = contracts.filter(
    (c) => c.status === "expired" || c.contract_status === "منتهي"
  ).length;
  const renewableContracts = contracts.filter((c) => {
    if (!c.tenancy_end && !c.end_date) return false;
    const end = new Date(c.tenancy_end || c.end_date);
    const diff = (end - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;

  // ===============================
  // 📈 Monthly payments chart
  // ===============================
  const monthly = {};
  payments.forEach((p) => {
    const date = new Date(p.payment_date || p.due_date || p.created_at);
    if (isNaN(date)) return;
    const month = date.toLocaleString("en", { month: "short" });
    monthly[month] = (monthly[month] || 0) + Number(p.amount || 0);
  });

  const chartData = Object.entries(monthly)
    .slice(-6)
    .map(([m, val]) => ({ month: m, payments: val }));

  // ===============================
  // ⏰ Contracts ending soon
  // ===============================
  const soonToExpire = contracts.filter((c) => {
    const end = new Date(c.tenancy_end || c.end_date);
    if (isNaN(end)) return false;
    const diff = (end - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  });

  // ===============================
  // 🧩 UI Rendering
  // ===============================
  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 📊 Summary Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          {[
            { title: t("totalContracts"), value: totalContracts },
            { title: t("activeContracts"), value: activeContracts },
            { title: t("expiredContracts"), value: expiredContracts },
            { title: t("renewableContracts"), value: renewableContracts },
          ].map((s, idx) => (
            <Card
              key={idx}
              className="shadow-sm rounded-2xl border border-border bg-white hover:shadow-md transition"
            >
              <CardHeader>
                <CardTitle className="text-gray-500 text-sm">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 💰 Monthly Payments Chart */}
        <Card className="shadow-sm rounded-2xl border border-border bg-white">
          <CardHeader>
            <CardTitle>{t("monthlyPayments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-gray-500 text-sm">لا توجد بيانات مدفوعات</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="payments" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📅 Contracts Ending Soon */}
        <Card className="shadow-sm rounded-2xl border border-border bg-white">
          <CardHeader>
            <CardTitle>{t("contractsEndingSoon")}</CardTitle>
          </CardHeader>
          <CardContent>
            {soonToExpire.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noExpiringContracts")}</p>
            ) : (
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-2 text-start">{t("tenantName")}</th>
                    <th className="p-2 text-start">{t("propertyName")}</th>
                    <th className="p-2 text-start">{t("endDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {soonToExpire.map((c, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition">
                      <td className="p-2">{c.tenant_name || "—"}</td>
                      <td className="p-2">
                        {c.property_name || c.property_type || "—"}
                      </td>
                      <td className="p-2">
                        {(c.tenancy_end || c.end_date || "").split("T")[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
