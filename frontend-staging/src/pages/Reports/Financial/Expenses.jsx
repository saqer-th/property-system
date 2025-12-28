import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Calendar,
  Receipt,
  Loader2,
  Filter,
  Download,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpDown,
  Building2,
  Briefcase
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
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

export default function FinancialExpensesReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  /* ==================== LOAD DATA ==================== */
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

  /* ==================== ANALYTICS & PROCESSING ==================== */
  
  // 1. Sort Data
  const sortedExpenses = useMemo(() => {
    if (!summary?.expenses) return [];
    let items = [...summary.expenses];
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        // Numeric sort for amounts
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

  // 2. Chart Data: Scope Distribution (Pie)
  const scopeData = useMemo(() => {
    if (!summary?.expenses) return [];
    const counts = {};
    summary.expenses.forEach(e => {
      const scope = e.expense_scope || "Other";
      counts[scope] = (counts[scope] || 0) + Number(e.amount);
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [summary]);

  // 3. Chart Data: Daily Trend (Bar)
  const trendData = useMemo(() => {
    if (!summary?.expenses) return [];
    const daily = {};
    summary.expenses.forEach(e => {
       const date = e.date ? e.date.split("T")[0] : "Unknown";
       daily[date] = (daily[date] || 0) + Number(e.amount);
    });
    // Sort by date and take last 10-15 entries for cleanliness if needed, or all
    return Object.keys(daily).sort().map(key => ({ date: key, amount: daily[key] }));
  }, [summary]);

  // 4. Stats
  const stats = useMemo(() => {
    if (!summary) return { max: 0, avg: 0 };
    const total = summary.total_amount || 0;
    const count = summary.expenses_count || 0;
    const max = summary.expenses?.length ? Math.max(...summary.expenses.map(e => Number(e.amount))) : 0;
    const avg = count > 0 ? total / count : 0;
    return { max, avg };
  }, [summary]);

  /* ==================== ACTIONS ==================== */
  const generateReport = () => {
    const lang = i18n.language;
    const url = `${API_URL}/reports?type=expenses&auth=${user.token}&lang=${lang}&from=${from}&to=${to}`;
    window.open(url, "_blank");
  };

  const exportCSV = () => {
    if (!sortedExpenses.length) return;
    const headers = ["Scope,Date,Amount,On Whom,Description,Property\n"];
    const rows = sortedExpenses.map(e => 
      `${e.expense_scope},${e.date},${e.amount},${e.on_whom},"${e.description}",${e.property_name || '-'}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${from}-${to}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <Receipt className="text-blue-600" /> {t("officeExpenses")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("expensesSub", "تحليل المصروفات العامة، التشغيلية، ومصروفات العقارات")}
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
                       className="flex-1 md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100"
                    >
                       {loading ? <Loader2 className="animate-spin mr-2" size={18}/> : <Filter className="mr-2" size={18}/>}
                       {t("showPreview")}
                    </Button>
                    <Button 
                       onClick={generateReport}
                       disabled={!summary || loading}
                       variant="outline"
                       className="flex-1 md:w-auto border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
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
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl"/>)}
               </div>
               <Skeleton className="h-[400px] rounded-xl"/>
            </div>
        ) : summary ? (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <StatCard 
                    title={t("totalExpensesAmount")} 
                    value={Number(summary.total_amount).toLocaleString()} 
                    icon={<DollarSign size={20}/>} 
                    colorClass="text-blue-600" 
                    bgClass="bg-blue-50" 
                 />
                 <StatCard 
                    title={t("expensesCount")} 
                    value={summary.expenses_count} 
                    icon={<FileText size={20}/>} 
                    colorClass="text-purple-600" 
                    bgClass="bg-purple-50" 
                 />
                 <StatCard 
                    title={t("averageExpense")} 
                    value={Math.round(stats.avg).toLocaleString()} 
                    icon={<TrendingUp size={20}/>} 
                    colorClass="text-emerald-600" 
                    bgClass="bg-emerald-50" 
                 />
                 <StatCard 
                    title={t("highestExpense")} 
                    value={stats.max.toLocaleString()} 
                    icon={<Briefcase size={20}/>} 
                    colorClass="text-amber-600" 
                    bgClass="bg-amber-50" 
                 />
              </div>

              {/* 2. Charts Row */}
              {summary.expenses_count > 0 && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart */}
                    <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                       <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                             <TrendingUp size={18} className="text-gray-500"/> {t("dailyTrend", "المصروفات اليومية")}
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
                                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                             </BarChart>
                          </ResponsiveContainer>
                       </CardContent>
                    </Card>

                    {/* Scope Chart */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                             <PieChartIcon size={18} className="text-gray-500"/> {t("byScope", "حسب النطاق")}
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                   data={scopeData}
                                   innerRadius={60}
                                   outerRadius={80}
                                   paddingAngle={5}
                                   dataKey="value"
                                >
                                   {scopeData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                                </Pie>
                                <Tooltip />
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
                       <FileSpreadsheet size={18} className="text-gray-500"/> {t("details")}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={exportCSV} disabled={summary.expenses_count === 0} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                       <FileSpreadsheet size={16} className="ml-2"/> CSV
                    </Button>
                 </CardHeader>
                 
                 <div className="overflow-x-auto">
                    {summary.expenses_count === 0 ? (
                       <div className="p-8 text-center text-gray-400">لا توجد بيانات للعرض</div>
                    ) : (
                       <table className="w-full text-sm text-right">
                          <thead className="bg-gray-50/50 text-gray-500">
                             <tr>
                                <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('expense_scope')}>
                                   <div className="flex items-center gap-1">النطاق <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('date')}>
                                   <div className="flex items-center gap-1">التاريخ <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('amount')}>
                                   <div className="flex items-center gap-1">المبلغ <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium">على من/الوصف</th>
                                <th className="p-4 font-medium">الارتباط</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {sortedExpenses.map((e, i) => (
                                <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                   <td className="p-4">
                                      <Badge variant="outline" className={`font-normal ${
                                         e.expense_scope === 'عقد' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                         e.expense_scope === 'وحدة' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          e.expense_scope === 'عقار' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                         'bg-gray-100 text-gray-700'
                                      }`}>
                                         {e.expense_scope}
                                      </Badge>
                                   </td>
                                   <td className="p-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                                      {e.date ? e.date.split("T")[0] : "-"}
                                   </td>
                                   <td className="p-4 font-bold text-gray-900">{Number(e.amount).toLocaleString()}</td>
                                   <td className="p-4">
                                      <div className="text-gray-900 font-medium">{e.on_whom || "-"}</div>
                                      <div className="text-gray-500 text-xs truncate max-w-[200px]">{e.description}</div>
                                   </td>
                                   <td className="p-4 text-gray-500 text-xs">
                                      {e.property_name && (
                                         <div className="flex items-center gap-1 mb-1">
                                            <Building2 size={10}/> {e.property_name} {e.unit_no && `(${e.unit_no})`}
                                         </div>
                                      )}
                                      {e.contract_no && (
                                         <div className="flex items-center gap-1 text-gray-400">
                                            <FileText size={10}/> {e.contract_no}
                                         </div>
                                      )}
                                      {!e.property_name && !e.contract_no && "-"}
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
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                 <Calendar size={40} className="text-blue-300"/>
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