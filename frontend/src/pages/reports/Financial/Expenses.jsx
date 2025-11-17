import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Calendar,
  Receipt,
  Loader2,
  Filter,
} from "lucide-react";

export default function FinancialExpensesReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  /* ==================== LOAD PREVIEW ==================== */
  const loadPreview = async () => {
    if (!from || !to) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/reports/summary/expenses?from=${from}&to=${to}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        }
      );

      const json = await res.json();
      setSummary(json);
    } catch (err) {
      console.error("Preview error:", err);
    }

    setLoading(false);
  };

  /* ==================== GENERATE PDF ==================== */
  const generateReport = () => {
    const lang = i18n.language;
    const url = `${API_URL}/reports?type=expenses&auth=${user.token}&lang=${lang}&from=${from}&to=${to}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        {/* Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight flex items-center gap-2">
            <Receipt size={28} /> {t("officeExpenses")}
          </h1>
        </div>

        {/* ================= FILTER CARD ================= */}
        <Card className="p-6 shadow-lg rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-700">
            <Filter size={20} /> {t("filters")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className="font-medium text-gray-700 mb-1 flex gap-2 items-center">
                <Calendar size={20} /> {t("fromDate")}
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 mb-1 flex gap-2 items-center">
                <Calendar size={20} /> {t("toDate")}
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-6">
            <Button
              className="bg-blue-600 text-white px-6 hover:bg-blue-700 shadow-md"
              onClick={loadPreview}
            >
              {loading ? <Loader2 className="animate-spin" /> : t("showPreview")}
            </Button>

            <Button
              className="bg-green-600 text-white px-6 hover:bg-green-700 shadow-md"
              onClick={generateReport}
              disabled={!from || !to}
            >
              {t("generatePDF")}
            </Button>
          </div>
        </Card>

        {/* ================= PREVIEW SECTION ================= */}
        {summary && (
          <Card className="p-6 bg-gray-50 shadow-md rounded-2xl border border-gray-200">

            {/* Summary Header */}
            <h2 className="text-xl font-bold text-gray-700 mb-5 flex items-center gap-2">
              <FileText size={20} /> {t("expensesSummary")}
            </h2>

            {/* Summary Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

              <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm text-center">
                <div className="text-2xl font-extrabold text-blue-700">
                  {summary.total_amount?.toLocaleString() || 0}
                </div>
                <div className="text-gray-600 text-sm">{t("totalExpensesAmount")}</div>
              </div>

              <div className="p-5 bg-purple-50 border border-purple-200 rounded-xl shadow-sm text-center">
                <div className="text-2xl font-extrabold text-purple-700">
                  {summary.expenses_count}
                </div>
                <div className="text-gray-600 text-sm">{t("expensesCount")}</div>
              </div>

              <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm text-center">
                <div className="text-lg font-bold text-yellow-700">
                  {from} → {to}
                </div>
                <div className="text-gray-600 text-sm">{t("selectedRange")}</div>
              </div>

            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-700 text-center">
                    <th className="border p-2">{t("expense_scope")}</th>
                    <th className="border p-2">{t("date")}</th>
                    <th className="border p-2">{t("amount")}</th>
                    <th className="border p-2">{t("onWhom")}</th>
                    <th className="border p-2">{t("description")}</th>
                    <th className="border p-2">{t("unit")}</th>
                    <th className="border p-2">{t("property")}</th>
                    <th className="border p-2">{t("contract")}</th>
                  </tr>
                </thead>

                <tbody>
                  {summary.expenses.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-100 text-center">
                      <td className="border p-2">{e.expense_scope}</td>
                      <td className="border p-2">{e.date}</td>
                      <td className="border p-2 font-bold text-blue-700">
                        {e.amount.toLocaleString()}
                      </td>
                      <td className="border p-2">{e.on_whom}</td>
                      <td className="border p-2 text-left">{e.description}</td>
                      <td className="border p-2">{e.unit_no || "-"}</td>
                      <td className="border p-2">{e.property_name || "-"}</td>
                      <td className="border p-2">{e.contract_no || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
