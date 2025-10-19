import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCcw, FileText, PlusCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { API_URL, API_KEY } from "@/config";

export default function ContractsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");

  // 🔹 تحميل العقود من السيرفر
  useEffect(() => {
    async function fetchContracts() {
      try {
        const res = await fetch(`${API_URL}/contracts`, {
          headers: { "x-api-key": API_KEY },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        setContracts(list);
        setFiltered(list);
      } catch (err) {
        console.error("❌ Error loading contracts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchContracts();
  }, []);

  // 🎚️ تطبيق الفلاتر
  useEffect(() => {
    let results = [...contracts];
    const term = searchTerm.toLowerCase();

    if (searchTerm) {
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

    if (selectedTenant)
      results = results.filter((c) => c.tenant_name === selectedTenant);

    setFiltered(results);
  }, [searchTerm, selectedProperty, selectedStatus, selectedTenant, contracts]);

  // 📊 إحصائيات
  const stats = useMemo(() => {
    const totalRent = filtered.reduce(
      (sum, c) => sum + Number(c.annual_rent || 0),
      0
    );
    const totalPaid = filtered.reduce(
      (sum, c) => sum + Number(c.paid_amount || 0),
      0
    );
    const totalRemaining = totalRent - totalPaid;
    return {
      totalContracts: filtered.length,
      totalRent,
      totalPaid,
      totalRemaining,
    };
  }, [filtered]);

  if (loading)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 🔍 العنوان والفلاتر */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
              <FileText /> {t("menu_contracts")}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 🔍 بحث */}
            <div className="relative w-56">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t("searchContracts")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* 🏠 نوع العقار */}
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

            {/* 🧾 حالة العقد */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allStatuses")}</option>
              <option value="نشط">{t("active")}</option>
              <option value="منتهي">{t("expired")}</option>
            </select>

            {/* 👤 المستأجر */}
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">{t("allTenants")}</option>
              {[...new Set(contracts.map((c) => c.tenant_name))].map(
                (tname, i) => (
                  <option key={i} value={tname}>
                    {tname}
                  </option>
                )
              )}
            </select>

            {/* 🔄 إعادة تعيين */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedProperty("");
                setSelectedStatus("");
                setSelectedTenant("");
                setFiltered(contracts);
              }}
            >
              <RefreshCcw size={16} className="mr-1" />
              {t("resetFilters")}
            </Button>

            {/* ➕ إضافة عقد جديد */}
            <Button
              onClick={() => navigate("/contracts/add")}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PlusCircle size={16} />
              {t("addContract")}
            </Button>
          </div>
        </div>

        {/* 📊 الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: t("totalContracts"), value: stats.totalContracts },
            { title: t("totalRent"), value: `${stats.totalRent.toLocaleString()} SAR` },
            { title: t("totalPaid"), value: `${stats.totalPaid.toLocaleString()} SAR` },
            { title: t("totalRemaining"), value: `${stats.totalRemaining.toLocaleString()} SAR` },
          ].map((s, idx) => (
            <Card key={idx} className="bg-card border border-border rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-500 text-sm">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-700">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 📋 جدول العقود */}
        <Card className="bg-card border border-border shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-emerald-700 text-lg">
              {t("contractsTable")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                {t("noContractsFound")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("contractNo")}</th>
                      <th className="p-2 text-start">{t("propertyType")}</th>
                      <th className="p-2 text-start">{t("unitNo")}</th>
                      <th className="p-2 text-start">{t("tenantName")}</th>
                      <th className="p-2 text-start">{t("lessorName")}</th>
                      <th className="p-2 text-start">{t("annualRent")}</th>
                      <th className="p-2 text-start">{t("paid")}</th>
                      <th className="p-2 text-start">{t("remaining")}</th>
                      <th className="p-2 text-start">{t("startDate")}</th>
                      <th className="p-2 text-start">{t("endDate")}</th>
                      <th className="p-2 text-start">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, idx) => {
                      const paid = Number(c.paid_amount || 0);
                      const rent = Number(c.annual_rent || 0);
                      const remaining = rent - paid;
                      return (
                        <tr
                          key={idx}
                          onClick={() => navigate(`/contracts/${c.id}`)}
                          className="border-b hover:bg-emerald-50 cursor-pointer transition"
                        >
                          <td className="p-2 font-semibold text-emerald-700">
                            {c.contract_no || "—"}
                          </td>
                          <td className="p-2">{c.property_type || "—"}</td>
                          <td className="p-2">{c.unit_no || "—"}</td>
                          <td className="p-2">{c.tenant_name || "—"}</td>
                          <td className="p-2">{c.lessor_name || "—"}</td>
                          <td className="p-2">
                            {rent ? `${rent.toLocaleString()} SAR` : "—"}
                          </td>
                          <td className="p-2 text-emerald-700 font-medium">
                            {paid ? `${paid.toLocaleString()} SAR` : "—"}
                          </td>
                          <td className="p-2 text-red-600 font-medium">
                            {remaining > 0 ? `${remaining.toLocaleString()} SAR` : "—"}
                          </td>
                          <td className="p-2">{c.tenancy_start?.split("T")[0] || "—"}</td>
                          <td className="p-2">{c.tenancy_end?.split("T")[0] || "—"}</td>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
