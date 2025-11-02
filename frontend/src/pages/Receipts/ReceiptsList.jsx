import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  PlusCircle,
  Receipt,
  RefreshCcw,
  Calendar,
  Building2,
  Home,
  FileText,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import AddReceiptDrawer from "@/components/receipts/AddReceiptDrawer";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

export default function ReceiptsList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [receipts, setReceipts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [linkFilter, setLinkFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const activeRole = user?.activeRole;

  // 🔒 صلاحيات الإضافة
  const canAdd = ["admin", "office_admin", "office"].includes(activeRole);

  // 📦 تحميل السندات
  async function fetchReceipts() {
    if (!user?.token) {
      setError(t("pleaseLogin") || "الرجاء تسجيل الدخول أولاً");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/receipts/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      if (res.status === 401 || res.status === 403) {
        setError(t("noPermission") || "🚫 لا تملك صلاحية لعرض هذه السندات");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to load receipts");

      const list = Array.isArray(data.data) ? data.data : [];
      setReceipts(list);
      setFiltered(list);
      setError("");
    } catch (err) {
      console.error("❌ Error loading receipts:", err);
      setError(t("failedToLoadReceipts") || "فشل تحميل السندات");
      toast.error(t("failedToLoadReceipts") || "فشل تحميل السندات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReceipts();
  }, []);

  // 🔍 الفلاتر
  useEffect(() => {
    let results = [...receipts];
    const q = searchTerm.toLowerCase();

    if (searchTerm) {
      results = results.filter((r) =>
        [
          r.reference_no,
          r.payer,
          r.receiver,
          r.reason,
          r.description,
          r.contract_no,
          r.property_name,
          r.unit_no,
        ]
          .filter(Boolean)
          .some((x) => x.toLowerCase().includes(q))
      );
    }

    if (typeFilter)
      results = results.filter(
        (r) => r.receipt_type?.toLowerCase() === typeFilter.toLowerCase()
      );

    if (linkFilter) {
      results = results.filter((r) => {
        if (linkFilter === "contract") return r.contract_id;
        if (linkFilter === "unit") return r.unit_id;
        if (linkFilter === "property") return r.property_id;
        return !r.contract_id && !r.unit_id && !r.property_id;
      });
    }

    if (dateFrom)
      results = results.filter(
        (r) => new Date(r.date || r.receipt_date) >= new Date(dateFrom)
      );
    if (dateTo)
      results = results.filter(
        (r) => new Date(r.date || r.receipt_date) <= new Date(dateTo)
      );

    setFiltered(results);
  }, [searchTerm, typeFilter, linkFilter, dateFrom, dateTo, receipts]);

  // 💰 الإحصائيات
  const stats = useMemo(() => {
    const totalCount = filtered.length;
    const totalReceived = filtered
      .filter((r) => r.receipt_type === "قبض" || r.receipt_type === "receive")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalPaid = filtered
      .filter((r) => r.receipt_type === "صرف" || r.receipt_type === "payment")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const balance = totalReceived - totalPaid;
    return { totalCount, totalReceived, totalPaid, balance };
  }, [filtered]);

  const formatCurrency = (num) =>
    Number(num || 0).toLocaleString(
      i18n.language === "ar" ? "ar-SA" : "en-US",
      {
        style: "currency",
        currency: "SAR",
        minimumFractionDigits: 2,
      }
    );

  const formatDate = (d) =>
    d ? new Date(d).toISOString().split("T")[0] : "—";

  // ⚠️ حالة الخطأ أو الصلاحية
  if (error)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-red-600">
          <ShieldAlert size={36} className="mb-2" />
          <p className="text-center max-w-md">{error}</p>
        </div>
      </DashboardLayout>
    );

  // 🕓 حالة التحميل
  if (loading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          {t("loadingData") || "جاري تحميل البيانات..."}
        </div>
      </DashboardLayout>
    );

  // 🧱 واجهة
  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-6 space-y-6" dir={dir}>
        {/* ✅ العنوان والفلاتر */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <Receipt /> {t("receipts")}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            {/* 🔍 بحث */}
            <div className="relative w-56">
              <Search
                className={`absolute ${
                  dir === "rtl" ? "right-3" : "left-3"
                } top-2.5 text-gray-400`}
                size={18}
              />
              <input
                type="text"
                placeholder={t("searchReceipt")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${
                  dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                } py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
            </div>

            {/* الفلاتر */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allTypes")}</option>
              <option value="قبض">{t("receive")}</option>
              <option value="صرف">{t("payment")}</option>
              <option value="adjustment">{t("adjustment")}</option>
            </select>

            <select
              value={linkFilter}
              onChange={(e) => setLinkFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allLinks")}</option>
              <option value="contract">{t("contract")}</option>
              <option value="unit">{t("unit")}</option>
              <option value="property">{t("property")}</option>
              <option value="none">{t("noLink")}</option>
            </select>

            {/* 📅 التاريخ */}
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400" size={16} />
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

            {/* 🔄 إعادة تعيين */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("");
                setLinkFilter("");
                setDateFrom("");
                setDateTo("");
                setFiltered(receipts);
              }}
              className="flex items-center gap-1"
            >
              <RefreshCcw size={16} />
              {t("resetFilters")}
            </Button>

            {/* ➕ إضافة سند (مخفي للمالك والمستأجر) */}
            {canAdd && (
              <Button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PlusCircle size={16} />
                {t("addReceipt")}
              </Button>
            )}
          </div>
        </div>

        {/* 📊 الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: t("totalReceipts"), value: stats.totalCount },
            { title: t("totalReceived"), value: formatCurrency(stats.totalReceived) },
            { title: t("totalPaid"), value: formatCurrency(stats.totalPaid) },
            { title: t("balance"), value: formatCurrency(stats.balance) },
          ].map((s, i) => (
            <Card key={i} className="border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-500 text-sm">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    i === 1
                      ? "text-emerald-600"
                      : i === 2
                      ? "text-red-600"
                      : i === 3
                      ? "text-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 📋 جدول السندات */}
        <Card className="bg-white border border-border shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-emerald-700 text-lg">
              {t("receiptsList")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t("noReceiptsFound")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2">{t("receiptNo")}</th>
                      <th className="p-2">{t("receiptType")}</th>
                      <th className="p-2">{t("amount")}</th>
                      <th className="p-2">{t("date")}</th>
                      <th className="p-2">{t("payer")}</th>
                      <th className="p-2">{t("receiver")}</th>
                      <th className="p-2">{t("linkedTo")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b hover:bg-emerald-50 transition"
                      >
                        <td className="p-2 font-semibold text-emerald-700">
                          {r.reference_no || r.receipt_no || "—"}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              r.receipt_type === "قبض" ||
                              r.receipt_type === "receive"
                                ? "bg-emerald-50 text-emerald-700"
                                : r.receipt_type === "صرف" ||
                                  r.receipt_type === "payment"
                                ? "bg-red-50 text-red-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {r.receipt_type}
                          </span>
                        </td>
                        <td className="p-2 font-medium">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="p-2">
                          {formatDate(r.receipt_date || r.date)}
                        </td>
                        <td className="p-2">{r.payer || r.payer_name || "—"}</td>
                        <td className="p-2">
                          {r.receiver || r.receiver_name || "—"}
                        </td>

                        {/* ✅ الربط الذكي */}
                        <td className="p-2">
                          {r.contract_no ? (
                            <span className="flex items-center gap-1 text-blue-700">
                              <FileText size={14} /> {t("contract")} #
                              {r.contract_no}
                            </span>
                          ) : r.unit_no ? (
                            <span className="flex items-center gap-1 text-emerald-700">
                              <Home size={14} /> {t("unit")} {r.unit_no} –{" "}
                              {r.property_name || "—"}
                            </span>
                          ) : r.property_name ? (
                            <span className="flex items-center gap-1 text-gray-700">
                              <Building2 size={14} /> {t("property")} –{" "}
                              {r.property_name}
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              {t("noLink")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ➕ نافذة الإضافة (تظهر فقط حسب الصلاحية) */}
        {canAdd && (
          <AddReceiptDrawer
            open={drawerOpen}
            setOpen={setDrawerOpen}
            refresh={fetchReceipts}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
