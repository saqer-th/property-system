import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { PieChart, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function OccupancyReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  /* =====================================================
      Load Summary (JSON Endpoint)
  ===================================================== */
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/reports/occupancy/summary`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        });

        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Error loading summary:", err);
      }
      setLoading(false);
    }
    loadSummary();
  }, []);

  /* =====================================================
      PDF Generator
  ===================================================== */
  const generatePDF = () => {
    const lang = i18n.language;
    const url = `${API_URL}/reports?type=occupancy&auth=${user.token}&lang=${lang}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        {/* Title */}
        <h1 className="text-2xl font-bold text-rose-600 flex items-center gap-2">
          <PieChart size={24} /> {t("occupancySummary")}
        </h1>

        {/* Loading */}
        {loading && (
          <div className="text-center py-10">
            <Loader2 className="animate-spin text-rose-600 mx-auto" size={40} />
          </div>
        )}

        {/* Summary Data */}
        {!loading && summary && (
          <>
            {/* Overall Summary */}
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">
                {t("overallOccupancy")}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">

                <div className="p-4 bg-gray-50 rounded-xl border">
                  <div className="text-2xl font-bold text-gray-700">
                    {summary.total_units}
                  </div>
                  <div className="text-gray-600">{t("totalUnits")}</div>
                </div>

                <div className="p-4 bg-green-50 rounded-xl border">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.occupied_units}
                  </div>
                  <div className="text-gray-600">{t("occupiedUnits")}</div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-xl border">
                  <div className="text-2xl font-bold text-yellow-600">
                    {summary.empty_units}
                  </div>
                  <div className="text-gray-600">{t("emptyUnits")}</div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border">
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.occupancy_rate}%
                  </div>
                  <div className="text-gray-600">{t("occupancyRate")}</div>
                </div>

              </div>
            </Card>

            {/* Units Table */}
            <Card className="p-6 space-y-4">

              <h2 className="text-xl font-semibold text-gray-700">
                {t("unitsList")}
              </h2>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">{t("unitNumber")}</th>
                    <th className="border p-2">{t("unitType")}</th>
                    <th className="border p-2">{t("property")}</th>
                    <th className="border p-2">{t("status")}</th>
                  </tr>
                </thead>

                <tbody>
                  {summary.units.map((u, i) => (
                    <tr key={i}>
                      <td className="border p-2 text-center">{u.unit_no}</td>
                      <td className="border p-2 text-center">{u.unit_type}</td>
                      <td className="border p-2 text-center">{u.property_name}</td>
                      <td className="border p-2 text-center">
                        {u.occupied > 0 ? (
                          <span className="text-green-600 font-semibold">
                            {t("occupied")}
                          </span>
                        ) : (
                          <span className="text-yellow-600 font-semibold">
                            {t("empty")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </Card>


          </>
        )}

      </div>
    </DashboardLayout>
  );
}
