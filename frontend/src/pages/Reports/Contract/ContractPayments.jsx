import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileSpreadsheet,
  Search,
  BarChart2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Building,
  User,
  PieChart as PieChartIcon,
  ArrowUpDown,
  Filter,
  CreditCard
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  Label
} from "recharts";

// --- Constants ---
const STATUS_COLORS = {
  "مدفوعة": "#10b981", // Emerald-500
  "قادمة": "#f59e0b", // Amber-500
  "متأخرة": "#ef4444", // Red-500
  "Partial": "#3b82f6" // Blue-500
};

const AGING_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

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

export default function ContractPaymentsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // State
  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  
  // Filters & Sort
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'paid', 'pending', 'overdue'
  const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'asc' });

  // Load contracts
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      try {
        const res = await fetch(`${API_URL}/contracts/my`, {
          headers: { Authorization: `Bearer ${user.token}`, "x-active-role": user.activeRole },
        });
        const data = await res.json();
        setContracts(data.data || []);
      } catch (err) { console.error(err); }
      setLoadingList(false);
    }
    load();
  }, [user.token, user.activeRole]);

  // Filter Contracts
  const filteredContracts = useMemo(() => {
    if (!query) return contracts;
    const lowerQ = query.toLowerCase();
    return contracts.filter((c) =>
      `${c.contract_no} ${c.tenant_name} ${c.unit_no}`.toLowerCase().includes(lowerQ)
    );
  }, [contracts, query]);

  // Load Payments
  const loadPayments = async (contractId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments/by-contract/${contractId}`, {
        headers: { Authorization: `Bearer ${user.token}`, "x-active-role": user.activeRole },
      });
      const json = await res.json();
      setPayments(json.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSelect = (c) => {
    if (selected?.id === c.id) return;
    setSelected(c);
    loadPayments(c.id);
  };

  // --- Process Data ---

  // 1. Process & Filter Payments
  const processedPayments = useMemo(() => {
    return payments.map(p => {
      let computedStatus = p.status;
      // Simple client-side logic to determine overdue if not paid
      if (p.status !== "مدفوعة" && p.status !== "Paid" && new Date(p.due_date) < new Date()) {
        computedStatus = "متأخرة";
      } else if (p.status === "مدفوعة") {
        computedStatus = "مدفوعة";
      } else {
        computedStatus = "قادمة";
      }
      return { ...p, computedStatus };
    });
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (statusFilter === "all") return processedPayments;
    return processedPayments.filter(p => p.computedStatus.toLowerCase() === statusFilter);
  }, [processedPayments, statusFilter]);

  // 2. Sort Payments
  const sortedPayments = useMemo(() => {
    let items = [...filteredPayments];
    if (sortConfig.key) {
      items.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [filteredPayments, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // 3. Analytics
  const stats = useMemo(() => {
    const totalAmount = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const totalPaid = payments.reduce((a, p) => a + Number(p.paid_amount || 0), 0);
    const totalRemaining = totalAmount - totalPaid;
    const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
    const delayedCount = processedPayments.filter(p => p.computedStatus === "متأخرة").length;
    
    return { totalAmount, totalPaid, totalRemaining, percentPaid, delayedCount };
  }, [payments, processedPayments]);

  // 4. Chart Data: Status Distribution (Pie)
  const statusData = useMemo(() => {
    const counts = { "مدفوعة": 0, "قادمة": 0, "متأخرة": 0 };
    processedPayments.forEach(p => {
      if (counts[p.computedStatus] !== undefined) counts[p.computedStatus]++;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [processedPayments]);

  // 5. Chart Data: Aging Buckets (Bar)
  const agingData = useMemo(() => {
    const daysDiff = (date) => Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    const unpaid = processedPayments.filter(p => p.computedStatus !== "Paid");
    
    return [
      { name: "0-30 Days", count: unpaid.filter(p => daysDiff(p.due_date) <= 30).length, fill: AGING_COLORS[0] },
      { name: "31-60 Days", count: unpaid.filter(p => daysDiff(p.due_date) > 30 && daysDiff(p.due_date) <= 60).length, fill: AGING_COLORS[1] },
      { name: "61-90 Days", count: unpaid.filter(p => daysDiff(p.due_date) > 60 && daysDiff(p.due_date) <= 90).length, fill: AGING_COLORS[2] },
      { name: "90+ Days", count: unpaid.filter(p => daysDiff(p.due_date) > 90).length, fill: AGING_COLORS[3] },
    ];
  }, [processedPayments]);

  // Actions
  const generatePDF = () => {
    if (!selected) return;
    const lang = i18n.language;
    const url = `${API_URL}/reports?type=contract-payments&id=${selected.id}&auth=${user.token}&lang=${lang}`;
    window.open(url, "_blank");
  };

  const handleExportCSV = () => {
    if (!sortedPayments.length) return;
    const headers = ["Due Date,Amount,Paid Amount,Status,Notes\n"];
    const rows = sortedPayments.map(p => `${p.due_date},${p.amount},${p.paid_amount},${p.computedStatus},"${p.notes || ''}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${selected.contract_no}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <FileSpreadsheet className="text-blue-600" /> {t("paymentsReport")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("paymentAnalysisSub", "متابعة شاملة للتدفقات النقدية وتحصيل الإيجارات")}
              </p>
           </div>
        </div>

        {/* --- Main Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
           
           {/* Left Sidebar: Contract Selector */}
           <Card className="lg:col-span-3 lg:sticky lg:top-8 h-[500px] lg:h-[calc(100vh-140px)] flex flex-col border-0 shadow-sm ring-1 ring-gray-100">
              <div className="p-4 border-b space-y-3">
                 <h2 className="font-semibold text-gray-700">{t("contractsList", "قائمة العقود")}</h2>
                 <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                    <Input 
                       placeholder={t("searchContract")} 
                       className="pr-9 bg-gray-50 border-gray-200"
                       value={query}
                       onChange={(e) => setQuery(e.target.value)}
                    />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
                 {loadingList ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="p-3 space-y-2">
                           <Skeleton className="h-4 w-3/4" />
                           <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))
                 ) : filteredContracts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                       <p>لا توجد عقود مطابقة</p>
                    </div>
                 ) : (
                    filteredContracts.map(c => (
                       <div 
                          key={c.id} 
                          onClick={() => handleSelect(c)}
                          className={`p-3 rounded-lg cursor-pointer transition-all border group relative
                             ${selected?.id === c.id 
                                ? "bg-blue-50 border-blue-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {selected?.id === c.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />}
                          <div className="flex justify-between items-start mb-1">
                             <p className={`font-semibold text-sm truncate max-w-[70%] ${selected?.id === c.id ? "text-blue-800" : "text-gray-700"}`}>
                                {c.tenant_name}
                             </p>
                             <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-white border border-gray-100 text-gray-500">
                                #{c.contract_no}
                             </Badge>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 gap-3">
                             <span className="flex items-center gap-1"><Building className="w-3 h-3 text-gray-400"/> {c.unit_no}</span>
                             <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.contract_status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {c.contract_status}
                             </span>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </Card>

           {/* Right Content: Report Details */}
           <div className="lg:col-span-9 space-y-6">
              {selected ? (
                 <>
                    {/* Action & Info Bar */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900">{selected.tenant_name}</h2>
                             <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><CreditCard size={14}/> العقد: {selected.contract_no}</span>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1"><Building size={14}/> {selected.property_name} ({selected.unit_no})</span>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px] h-9 text-sm">
                                   <div className="flex items-center gap-2 text-gray-600">
                                      <Filter size={14} />
                                      <SelectValue />
                                   </div>
                                </SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="all">كل الحالات</SelectItem>
                                   <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                                   <SelectItem value="متأخرة">متأخرة</SelectItem>
                                   <SelectItem value="قادمة">مستحقة قريباً</SelectItem>
                                </SelectContent>
                             </Select>



                             <Button onClick={generatePDF} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100">
                                <Download size={16} className="ml-2" /> PDF
                             </Button>
                          </div>
                       </CardContent>
                    </Card>

                    {loading ? (
                       <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                          </div>
                          <Skeleton className="h-[300px] rounded-xl" />
                       </div>
                    ) : (
                       <>
                          {/* 1. Stats Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                             <StatCard 
                                title={t("totalAmount")} 
                                value={stats.totalAmount.toLocaleString()} 
                                icon={<Wallet size={20}/>} 
                                colorClass="text-blue-600" 
                                bgClass="bg-blue-50"
                             />
                             <StatCard 
                                title={t("paid")} 
                                value={stats.totalPaid.toLocaleString()} 
                                subtext={`${stats.percentPaid.toFixed(1)}% تم التحصيل`}
                                icon={<CheckCircle2 size={20}/>} 
                                colorClass="text-emerald-600" 
                                bgClass="bg-emerald-50"
                             />
                             <StatCard 
                                title={t("remaining")} 
                                value={stats.totalRemaining.toLocaleString()} 
                                icon={<Clock size={20}/>} 
                                colorClass="text-amber-600" 
                                bgClass="bg-amber-50"
                             />
                             <StatCard 
                                title={t("delayedPayments")} 
                                value={stats.delayedCount} 
                                subtext="دفعات متأخرة السداد"
                                icon={<AlertCircle size={20}/>} 
                                colorClass="text-red-600" 
                                bgClass="bg-red-50"
                             />
                          </div>

                          {/* Progress Bar Visual */}
                          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                             <CardContent className="p-4">
                                <div className="flex justify-between mb-2 text-sm">
                                   <span className="font-medium text-gray-700">نسبة إنجاز التحصيل</span>
                                   <span className="font-bold text-blue-600">{stats.percentPaid.toFixed(1)}%</span>
                                </div>
                                <Progress value={stats.percentPaid} className="h-2.5 bg-gray-100" indicatorClassName="bg-blue-600" />
                             </CardContent>
                          </Card>

                          {payments.length === 0 ? (
                             <div className="text-center py-16 bg-white rounded-xl border border-dashed">
                                <Wallet className="mx-auto text-gray-300 mb-4" size={48} />
                                <h3 className="text-lg font-medium text-gray-900">لا توجد دفعات</h3>
                                <p className="text-gray-500">لم يتم إنشاء جدول دفعات لهذا العقد بعد.</p>
                             </div>
                          ) : (
                             <>
                                {/* 2. Charts Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                   {/* Status Distribution */}
                                   <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                                      <CardHeader>
                                         <CardTitle className="text-base flex items-center gap-2">
                                            <PieChartIcon size={18} className="text-gray-500"/> {t("statusDistribution", "حالة الدفعات")}
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
                                                     <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#cbd5e1"} />
                                                  ))}
                                               </Pie>
                                               <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}} />
                                               <Legend wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                                            </PieChart>
                                         </ResponsiveContainer>
                                      </CardContent>
                                   </Card>

                                   {/* Aging Chart */}
                                   <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                                      <CardHeader>
                                         <CardTitle className="text-base flex items-center gap-2">
                                            <BarChart2 size={18} className="text-gray-500"/> {t("paymentAging", "أعمار الديون (لغير المدفوعة)")}
                                         </CardTitle>
                                      </CardHeader>
                                      <CardContent className="h-[300px]">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={agingData} layout="vertical" margin={{left: 0, right: 20}}>
                                               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                               <XAxis type="number" hide />
                                               <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                               <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px'}} />
                                               <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} background={{ fill: '#f8fafc' }}>
                                                  {agingData.map((entry, index) => (
                                                     <Cell key={`cell-${index}`} fill={entry.fill} />
                                                  ))}
                                               </Bar>
                                            </BarChart>
                                         </ResponsiveContainer>
                                      </CardContent>
                                   </Card>
                                </div>

                                {/* 3. Detailed Table */}
                                <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                                   <CardHeader className="bg-white border-b border-gray-100 pb-4">
                                      <div className="flex justify-between items-center">
                                         <CardTitle className="text-base">{t("paymentsList", "جدول الدفعات")}</CardTitle>
                                         <Badge variant="outline" className="bg-gray-50">{filteredPayments.length} دفعة</Badge>
                                      </div>
                                   </CardHeader>
                                   <div className="overflow-x-auto">
                                      <table className="w-full text-sm text-right">
                                         <thead className="bg-gray-50/50 text-gray-500">
                                            <tr>
                                               <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('due_date')}>
                                                  <div className="flex items-center gap-1">تاريخ الاستحقاق <ArrowUpDown size={12}/></div>
                                               </th>
                                               <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('amount')}>
                                                  <div className="flex items-center gap-1">المبلغ <ArrowUpDown size={12}/></div>
                                               </th>
                                               <th className="p-4 font-medium">المدفوع</th>
                                               <th className="p-4 font-medium">الحالة</th>
                                               <th className="p-4 font-medium w-1/4">ملاحظات</th>
                                            </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-50">
                                            {sortedPayments.map((p, i) => (
                                               <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                                  <td className="p-4 text-gray-600 font-mono text-xs">
                                                     {p.due_date ? p.due_date.split("T")[0] : "-"}
                                                  </td>
                                                  <td className="p-4 font-bold text-gray-900">{Number(p.amount).toLocaleString()}</td>
                                                  <td className="p-4 font-semibold text-emerald-600">
                                                     {Number(p.paid_amount) > 0 ? Number(p.paid_amount).toLocaleString() : "-"}
                                                  </td>
                                                  <td className="p-4">
                                                     <Badge 
                                                        variant="outline" 
                                                        className={`font-normal border ${
                                                           p.computedStatus === "مدفوعة" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                           p.computedStatus === "متأخرة" ? "bg-red-50 text-red-700 border-red-200" :
                                                           "bg-amber-50 text-amber-700 border-amber-200"
                                                        }`}
                                                     >
                                                        {p.computedStatus === "مدفوعة" ? "مدفوعة" : 
                                                         p.computedStatus === "متأخرة" ? "متأخرة" : "قادمة"}
                                                     </Badge>
                                                  </td>
                                                  <td className="p-4 text-gray-400 text-xs truncate max-w-[150px]">
                                                     {p.notes || "-"}
                                                  </td>
                                               </tr>
                                            ))}
                                         </tbody>
                                      </table>
                                   </div>
                                </Card>
                             </>
                          )}
                       </>
                    )}
                 </>
              ) : (
                 // Empty State
                 <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                       <Search size={48} className="text-blue-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">ابدأ بتحديد العقد</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       قم باختيار عقد من القائمة الجانبية لعرض تحليل الدفعات والديون والتدفقات النقدية.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}