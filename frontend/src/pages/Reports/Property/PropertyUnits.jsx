import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Search,
  Loader2,
} from "lucide-react";

export default function PropertyUnitsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  /* ============================
     Load Properties
  ============================ */
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
        console.error("Error:", err);
      }
    }
    load();
  }, []);

  /* ============================
     Search Filter
  ============================ */
  const filteredProperties = useMemo(() => {
    if (!query) return properties;
    return properties.filter((p) =>
      `${p.property_name} ${p.city} ${p.title_deed_no}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [properties, query]);

  /* ============================
     Load Property Details
  ============================ */
  const loadPropertyDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/properties/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setPropertyDetails(json.data);
    } catch (err) {
      console.error("Error loading details:", err);
    }
    setLoadingDetails(false);
  };

  const handleSelect = (p) => {
    setSelected(p);
    loadPropertyDetails(p.id);
  };

  /* ============================
     Generate PDF
  ============================ */
  const generateReport = () => {
    const url = `${API_URL}/reports?type=property&id=${selected.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
          <Building2 size={24} /> {t("unitsByProperty")}
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
                    ${selected?.id === p.id ? "bg-blue-100" : ""}`}
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

          {/* Property Units Preview */}
          {selected && (
            <Card className="p-5 border rounded-xl shadow bg-white mt-4">

              <h2 className="font-bold text-lg text-blue-700 mb-3 flex gap-2 items-center">
                <Building2 size={20} /> {t("unitsList")}
              </h2>

              {loadingDetails ? (
                <Loader2 className="animate-spin text-blue-700 mx-auto" />
              ) : propertyDetails ? (
                <>
                  {/* Header summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-blue-50 border rounded-lg text-center">
                      <div className="text-xl font-bold text-blue-700">
                        {propertyDetails?.units?.length || 0}
                      </div>
                      <div className="text-gray-600 text-sm">{t("unitsCount")}</div>
                    </div>

                    <div className="p-4 bg-green-50 border rounded-lg text-center">
                      <div className="text-lg font-bold text-green-700">
                        {propertyDetails?.property_name}
                      </div>
                      <div className="text-gray-600 text-sm">{t("propertyType")}</div>
                    </div>

                    <div className="p-4 bg-purple-50 border rounded-lg text-center">
                      <div className="text-lg font-bold text-purple-700">
                        {propertyDetails?.city}
                      </div>
                      <div className="text-gray-600 text-sm">{t("city")}</div>
                    </div>
                  </div>

                  {/* Units Table */}
                  <div className="overflow-x-auto border rounded-lg bg-white mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="p-2 border">{t("unitNumber")}</th>
                          <th className="p-2 border">{t("type")}</th>
                          <th className="p-2 border">{t("area")}</th>
                          <th className="p-2 border">{t("electricMeter")}</th>
                          <th className="p-2 border">{t("waterMeter")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyDetails?.units?.map((u) => (
                          <tr key={u.id}>
                            <td className="p-2 border text-center">{u.unit_no}</td>
                            <td className="p-2 border text-center">{u.unit_type}</td>
                            <td className="p-2 border text-center">{u.unit_area}</td>
                            <td className="p-2 border text-center">{u.electric_meter_no}</td>
                            <td className="p-2 border text-center">{u.water_meter_no}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Download PDF Button */}
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
