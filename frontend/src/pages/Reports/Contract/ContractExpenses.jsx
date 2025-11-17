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
  Loader2,
  Search,
  BarChart2,
  Wallet,
  Calendar,
} from "lucide-react";

export default function ContractExpensesReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

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

  // Filter search
  const filteredContracts = useMemo(() => {
    if (!query) return contracts;
    return contracts.filter((c) =>
      `${c.contract_no} ${c.tenant_name} ${c.unit_no}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [contracts, query]);

  // Load expenses when contract selected
  const loadExpenses = async (contractId) => {
    setLoadingExpenses(true);
    try {
      const res = await fetch(
        `${API_URL}/expenses/by-contract/${contractId}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        }
      );
      const json = await res.json();
      setExpenses(json.data || []);
    } catch (err) {
      console.error("Error loading expenses:", err);
    }
    setLoadingExpenses(false);
  };

  const handleSelect = (c) => {
    setSelected(c);
    loadExpenses(c.id);
  };

  const generateReport = () => {
    if (!selected) return;
    const lang = i18n.language;
    const url = `${API_URL}/reports?type=contract-expenses&id=${selected.id}&auth=${user.token}&lang=${lang}`;
    window.open(url, "_blank");
  };

  // ====== EXPENSES ANALYTICS ======
  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const highestExpense = expenses.length
    ? Math.max(...expenses.map((e) => Number(e.amount)))
    : 0;
  const averageExpense = expenses.length
    ? (totalExpenses / expenses.length).toFixed(2)
    : 0;

  // Monthly analytics (last 6 months)
  const monthlyStats = Array(6)
    .fill(0)
    .map((_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const m = month.getMonth() + 1;
      const y = month.getFullYear();
      const key = `${y}-${String(m).padStart(2, "0")}`;

      const sum = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return { month: key, total: sum };
    })
    .reverse();

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        <h1 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
          <FileText size={24} /> {t("expensesReport")}
        </h1>

        <Card className="p-6 space-y-6">

          {/* 🔍 Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t("searchContract")}
              className="pl-10"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* 📋 Contract list */}
          <div className="border rounded-xl bg-gray-50 max-h-64 overflow-y-auto">
            {filteredContracts.map((c) => (
              <div
                key={c.id}
                className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-100 transition ${
                  selected?.id === c.id ? "bg-purple-100" : ""
                }`}
                onClick={() => handleSelect(c)}
              >
                <div className="font-semibold text-gray-700">
                  {c.contract_no} – {c.tenant_name}
                </div>
                <div className="text-gray-500 text-sm flex gap-4">
                  <span>{t("unit")} {c.unit_no}</span>
                  <span>{t("city")}: {c.city}</span>
                  <span>{t("status")}: {c.contract_status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ========= EXPENSES SUMMARY ========= */}
          {selected && (
            <Card className="p-5 bg-white border rounded-xl shadow mt-4">

              <h2 className="font-bold text-lg text-purple-700 mb-3">
                {t("expensesSummary")}
              </h2>

              {loadingExpenses ? (
                <Loader2 className="animate-spin text-purple-600 mx-auto" />
              ) : (
                <>
                  {/* INFO CARDS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <div className="p-3 bg-purple-50 rounded-lg border text-center">
                      <div className="text-xl font-bold text-purple-700">
                        {totalExpenses.toLocaleString()}
                      </div>
                      <div className="text-gray-600 text-sm">{t("totalExpenses")}</div>
                    </div>

                    <div className="p-3 bg-red-50 rounded-lg border text-center">
                      <div className="text-xl font-bold text-red-700">
                        {highestExpense.toLocaleString()}
                      </div>
                      <div className="text-gray-600 text-sm">{t("highestExpense")}</div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border text-center">
                      <div className="text-xl font-bold text-blue-700">
                        {expenses.length}
                      </div>
                      <div className="text-gray-600 text-sm">{t("expensesCount")}</div>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg border text-center">
                      <div className="text-xl font-bold text-green-700">
                        {Number(averageExpense).toLocaleString()}
                      </div>
                      <div className="text-gray-600 text-sm">{t("averageExpense")}</div>
                    </div>

                  </div>

                  {/* MONTHLY ANALYTICS */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <BarChart2 /> {t("monthlyExpenses")}
                    </h3>

                    <div className="grid grid-cols-6 gap-3">
                      {monthlyStats.map((m) => (
                        <div
                          key={m.month}
                          className="p-3 bg-gray-100 rounded text-center border"
                        >
                          <div className="font-bold text-gray-800">{m.total.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{m.month}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TABLE */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-700 mb-2">
                      {t("expensesList")}
                    </h3>

                    <div className="overflow-x-auto border rounded-xl bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="p-2 border">{t("date")}</th>
                            <th className="p-2 border">{t("amount")}</th>
                            <th className="p-2 border">{t("category")}</th>
                            <th className="p-2 border">{t("description")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((e) => (
                            <tr key={e.id}>
                              <td className="p-2 border text-center">{e.date}</td>
                              <td className="p-2 border text-center">{Number(e.amount).toLocaleString()}</td>
                              <td className="p-2 border text-center">{e.expense_type || "-"}</td>
                              <td className="p-2 border text-center">{e.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PDF */}
                  <div className="flex justify-end mt-6">
                    <Button
                      className="bg-purple-600 text-white hover:bg-purple-700 px-6"
                      onClick={generateReport}
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
