import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Search,
  BarChart2,
  Wallet,
  Download,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  Building,
  PieChart as PieChartIcon,
  Filter,
  ArrowUpDown,
  AlertCircle
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

// --- Constants & Helpers ---
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

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

export default function ContractExpensesReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // State
  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all"); // '30days', 'year', 'all'
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

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

  // Load expenses
  const loadExpenses = async (contractId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/expenses/by-contract/${contractId}`, {
        headers: { Authorization: `Bearer ${user.token}`, "x-active-role": user.activeRole },
      });
      const json = await res.json();
      setExpenses(json.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSelect = (c) => {
    if (selected?.id === c.id) return;
    setSelected(c);
    loadExpenses(c.id);
  };

  // --- Process Data ---

  // 1. Filter Contracts
  const filteredContracts = useMemo(() => {
    if (!query) return contracts;
    const lowerQ = query.toLowerCase();
    return contracts.filter((c) =>
      `${c.contract_no} ${c.tenant_name} ${c.unit_no}`.toLowerCase().includes(lowerQ)
    );
  }, [contracts, query]);

  // 2. Filter Expenses by Time
  const filteredExpenses = useMemo(() => {
    if (timeFilter === "all") return expenses;
    const now = new Date();
    const limit = new Date();
    if (timeFilter === "30days") limit.setDate(now.getDate() - 30);
    if (timeFilter === "year") limit.setFullYear(now.getFullYear() - 1);
    
    return expenses.filter(e => new Date(e.date) >= limit);
  }, [expenses, timeFilter]);

  // 3. Sort Expenses
  const sortedExpenses = useMemo(() => {
    let sortableItems = [...filteredExpenses];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredExpenses, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 4. Analytics Calculations
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    const max = filteredExpenses.length ? Math.max(...filteredExpenses.map((e) => Number(e.amount))) : 0;
    const avg = filteredExpenses.length ? (total / filteredExpenses.length) : 0;
    return { total, max, avg, count: filteredExpenses.length };
  }, [filteredExpenses]);

  // 5. Chart Data (Bar)
  const monthlyData = useMemo(() => {
    const data = {};
    filteredExpenses.forEach(e => {
       const date = new Date(e.date);
       const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
       data[key] = (data[key] || 0) + Number(e.amount);
    });
    return Object.keys(data).sort().map(key => ({ name: key, total: data[key] }));
  }, [filteredExpenses]);

  // 6. Chart Data (Pie - Categories)
  const categoryData = useMemo(() => {
    const data = {};
    filteredExpenses.forEach(e => {
      const type = e.expense_type || "Other";
      data[type] = (data[type] || 0) + Number(e.amount);
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [filteredExpenses]);


  const generateReport = () => {
    if (!selected) return;
    const lang = i18n.language;
    // Add logic here to include timeFilter in query param if backend supports it
    const url = `${API_URL}/reports?type=contract-expenses&id=${selected.id}&auth=${user.token}&lang=${lang}`;
    window.open(url, "_blank");
  };

  const handleExportCSV = () => {
    if (!sortedExpenses.length) return;
    const headers = ["Date,Amount,Type,Description\n"];
    const rows = sortedExpenses.map(e => `${e.date},${e.amount},${e.expense_type},"${e.description || ''}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${selected.contract_no}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <FileText className="text-purple-600" /> {t("expensesReport")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("financialAnalysis", "تحليل وتتبع المصروفات التشغيلية للعقود")}
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
                       placeholder={t("searchContract", "بحث برقم العقد، المستأجر...")} 
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
                                ? "bg-purple-50 border-purple-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {selected?.id === c.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-purple-600 rounded-r-full" />}
                          <div className="flex justify-between items-start mb-1">
                             <p className={`font-semibold text-sm truncate max-w-[70%] ${selected?.id === c.id ? "text-purple-800" : "text-gray-700"}`}>
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

           {/* Right Content: Report Area */}
           <div className="lg:col-span-9 space-y-6">
              {selected ? (
                 <>
                    {/* Action & Filter Bar */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900">{selected.tenant_name}</h2>
                             <p className="text-sm text-gray-500 flex items-center gap-2">
                                عقد رقم: {selected.contract_no} 
                                <span className="text-gray-300">|</span> 
                                الوحدة: {selected.unit_no}
                             </p>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                             <Select value={timeFilter} onValueChange={setTimeFilter}>
                                <SelectTrigger className="w-[140px] h-9 text-sm">
                                   <div className="flex items-center gap-2 text-gray-600">
                                      <Filter size={14} />
                                      <SelectValue />
                                   </div>
                                </SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="all">كل الفترات</SelectItem>
                                   <SelectItem value="year">هذه السنة</SelectItem>
                                   <SelectItem value="30days">آخر 30 يوم</SelectItem>
                                </SelectContent>
                             </Select>

                             <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 hidden sm:flex">
                                <FileSpreadsheet size={16} className="ml-2 text-green-600" /> CSV
                             </Button>

                             <Button onClick={generateReport} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-100">
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
                             <StatCard title={t("totalExpenses")} value={stats.total.toLocaleString()} icon={<Wallet size={20}/>} colorClass="text-purple-600" bgClass="bg-purple-50" />
                             <StatCard title={t("highestExpense")} value={stats.max.toLocaleString()} icon={<TrendingUp size={20}/>} colorClass="text-red-600" bgClass="bg-red-50" />
                             <StatCard title={t("expensesCount")} value={stats.count} icon={<FileSpreadsheet size={20}/>} colorClass="text-blue-600" bgClass="bg-blue-50" />
                             <StatCard title={t("averageExpense")} value={stats.avg.toFixed(0)} icon={<DollarSign size={20}/>} colorClass="text-green-600" bgClass="bg-green-50" />
                          </div>

                          {expenses.length === 0 ? (
                             <Card className="border-dashed border-2 bg-gray-50/50">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                   <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                                      <Wallet className="text-gray-300" size={32} />
                                   </div>
                                   <h3 className="text-lg font-medium text-gray-900">لا توجد مصروفات</h3>
                                   <p className="text-gray-500 max-w-sm mt-1">لم يتم تسجيل أي مصروفات لهذا العقد في الفترة الزمنية المحددة.</p>
                                </CardContent>
                             </Card>
                          ) : (
                             <>
                                {/* 2. Charts Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                   <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                                      <CardHeader>
                                         <CardTitle className="text-base flex items-center gap-2">
                                            <BarChart2 size={18} className="text-gray-500"/> {t("monthlyOverview", "التوزيع الشهري")}
                                         </CardTitle>
                                      </CardHeader>
                                      <CardContent className="h-[300px]">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={monthlyData}>
                                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                               <XAxis dataKey="name" tick={{fontSize: 11, fill: '#888'}} axisLine={false} tickLine={false} dy={10} />
                                               <YAxis tick={{fontSize: 11, fill: '#888'}} axisLine={false} tickLine={false} />
                                               <Tooltip 
                                                  cursor={{fill: '#f9fafb'}} 
                                                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                               />
                                               <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                            </BarChart>
                                         </ResponsiveContainer>
                                      </CardContent>
                                   </Card>

                                   <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                                      <CardHeader>
                                         <CardTitle className="text-base flex items-center gap-2">
                                            <PieChartIcon size={18} className="text-gray-500"/> {t("byCategory", "حسب التصنيف")}
                                         </CardTitle>
                                      </CardHeader>
                                      <CardContent className="h-[300px]">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                               <Pie
                                                  data={categoryData}
                                                  innerRadius={60}
                                                  outerRadius={80}
                                                  paddingAngle={5}
                                                  dataKey="value"
                                               >
                                                  {categoryData.map((entry, index) => (
                                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                  ))}
                                               </Pie>
                                               <Tooltip contentStyle={{borderRadius: '8px'}} />
                                               <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                                            </PieChart>
                                         </ResponsiveContainer>
                                      </CardContent>
                                   </Card>
                                </div>

                                {/* 3. Detailed Table */}
                                <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                                   <CardHeader className="bg-white border-b border-gray-100 pb-4">
                                      <div className="flex justify-between items-center">
                                         <CardTitle className="text-base">{t("details", "تفاصيل العمليات")}</CardTitle>
                                         <Badge variant="outline" className="bg-gray-50">{filteredExpenses.length} عملية</Badge>
                                      </div>
                                   </CardHeader>
                                   <div className="overflow-x-auto">
                                      <table className="w-full text-sm text-right">
                                         <thead className="bg-gray-50/50 text-gray-500">
                                            <tr>
                                               <th className="p-4 font-medium cursor-pointer hover:text-purple-600" onClick={() => requestSort('date')}>
                                                  <div className="flex items-center gap-1">التاريخ <ArrowUpDown size={12}/></div>
                                               </th>
                                               <th className="p-4 font-medium cursor-pointer hover:text-purple-600" onClick={() => requestSort('amount')}>
                                                  <div className="flex items-center gap-1">المبلغ <ArrowUpDown size={12}/></div>
                                               </th>
                                               <th className="p-4 font-medium cursor-pointer hover:text-purple-600" onClick={() => requestSort('expense_type')}>
                                                  <div className="flex items-center gap-1">النوع <ArrowUpDown size={12}/></div>
                                               </th>
                                               <th className="p-4 font-medium w-1/3">الملاحظات</th>
                                            </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-50">
                                            {sortedExpenses.map((e, i) => (
                                               <tr key={i} className="hover:bg-purple-50/30 transition-colors group">
                                                  <td className="p-4 text-gray-600 font-mono text-xs">{e.date}</td>
                                                  <td className="p-4 font-bold text-gray-900">{Number(e.amount).toLocaleString()}</td>
                                                  <td className="p-4">
                                                     <Badge variant="secondary" className="font-normal bg-gray-100 text-gray-700 group-hover:bg-white border border-gray-200">
                                                        {e.expense_type}
                                                     </Badge>
                                                  </td>
                                                  <td className="p-4 text-gray-500 truncate max-w-[200px]" title={e.description}>
                                                     {e.description || "-"}
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
                 // Empty State for No Selection
                 <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                       <Search size={48} className="text-purple-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">اختر عقداً للبدء</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       قم باختيار أحد العقود من القائمة الجانبية لعرض التحليل المالي والمصروفات الخاصة به.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}