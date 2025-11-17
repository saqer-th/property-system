import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Home,
  Loader2,
  Search,
  Building2,
} from "lucide-react";

export default function UnitSummaryReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [units, setUnits] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [unitDetails, setUnitDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  /* ===============================
     Load Units (List)
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

        const data = await res.json();
        setUnits(data.data || data || []);
      } catch (err) {
        console.error("Error loading units:", err);
      }
    }
    load();
  }, []);

  /* ===============================
     Search Units
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
     Load Selected Unit Details
  =================================*/
  const loadUnitDetails = async (unitId) => {
    setLoadingDetails(true);

    try {
      const res = await fetch(`${API_URL}/units/${unitId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const json = await res.json();
      setUnitDetails(json.data); // <-- API gives `data`
    } catch (err) {
      console.error("Error loading unit details:", err);
    }

    setLoadingDetails(false);
  };

  const handleSelect = (u) => {
    setSelected(u);
    loadUnitDetails(u.id);
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
        <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
          <Home size={24} /> {t("unitSummary")}
        </h1>

        <Card className="p-6 space-y-6 shadow-md rounded-xl">

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder={t("searchUnit") || "Search units..."}
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
                    ${selected?.id === u.id ? "bg-blue-100" : ""}`}
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

          {/* Unit Details */}
          {selected && (
            <Card className="p-5 border rounded-xl shadow bg-white mt-4">

              <h2 className="font-bold text-lg text-blue-700 mb-3 flex gap-2 items-center">
                <Building2 size={20} /> {t("unitDetails")}
              </h2>

              {loadingDetails ? (
                <Loader2 className="animate-spin text-blue-600 mx-auto" />
              ) : unitDetails ? (
                <>
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 mb-4">

                    <div>
                      <span className="font-semibold">{t("unitNumber")}:</span>{" "}
                      {unitDetails?.unit_no || "-"}
                    </div>

                    <div>
                      <span className="font-semibold">{t("area")}:</span>{" "}
                      {unitDetails?.unit_area || "-"}
                    </div>

                    <div>
                      <span className="font-semibold">{t("electricMeter")}:</span>{" "}
                      {unitDetails?.electric_meter_no || "-"}
                    </div>

                    <div>
                      <span className="font-semibold">{t("waterMeter")}:</span>{" "}
                      {unitDetails?.water_meter_no || "-"}
                    </div>
                  </div>

                  {/* Linked Contracts */}
                  <h3 className="font-bold text-md text-gray-700 mb-2">
                    {t("linkedContracts")}
                  </h3>

                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="p-2 border">{t("contractNo")}</th>
                          <th className="p-2 border">{t("startDate")}</th>
                          <th className="p-2 border">{t("endDate")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitDetails?.contracts?.map((c) => (
                          <tr key={c.id}>
                            <td className="p-2 border text-center">{c.contract_no}</td>
                            <td className="p-2 border text-center">{c.tenancy_start?.split("T")[0]}</td>
                            <td className="p-2 border text-center">{c.tenancy_end?.split("T")[0]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Stats */}
                  <h3 className="font-bold text-md text-gray-700 mt-4 mb-2">
                    {t("summary")}
                  </h3>

                  <div className="grid grid-cols-3 gap-4">

                    <div className="p-3 bg-green-50 border rounded-lg text-center">
                      <div className="text-lg font-bold text-green-700">
                        {unitDetails?.contracts?.length || 0}
                      </div>
                      <div className="text-gray-600 text-sm">{t("contractsCount")}</div>
                    </div>

                    <div className="p-3 bg-blue-50 border rounded-lg text-center">
                      <div className="text-lg font-bold text-blue-700">
                        {unitDetails?.expenses?.length || 0}
                      </div>
                      <div className="text-gray-600 text-sm">{t("expensesCount")}</div>
                    </div>

                    <div className="p-3 bg-purple-50 border rounded-lg text-center">
                      <div className="text-lg font-bold text-purple-700">
                        {selected?.title_deed_no}
                      </div>
                      <div className="text-gray-600 text-sm">{t("propertyID")}</div>
                    </div>

                  </div>

                  {/* Generate PDF */}
                  <div className="flex justify-end mt-6">
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700 px-6"
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
