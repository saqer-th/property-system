import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Search, PlusCircle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import AddExpenseDrawer from "@/components/expenses/AddExpenseDrawer"; // نافذة إضافة مصروف
import { API_URL, API_KEY } from "@/config";

export default function ExpensesList() {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ===============================
  // 🔹 Fetch expenses from backend
  // ===============================
  async function fetchExpenses() {
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        headers: { "x-api-key": API_KEY },
      });
      const json = await res.json();

      if (!res.ok || !json.success)
        throw new Error(json.message || "Failed to fetch expenses");

      const data = json.data || json;
      setExpenses(data);
      setFiltered(data);
    } catch (err) {
      console.error("❌ Error loading expenses:", err);
      toast.error(t("failedToLoadExpenses") || "فشل تحميل المصروفات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
  }, []);

  // ===============================
  // 🔍 Search Filter
  // ===============================
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const results = expenses.filter((e) =>
      [e.property_name, e.expense_type, e.notes, e.on_whom]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(lower))
    );
    setFiltered(results);
  }, [searchTerm, expenses]);

  // ===============================
  // 📊 Pie Chart Data
  // ===============================
  const grouped = {};
  expenses.forEach((e) => {
    const key = e.expense_type || t("unknown");
    grouped[key] = (grouped[key] || 0) + parseFloat(e.amount || 0);
  });

  const chartData = Object.entries(grouped).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = [
    "#10B981",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-6 space-y-6">
        {/* 🔍 العنوان + البحث + زر الإضافة */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            {t("menu_expenses")}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t("searchExpenses")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <Button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusCircle size={16} />
              {t("addExpense")}
            </Button>
          </div>
        </div>

        {/* 📈 ملخص المصروفات حسب النوع */}
        <Card className="bg-card shadow-md rounded-2xl border border-border">
          <CardHeader>
            <CardTitle>{t("expensesSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                {t("noExpensesData")}
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📋 جدول المصروفات */}
        <Card className="bg-card shadow-md rounded-2xl border border-border">
          <CardHeader>
            <CardTitle>{t("expensesList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                {t("noExpensesFound")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-t">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("propertyName")}</th>
                      <th className="p-2 text-start">{t("expenseType")}</th>
                      <th className="p-2 text-start">{t("onWhom")}</th>
                      <th className="p-2 text-start">{t("amount")}</th>
                      <th className="p-2 text-start">{t("date")}</th>
                      <th className="p-2 text-start">{t("notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, idx) => (
                      <tr
                        key={idx}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="p-2">{e.property_name || "—"}</td>
                        <td className="p-2">{e.expense_type || "—"}</td>
                        <td className="p-2">{e.on_whom || "—"}</td>
                        <td className="p-2">
                          {e.amount ? `${Number(e.amount).toLocaleString()} SAR` : "—"}
                        </td>
                        <td className="p-2">
                          {e.date?.split("T")[0] || "—"}
                        </td>
                        <td className="p-2">{e.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🧾 نافذة الإضافة */}
        <AddExpenseDrawer
          open={drawerOpen}
          setOpen={setDrawerOpen}
          refresh={fetchExpenses}
        />
      </div>
    </DashboardLayout>
  );
}
