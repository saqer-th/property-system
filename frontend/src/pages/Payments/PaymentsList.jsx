import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Search,
  RefreshCcw,
  Wallet,
  CheckCircle2,
  Clock3,
  AlertTriangle,
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";

// ===============================
// 💰 Payments Dashboard Page
// ===============================
export default function PaymentsList() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ===============================
  // 🔹 Fetch payments from backend
  // ===============================
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments`, {
        headers: { "x-api-key": API_KEY },
      });
      const json = await res.json();
      const data = json.data || [];
      setPayments(data);
      setFiltered(data);
    } catch (err) {
      console.error("❌ Error loading payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // ===============================
  // 🔍 Search + Filter
  // ===============================
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const results = payments.filter((p) => {
      const matchSearch = [p.tenant_name, p.contract_no]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(lower));
      const matchStatus =
        statusFilter === "all" || p.status?.toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
    setFiltered(results);
  }, [searchTerm, statusFilter, payments]);

  // ===============================
  // 🎨 Status Colors & Labels
  // ===============================
  const STATUS_MAP = {
    "مدفوعة": { color: "text-emerald-600 bg-emerald-50", icon: <CheckCircle2 size={14} />, label: t("paid") },
    "غير مدفوعة": { color: "text-yellow-600 bg-yellow-50", icon: <Clock3 size={14} />, label: t("due") },
    "متأخرة": { color: "text-red-600 bg-red-50", icon: <AlertTriangle size={14} />, label: t("overdue") },
  };

  // ===============================
  // 📊 Monthly Chart Data
  // ===============================
  const monthlyTotals = {};
  payments.forEach((p) => {
    const d = new Date(p.due_date || p.created_at);
    const month = d.toLocaleString("en", { month: "short" });
    monthlyTotals[month] =
      (monthlyTotals[month] || 0) + parseFloat(p.amount || 0);
  });

  const chartData = Object.entries(monthlyTotals).map(([month, val]) => ({
    month,
    payments: val,
  }));

  const formatCurrency = (val) =>
    new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
    }).format(val || 0);

  // ===============================
  // 🌀 Loading State
  // ===============================
  if (loading)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
      </DashboardLayout>
    );

  // ===============================
  // 🧭 UI Layout
  // ===============================
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 🔍 Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet size={22} className="text-emerald-600" />
            {t("menu_payments")}
          </h1>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t("searchPayments")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("allStatuses")}</option>
              <option value="مدفوعة">{t("paid")}</option>
              <option value="غير مدفوعة">{t("due")}</option>
              <option value="متأخرة">{t("overdue")}</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchPayments}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg"
            >
              <RefreshCcw size={16} className="animate-spin-slow" />
              {t("refresh")}
            </button>
          </div>
        </div>

        {/* 📈 Chart Section */}
        <Card className="bg-card shadow-md rounded-2xl border border-border">
          <CardHeader>
            <CardTitle>{t("paymentsSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noPaymentsFound")}</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar
                      dataKey="payments"
                      name={t("totalPayments")}
                      fill="#10B981"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📋 Payments Table */}
        <Card className="bg-card shadow-md rounded-2xl border border-border">
          <CardHeader>
            <CardTitle>{t("paymentsList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noPaymentsFound")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("contractNo")}</th>
                      <th className="p-2 text-start">{t("tenantName")}</th>
                      <th className="p-2 text-start">{t("amount")}</th>
                      <th className="p-2 text-start">{t("dueDate")}</th>
                      <th className="p-2 text-start">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, idx) => {
                      const s =
                        STATUS_MAP[p.status] ||
                        STATUS_MAP["غير مدفوعة"] ||
                        {
                          color: "text-gray-500 bg-gray-100",
                          icon: null,
                          label: t("unknown"),
                        };
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50 transition">
                          <td className="p-2">{p.contract_no || "—"}</td>
                          <td className="p-2">{p.tenant_name || "—"}</td>
                          <td className="p-2">{formatCurrency(p.amount)}</td>
                          <td className="p-2">
                            {p.due_date ? p.due_date.split("T")[0] : "—"}
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.color}`}
                            >
                              {s.icon}
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
