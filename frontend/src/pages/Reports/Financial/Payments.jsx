import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Loader2,
  CreditCard,
  DollarSign,
  ListOrdered,
} from "lucide-react";

export default function FinancialPaymentsReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  /* =====================================================
      Load Preview Summary
  ===================================================== */
  const loadPreview = async () => {
    setError("");

    if (!from || !to) return setError(t("pleaseChooseDates"));
    if (new Date(from) > new Date(to)) return setError(t("dateRangeInvalid"));

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/payments/summary?from=${from}&to=${to}`,
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
      console.error(err);
      setError(t("errorLoadingData"));
    }

    setLoading(false);
  };

  /* =====================================================
      Generate PDF
  ===================================================== */
  const generatePDF = () => {
    const lang = i18n.language;
    const url =
      `${API_URL}/reports?type=payments&auth=${user.token}&lang=${lang}` +
      `&from=${from}&to=${to}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
          <FileSpreadsheet size={24} /> {t("officePayments")}
        </h1>

        <Card className="p-6 space-y-6 shadow-md rounded-2xl">

          {/* Date Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-2">
              <label className="font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={20} /> {t("fromDate")}
              </label>
              <input
                type="date"
                className="w-full border p-3 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-orange-400"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={20} /> {t("toDate")}
              </label>
              <input
                type="date"
                className="w-full border p-3 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-orange-400"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Button */}
          <div className="flex justify-end">
            <Button
              className="bg-gray-700 text-white hover:bg-gray-800 px-8"
              onClick={loadPreview}
            >
              {loading ? <Loader2 className="animate-spin" /> : t("viewReport")}
            </Button>
          </div>
        </Card>

        {/* Preview Section */}
        {summary && (
          <Card className="p-6 space-y-6 shadow-lg rounded-xl border">

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">

              <div className="p-4 bg-orange-50 border rounded-xl">
                <div className="text-3xl font-bold text-orange-600 flex justify-center gap-2">
                  {summary.total_amount} 
                </div>
                <div className="text-gray-700">{t("totalPayments")}</div>
              </div>

              <div className="p-4 bg-green-50 border rounded-xl">
                <div className="text-3xl font-bold text-green-600">
                  {summary.payments_count}
                </div>
                <div className="text-gray-700">{t("paymentsCount")}</div>
              </div>

              <div className="p-4 bg-blue-50 border rounded-xl">
                <div className="text-3xl font-bold text-blue-600">
                  {summary.contracts_count}
                </div>
                <div className="text-gray-700">{t("relatedContracts")}</div>
              </div>

            </div>

            {/* Table */}
            <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
              <ListOrdered size={20} /> {t("paymentsList")}
            </h2>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">{t("contractNo")}</th>
                    <th className="border p-2">{t("tenantName")}</th>
                    <th className="border p-2">{t("tenantPhone")}</th>
                    <th className="border p-2">{t("amount")}</th>
                    <th className="border p-2">{t("dueDate")}</th>
                    <th className="border p-2">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.payments.map((p, i) => (
                    <tr key={i}>
                      <td className="border p-2 text-center">{p.contract_no}</td>
                      <td className="border p-2 text-center">{p.tenant_name}</td>
                      <td className="border p-2 text-center">{p.tenant_phone}</td>
                      <td className="border p-2 text-center">{p.amount}</td>
                      <td className="border p-2 text-center">{p.due_date.split("T")[0]}</td>
                      <td className="border p-2 text-center">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PDF Button */}
            <div className="flex justify-end">
              <Button
                className="bg-orange-600 text-white hover:bg-orange-700 px-8 py-2"
                onClick={generatePDF}
              >
                {t("generatePDF")}
              </Button>
            </div>

          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
