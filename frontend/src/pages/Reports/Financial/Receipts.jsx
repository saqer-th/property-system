import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import { ClipboardList, Calendar, Loader2 } from "lucide-react";

export default function FinancialReceiptsReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  /* ============================================================
     📌 Load Summary Preview
  ============================================================ */
  const loadPreview = async () => {
    if (!from || !to) return;
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/reports/summary/receipts?from=${from}&to=${to}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error("Preview error:", err);
    }

    setLoading(false);
  };

  /* ============================================================
     📄 Generate PDF
  ============================================================ */
  const generateReport = () => {
    const url = `${API_URL}/reports?type=receipts&auth=${user.token}&lang=${i18n.language}&from=${from}&to=${to}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-teal-700 flex items-center gap-2">
            <ClipboardList size={26} />
            {t("officeReceipts")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("receiptReportDesc") ||
              "Generate a summarized report for office receipts within a selected date range."}
          </p>
        </div>

        {/* Filter Card */}
        <Card className="p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* From Date */}
            <div>
              <label className="font-medium text-gray-600 flex items-center gap-2 mb-1">
                <Calendar size={18} /> {t("fromDate")}
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded-md"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            {/* To Date */}
            <div>
              <label className="font-medium text-gray-600 flex items-center gap-2 mb-1">
                <Calendar size={18} /> {t("toDate")}
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded-md"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={loadPreview}
              className="bg-gray-600 text-white hover:bg-gray-700"
              disabled={!from || !to}
            >
              {loading ? <Loader2 className="animate-spin" /> : t("preview")}
            </Button>

            <Button
              onClick={generateReport}
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={!from || !to}
            >
              {t("generatePDF")}
            </Button>
          </div>

        </Card>

        {/* Preview Summary */}
        {summary && (
          <Card className="p-6 space-y-4 shadow-md rounded-xl bg-white">
            <h2 className="font-bold text-lg text-gray-700">
              {t("previewSummary")}
            </h2>

            {summary.success ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">

                  <div className="p-4 bg-teal-50 border rounded-xl">
                    <div className="text-2xl font-bold text-teal-700">
                      {summary.count}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {t("receiptsCount")}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border rounded-xl">
                    <div className="text-2xl font-bold text-emerald-700">
                      {summary.total_amount?.toLocaleString()}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {t("totalAmount")}
                    </div>
                  </div>

                </div>

                {/* Table */}
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">{t("receiptType")}</th>
                      <th className="p-2 border">{t("receiver")}</th>
                      <th className="p-2 border">{t("propertyName")}</th>
                      <th className="p-2 border">{t("unit")}</th>
                      <th className="p-2 border">{t("contract")}</th>
                      <th className="p-2 border">{t("amount")}</th>
                      <th className="p-2 border">{t("date")}</th>
                      <th className="p-2 border">{t("payer")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.items.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 border">{r.receipt_type}</td>
                        <td className="p-2 border">{r.receiver}</td>
                        <td className="p-2 border">{r.property_type}</td>
                        <td className="p-2 border">{r.unit_no || "-"}</td>
                        <td className="p-2 border">{r.contract_no || "-"}</td>
                        <td className="p-2 border">{r.amount}</td>
                        <td className="p-2 border">{r.date}</td>
                        <td className="p-2 border">{r.payer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-red-600">{t("noDataFound")}</p>
            )}
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
