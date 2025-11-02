import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  PlusCircle,
  RefreshCcw,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AddExpenseDrawer from "@/components/expenses/AddExpenseDrawer";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

export default function ExpensesList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");

  // 🔍 فلاتر
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [onWhomFilter, setOnWhomFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const activeRole = user?.activeRole;

  // 🧩 صلاحيات
  const canAdd = ["admin", "office_admin", "office"].includes(activeRole);

  // 📦 تحميل المصروفات
  async function fetchExpenses() {
    if (!user?.token) {
      setError(t("pleaseLogin") || "الرجاء تسجيل الدخول أولاً");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/expenses/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      if (res.status === 401 || res.status === 403) {
        setError(t("noPermission") || "🚫 لا تملك صلاحية لعرض المصروفات");
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Failed to load expenses");

      const data = json.data || [];
      setExpenses(data);
      setFiltered(data);
      setError("");
    } catch (err) {
      console.error("❌ Error loading expenses:", err);
      setError(t("failedToLoadExpenses") || "فشل تحميل المصروفات");
      toast.error(t("failedToLoadExpenses") || "فشل تحميل المصروفات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
  }, []);

  // 🔍 تطبيق الفلاتر
  useEffect(() => {
    let results = [...expenses];
    const q = searchTerm.toLowerCase();

    if (searchTerm) {
      results = results.filter((e) =>
        [e.property_name, e.expense_type, e.on_whom, e.description, e.notes]
          .filter(Boolean)
          .some((x) => x.toLowerCase().includes(q))
      );
    }

    if (typeFilter)
      results = results.filter(
        (e) => e.expense_type?.toLowerCase() === typeFilter.toLowerCase()
      );

    if (onWhomFilter)
      results = results.filter(
        (e) => e.on_whom?.toLowerCase() === onWhomFilter.toLowerCase()
      );

    if (dateFrom)
      results = results.filter((e) => new Date(e.date) >= new Date(dateFrom));
    if (dateTo)
      results = results.filter((e) => new Date(e.date) <= new Date(dateTo));

    setFiltered(results);
  }, [searchTerm, typeFilter, onWhomFilter, dateFrom, dateTo, expenses]);

  // 📊 إحصائيات
  const stats = useMemo(() => {
    const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const onOwner = filtered
      .filter((e) => e.on_whom === "مالك" || e.on_whom === "owner")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const onTenant = filtered
      .filter((e) => e.on_whom === "مستأجر" || e.on_whom === "tenant")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const onOffice = filtered
      .filter((e) => e.on_whom === "مكتب" || e.on_whom === "office")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { total, onOwner, onTenant, onOffice };
  }, [filtered]);

  // 📊 بيانات الرسم البياني
  const chartData = useMemo(() => {
    const grouped = {};
    filtered.forEach((e) => {
      const key = e.expense_type || t("unknown");
      grouped[key] = (grouped[key] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  const formatDate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "—");

  const formatAmount = (num) =>
    Number(num || 0).toLocaleString("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
    });

  // 🧱 واجهة
  if (error)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-red-600">
          <ShieldAlert size={36} className="mb-2" />
          <p className="text-center max-w-md">{error}</p>
        </div>
      </DashboardLayout>
    );

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          {t("loadingData") || "جاري تحميل البيانات..."}
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-6 space-y-6" dir={dir}>
        {/* 🔍 الفلاتر والعنوان */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            {t("menu_expenses")}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            {/* 🔎 بحث */}
            <div className="relative w-56">
              <Search
                className={`absolute ${
                  dir === "rtl" ? "right-3" : "left-3"
                } top-2.5 text-gray-400`}
                size={18}
              />
              <input
                type="text"
                placeholder={t("searchExpenses")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${
                  dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                } py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
            </div>

            {/* 🔽 نوع المصروف */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allTypes")}</option>
              {[...new Set(expenses.map((e) => e.expense_type).filter(Boolean))].map(
                (type, i) => (
                  <option key={i} value={type}>
                    {type}
                  </option>
                )
              )}
            </select>

            {/* 🔽 على من */}
            <select
              value={onWhomFilter}
              onChange={(e) => setOnWhomFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allBeneficiaries")}</option>
              <option value="مالك">{t("owner")}</option>
              <option value="مستأجر">{t("tenant")}</option>
              <option value="مكتب">{t("office")}</option>
              <option value="other">{t("other")}</option>
            </select>

            {/* 📅 التاريخ */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              />
              <span className="text-gray-500">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              />
            </div>

            {/* 🔁 إعادة تعيين الفلاتر */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("");
                setOnWhomFilter("");
                setDateFrom("");
                setDateTo("");
                setFiltered(expenses);
              }}
              className="flex items-center gap-1"
            >
              <RefreshCcw size={16} />
              {t("resetFilters")}
            </Button>

            {/* ➕ زر إضافة مصروف (مخفي للمالك والمستأجر) */}
            {canAdd && (
              <Button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PlusCircle size={16} />
                {t("addExpense")}
              </Button>
            )}
          </div>
        </div>

        {/* 📊 ملخص */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: t("totalExpenses"), value: stats.total },
            { title: t("onOwner"), value: stats.onOwner },
            { title: t("onTenant"), value: stats.onTenant },
            { title: t("onOffice"), value: stats.onOffice },
          ].map((s, i) => (
            <Card key={i} className="border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-500 text-sm">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    i === 0
                      ? "text-emerald-600"
                      : i === 1
                      ? "text-blue-600"
                      : i === 2
                      ? "text-yellow-600"
                      : "text-gray-700"
                  }`}
                >
                  {formatAmount(s.value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 📈 الرسم البياني */}
        <Card className="bg-white border border-border rounded-2xl shadow-md">
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

        {/* 📋 جدول */}
        <Card className="bg-white border border-border shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-emerald-700 text-lg">
              {t("expensesList")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                {t("noExpensesFound")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2">{t("expenseType")}</th>
                      <th className="p-2">{t("onWhom")}</th>
                      <th className="p-2">{t("amount")}</th>
                      <th className="p-2">{t("date")}</th>
                      <th className="p-2">{t("linkedTo")}</th>
                      <th className="p-2">{t("notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, idx) => {
                      let linkLabel = "—";
                      if (e.contract_id) {
                        const contractLabel = e.contract_no
                          ? `#${e.contract_no}`
                          : `${t("contract")} ${e.contract_id}`;
                        linkLabel = `📄 ${t("contract")}: ${contractLabel}${
                          e.tenant_name ? " – " + e.tenant_name : ""
                        }`;
                      } else if (e.unit_id) {
                        const unitLabel = e.unit_no
                          ? `#${e.unit_no}`
                          : `${t("unit")} ${e.unit_id}`;
                        linkLabel = `🏘️ ${t("unit")}: ${unitLabel}${
                          e.property_name ? " – " + e.property_name : ""
                        }`;
                      } else if (e.property_id) {
                        const propLabel = e.property_name
                          ? e.property_name
                          : `${t("property")} ${e.property_id}`;
                        linkLabel = `🏢 ${t("property")}: ${propLabel}`;
                      }

                      return (
                        <tr
                          key={idx}
                          className="border-b hover:bg-emerald-50 transition"
                        >
                          <td className="p-2">{e.expense_type || "—"}</td>
                          <td className="p-2">{e.on_whom || "—"}</td>
                          <td className="p-2 text-emerald-700 font-medium">
                            {formatAmount(e.amount)}
                          </td>
                          <td className="p-2">{formatDate(e.date)}</td>
                          <td className="p-2">{linkLabel}</td>
                          <td className="p-2">{e.notes || e.description || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ➕ نافذة الإضافة (مخفيه للمالك والمستأجر) */}
        {canAdd && (
          <AddExpenseDrawer
            open={drawerOpen}
            setOpen={setDrawerOpen}
            refresh={fetchExpenses}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
