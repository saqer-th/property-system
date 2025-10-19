import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, FileText, Loader2, Wrench } from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import toast, { Toaster } from "react-hot-toast";

export default function UnitDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [unit, setUnit] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📦 تحميل بيانات الوحدة والعقود والمصروفات
  useEffect(() => {
    async function fetchUnit() {
      try {
        const res = await fetch(`${API_URL}/units/${id}`, {
          headers: { "x-api-key": API_KEY },
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load unit details");
        }

        const data = json.data || json;
        setUnit(data);
        setContracts(data.contracts || []);
        setExpenses(data.expenses || []);
      } catch (err) {
        console.error("❌ Error loading unit:", err);
        toast.error(t("failedToLoadUnit") || "فشل تحميل بيانات الوحدة");
      } finally {
        setLoading(false);
      }
    }
    fetchUnit();
  }, [id, t]);

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          {t("loadingData")}
        </div>
      </DashboardLayout>
    );

  if (!unit)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("noUnitFound")}</p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-6 space-y-6">
        {/* 🏘️ تفاصيل الوحدة */}
        <Card className="bg-card border border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-emerald-700">
              <Home size={18} /> {t("unitDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p>
              <span className="font-medium">{t("unitNo")}:</span>{" "}
              {unit.unit_no || "—"}
            </p>
            <p>
              <span className="font-medium">{t("unitType")}:</span>{" "}
              {unit.unit_type || "—"}
            </p>
            <p>
              <span className="font-medium">{t("unitArea")}:</span>{" "}
              {unit.unit_area ? `${unit.unit_area} م²` : "—"}
            </p>
            <p>
              <span className="font-medium">{t("electricMeter")}:</span>{" "}
              {unit.electric_meter_no || "—"}
            </p>
            <p>
              <span className="font-medium">{t("waterMeter")}:</span>{" "}
              {unit.water_meter_no || "—"}
            </p>
            <p>
              <span className="font-medium">{t("status")}:</span>{" "}
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium ${
                  unit.status === "occupied"
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-gray-600 bg-gray-100"
                }`}
              >
                {unit.status === "occupied" ? t("occupied") : t("vacant")}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* 📑 العقود المرتبطة بالوحدة */}
        <Card className="bg-card border border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-600">
              <FileText size={18} /> {t("relatedContracts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noContractsFound")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("contractNo")}</th>
                      <th className="p-2 text-start">{t("tenantName")}</th>
                      <th className="p-2 text-start">{t("startDate")}</th>
                      <th className="p-2 text-start">{t("endDate")}</th>
                      <th className="p-2 text-start">{t("status")}</th>
                      <th className="p-2 text-start">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c, i) => (
                      <tr
                        key={i}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="p-2">{c.contract_no || "—"}</td>
                        <td className="p-2">{c.tenant_name || "—"}</td>
                        <td className="p-2">
                          {c.start_date
                            ? c.start_date.split("T")[0]
                            : "—"}
                        </td>
                        <td className="p-2">
                          {c.end_date ? c.end_date.split("T")[0] : "—"}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              c.status === "active" || c.status === "نشط"
                                ? "text-emerald-600 bg-emerald-50"
                                : "text-gray-600 bg-gray-100"
                            }`}
                          >
                            {c.status === "active" || c.status === "نشط"
                              ? t("active")
                              : t("expired")}
                          </span>
                        </td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/contracts/${c.id}`)
                            }
                          >
                            {t("viewDetails")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🧾 المصروفات الخاصة بالوحدة */}
        <Card className="bg-card border border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-amber-600">
              <Wrench size={18} /> {t("unitExpenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noExpensesFound")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("expenseType")}</th>
                      <th className="p-2 text-start">{t("amount")}</th>
                      <th className="p-2 text-start">{t("onWhom")}</th>
                      <th className="p-2 text-start">{t("date")}</th>
                      <th className="p-2 text-start">{t("notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, i) => (
                      <tr
                        key={i}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="p-2">{e.expense_type || "—"}</td>
                        <td className="p-2">
                          {e.amount ? `${Number(e.amount).toLocaleString()} SAR` : "—"}
                        </td>
                        <td className="p-2">{e.on_whom || "—"}</td>
                        <td className="p-2">
                          {e.date ? e.date.split("T")[0] : "—"}
                        </td>
                        <td className="p-2">{e.notes || "—"}</td>
                      </tr>
                    ))}
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
