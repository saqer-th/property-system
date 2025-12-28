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
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Loader2,
  Filter,
  Download,
  Wallet,
  CheckCircle2,
  Clock,
  Users,
  BarChart2,
  PieChart as PieChartIcon,
  ArrowUpDown,
  Phone,
  Building,
  FileText
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
const STATUS_COLORS = {
  "مدفوعة": "#10b981", // Emerald
  "pending": "#f59e0b", // Amber
  "غير مدفوعة": "#ef4444", // Red
  "جزئية": "#3b82f6", // Blue
  "Cancelled": "#9ca3af" // Gray
};

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

export default function FinancialPaymentsReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'asc' });

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

  /* ==================== ANALYTICS & PROCESSING ==================== */

  // 1. Sort Data
  const sortedPayments = useMemo(() => {
    if (!summary?.payments) return [];
    let items = [...summary.payments];
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

  // 2. Chart Data: Status Distribution (Pie)
  const statusData = useMemo(() => {
    if (!summary?.payments) return [];
    const counts = {};
    summary.payments.forEach(p => {
      const status = p.status || "Unknown";
      counts[status] = (counts[status] || 0) + 1; // Counting number of payments
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [summary]);

  // 3. Chart Data: Daily Amounts (Bar)
  const trendData = useMemo(() => {
    if (!summary?.payments) return [];
    const daily = {};
    summary.payments.forEach(p => {
       const date = p.due_date ? p.due_date.split("T")[0] : "Unknown";
       daily[date] = (daily[date] || 0) + Number(p.amount);
    });
    return Object.keys(daily).sort().map(key => ({ date: key, amount: daily[key] }));
  }, [summary]);

  /* ==================== ACTIONS ==================== */
  const generatePDF = () => {
    const lang = i18n.language;
    const url = `${API_URL}/reports?type=payments&auth=${user.token}&lang=${lang}&from=${from}&to=${to}`;
    window.open(url, "_blank");
  };

  const exportCSV = () => {
    if (!sortedPayments.length) return;
    const headers = ["Contract No,Tenant,Phone,Amount,Due Date,Status\n"];
    const rows = sortedPayments.map(p => 
      `${p.contract_no},"${p.tenant_name}",${p.tenant_phone},${p.amount},${p.due_date},${p.status}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${from}-${to}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <FileSpreadsheet className="text-orange-600" /> {t("officePayments")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("paymentsReportSub", "تحليل الدفعات المستحقة، المحصلة، والمتأخرة لكافة العقود")}
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
                       className="flex-1 md:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-100"
                    >
                       {loading ? <Loader2 className="animate-spin mr-2" size={18}/> : <Filter className="mr-2" size={18}/>}
                       {t("showPreview")}
                    </Button>
                    <Button 
                       onClick={generatePDF}
                       disabled={!summary || loading}
                       variant="outline"
                       className="flex-1 md:w-auto border-orange-200 text-orange-700 hover:bg-orange-50"
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
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl"/>)}
               </div>
               <Skeleton className="h-[400px] rounded-xl"/>
            </div>
        ) : summary ? (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <StatCard 
                    title={t("totalPayments")} 
                    value={Number(summary.total_amount).toLocaleString()} 
                    icon={<Wallet size={20}/>} 
                    colorClass="text-green-600" 
                    bgClass="bg-green-50" 
                 />
                 <StatCard 
                    title={t("paymentsCount")} 
                    value={summary.payments_count} 
                    icon={<CheckCircle2 size={20}/>} 
                    colorClass="text-blue-600" 
                    bgClass="bg-blue-50" 
                 />
                 <StatCard 
                    title={t("relatedContracts")} 
                    value={summary.contracts_count} 
                    icon={<Users size={20}/>} 
                    colorClass="text-orange-600" 
                    bgClass="bg-orange-50" 
                 />
              </div>

              {/* 2. Charts Row */}
              {summary.payments_count > 0 && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart */}
                    <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                       <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                             <BarChart2 size={18} className="text-gray-500"/> {t("dailyTrend", "التدفقات اليومية")}
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
                                <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                             </BarChart>
                          </ResponsiveContainer>
                       </CardContent>
                    </Card>

                    {/* Status Chart */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                             <PieChartIcon size={18} className="text-gray-500"/> {t("byStatus", "حسب الحالة")}
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                   data={statusData}
                                   innerRadius={60}
                                   outerRadius={80}
                                   paddingAngle={5}
                                   dataKey="value"
                                >
                                   {statusData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
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
                    <Button variant="ghost" size="sm" onClick={exportCSV} disabled={summary.payments_count === 0} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                       <FileSpreadsheet size={16} className="ml-2"/> CSV
                    </Button>
                 </CardHeader>
                 
                 <div className="overflow-x-auto">
                    {summary.payments_count === 0 ? (
                       <div className="p-8 text-center text-gray-400">لا توجد بيانات للعرض</div>
                    ) : (
                       <table className="w-full text-sm text-right">
                          <thead className="bg-gray-50/50 text-gray-500">
                             <tr>
                                <th className="p-4 font-medium cursor-pointer hover:text-orange-600" onClick={() => requestSort('contract_no')}>
                                   <div className="flex items-center gap-1">رقم العقد <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-orange-600" onClick={() => requestSort('tenant_name')}>
                                   <div className="flex items-center gap-1">المستأجر <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-orange-600" onClick={() => requestSort('due_date')}>
                                   <div className="flex items-center gap-1">الاستحقاق <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-orange-600" onClick={() => requestSort('amount')}>
                                   <div className="flex items-center gap-1">المبلغ <ArrowUpDown size={12}/></div>
                                </th>
                                <th className="p-4 font-medium">الحالة</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {sortedPayments.map((p, i) => (
                                <tr key={i} className="hover:bg-orange-50/30 transition-colors group">
                                   <td className="p-4 text-gray-900 font-medium">
                                      <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-gray-400"/>
                                        {p.contract_no}
                                      </div>
                                   </td>
                                   <td className="p-4">
                                      <div className="font-medium text-gray-900">{p.tenant_name}</div>
                                      <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                        <Phone size={10}/> {p.tenant_phone || "-"}
                                      </div>
                                   </td>
                                   <td className="p-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                                      {p.due_date ? p.due_date.split("T")[0] : "-"}
                                   </td>
                                   <td className="p-4 font-bold text-gray-900">{Number(p.amount).toLocaleString()}</td>
                                   <td className="p-4">
                                      <Badge variant="outline" className={`font-normal border ${
                                         p.status === 'Paid' || p.status === 'مدفوعة' ? 'bg-green-50 text-green-700 border-green-200' : 
                                         p.status === 'Pending' || p.status === 'جزئية' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                         p.status === 'Overdue' || p.status === 'غير مدفوعة' ? 'bg-red-50 text-red-700 border-red-200' :
                                         'bg-gray-100 text-gray-700'
                                      }`}>
                                         {p.status}
                                      </Badge>
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
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                 <Calendar size={40} className="text-orange-300"/>
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