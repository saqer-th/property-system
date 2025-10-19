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

// ===============================
// 📊 Dashboard Page
// ===============================
export default function Dashboard() {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===============================
  // 🔹 Fetch contracts & payments
  // ===============================
  useEffect(() => {
    async function fetchData() {
      try {
        const [contractsRes, paymentsRes] = await Promise.all([
          fetch(`${API_URL}/contracts`, {
            headers: { "x-api-key": API_KEY },
          }),
          fetch(`${API_URL}/payments`, {
            headers: { "x-api-key": API_KEY },
          }),
        ]);

        const contractsJson = await contractsRes.json();
        const paymentsJson = await paymentsRes.json();

        // تأكد أن البيانات مصفوفة دائمًا
        setContracts(Array.isArray(contractsJson) ? contractsJson : contractsJson.data || []);
        setPayments(Array.isArray(paymentsJson) ? paymentsJson : paymentsJson.data || []);
      } catch (err) {
        console.error("❌ Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ===============================
  // 🧮 Summary
  // ===============================
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(
    (c) => c.contract_status === "نشط" || c.status === "active"
  ).length;
  const expiredContracts = contracts.filter(
    (c) => c.contract_status === "منتهي" || c.status === "expired"
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

  if (loading)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
      </DashboardLayout>
    );

  // ===============================
  // 🧩 UI Rendering
  // ===============================
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
            <Card key={idx} className="shadow-md rounded-2xl border border-border">
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
        <Card className="shadow-md rounded-2xl border border-border">
          <CardHeader>
            <CardTitle>{t("monthlyPayments")}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* 📅 Contracts Ending Soon */}
        <Card className="shadow-md rounded-2xl border border-border">
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
                      <td className="p-2">{c.property_name || c.property_type || "—"}</td>
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
