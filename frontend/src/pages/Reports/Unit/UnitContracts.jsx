import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Search,
  Building2,
  Loader2,
} from "lucide-react";

export default function UnitContractsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [units, setUnits] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [unitContracts, setUnitContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  /* ===============================
     Load Units List
  =================================*/
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/units/my`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        });
        const json = await res.json();
        setUnits(json.data || json || []);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  /* ===============================
     Search Filter
  =================================*/
  const filteredUnits = useMemo(() => {
    if (!query) return units;
    return units.filter((u) =>
      `${u.unit_no} ${u.property_name} ${u.property_type}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [units, query]);

  /* ===============================
     Load Contracts for Unit
  =================================*/
  const loadUnitContracts = async (unitId) => {
    setLoadingContracts(true);
    try {
      const res = await fetch(`${API_URL}/units/${unitId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const json = await res.json();
      setUnitContracts(json.data?.contracts || []);

    } catch (err) {
      console.error("Error loading unit contracts:", err);
    }
    setLoadingContracts(false);
  };

  const handleSelect = (u) => {
    setSelected(u);
    loadUnitContracts(u.id);
  };

  /* ===============================
     Generate PDF
  =================================*/
  const generateReport = () => {
    const url = `${API_URL}/reports?type=unit&id=${selected.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        {/* Title */}
        <h1 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
          <FileText size={24} /> {t("unitContracts")}
        </h1>

        <Card className="p-6 space-y-6 shadow-md rounded-xl">

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder={t("searchUnit")}
              className="pl-10"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Unit List */}
          <div className="border rounded-xl bg-gray-50 max-h-64 overflow-y-auto">
            {filteredUnits.length === 0 ? (
              <p className="p-3 text-gray-500 text-center">{t("noUnitsFound")}</p>
            ) : (
              filteredUnits.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-100 transition
                     ${selected?.id === u.id ? "bg-purple-100" : ""}`}
                >
                  <div className="font-semibold text-gray-700">
                    {u.unit_no} — {u.property_name}
                  </div>
                  <div className="text-sm text-gray-500 flex gap-3">
                    <span>{t("type")}: {u.unit_type}</span>
                    <span>{t("propertyType")}: {u.property_type}</span>
                    <span>{t("city")}: {u.city}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Unit Contracts Preview */}
          {selected && (
            <Card className="p-5 border rounded-xl shadow bg-white mt-4">

              <h2 className="font-bold text-lg text-purple-700 mb-3 flex gap-2 items-center">
                <Building2 size={20} /> {t("contractsList")}
              </h2>

              {loadingContracts ? (
                <Loader2 className="animate-spin text-purple-700 mx-auto" />
              ) : unitContracts.length > 0 ? (
                <>
                  {/* Stats */}
                  <div className="p-4 bg-purple-50 border rounded-lg text-center mb-4">
                    <div className="text-xl font-bold text-purple-700">{unitContracts.length}</div>
                    <div className="text-gray-600">{t("contractsCount")}</div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border rounded-lg bg-white">
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
                        {unitContracts.map((c) => (
                          <tr key={c.id}>
                            <td className="p-2 border text-center">{c.contract_no}</td>
                            <td className="p-2 border text-center">{c.tenant_name}</td>
                            <td className="p-2 border text-center">{c.tenancy_start?.split("T")[0]}</td>
                            <td className="p-2 border text-center">{c.tenancy_end?.split("T")[0]}</td>
                            <td className="p-2 border text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  c.contract_status === "نشط"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {c.contract_status}
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
                <p className="text-gray-500 text-center py-6">
                  {t("noContracts")}
                </p>
              )}

            </Card>
          )}

        </Card>
      </div>
    </DashboardLayout>
  );
}
