import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart2,
  Loader2,
  Building2,
  Percent,
  Calendar,
  FileText,
  Receipt,
  Home,
} from "lucide-react";

import { useTranslation } from "react-i18next";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function ProfitReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [officeRate, setOfficeRate] = useState(0);
  const [rateType, setRateType] = useState("income");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* =======================
     Load properties
  ======================= */
  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_URL}/properties/my`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setProperties(json.data || json || []);
    }
    load();
  }, []);

  /* =======================
     Load units
  ======================= */
  useEffect(() => {
    async function loadUnits() {
      if (!selectedProperty) return;

      const res = await fetch(
        `${API_URL}/units/by-property/${selectedProperty.id}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        }
      );
      const json = await res.json();
      setUnits(json.data || []);
    }
    loadUnits();
  }, [selectedProperty]);

  /* =======================
     Build Query URL
  ======================= */
  const buildQueryURL = () => {
    const params = new URLSearchParams();

    if (selectedProperty?.id) params.append("property_id", selectedProperty.id);
    if (selectedUnit?.id) params.append("unit_id", selectedUnit.id);

    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    params.append("rate", officeRate || 0);
    params.append("rate_type", rateType);

    return `${API_URL}/reports/summary/profit?` + params.toString();
  };

  /* =======================
     Load preview
  ======================= */
  const loadPreview = async () => {
    setLoading(true);

    try {
      const url = buildQueryURL();
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      setResult(await res.json());
    } catch (err) {
      console.error("ERR:", err);
    }

    setLoading(false);
  };

  /* =======================
     Export PDF
  ======================= */
  const generatePDF = () => {
    const params = new URLSearchParams();

    if (selectedProperty?.id) params.append("property_id", selectedProperty.id);
    if (selectedUnit?.id) params.append("unit_id", selectedUnit.id);
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    params.append("rate", officeRate || 0);
    params.append("rate_type", rateType);
    params.append("auth", user.token);
    params.append("lang", i18n.language);

    const url = `${API_URL}/reports?type=profit&${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-8">

        <h1 className="text-3xl font-bold text-amber-600 flex items-center gap-2">
          <BarChart2 size={30} /> {t("profitSummary")}
        </h1>

        {/* Filters */}
        <Card className="p-6 rounded-xl shadow space-y-6">
          
          {/* Property */}
          <div>
            <label className="font-medium text-gray-700 flex items-center gap-2">
              <Home size={18} /> {t("chooseProperty")}
            </label>

            <select
              className="w-full border p-2 rounded-md mt-1"
              onChange={(e) =>
                setSelectedProperty(
                  properties.find((p) => p.id == e.target.value)
                )
              }
            >
              <option value="">{t("selectProperty")}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_name || p.title_deed_no}
                </option>
              ))}
            </select>
          </div>

          {/* Units */}
          {selectedProperty && (
            <div>
              <label className="font-medium text-gray-700 flex items-center gap-2">
                <Building2 size={18} /> {t("chooseUnit")}
              </label>

              <select
                className="w-full border p-2 rounded-md mt-1"
                onChange={(e) =>
                  setSelectedUnit(units.find((u) => u.id == e.target.value))
                }
              >
                <option value="">{t("allUnits")}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_no}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-gray-700 flex items-center gap-2">
                <Calendar size={18} /> {t("fromDate")}
              </label>
              <input
                type="date"
                value={fromDate}
                className="w-full border p-2 rounded-md"
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 flex items-center gap-2">
                <Calendar size={18} /> {t("toDate")}
              </label>
              <input
                type="date"
                value={toDate}
                className="w-full border p-2 rounded-md"
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {/* Office Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-gray-700 flex items-center gap-2">
                <Percent size={18} /> {t("officeRate")}
              </label>
              <input
                type="number"
                value={officeRate}
                className="w-full border p-2 rounded-md"
                onChange={(e) => setOfficeRate(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium text-gray-700">{t("rateType")}</label>
              <select
                className="w-full border p-2 rounded-md"
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
              >
                <option value="income">{t("percentageOfIncome")}</option>
                <option value="profit">{t("percentageOfProfit")}</option>
              </select>
            </div>
          </div>

          <Button
            className="bg-amber-600 text-white hover:bg-amber-700 px-5"
            onClick={loadPreview}
          >
            {loading ? <Loader2 className="animate-spin" /> : t("previewReport")}
          </Button>
        </Card>

        {/* Result */}
        {result && !loading && (
          <PreviewResult result={result} t={t} generatePDF={generatePDF} />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ===========================
   Preview Component
=========================== */
function PreviewResult({ result, t, generatePDF }) {
  return (
    <div className="space-y-10">
      <SummaryRow result={result} t={t} />
      <ChartBlock result={result} t={t} />
      <DataBlock title={t("paymentsList")} icon={<BarChart2 size={20} />} rows={result.payments} />
      <DataBlock title={t("incomeItems")} icon={<BarChart2 size={20} />} rows={result.income_rows} />
      <DataBlock title={t("expenseItems")} icon={<FileText size={20} />} rows={result.expense_rows} />
      <DataBlock title={t("receiptsList")} icon={<Receipt size={20} />} rows={result.receipt_rows} />
      
      
      <div className="text-center">
        <Button
          onClick={generatePDF}
          className="bg-amber-600 text-white hover:bg-amber-700 px-8 py-3 text-lg"
        >
          {t("generatePDF")}
        </Button>
      </div>
    </div>
  );
}

/* ===========================
   Summary 
=========================== */
function SummaryRow({ result, t }) {
  return (
    <Card className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-xl shadow">
      {/* هنا total_collected بدل total_income */}
      <SummaryCard color="green" value={result.total_collected} label={t("totalIncome")} />
      <SummaryCard color="red" value={result.total_expenses} label={t("totalExpenses")} />
      <SummaryCard color="blue" value={result.net_profit} label={t("netProfit")} />
      <SummaryCard color="amber" value={result.office_fee} label={t("officeFee")} />
    </Card>
  );
}

function SummaryCard({ value, label, color }) {
  const colors = {
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };

  return (
    <div className={`p-4 rounded-xl border text-center shadow-sm ${colors[color]}`}>
      <div className="text-2xl font-bold">{Number(value).toLocaleString()}</div>
      <div className="text-gray-700 mt-1">{label}</div>
    </div>
  );
}

/* ===========================
   Chart
=========================== */
function ChartBlock({ result, t }) {
  return (
    <Card className="p-6 bg-white rounded-xl shadow">
      <h2 className="font-semibold text-gray-700 mb-4">{t("visualComparison")}</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={[
            { name: t("income"), value: result.total_collected },
            { name: t("expenses"), value: result.total_expenses },
            { name: t("netProfit"), value: result.net_profit },
          ]}
        >
          <XAxis dataKey="name" />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ===========================
   Data table
=========================== */
function DataBlock({ title, icon, rows }) {
  return (
    <Card className="p-6 rounded-xl bg-white shadow">
      <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
        {icon} {title}
      </h2>

      {rows?.length > 0 ? (
        <DataTable rows={rows} />
      ) : (
        <p className="text-gray-500 text-center py-6">No data</p>
      )}
    </Card>
  );
}

function DataTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-600 text-center">
          <tr>
            {Object.keys(rows[0] || {}).map((key) => (
              <th key={key} className="p-2 border capitalize">
                {key.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="text-center">
              {Object.values(r).map((v, j) => (
                <td key={j} className="p-2 border">{String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
