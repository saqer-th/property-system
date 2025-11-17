import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Search,
  Loader2,
  Building2,
} from "lucide-react";

export default function PropertyContractsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
      Load Properties
  =============================== */
  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_URL}/properties/my`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setProperties(json.data || json || []);
    }
    load();
  }, []);

  /* ===============================
      Search Filter
  =============================== */
  const filtered = useMemo(() => {
    if (!query) return properties;
    return properties.filter((p) =>
      `${p.property_name} ${p.title_deed_no} ${p.city}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [properties, query]);

  /* ===============================
      Load Contracts by Property
  =============================== */
  const loadContracts = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/properties/${id}/contracts`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const json = await res.json();
      setContracts(json.data || []);
    } catch (err) {
      console.error("Contracts error:", err);
    }
    setLoading(false);
  };

  const handleSelect = (p) => {
    setSelected(p);
    loadContracts(p.id);
  };

  /* ===============================
      Generate PDF
  =============================== */
  const generateReport = () => {
    const url =
      `${API_URL}/reports?type=property&id=${selected.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        <h1 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
          <FileText size={24} /> {t("contractsByProperty")}
        </h1>

        <Card className="p-6 space-y-6 shadow-md rounded-xl">

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder={t("searchProperty")}
              className="pl-10"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Property List */}
          <div className="border rounded-xl bg-gray-50 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-3 text-gray-500 text-center">{t("noPropertiesFound")}</p>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-100 transition
                    ${selected?.id === p.id ? "bg-purple-100" : ""}`}
                >
                  <div className="font-semibold text-gray-700">
                    {p.property_name || p.title_deed_no} — {p.city}
                  </div>
                  <div className="text-sm text-gray-500 flex gap-3 mt-1">
                    <span>{t("type")}: {p.property_type}</span>
                    <span>{t("usage")}: {p.property_usage}</span>
                    <span>{t("units")}: {p.num_units}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Contract Preview */}
          {selected && (
            <Card className="p-5 border rounded-xl shadow bg-white mt-4">

              <h2 className="font-bold text-lg text-purple-700 mb-3 flex gap-2 items-center">
                <Building2 size={20} /> {t("contractsList")}
              </h2>

              {loading ? (
                <Loader2 className="animate-spin text-purple-700 mx-auto" />
              ) : contracts.length > 0 ? (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

                    <div className="p-4 bg-purple-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-purple-700">{contracts.length}</div>
                      <div className="text-gray-600 text-sm">{t("contractsCount")}</div>
                    </div>

                    <div className="p-4 bg-green-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-green-700">
                        {
                          contracts.filter((c) =>
                            (c.status || c.contract_status) === "نشط"
                          ).length
                        }
                      </div>
                      <div className="text-gray-600 text-sm">{t("activeContracts")}</div>
                    </div>

                    <div className="p-4 bg-red-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-red-700">
                        {
                          contracts.filter((c) =>
                            (c.status || c.contract_status) === "منتهي"
                          ).length
                        }
                      </div>
                      <div className="text-gray-600 text-sm">{t("expiredContracts")}</div>
                    </div>

                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="p-2 border">{t("contractNo")}</th>
                          <th className="p-2 border">{t("tenant")}</th>
                            <th className="p-2 border">{t("unitNumber")}</th>
                            <th className="p-2 border">{t("unitType")}</th>
                          <th className="p-2 border">{t("startDate")}</th>
                          <th className="p-2 border">{t("endDate")}</th>
                          <th className="p-2 border">{t("amount")}</th>
                          <th className="p-2 border">{t("status")}</th>
                        </tr>
                      </thead>

                      <tbody>
                        {contracts.map((c) => (
                          <tr key={c.id}>
                            <td className="p-2 border text-center">{c.contract_no}</td>
                            <td className="p-2 border text-center">{c.tenant_name}</td>
                            <td className="p-2 border text-center">{c.unit_no}</td>
                            <td className="p-2 border text-center">{c.unit_type}</td>
                            <td className="p-2 border text-center">{c.tenancy_start?.split("T")[0]}</td>
                            <td className="p-2 border text-center">{c.tenancy_end?.split("T")[0]}</td>
                            <td className="p-2 border text-center">
                              {c.total_contract_value?.toLocaleString()}
                            </td>
                            <td className="p-2 border text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  (c.status || c.contract_status) === "نشط"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {c.status || c.contract_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Generate PDF */}
                  <div className="flex justify-end mt-6">
                    <Button
                      className="bg-purple-600 text-white hover:bg-purple-700 px-6"
                      onClick={generateReport}
                    >
                      {t("generatePDF")}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center">{t("noContracts")}</p>
              )}

            </Card>
          )}

        </Card>
      </div>
    </DashboardLayout>
  );
}
