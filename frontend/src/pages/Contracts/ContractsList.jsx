import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCcw,
  FileText,
  PlusCircle,
  Calendar,
  Wallet2,
  TrendingUp,
  AlertTriangle,
  Phone,
  PiggyBank,
  Bell,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export default function ContractsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showDueSoon, setShowDueSoon] = useState(false);
  const [showAdvanceOnly, setShowAdvanceOnly] = useState(false);

  const activeRole = user?.activeRole;
  const canAdd = ["admin", "office_admin", "office"].includes(activeRole);

  // 📦 تحميل العقود
  useEffect(() => {
    async function fetchContracts() {
      if (!user?.token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/contracts/my`, {
          headers: {
            "x-api-key": API_KEY,
            Authorization: `Bearer ${user.token}`,
            "x-active-role": activeRole,
          },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "فشل تحميل العقود");

        const list = data.data || [];
        const enriched = list.map((c) => ({
          ...c,
          total_value_calculated: Number(c.total_value_calculated || 0),
          total_paid: Number(c.total_paid || 0),
          total_remaining: Number(c.total_remaining || 0),
          advance_balance: Number(c.advance_balance || 0),
        }));

        setContracts(enriched);
        setFiltered(enriched);
      } catch (err) {
        console.error("❌ Error loading contracts:", err);
        toast.error(err.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }

    fetchContracts();
  }, [user]);

  // 🔍 الفلاتر
  useEffect(() => {
    let results = [...contracts];
    const term = searchTerm.toLowerCase();

    if (term) {
      results = results.filter((c) =>
        [c.contract_no, c.tenant_name, c.lessor_name, c.property_type, c.unit_no]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(term))
      );
    }
    if (selectedProperty)
      results = results.filter((c) => c.property_type === selectedProperty);
    if (selectedStatus)
      results = results.filter((c) => c.contract_status === selectedStatus);
    if (showAdvanceOnly)
      results = results.filter((c) => Number(c.advance_balance) > 0);
    if (showDueSoon) {
      const today = new Date();
      const limit = new Date();
      limit.setDate(today.getDate() + 30);
      results = results.filter((c) => {
        const d = c.next_payment_date ? new Date(c.next_payment_date) : null;
        return d && d >= today && d <= limit;
      });
    }
    setFiltered(results);
  }, [
    searchTerm,
    selectedProperty,
    selectedStatus,
    showDueSoon,
    showAdvanceOnly,
    contracts,
  ]);

  // 📊 الإحصاءات
  const stats = useMemo(() => {
    const totalContracts = filtered.length;
    const totalValue = filtered.reduce(
      (sum, c) => sum + Number(c.total_value_calculated || 0),
      0
    );
    const totalPaid = filtered.reduce(
      (sum, c) => sum + Number(c.total_paid || 0),
      0
    );
    const totalAdvance = filtered.reduce(
      (sum, c) => sum + Number(c.advance_balance || 0),
      0
    );
    const totalRemaining = totalValue - totalPaid;
    return { totalContracts, totalValue, totalPaid, totalRemaining, totalAdvance };
  }, [filtered]);

  const formatCurrency = (num) =>
    Number(num || 0).toLocaleString("en-EN", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
    });

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? "—" : d.toLocaleDateString("en-CA");
  };

  if (loading)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        {/* ===== العنوان والفلاتر ===== */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <FileText /> {t("menu_contracts")}
          </h1>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t("searchContracts")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-60 pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allProperties")}</option>
              {[...new Set(contracts.map((c) => c.property_type))].map((p, i) => (
                <option key={i} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allStatuses")}</option>
              <option value="نشط">{t("active")}</option>
              <option value="منتهي">{t("expired")}</option>
            </select>

            <Button
              variant={showAdvanceOnly ? "default" : "outline"}
              onClick={() => setShowAdvanceOnly(!showAdvanceOnly)}
              className={`flex items-center gap-1 ${
                showAdvanceOnly ? "bg-green-600 text-white" : ""
              }`}
            >
              <PiggyBank size={16} /> {t("advanceBalance")}
            </Button>

            <Button
              variant={showDueSoon ? "default" : "outline"}
              onClick={() => setShowDueSoon(!showDueSoon)}
              className={`flex items-center gap-1 ${
                showDueSoon ? "bg-yellow-500 text-white" : ""
              }`}
            >
              <Calendar size={16} /> {t("dueSoon")}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedProperty("");
                setSelectedStatus("");
                setShowDueSoon(false);
                setShowAdvanceOnly(false);
                setFiltered(contracts);
              }}
            >
              <RefreshCcw size={16} className="mr-1" /> {t("resetFilters")}
            </Button>

            {/* ➕ زر إضافة عقد (يظهر فقط للمصرح لهم) */}
            {canAdd && (
              <Button
                onClick={() => navigate("/contracts/add")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex gap-1"
              >
                <PlusCircle size={16} /> {t("addContract")}
              </Button>
            )}
          </div>
        </div>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard title={t("totalContracts")} value={stats.totalContracts} icon={<FileText />} />
          <StatCard title={t("totalValue")} value={formatCurrency(stats.totalValue)} icon={<TrendingUp />} />
          <StatCard title={t("totalPaid")} value={formatCurrency(stats.totalPaid)} icon={<Wallet2 />} color="text-green-600" />
          <StatCard title={t("totalRemaining")} value={formatCurrency(stats.totalRemaining)} icon={<AlertTriangle />} color="text-red-600" />
          <StatCard title={t("advanceBalance")} value={formatCurrency(stats.totalAdvance)} icon={<PiggyBank />} color="text-emerald-600" />
        </div>

        {/* ===== جدول العقود ===== */}
        <Card className="bg-white border shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-emerald-50 border-b">
            <CardTitle className="text-emerald-700 text-lg">
              {t("contractsTable")}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                {t("noContractsFound")}
              </p>
            ) : (
              <table className="w-full text-sm text-gray-700 border-collapse">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-2">{t("contractNo")}</th>
                    <th className="p-2">{t("tenantName")}</th>
                    <th className="p-2">{t("tenancyStart")}</th>
                    <th className="p-2">{t("tenancyEnd")}</th>
                    <th className="p-2">{t("tenantPhone")}</th>
                    <th className="p-2">{t("propertyType")}</th>
                    <th className="p-2">{t("unitNo")}</th>
                    <th className="p-2">{t("totalValue")}</th>
                    <th className="p-2 text-green-700">{t("paid")}</th>
                    <th className="p-2 text-red-600">{t("remaining")}</th>
                    <th className="p-2 text-emerald-600">{t("advanceBalance")}</th>
                    <th className="p-2">{t("nextPayment")}</th>
                    <th className="p-2">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => {
                    const dueSoon =
                      c.next_payment_date &&
                      new Date(c.next_payment_date) - new Date() <= 7 * 24 * 60 * 60 * 1000;
                    return (
                      <tr
                        key={idx}
                        onClick={() => navigate(`/contracts/${c.id}`)}
                        className={`border-b hover:bg-emerald-50 cursor-pointer transition ${
                          c.advance_balance > 0 ? "bg-green-50" : ""
                        }`}
                      >
                        <td className="p-2 font-semibold text-emerald-700">{c.contract_no || "—"}</td>
                        <td className="p-2">{c.tenant_name || "—"}</td>
                        <td className="p-2">{formatDate(c.tenancy_start)}</td>
                        <td className="p-2">{formatDate(c.tenancy_end)}</td>
                        <td className="p-2 flex items-center gap-1 text-gray-600">
                          <Phone size={14} className="text-gray-400" />
                          {c.tenant_phone || "—"}
                        </td>
                        <td className="p-2">{c.property_type || "—"}</td>
                        <td className="p-2">{c.unit_no || "—"}</td>
                        <td className="p-2">{formatCurrency(c.total_value_calculated)}</td>
                        <td className="p-2 text-green-700 font-medium">{formatCurrency(c.total_paid)}</td>
                        <td className="p-2 text-red-600 font-medium">
                          {c.total_remaining > 0 ? formatCurrency(c.total_remaining) : "—"}
                        </td>
                        <td className="p-2 text-emerald-600 font-medium">
                          {c.advance_balance > 0 ? formatCurrency(c.advance_balance) : "—"}
                        </td>
                        <td className="p-2 text-blue-600 flex items-center gap-1">
                          {dueSoon && <Bell size={14} className="text-yellow-500" />}
                          {formatDate(c.next_payment_date)}{" "}
                          {c.next_payment_amount ? `(${formatCurrency(c.next_payment_amount)})` : ""}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              c.contract_status === "نشط"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {c.contract_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* ===== بطاقة الإحصاءات ===== */
function StatCard({ title, value, icon, color }) {
  return (
    <Card className="border shadow-sm rounded-xl hover:shadow-md transition-all duration-200">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          {icon} {title}
        </div>
        <p className={`text-xl font-bold ${color || "text-emerald-700"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
