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
  CalendarDays,
  User,
  Home,
  Building2,
  DollarSign,
  Layers,
  Receipt,
  ClipboardList,
} from "lucide-react";

export default function ContractSummaryReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ============================================================
      1) Load contracts list
  ============================================================ */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/contracts/my`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        });
        const data = await res.json();
        setContracts(data.data || []);
      } catch (err) {
        console.error("Error:", err);
      }
    }
    load();
  }, []);

  /* ============================================================
      2) Load FULL contract details
  ============================================================ */
  const loadFullContract = async (id) => {
    try {
      const res = await fetch(`${API_URL}/contracts/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error("Error loading contract", err);
      return null;
    }
  };

  /* ============================================================
      3) Filtering
  ============================================================ */
  const filteredContracts = useMemo(() => {
    if (!query) return contracts;
    return contracts.filter((c) =>
      `${c.contract_no} ${c.tenant_name} ${c.unit_no}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [query, contracts]);

  /* ============================================================
      4) Generate PDF
  ============================================================ */
  const generateReport = () => {
    if (!selected) return;
    setLoading(true);

    const url = `${API_URL}/reports?type=contract&id=${selected.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");

    setTimeout(() => setLoading(false), 600);
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6">

        {/* -----------------------------------------------------------
            Header
        ----------------------------------------------------------- */}
        <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
          <FileText size={26} /> {t("contractSummary")}
        </h1>

        <Card className="p-6 space-y-6 shadow-md rounded-xl">

          {/* -----------------------------------------------------------
              Search Contracts
          ----------------------------------------------------------- */}
          <div className="relative mb-3">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder={t("searchContract")}
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* -----------------------------------------------------------
              Contract List
          ----------------------------------------------------------- */}
          <div className="max-h-72 overflow-y-auto rounded-xl border bg-gray-50">
            {filteredContracts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {t("noContractsFound")}
              </p>
            ) : (
              filteredContracts.map((c) => (
                <div
                  key={c.id}
                  onClick={async () => {
                    const full = await loadFullContract(c.id);
                    setSelected(full);
                  }}
                  className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-100 transition 
                    ${selected?.id == c.id ? "bg-emerald-100" : ""}`}
                >
                  <div className="font-semibold text-gray-700">
                    {c.contract_no} — {c.tenant_name}
                  </div>
                  <div className="text-sm text-gray-500 flex gap-4 mt-1">
                    <span>{t("unit")}: {c.unit_no}</span>
                    <span>{t("city")}: {c.city}</span>
                    <span>{t("status")}: {c.contract_status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* -----------------------------------------------------------
              Full Contract Summary
          ----------------------------------------------------------- */}
          {selected && (
            <Card className="p-6 bg-white shadow-inner border rounded-xl mt-4 space-y-10">

              {/* ------------------ Contract Main Info ------------------ */}
              <h2 className="font-bold text-xl text-emerald-700 mb-2">
                {t("contractOverview")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-gray-700">

                <div className="flex items-center gap-2">
                  <Layers className="text-emerald-600" size={18} />
                  <span className="font-semibold">{t("contractNo")}:</span>{" "}
                  {selected.contract_no}
                </div>

                <div className="flex items-center gap-2">
                  <User className="text-emerald-600" size={18} />
                  <span className="font-semibold">{t("tenant")}:</span>{" "}
                  {selected.tenants?.[0]?.name}
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays className="text-emerald-600" size={18} />
                  <span className="font-semibold">{t("startDate")}:</span>{" "}
                  {selected.tenancy_start?.split("T")[0]}
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays className="text-emerald-600" size={18} />
                  <span className="font-semibold">{t("endDate")}:</span>{" "}
                  {selected.tenancy_end?.split("T")[0]}
                </div>

                <div className="flex items-center gap-2">
                  <Home className="text-emerald-600" size={18} />
                  <span className="font-semibold">{t("unit")}:</span>{" "}
                  {selected.units?.[0]?.unit_no} — {selected.units?.[0]?.unit_type}
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="text-emerald-600" size={18} />
                  <span className="font-semibold">{t("property")}:</span>{" "}
                  {selected.property?.property_name}
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="text-emerald-600" size={18} />
                  <span className="font-semibold">{t("totalValue")}:</span>{" "}
                  {Number(selected.total_contract_value).toLocaleString()}
                </div>
              </div>

              {/* ------------------ Financial Summary ------------------ */}
              <div>
                <h3 className="text-lg font-bold text-emerald-700 mb-4">
                  {t("financialSummary")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div className="p-4 border rounded-xl bg-emerald-50 shadow-sm">
                    <div className="text-gray-600 font-semibold">{t("expectedIncome")}</div>
                    <div className="text-xl font-bold">
                      {Number(selected.total_contract_value).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl bg-emerald-50 shadow-sm">
                    <div className="text-gray-600 font-semibold">{t("collected")}</div>
                    <div className="text-xl font-bold">
                      {Number(
                        selected.receipts
                          ?.filter((r) => r.receipt_type === "قبض")
                          ?.reduce((s, r) => s + Number(r.amount || 0), 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl bg-emerald-50 shadow-sm">
                    <div className="text-gray-600 font-semibold">{t("remaining")}</div>
                    <div className="text-xl font-bold">
                      {Number(
                        selected.total_contract_value -
                          selected.receipts
                            ?.filter((r) => r.receipt_type === "قبض")
                            ?.reduce((s, r) => s + Number(r.amount || 0), 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================
                  Payments Table (Premium UI)
              ============================================================ */}
              <div>
                <h3 className="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <ClipboardList className="text-emerald-600" size={18} /> {t("payments")}
                </h3>

                <div className="overflow-hidden border rounded-xl shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-600 text-white text-center">
                        <th className="p-3">{t("dueDate")}</th>
                        <th className="p-3">{t("amount")}</th>
                        <th className="p-3">{t("paidAmount")}</th>
                        <th className="p-3">{t("remainingAmount")}</th>
                        <th className="p-3">{t("status")}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selected.payments.map((p, i) => (
                        <tr
                          key={p.id}
                          className={`text-center border-b ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-emerald-50 transition`}
                        >
                          <td className="p-3">{p.due_date?.split("T")[0]}</td>
                          <td className="p-3 font-semibold">{Number(p.amount).toLocaleString()}</td>
                          <td className="p-3">{Number(p.paid_amount).toLocaleString()}</td>
                          <td className="p-3">{Number(p.remaining_amount).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`
                              px-3 py-1 rounded-full text-xs font-bold
                              ${p.status === "مدفوعة"
                                ? "bg-emerald-100 text-emerald-700"
                                : p.status === "جزئية"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"}
                            `}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ============================================================
                  Expenses Table (Premium UI)
              ============================================================ */}
              <div>
                <h3 className="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <Receipt className="text-emerald-600" size={18} /> {t("expenses")}
                </h3>

                <div className="overflow-hidden border rounded-xl shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-700 text-white text-center">
                        <th className="p-3">{t("type")}</th>
                        <th className="p-3">{t("amount")}</th>
                        <th className="p-3">{t("date")}</th>
                        <th className="p-3">{t("notes")}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selected.expenses.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-4 text-center text-gray-500">
                            {t("noExpenses")}
                          </td>
                        </tr>
                      ) : (
                        selected.expenses.map((e, i) => (
                          <tr
                            key={e.id}
                            className={`text-center border-b ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50"
                            } hover:bg-slate-100 transition`}
                          >
                            <td className="p-3">{e.expense_type}</td>
                            <td className="p-3 font-semibold">{Number(e.amount).toLocaleString()}</td>
                            <td className="p-3">{e.date?.split("T")[0]}</td>
                            <td className="p-3">{e.notes || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ============================================================
                  Receipts Table (Premium UI)
              ============================================================ */}
              <div>
                <h3 className="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <Receipt className="text-emerald-600" size={18} /> {t("receipts")}
                </h3>

                <div className="overflow-hidden border rounded-xl shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-700 text-white text-center">
                        <th className="p-3">{t("type")}</th>
                        <th className="p-3">{t("reference")}</th>
                        <th className="p-3">{t("amount")}</th>
                        <th className="p-3">{t("date")}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selected.receipts.map((r, i) => (
                        <tr
                          key={r.id}
                          className={`text-center border-b ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-blue-50 transition`}
                        >
                          <td className="p-3">{r.receipt_type}</td>
                          <td className="p-3">{r.reference_no}</td>
                          <td className="p-3 font-semibold">{Number(r.amount).toLocaleString()}</td>
                          <td className="p-3">{r.date?.split("T")[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* -----------------------------------------------------------
              Generate PDF Button
          ----------------------------------------------------------- */}
          <div className="flex justify-end mt-6">
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-6"
              disabled={!selected || loading}
              onClick={generateReport}
            >
              {loading ? <Loader2 className="animate-spin" /> : t("generatePDF")}
            </Button>
          </div>

        </Card>
      </div>
    </DashboardLayout>
  );
}
