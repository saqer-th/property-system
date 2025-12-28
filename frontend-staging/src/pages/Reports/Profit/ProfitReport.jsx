import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Filter,
  PieChart as PieChartIcon,
  ArrowRight,
  ArrowLeft,
  Wallet
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";

// --- Constants ---
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
const FINANCIAL_COLORS = { income: '#10b981', expense: '#ef4444', profit: '#3b82f6' };

const StatCard = ({ title, value, subtext, icon, colorClass, bgClass, loading }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
    <div className="space-y-1">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
      )}
      {subtext && !loading && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
      {icon}
    </div>
  </div>
);

export default function ProfitReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  // Filter State
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [officeRate, setOfficeRate] = useState(2.5); // Default 2.5%
  const [rateType, setRateType] = useState("income");

  // Data State
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(true);
  const [result, setResult] = useState(null);

  /* =======================
      Load Properties
  ======================= */
  useEffect(() => {
    async function load() {
      setLoadingProps(true);
      try {
        const res = await fetch(`${API_URL}/properties/my`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        });
        const json = await res.json();
        setProperties(json.data || json || []);
      } catch (err) { console.error(err); }
      setLoadingProps(false);
    }
    load();
  }, [user.token, user.activeRole]);

  /* =======================
      Load Units
  ======================= */
  useEffect(() => {
    async function loadUnits() {
      if (!selectedProperty) {
        setUnits([]);
        return;
      }
      try {
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
      } catch (err) { console.error(err); }
    }
    loadUnits();
  }, [selectedProperty, user.token, user.activeRole]);

  /* =======================
      Load Preview
  ======================= */
  const loadPreview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProperty?.id) params.append("property_id", selectedProperty.id);
      if (selectedUnit?.id) params.append("unit_id", selectedUnit.id);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      params.append("rate", officeRate || 0);
      params.append("rate_type", rateType);

      const res = await fetch(`${API_URL}/reports/summary/profit?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("ERR:", err);
    }
    setLoading(false);
  };

  /* =======================
      Analytics Processing
  ======================= */
  const analytics = useMemo(() => {
    if (!result) return null;

    const totalIncome = Number(result.total_collected || 0);
    const totalExpenses = Number(result.total_expenses || 0);
    const netProfit = Number(result.net_profit || 0);
    const officeFee = Number(result.office_fee || 0);
    
    // Profit Margin
    const margin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

    // Chart Data: Financial Overview
    const financialChart = [
      { name: t("income"), amount: totalIncome, fill: FINANCIAL_COLORS.income },
      { name: t("expenses"), amount: totalExpenses, fill: FINANCIAL_COLORS.expense },
      { name: t("netProfit"), amount: netProfit, fill: FINANCIAL_COLORS.profit },
    ];

    // Chart Data: Expense Breakdown
    const expenseData = (result.expense_rows || []).map((row, index) => ({
      name: row.description || row.expense_type || "Other",
      value: Number(row.amount),
      fill: COLORS[index % COLORS.length]
    })).filter(i => i.value > 0);

    return { totalIncome, totalExpenses, netProfit, officeFee, margin, financialChart, expenseData };
  }, [result, t]);

  /* =======================
      PDF Export
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
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <BarChart2 className="text-amber-600" /> {t("profitSummary")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("profitSummarySub", "تحليل الأرباح، المصروفات، وصافي الدخل للفترة المحددة")}
              </p>
           </div>
        </div>

        {/* --- Filters --- */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 bg-white">
           <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 
                 {/* Property & Unit */}
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">{t("property")}</label>
                    <Select 
                       onValueChange={(val) => {
                          setSelectedProperty(properties.find(p => p.id.toString() === val));
                          setSelectedUnit(null);
                       }}
                    >
                       <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue placeholder={t("selectProperty")} />
                       </SelectTrigger>
                       <SelectContent>
                          {properties.map(p => (
                             <SelectItem key={p.id} value={p.id.toString()}>
                                {p.property_type || p.title_deed_no}
                             </SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">{t("unit")}</label>
                    <Select 
                       disabled={!selectedProperty}
                       onValueChange={(val) => setSelectedUnit(units.find(u => u.id.toString() === val))}
                    >
                       <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue placeholder={t("allUnits")} />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">{t("allUnits")}</SelectItem>
                          {units.map(u => (
                             <SelectItem key={u.id} value={u.id.toString()}>{u.unit_no}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>

                 {/* Date Range */}
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">{t("fromDate")}</label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 border-gray-200"/>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">{t("toDate")}</label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 border-gray-200"/>
                 </div>
              </div>

              {/* Advanced Options (Office Rate) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-t border-gray-100 pt-4">
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">{t("officeRate")} (%)</label>
                    <div className="relative">
                       <Percent className="absolute left-3 top-2.5 text-gray-400" size={14}/>
                       <Input 
                          type="number" 
                          value={officeRate} 
                          onChange={(e) => setOfficeRate(e.target.value)} 
                          className="pl-9 bg-gray-50 border-gray-200"
                       />
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">{t("rateType")}</label>
                    <Select value={rateType} onValueChange={setRateType}>
                       <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="income">{t("percentageOfIncome")}</SelectItem>
                          <SelectItem value="profit">{t("percentageOfProfit")}</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>

                 <div className="md:col-span-2 flex gap-3">
                    <Button onClick={loadPreview} disabled={loading} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-100">
                       {loading ? <Loader2 className="animate-spin mr-2" size={18}/> : <BarChart2 className="mr-2" size={18}/>}
                       {t("previewReport")}
                    </Button>
                    <Button onClick={generatePDF} disabled={!result} variant="outline" className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50">
                       <Download className="mr-2" size={18}/> PDF
                    </Button>
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* --- Content Area --- */}
        {loading ? (
           <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl"/>)}
              </div>
              <Skeleton className="h-[400px] rounded-xl"/>
           </div>
        ) : result && analytics ? (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. Key Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <StatCard 
                    title={t("totalIncome")} 
                    value={analytics.totalIncome.toLocaleString()} 
                    icon={<TrendingUp size={20}/>} 
                    colorClass="text-emerald-600" 
                    bgClass="bg-emerald-50"
                 />
                 <StatCard 
                    title={t("totalExpenses")} 
                    value={analytics.totalExpenses.toLocaleString()} 
                    icon={<TrendingDown size={20}/>} 
                    colorClass="text-red-600" 
                    bgClass="bg-red-50"
                 />
                 <StatCard 
                    title={t("netProfit")} 
                    value={analytics.netProfit.toLocaleString()} 
                    subtext={`هامش ربح: ${analytics.margin}%`}
                    icon={<Wallet size={20}/>} 
                    colorClass="text-blue-600" 
                    bgClass="bg-blue-50"
                 />
                 <StatCard 
                    title={t("officeFee")} 
                    value={analytics.officeFee.toLocaleString()} 
                    subtext={`${officeRate}% نسبة المكتب`}
                    icon={<Building2 size={20}/>} 
                    colorClass="text-amber-600" 
                    bgClass="bg-amber-50"
                 />
              </div>

              {/* 2. Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Financial Overview Bar Chart */}
                 <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                    <CardHeader>
                       <CardTitle className="text-base flex items-center gap-2">
                          <BarChart2 size={18} className="text-gray-500"/> {t("financialOverview")}
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.financialChart}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                             <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                             <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                             <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px'}} />
                             <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={50}>
                                {analytics.financialChart.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </CardContent>
                 </Card>

                 {/* Expense Breakdown Pie Chart */}
                 <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                    <CardHeader>
                       <CardTitle className="text-base flex items-center gap-2">
                          <PieChartIcon size={18} className="text-gray-500"/> {t("expensesBreakdown", "توزيع المصروفات")}
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie
                                data={analytics.expenseData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                             >
                                {analytics.expenseData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                             </Pie>
                             <Tooltip contentStyle={{borderRadius: '8px'}} />
                             <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                          </PieChart>
                       </ResponsiveContainer>
                    </CardContent>
                 </Card>
              </div>

              {/* 3. Detailed Statement Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 
                 {/* Income Table */}
                 <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <CardHeader className="bg-white border-b border-gray-100 pb-3">
                       <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700">
                          <TrendingUp size={16}/> {t("incomeStatement", "تفاصيل الإيرادات")}
                       </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto max-h-[300px]">
                       <table className="w-full text-xs text-right">
                          <thead className="bg-emerald-50 text-emerald-800 sticky top-0">
                             <tr>
                                <th className="p-3">البند</th>
                                <th className="p-3">المبلغ</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {result.income_rows?.map((row, i) => (
                                <tr key={i} className="hover:bg-emerald-50/30">
                                   <td className="p-3 font-medium text-gray-700">{row.description || t("rentRevenue")}</td>
                                   <td className="p-3 font-bold text-gray-900">{Number(row.amount).toLocaleString()}</td>
                                </tr>
                             ))}
                             {result.income_rows?.length === 0 && (
                                <tr><td colSpan="2" className="p-4 text-center text-gray-400">لا توجد إيرادات</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </Card>

                 {/* Expense Table */}
                 <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <CardHeader className="bg-white border-b border-gray-100 pb-3">
                       <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                          <TrendingDown size={16}/> {t("expenseStatement", "تفاصيل المصروفات")}
                       </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto max-h-[300px]">
                       <table className="w-full text-xs text-right">
                          <thead className="bg-red-50 text-red-800 sticky top-0">
                             <tr>
                                <th className="p-3">البند</th>
                                <th className="p-3">المبلغ</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {result.expense_rows?.map((row, i) => (
                                <tr key={i} className="hover:bg-red-50/30">
                                   <td className="p-3 font-medium text-gray-700">{row.description || row.expense_type}</td>
                                   <td className="p-3 font-bold text-gray-900">{Number(row.amount).toLocaleString()}</td>
                                </tr>
                             ))}
                             {result.expense_rows?.length === 0 && (
                                <tr><td colSpan="2" className="p-4 text-center text-gray-400">لا توجد مصروفات</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </Card>

              </div>

           </div>
        ) : (
           // Empty State
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                 <BarChart2 size={40} className="text-amber-300"/>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">تحديد المعايير</h3>
              <p className="max-w-xs text-center text-sm mt-1">
                 الرجاء اختيار العقار وتحديد الفترة الزمنية لعرض تقرير الأرباح والخسائر.
              </p>
           </div>
        )}

      </div>
    </DashboardLayout>
  );
}