import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  RefreshCcw,
  Wallet,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

export default function PaymentsList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
const activeRole = user.activeRole; // من السياق أو الحالة

  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  // =========================
  // 📦 تحميل الدفعات
  // =========================
  async function fetchPayments() {
    if (!user?.token) {
      setError(t("pleaseLogin") || "الرجاء تسجيل الدخول أولاً");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": activeRole,
        },
      });

      if (res.status === 401 || res.status === 403) {
        setError(t("noPermission") || "🚫 لا تملك صلاحية لعرض الدفعات");
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch payments");
      }

      const data = json.data || [];
      setPayments(data);
      setFiltered(data);
      setError("");
    } catch (err) {
      console.error("❌ Error loading payments:", err);
      toast.error(t("failedToLoadPayments") || "فشل تحميل الدفعات");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, [user]);

  // =========================
  // 🎨 حالات الدفع
  // =========================
  const STATUS_MAP = {
    "مدفوعة": {
      color: "text-emerald-600 bg-emerald-50",
      icon: <CheckCircle2 size={14} />,
      label: t("paid"),
    },
    "غير مدفوعة": {
      color: "text-yellow-600 bg-yellow-50",
      icon: <Clock3 size={14} />,
      label: t("unpaid"),
    },
    "متأخرة": {
      color: "text-red-600 bg-red-50",
      icon: <AlertTriangle size={14} />,
      label: t("overdue"),
    },
    "قادمة": {
      color: "text-yellow-700 bg-yellow-100",
      icon: <Clock3 size={14} />,
      label: t("upcoming"),
    },
  };

  // =========================
  // 🔍 تطبيق الفلاتر
  // =========================
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next30 = new Date(today);
    next30.setDate(today.getDate() + 30);

    const q = searchTerm.toLowerCase();

    const results = payments.filter((p) => {
      const dueDate = p.due_date ? new Date(p.due_date) : null;
      if (dueDate) dueDate.setHours(0, 0, 0, 0);

      let actualStatus = p.status;
      if (p.status !== "مدفوعة") {
        if (dueDate && dueDate < today) actualStatus = "متأخرة";
        else if (dueDate && dueDate <= next30) actualStatus = "قادمة";
        else actualStatus = "غير مدفوعة";
      }

      const matchSearch = [p.contract_no, p.tenant_name, p.property_name, p.unit_no]
        .filter(Boolean)
        .some((x) => x.toLowerCase().includes(q));

      if (filterType !== "all" && actualStatus !== filterType) return false;
      if (propertyFilter && p.property_name !== propertyFilter) return false;
      if (unitFilter && p.unit_no !== unitFilter) return false;
      if (contractFilter && p.contract_no !== contractFilter) return false;
      if (tenantFilter && p.tenant_name !== tenantFilter) return false;

      return matchSearch;
    });

    setFiltered(results);
  }, [
    searchTerm,
    filterType,
    propertyFilter,
    unitFilter,
    contractFilter,
    tenantFilter,
    payments,
  ]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-EN", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
    }).format(val || 0);

  // =========================
  // 🧭 واجهة العرض
  // =========================
  if (loading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          {t("loadingData") || "جاري تحميل البيانات..."}
        </div>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-red-600">
          <ShieldAlert size={36} className="mb-2" />
          <p className="text-center max-w-md">{error}</p>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-6 space-y-6" dir={dir}>
        {/* 🔍 العنوان والفلاتر */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet size={22} className="text-emerald-600" />
            {t("menu_payments") || "الدفعات"}
          </h1>

          <div className="flex flex-wrap gap-2 items-center">
            {/* 🔍 البحث */}
            <div className="relative w-52">
              <Search
                className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-2.5 text-gray-400`}
                size={18}
              />
              <input
                type="text"
                placeholder={t("searchPayments") || "ابحث عن دفعة..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"} py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
            </div>

            {/* 🔽 الحالة */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              <option value="all">📋 {t("all")}</option>
              <option value="مدفوعة">✅ {t("paid")}</option>
              <option value="متأخرة">⚠️ {t("overdue")}</option>
              <option value="قادمة">📅 {t("upcoming")}</option>
            </select>

            {/* 🔄 إعادة تعيين */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
                setPropertyFilter("");
                setUnitFilter("");
                setContractFilter("");
                setTenantFilter("");
                setFiltered(payments);
              }}
              className="flex items-center gap-1"
            >
              <RefreshCcw size={16} />
              {t("resetFilters") || "إعادة التصفية"}
            </Button>
          </div>
        </div>

        {/* 📋 جدول الدفعات */}
        <Card className="bg-white border border-border shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-emerald-700 text-lg">
              {t("paymentsList") || "قائمة الدفعات"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noPaymentsFound") || "لا توجد دفعات"}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2">{t("contract")}</th>
                      <th className="p-2">
                        {activeRole === "tenant" ? t("ownerName") : t("tenantName")}
                        </th>
                      <th className="p-2">{t("amount")}</th>
                      <th className="p-2">{t("paidAmount")}</th>
                      <th className="p-2">{t("remainingAmount")}</th>
                      <th className="p-2">{t("dueDate")}</th>
                      <th className="p-2">{t("status")}</th>
                      <th className="p-2">{t("property")}</th>
                      <th className="p-2">{t("unit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, idx) => {
                      const due = new Date(p.due_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const next30 = new Date(today);
                      next30.setDate(today.getDate() + 30);

                      let actualStatus = p.status;
                      if (p.status !== "مدفوعة") {
                        if (due < today) actualStatus = "متأخرة";
                        else if (due <= next30) actualStatus = "قادمة";
                        else actualStatus = "غير مدفوعة";
                      }

                      const s = STATUS_MAP[actualStatus] || STATUS_MAP["غير مدفوعة"];

                      let dateColor = "";
                      if (actualStatus === "متأخرة") dateColor = "text-red-600 font-semibold";
                      else if (actualStatus === "قادمة")
                        dateColor = "text-yellow-600 font-semibold";

                      return (
                        <tr key={idx} className="border-b hover:bg-emerald-50 transition">
                          <td className="p-2">{p.contract_no || "—"}</td>
                          <td className="p-2">
                            {activeRole === "tenant" ? p.lessor_name : p.tenant_name}</td>
                          <td className="p-2 text-emerald-700 font-medium">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="p-2 text-emerald-700 font-medium">
                            {formatCurrency(p.paid_amount)}
                          </td>
                          <td className="p-2 text-emerald-700 font-medium">
                            {formatCurrency(p.amount - (p.paid_amount || 0))}
                          </td>
                          <td className={`p-2 ${dateColor}`}>
                            {p.due_date
                              ? new Date(p.due_date).toISOString().split("T")[0]
                              : "—"}
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.color}`}
                            >
                              {s.icon}
                              {s.label}
                            </span>
                          </td>
                          <td className="p-2">{p.property_name || "—"}</td>
                          <td className="p-2">{p.unit_no || "—"}</td>
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
