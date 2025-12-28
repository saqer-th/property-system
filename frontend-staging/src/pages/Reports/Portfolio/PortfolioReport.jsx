import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart2,
  Home,
  Building2,
  FileText,
  Loader2,
  PieChart as PieChartIcon,
  Wallet,
  TrendingUp,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  Activity
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";

// --- Constants ---
const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];
const FINANCIAL_COLORS = { income: '#10b981', expense: '#ef4444', potential: '#3b82f6' };

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

export default function PortfolioSummaryReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);

  /* ================================
      LOAD PORTFOLIO PREVIEW
  ================================= */
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/reports/summary/portfolio?auth=${user.token}&lang=${i18n.language}`
        );
        const data = await res.json();
        setPortfolio(data);
      } catch (err) {
        console.error("Error loading portfolio:", err);
      }
      setLoading(false);
    }
    loadSummary();
  }, [user.token, i18n.language]);

  /* ================================
      ANALYTICS
  ================================= */
  const analytics = useMemo(() => {
    if (!portfolio) return null;

    // Financial Chart Data
    const financialData = [
      { name: t("totalContractValue"), amount: Number(portfolio.totalValue || 0), fill: FINANCIAL_COLORS.potential },
      { name: t("totalPaid"), amount: Number(portfolio.totalPaid || 0), fill: FINANCIAL_COLORS.income },
      { name: t("totalExpenses"), amount: Number(portfolio.totalExpenses || 0), fill: FINANCIAL_COLORS.expense },
    ];

    // Contract Status Data
    const contractData = [
      { name: t("activeContracts"), value: Number(portfolio.activeContracts || 0) },
      { name: t("expiredContracts"), value: Number(portfolio.expiredContracts || 0) },
    ];

    // Occupancy Rate (Estimate)
    const occupancyRate = portfolio.totalUnits > 0 
      ? ((portfolio.activeContracts || 0) / portfolio.totalUnits) * 100 
      : 0;

    // Collection Rate
    const collectionRate = portfolio.totalValue > 0
      ? ((portfolio.totalPaid || 0) / portfolio.totalValue) * 100
      : 0;

    return { financialData, contractData, occupancyRate, collectionRate };
  }, [portfolio, t]);

  /* ================================
      PDF EXPORT
  ================================= */
  const generatePDF = () => {
    const url = `${API_URL}/reports?type=portfolio&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="text-emerald-600" /> {t("portfolioSummary")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t("portfolioSummarySub", "نظرة عامة على أداء المحفظة العقارية والوضع المالي")}
            </p>
          </div>
          <Button onClick={generatePDF} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100">
             <Download size={16} className="ml-2"/> {t("generatePDF")}
          </Button>
        </div>

        {/* CONTENT */}
        {loading ? (
           <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl"/>)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <Skeleton className="h-[300px] rounded-xl"/>
                 <Skeleton className="h-[300px] rounded-xl"/>
              </div>
           </div>
        ) : portfolio && analytics ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. KEY METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               <StatCard 
                  title={t("totalProperties")} 
                  value={portfolio.totalProperties} 
                  icon={<Home size={20}/>} 
                  colorClass="text-orange-600" 
                  bgClass="bg-orange-50"
                  subtext="عقار مسجل"
               />
               <StatCard 
                  title={t("totalUnits")} 
                  value={portfolio.totalUnits} 
                  icon={<Building2 size={20}/>} 
                  colorClass="text-blue-600" 
                  bgClass="bg-blue-50"
                  subtext="وحدة إيجارية"
               />
               <StatCard 
                  title={t("collectionRate")} 
                  value={`${analytics.collectionRate.toFixed(1)}%`} 
                  icon={<TrendingUp size={20}/>} 
                  colorClass="text-emerald-600" 
                  bgClass="bg-emerald-50"
                  subtext="نسبة التحصيل"
               />
            </div>

            {/* 2. FINANCIAL & CONTRACTS CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Financial Performance Bar Chart */}
               <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                  <CardHeader>
                     <CardTitle className="text-base flex items-center gap-2">
                        <Wallet size={18} className="text-gray-500"/> {t("financialPerformance", "الأداء المالي")}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.financialData} layout="vertical" margin={{left: 40, right: 20}}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
                           <XAxis type="number" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                           <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                           <Tooltip 
                              cursor={{fill: '#f9fafb'}} 
                              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                              formatter={(val) => Number(val).toLocaleString()}
                           />
                           <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
                              {analytics.financialData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </CardContent>
               </Card>

               {/* Contracts Status Pie Chart */}
               <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                  <CardHeader>
                     <CardTitle className="text-base flex items-center gap-2">
                        <FileText size={18} className="text-gray-500"/> {t("contractsStatus", "حالة العقود")}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={analytics.contractData}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              <Cell fill="#10b981" /> {/* Active */}
                              <Cell fill="#ef4444" /> {/* Expired */}
                           </Pie>
                           <Tooltip contentStyle={{borderRadius: '8px'}} />
                           <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                           <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 text-xl font-bold">
                              {portfolio.totalContracts}
                           </text>
                           <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 text-xs">
                              {t("totalContracts")}
                           </text>
                        </PieChart>
                     </ResponsiveContainer>
                  </CardContent>
               </Card>
            </div>

            {/* 3. DETAILED STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Wallet size={20}/></div>
                     <div>
                        <p className="text-sm text-gray-500">{t("totalContractValue")}</p>
                        <p className="text-xl font-bold text-gray-900">{Number(portfolio.totalValue).toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                     <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
               </div>

               <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle2 size={20}/></div>
                     <div>
                        <p className="text-sm text-gray-500">{t("totalPaid")}</p>
                        <p className="text-xl font-bold text-gray-900">{Number(portfolio.totalPaid).toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                     <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${analytics.collectionRate}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-400 text-right">{analytics.collectionRate.toFixed(1)}%</p>
               </div>

               <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={20}/></div>
                     <div>
                        <p className="text-sm text-gray-500">{t("totalExpenses")}</p>
                        <p className="text-xl font-bold text-gray-900">{Number(portfolio.totalExpenses).toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                     <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
               </div>
            </div>

          </div>
        ) : (
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
              <BarChart2 size={48} className="text-gray-200 mb-4"/>
              <p>{t("noDataAvailable")}</p>
           </div>
        )}

      </div>
    </DashboardLayout>
  );
}