import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  Calendar,
  Loader2,
  Filter,
  Download,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpDown,
  User,
  Building2,
  FileText,
  AlertTriangle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// --- Constants ---
const COLORS = ['#0d9488', '#059669', '#3b82f6', '#f59e0b', '#6366f1'];

const StatCard = ({ title, value, icon, colorClass, bgClass, loading }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
    <div className="space-y-1">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
      )}
    </div>
    <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
      {icon}
    </div>
  </div>
);

export default function FinancialReceiptsReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  /* ==================== LOAD DATA ==================== */
  const loadPreview = async () => {
    setError("");
    if (!from || !to) {
        setError(t("pleaseChooseDates"));
        return;
    }
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
      setError(t("errorLoadingData"));
    }
    setLoading(false);
  };

  /* ==================== ANALYTICS & PROCESSING ==================== */

  // 1. Sort Data
  const sortedReceipts = useMemo(() => {
    if (!summary?.items) return [];
    let items = [...summary.items];
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        
        if (sortConfig.key === 'amount') {
           aVal = Number(aVal);
           bVal = Number(bVal);
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [summary, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // 2. Chart Data: Type Distribution (Pie)
  const typeData = useMemo(() => {
    if (!summary?.items) return [];
    const counts = {};
    summary.items.forEach(r => {
      const type = r.receipt_type || "General";
      counts[type] = (counts[type] || 0) + Number(r.amount);
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [summary]);

  // 3. Chart Data: Daily Trend (Bar)
  const trendData = useMemo(() => {
    if (!summary?.items) return [];
    const daily = {};
    summary.items.forEach(r => {
       const date = r.date ? r.date.split("T")[0] : "Unknown";
       daily[date] = (daily[date] || 0) + Number(r.amount);
    });
    return Object.keys(daily).sort().map(key => ({ date: key, amount: daily[key] }));
  }, [summary]);

  // 4. Stats Calculation
  const stats = useMemo(() => {
    if (!summary?.items) return { max: 0, avg: 0 };
    const total = summary.total_amount || 0;
    const count = summary.count || 0;
    const max = summary.items.length ? Math.max(...summary.items.map(r => Number(r.amount))) : 0;
    const avg = count > 0 ? total / count : 0;
    return { max, avg };
  }, [summary]);

  /* ==================== ACTIONS ==================== */
  const generateReport = () => {
    const url = `${API_URL}/reports?type=receipts&auth=${user.token}&lang=${i18n.language}&from=${from}&to=${to}`;
    window.open(url, "_blank");
  };

  const exportCSV = () => {
    if (!sortedReceipts.length) return;
    const headers = ["Type,Date,Amount,Payer,Receiver,Property,Unit\n"];
    const rows = sortedReceipts.map(r => 
      `${r.receipt_type},${r.date},${r.amount},"${r.payer}",${r.receiver},${r.property_type || '-'},${r.unit_no || '-'}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-${from}-${to}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <ClipboardList className="text-teal-600" /> {t("officeReceipts")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("receiptReportDesc", "تقرير شامل لسندات القبض والتحصيلات المالية")}
              </p>
           </div>
        </div>

        {/* --- Filter Card --- */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 bg-white">
           <CardContent className="p-5">
              <div className="flex flex-col md:flex-row items-end gap-4">
                 <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                       <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          {t("fromDate")}
                       </label>
                       <Input 
                          type="date" 
                          value={from} 
                          onChange={(e) => setFrom(e.target.value)}
                          className="bg-gray-50"
                       />
                    </div>
                    <div>
                       <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          {t("toDate")}
                       </label>
                       <Input 
                          type="date" 
                          value={to} 
                          onChange={(e) => setTo(e.target.value)}
                          className="bg-gray-50"
                       />
                    </div>
                 </div>
                 
                 <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                       onClick={loadPreview} 
                       disabled={!from || !to || loading}
                       className="flex-1 md:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-100"
                    >
                       {loading ? <Loader2 className="animate-spin mr-2" size={18}/> : <Filter className="mr-2" size={18}/>}
                       {t("showPreview")}
                    </Button>
                    <Button 
                       onClick={generateReport}
                       disabled={!summary || loading}
                       variant="outline"
                       className="flex-1 md:w-auto border-teal-200 text-teal-700 hover:bg-teal-50"
                    >
                       <Download className="mr-2" size={18}/> PDF
                    </Button>
                 </div>
              </div>
              {error && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                   <AlertTriangle size={16} /> {error}
                </div>
              )}
           </CardContent>
        </Card>

        {/* --- Content Area --- */}
        {loading ? (
            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl"/>)}
               </div>
               <Skeleton className="h-[400px] rounded-xl"/>
            </div>
        ) : summary ? (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <StatCard 
                    title={t("totalAmount")} 
                    value={Number(summary.total_amount || 0).toLocaleString()} 
                    icon={<DollarSign size={20}/>} 
                    colorClass="text-teal-600" 
                    bgClass="bg-teal-50" 
                 />
                 <StatCard 
                    title={t("receiptsCount")} 
                    value={summary.count} 
                    icon={<FileText size={20}/>} 
                    colorClass="text-blue-600" 
                    bgClass="bg-blue-50" 
                 />
                 <StatCard 
                    title={t("averageReceipt", "متوسط السند")} 
                    value={Math.round(stats.avg).toLocaleString()} 
                    icon={<TrendingUp size={20}/>} 
                    colorClass="text-emerald-600" 
                    bgClass="bg-emerald-50" 
                 />
                 <StatCard 
                    title={t("highestReceipt", "أعلى سند")} 
                    value={stats.max.toLocaleString()} 
                    icon={<DollarSign size={20}/>} 
                    colorClass="text-amber-600" 
                    bgClass="bg-amber-50" 
                 />
              </div>

              {/* 2. Charts Row */}
              {summary.count > 0 && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart */}
                    <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                       <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                             <TrendingUp size={18} className="text-gray-500"/> {t("collectionTrend", "اتجاه التحصيل")}
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                <XAxis 
                                   dataKey="date" 
                                   tick={{fontSize: 11, fill: '#888'}} 
                                   axisLine={false} 
                                   tickLine={false} 
                                   tickFormatter={(val) => val.substring(5)} // Show MM-DD
                                />
                                <YAxis tick={{fontSize: 11, fill: '#888'}} axisLine={false} tickLine={false}/>
                                <Tooltip 
                                   cursor={{fill: '#f9fafb'}}
                                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                />
                                <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
                             </BarChart>
                          </ResponsiveContainer>
                       </CardContent>
                    </Card>

                    {/* Types Chart */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                             <PieChartIcon size={18} className="text-gray-500"/> {t("byType", "حسب النوع")}
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                   data={typeData}
                                   innerRadius={60}
                                   outerRadius={80}
                                   paddingAngle={5}
                                   dataKey="value"
                                >
                                   {typeData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '8px'}} />
                                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                             </PieChart>
                          </ResponsiveContainer>
                       </CardContent>
                    </Card>
                 </div>
              )}

              {/* 3. Detailed Table */}
              <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                 <CardHeader className="bg-white border-b border-gray-100 pb-4 flex flex-row justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2">
                       <FileText size={18} className="text-gray-500"/> {t("details")}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={exportCSV} disabled={summary.count === 0} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                       <FileSpreadsheet size={16} className="ml-2"/> CSV
                    </Button>
                 </CardHeader>
                 
                 <div className="overflow-x-auto">
                    {summary.count === 0 ? (
                       <div className="p-8 text-center text-gray-400">لا توجد بيانات للعرض</div>
                    ) : (
                       <table className="w-full text-sm text-right">
                          <thead className="bg-gray-50/50 text-gray-500">
                             <tr>
                                <th className="p-4 font-medium cursor-pointer hover:text-teal-600" onClick={() => requestSort('receipt_type')}>
                                   <div className="flex items-center gap-1">النوع <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-teal-600" onClick={() => requestSort('date')}>
                                   <div className="flex items-center gap-1">التاريخ <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-teal-600" onClick={() => requestSort('amount')}>
                                   <div className="flex items-center gap-1">المبلغ <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium">المستلم/الدافع</th>
                                <th className="p-4 font-medium">تفاصيل</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {sortedReceipts.map((r, i) => (
                                <tr key={i} className="hover:bg-teal-50/30 transition-colors group">
                                   <td className="p-4">
                                      <Badge variant="outline" className="font-normal bg-teal-50 text-teal-700 border-teal-200">
                                         {r.receipt_type}
                                      </Badge>
                                   </td>
                                   <td className="p-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                                      {r.date ? r.date.split("T")[0] : "-"}
                                   </td>
                                   <td className="p-4 font-bold text-gray-900">{Number(r.amount).toLocaleString()}</td>
                                   <td className="p-4">
                                      <div className="text-gray-900 font-medium text-xs">
                                         <span className="text-gray-400">من:</span> {r.payer}
                                      </div>
                                      <div className="text-gray-900 font-medium text-xs mt-1">
                                         <span className="text-gray-400">إلى:</span> {r.receiver}
                                      </div>
                                   </td>
                                   <td className="p-4 text-gray-500 text-xs">
                                      {r.property_type && (
                                         <div className="flex items-center gap-1 mb-1">
                                            <Building2 size={10}/> {r.property_type} {r.unit_no && `(${r.unit_no})`}
                                         </div>
                                      )}
                                      {r.contract_no && (
                                         <div className="flex items-center gap-1 text-gray-400">
                                            <FileText size={10}/> {r.contract_no}
                                         </div>
                                      )}
                                      {!r.property_type && !r.contract_no && "-"}
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    )}
                 </div>
              </Card>

           </div>
        ) : (
           // Empty State (Before filtering)
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
              <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                 <Calendar size={40} className="text-teal-300"/>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">تحديد الفترة الزمنية</h3>
              <p className="max-w-xs text-center text-sm mt-1">
                 الرجاء اختيار تاريخ البداية والنهاية من الأعلى ثم الضغط على "عرض التقرير"
              </p>
           </div>
        )}

      </div>
    </DashboardLayout>
  );
}