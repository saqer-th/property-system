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
import { FileText, CheckCircle, AlertCircle, Clock, TrendingUp, ArrowUpRight, Calendar } from "lucide-react";

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
    if (!user?.token) return;

    async function fetchData() {
      try {
        setLoading(true);

        const headers = {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        };

        const [contractsRes, paymentsRes] = await Promise.all([
          fetch(`${API_URL}/contracts/my`, { headers, credentials: "include" }),
          fetch(`${API_URL}/payments/my`, { headers, credentials: "include" }),
        ]);

        const contractsJson = await contractsRes.json();
        const paymentsJson = await paymentsRes.json();

        if (!contractsJson.success) throw new Error(contractsJson.message || "فشل تحميل العقود");
        if (!paymentsJson.success) throw new Error(paymentsJson.message || "فشل تحميل الدفعات");

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
  // 🧮 Summary Calculations
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

  // Monthly payments chart data
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

  // Contracts ending soon
  const soonToExpire = contracts.filter((c) => {
    const end = new Date(c.tenancy_end || c.end_date);
    if (isNaN(end)) return false;
    const diff = (end - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  });

  // ===============================
  // 🧩 Components
  // ===============================
  const StatsCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} />
        </div>
        {/* <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          +2.5% <ArrowUpRight size={12} className="ml-1" />
        </span> */}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-400 animate-pulse">{t("loadingData")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("welcomeBack")}, <span className="text-primary">{user?.name}</span> 👋
            </h1>
            <p className="text-gray-500 mt-1">{t("dashboardOverview") || "Here's what's happening with your properties today."}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
              <Calendar size={16} />
              {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* 📊 Stats Grid */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title={t("totalContracts")}
            value={totalContracts}
            icon={FileText}
            colorClass="text-blue-600"
            bgClass="bg-blue-50"
          />
          <StatsCard
            title={t("activeContracts")}
            value={activeContracts}
            icon={CheckCircle}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50"
          />
          <StatsCard
            title={t("expiredContracts")}
            value={expiredContracts}
            icon={AlertCircle}
            colorClass="text-rose-600"
            bgClass="bg-rose-50"
          />
          <StatsCard
            title={t("renewableContracts")}
            value={renewableContracts}
            icon={Clock}
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 💰 Monthly Payments Chart */}
          <div className="lg:col-span-2">
            <Card className="h-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp size={20} className="text-primary" />
                    {t("monthlyPayments")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {chartData.length === 0 ? (
                  <div className="h-80 flex flex-col items-center justify-center text-gray-400">
                    <TrendingUp size={48} className="mb-4 opacity-20" />
                    <p>{t("noPaymentData") || "No payment data available"}</p>
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#9ca3af', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ fill: '#f9fafb' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Bar
                          dataKey="payments"
                          fill="var(--color-primary)"
                          radius={[6, 6, 0, 0]}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 📅 Contracts Ending Soon */}
          <div className="lg:col-span-1">
            <Card className="h-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100 rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-gray-50 bg-white/50 backdrop-blur-sm">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock size={20} className="text-amber-500" />
                  {t("contractsEndingSoon")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                {soonToExpire.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 p-6">
                    <CheckCircle size={48} className="mb-4 opacity-20" />
                    <p className="text-center text-sm">{t("noExpiringContracts")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {soonToExpire.map((c, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {c.tenant_name?.charAt(0).toUpperCase() || "T"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.tenant_name || "—"}</p>
                          <p className="text-xs text-gray-500 truncate">{c.property_name || c.property_type || "—"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            {(c.tenancy_end || c.end_date || "").split("T")[0]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
