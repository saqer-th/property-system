import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  Home,
  Search,
  Building2,
  FileText,
  Loader2,
} from "lucide-react";

export default function PropertySummaryReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  /* Load Properties */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/properties/my`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        });
        const json = await res.json();
        setProperties(json.data || json || []);
      } catch (err) {
        console.error("ERR loading properties:", err);
      }
    }
    load();
  }, []);

  /* Search Filter */
  const filteredProperties = useMemo(() => {
    if (!query) return properties;
    return properties.filter((p) =>
      `${p.property_name} ${p.city} ${p.title_deed_no}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [properties, query]);

  /* Load Property Details */
  const loadPropertyDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/properties/${id}/summary`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const json = await res.json();
      setPropertyDetails(json.data);
    } catch (err) {
      console.error("ERR loading property details:", err);
    }
    setLoadingDetails(false);
  };

  const handleSelect = (p) => {
    setSelected(p);
    loadPropertyDetails(p.id);
  };

  /* Generate PDF */
  const generateReport = () => {
    const url = `${API_URL}/reports?type=property&id=${selected.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        {/* PAGE TITLE */}
        <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
          <Home size={24} /> {t("propertySummary")}
        </h1>

        <Card className="p-6 space-y-6 shadow-md rounded-xl">

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder={t("searchProperty") || "Search properties..."}
              className="pl-10"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Property List */}
          <div className="border rounded-xl bg-gray-50 max-h-64 overflow-y-auto">
            {filteredProperties.length === 0 ? (
              <p className="p-3 text-gray-500 text-center">{t("noPropertiesFound")}</p>
            ) : (
              filteredProperties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-100 transition
                     ${selected?.id === p.id ? "bg-emerald-100" : ""}`}
                >
                  <div className="font-semibold text-gray-700">
                    {p.property_name || p.title_deed_no} — {p.city}
                  </div>
                  <div className="text-sm text-gray-500 flex gap-4 mt-1">
                    <span>{t("type")}: {p.property_type}</span>
                    <span>{t("usage")}: {p.property_usage}</span>
                    <span>{t("units")}: {p.num_units}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Property Full Summary */}
          {selected && (
            <Card className="p-6 mt-4 shadow border rounded-xl bg-white">

              {loadingDetails ? (
                <Loader2 className="animate-spin text-emerald-700 mx-auto" />
              ) : propertyDetails ? (
                <>

                  {/* Basic Info */}
                  <h2 className="font-bold text-lg text-emerald-700 mb-3 flex gap-2 items-center">
                    <Building2 size={20} /> {t("propertyDetails")}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 mb-6">
                    <div>
                      <span className="font-semibold">{t("propertyType")}:</span>{" "}
                      {propertyDetails.property.property_type}
                    </div>
                    <div>
                      <span className="font-semibold">{t("city")}:</span>{" "}
                      {propertyDetails.property.city}
                    </div>
                    <div>
                      <span className="font-semibold">{t("titleDeed")}:</span>{" "}
                      {propertyDetails.property.title_deed_no}
                    </div>
                    <div>
                      <span className="font-semibold">{t("usage")}:</span>{" "}
                      {propertyDetails.property.property_usage}
                    </div>
                  </div>

                  {/* SUMMARY CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                    {/* Units count */}
                    <div className="p-4 bg-blue-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-blue-700">
                        {propertyDetails.units.length}
                      </div>
                      <div className="text-gray-600">{t("unitsCount")}</div>
                    </div>

                    {/* Contracts */}
                    <div className="p-4 bg-green-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-green-700">
                        {propertyDetails.contracts.length}
                      </div>
                      <div className="text-gray-600">{t("contractsCount")}</div>
                    </div>

                    {/* Expenses */}
                    <div className="p-4 bg-red-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-red-700">
                        {propertyDetails.expenses.length}
                      </div>
                      <div className="text-gray-600">{t("expensesCount")}</div>
                    </div>

                    {/* Receipts */}
                    <div className="p-4 bg-purple-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-purple-700">
                        {propertyDetails.receipts.length}
                      </div>
                      <div className="text-gray-600">{t("receiptsCount")}</div>
                    </div>

                  </div>

                  {/* UNITS TABLE */}
                  <h3 className="font-bold text-md text-gray-700 mb-2">{t("unitsList")}</h3>
                  <div className="overflow-x-auto rounded-lg border mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="p-2 border">{t("unitNumber")}</th>
                          <th className="p-2 border">{t("type")}</th>
                          <th className="p-2 border">{t("area")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyDetails.units.map((u) => (
                          <tr key={u.id}>
                            <td className="p-2 border text-center">{u.unit_no}</td>
                            <td className="p-2 border text-center">{u.unit_type}</td>
                            <td className="p-2 border text-center">{u.unit_area}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* CONTRACTS SUMMARY */}
                  <h3 className="font-bold text-md text-gray-700 mb-2">{t("contractsSummary")}</h3>
                  <div className="overflow-x-auto rounded-lg border mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="p-2 border">{t("contractNo")}</th>
                          <th className="p-2 border">{t("tenant")}</th>
                          <th className="p-2 border">{t("startDate")}</th>
                          <th className="p-2 border">{t("endDate")}</th>
                          <th className="p-2 border">{t("status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyDetails.contracts.map((c) => (
                          <tr key={c.id}>
                            <td className="p-2 border text-center">{c.contract_no}</td>
                            <td className="p-2 border text-center">{c.tenant_name}</td>
                            <td className="p-2 border text-center">{c.tenancy_start?.split("T")[0]}</td>
                            <td className="p-2 border text-center">{c.tenancy_end?.split("T")[0]}</td>
                            <td className="p-2 border text-center">{c.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* EXPENSES SUMMARY */}
                  <h3 className="font-bold text-md text-gray-700 mb-2">{t("latestExpenses")}</h3>
                  <div className="overflow-x-auto rounded-lg border mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 text-gray-700">
                        <tr>
                          <th className="p-2 border">{t("date")}</th>
                          <th className="p-2 border">{t("amount")}</th>
                          <th className="p-2 border">{t("type")}</th>
                          <th className="p-2 border">{t("description")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyDetails.expenses.slice(0, 5).map((e) => (
                          <tr key={e.id}>
                            <td className="p-2 border text-center">{e.date}</td>
                            <td className="p-2 border text-center">{e.amount}</td>
                            <td className="p-2 border text-center">{e.expense_type}</td>
                            <td className="p-2 border text-center">{e.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* RECEIPTS SUMMARY */}
                  <h3 className="font-bold text-md text-gray-700 mb-2">{t("latestReceipts")}</h3>
                  <div className="overflow-x-auto rounded-lg border mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-purple-50 text-gray-700">
                        <tr>
                          <th className="p-2 border">{t("type")}</th>
                          <th className="p-2 border">{t("amount")}</th>
                          <th className="p-2 border">{t("date")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyDetails.receipts.slice(0, 5).map((r) => (
                          <tr key={r.id}>
                            <td className="p-2 border text-center">{r.receipt_type}</td>
                            <td className="p-2 border text-center">{r.amount}</td>
                            <td className="p-2 border text-center">{r.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* DOWNLOAD BUTTON */}
                  <div className="flex justify-end">
                    <Button
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-6"
                      onClick={generateReport}
                    >
                      {t("generatePDF")}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">{t("noDetails")}</p>
              )}

            </Card>
          )}

        </Card>
      </div>
    </DashboardLayout>
  );
}
