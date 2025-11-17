import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileSpreadsheet,
  Loader2,
  Search,
  BarChart2,
  Calendar,
} from "lucide-react";

export default function ContractPaymentsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Load contracts
  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_URL}/contracts/my`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const data = await res.json();
      setContracts(data.data || []);
    }
    load();
  }, []);

  // Filter contracts by search
  const filteredContracts = useMemo(() => {
    if (!query) return contracts;
    return contracts.filter((c) =>
      `${c.contract_no} ${c.tenant_name} ${c.unit_no}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [contracts, query]);

  // Load payments for selected contract
  const loadPayments = async (contractId) => {
    setLoadingPayments(true);
    try {
      const res = await fetch(
        `${API_URL}/payments/by-contract/${contractId}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        }
      );
      const json = await res.json();
      setPayments(json.data || []);
    } catch (err) {
      console.error("Error loading payments:", err);
    }
    setLoadingPayments(false);
  };

  const handleSelect = (c) => {
    setSelected(c);
    loadPayments(c.id);
  };

  const generatePDF = () => {
    if (!selected) return;

    const lang = i18n.language;
    const url = `${API_URL}/reports?type=contract-payments&id=${selected.id}&auth=${user.token}&lang=${lang}`;
    window.open(url, "_blank");
  };

  // Payment Stats
  const totalAmount = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
  const totalPaid = payments.reduce(
    (a, p) => a + Number(p.paid_amount || 0),
    0
  );
  const totalRemaining = totalAmount - totalPaid;

  const delayedPayments = payments.filter(
    (p) =>
      p.status !== "مدفوعة" && new Date(p.due_date) < new Date()
  ).length;

  const percentageCollected = totalAmount
    ? ((totalPaid / totalAmount) * 100).toFixed(1)
    : 0;

  // Categorize by days
  const daysDiff = (date) =>
    Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));

  const buckets = {
    "0-30": payments.filter((p) => daysDiff(p.due_date) <= 30),
    "31-60": payments.filter(
      (p) => daysDiff(p.due_date) > 30 && daysDiff(p.due_date) <= 60
    ),
    "61-90": payments.filter(
      (p) => daysDiff(p.due_date) > 60 && daysDiff(p.due_date) <= 90
    ),
    "90+": payments.filter((p) => daysDiff(p.due_date) > 90),
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
          <FileSpreadsheet size={24} /> {t("paymentsReport")}
        </h1>

        <Card className="p-6 space-y-6">

          {/* ===== Search ===== */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder={t("searchContract")}
              className="pl-10"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* ===== List of Contracts ===== */}
          <div className="border rounded-xl bg-gray-50 max-h-64 overflow-y-auto">
            {filteredContracts.map((c) => (
              <div
                key={c.id}
                className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-100 transition 
                  ${selected?.id === c.id ? "bg-blue-100" : ""}`}
                onClick={() => handleSelect(c)}
              >
                <div className="font-semibold text-gray-700">
                  {c.contract_no} — {c.tenant_name}
                </div>
                <div className="text-sm text-gray-500 flex gap-3">
                  <span>{t("unit")} {c.unit_no}</span>
                  <span>{t("city")}: {c.city}</span>
                  <span>{t("status")}: {c.contract_status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ===== Preview Contract Details ===== */}
          {selected && (
            <Card className="p-4 border rounded-xl shadow bg-white">

              <h2 className="text-lg font-bold text-blue-700 mb-3">
                {t("paymentSummary")}
              </h2>

              {loadingPayments ? (
                <Loader2 className="animate-spin text-blue-600 mx-auto" />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">

                    {/* total amount */}
                    <div className="p-3 bg-blue-50 rounded-lg border">
                      <div className="text-xl font-bold text-blue-700">
                        {totalAmount.toLocaleString()}
                      </div>
                      <div className="text-gray-600 text-sm">{t("totalPayments")}</div>
                    </div>

                    {/* paid */}
                    <div className="p-3 bg-green-50 rounded-lg border">
                      <div className="text-xl font-bold text-green-700">
                        {totalPaid.toLocaleString()}
                      </div>
                      <div className="text-gray-600 text-sm">{t("paid")}</div>
                    </div>

                    {/* remaining */}
                    <div className="p-3 bg-yellow-50 rounded-lg border">
                      <div className="text-xl font-bold text-yellow-700">
                        {totalRemaining.toLocaleString()}
                      </div>
                      <div className="text-gray-600 text-sm">{t("remaining")}</div>
                    </div>

                    {/* delayed */}
                    <div className="p-3 bg-red-50 rounded-lg border">
                      <div className="text-xl font-bold text-red-700">
                        {delayedPayments}
                      </div>
                      <div className="text-gray-600 text-sm">{t("delayedPayments")}</div>
                    </div>
                  </div>

                  {/* ===== Payment Buckets Chart ===== */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <BarChart2 /> {t("paymentAging")}
                    </h3>

                    <div className="grid grid-cols-4 gap-3">

                      {Object.entries(buckets).map(([label, arr]) => (
                        <div key={label} className="p-3 bg-gray-100 rounded-lg text-center border">
                          <div className="text-xl font-bold">
                            {arr.length}
                          </div>
                          <div className="text-gray-600 text-sm">
                            {label} {t("days")}
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>

                  {/* ===== List of Payments ===== */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-700 mb-2">
                      {t("paymentsList")}
                    </h3>

                    <div className="overflow-x-auto rounded-xl border bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="p-2 border">{t("dueDate")}</th>
                            <th className="p-2 border">{t("amount")}</th>
                            <th className="p-2 border">{t("paid")}</th>
                            <th className="p-2 border">{t("remaining")}</th>
                            <th className="p-2 border">{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id}>
                              <td className="p-2 border text-center">
                                {p.due_date?.split("T")[0]}
                              </td>
                              <td className="p-2 border text-center">
                                {Number(p.amount).toLocaleString()}
                              </td>
                              <td className="p-2 border text-center">
                                {Number(p.paid_amount).toLocaleString()}
                              </td>
                              <td className="p-2 border text-center">
                                {(p.amount - p.paid_amount).toLocaleString()}
                              </td>
                              <td
                                className={`p-2 border text-center font-semibold ${
                                  p.status === "مدفوعة"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {p.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* ===== Generate PDF ===== */}
                  <div className="flex justify-end mt-6">
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700 px-6"
                      disabled={!selected}
                      onClick={generatePDF}
                    >
                      {t("generatePDF")}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}

        </Card>
      </div>
    </DashboardLayout>
  );
}
