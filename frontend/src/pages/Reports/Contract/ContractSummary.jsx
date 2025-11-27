import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Search,
  CalendarDays,
  User,
  Home,
  Building2,
  DollarSign,
  Receipt,
  ClipboardList,
  Download,
  Wallet,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  PieChart as PieChartIcon,
  Activity,
  CreditCard
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts";

// --- Constants ---
const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Emerald, Amber, Red

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

const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-3 text-gray-600">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
    <span className="font-semibold text-gray-900 text-sm">{value || "—"}</span>
  </div>
);

export default function ContractSummaryReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // State
  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 1. Load Contracts List
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      try {
        const res = await fetch(`${API_URL}/contracts/my`, {
          headers: { Authorization: `Bearer ${user.token}`, "x-active-role": user.activeRole },
        });
        const data = await res.json();
        setContracts(data.data || []);
      } catch (err) { console.error("Error:", err); }
      setLoadingList(false);
    }
    load();
  }, [user.token, user.activeRole]);

  // 2. Load Full Contract
  const loadFullContract = async (id) => {
    if (selected?.id === id) return;
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/contracts/${id}`, {
        headers: { Authorization: `Bearer ${user.token}`, "x-active-role": user.activeRole },
      });
      const data = await res.json();
      setSelected(data.data);
    } catch (err) { console.error(err); }
    setLoadingDetails(false);
  };

  // 3. Filter Logic
  const filteredContracts = useMemo(() => {
    if (!query) return contracts;
    const lowerQ = query.toLowerCase();
    return contracts.filter((c) =>
      `${c.contract_no} ${c.tenant_name} ${c.unit_no}`.toLowerCase().includes(lowerQ)
    );
  }, [query, contracts]);

  // 4. Generate PDF
  const generateReport = () => {
    if (!selected) return;
    setLoading(true);
    const url = `${API_URL}/reports?type=contract&id=${selected.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
    setTimeout(() => setLoading(false), 600);
  };

  // 5. Calculations & Analytics
  const analytics = useMemo(() => {
    if (!selected) return null;

    const totalVal = Number(selected.total_contract_value || 0);
    const collected = selected.receipts?.filter(r => r.receipt_type === "قبض")?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
    const remaining = totalVal - collected;
    const collectionRate = totalVal > 0 ? (collected / totalVal) * 100 : 0;

    // Time Progress
    const start = new Date(selected.tenancy_start);
    const end = new Date(selected.tenancy_end);
    const now = new Date();
    const totalDuration = end - start;
    const elapsed = now - start;
    let timeProgress = 0;
    if (totalDuration > 0) {
      timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    }
    
    // Days remaining
    const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    return { 
      totalVal, 
      collected, 
      remaining, 
      collectionRate, 
      timeProgress, 
      daysRemaining,
      chartData: [
        { name: t("collected"), value: collected },
        { name: t("remaining"), value: remaining }
      ]
    };
  }, [selected, t]);

  // compute active state based on tenancy_end
  const tenancyEndsAt = selected?.tenancy_end ? new Date(selected.tenancy_end) : null;
  const isActiveByEndDate = tenancyEndsAt ? tenancyEndsAt > new Date() : false;
  const daysRemainingByEndDate = tenancyEndsAt ? Math.ceil((tenancyEndsAt - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <FileText className="text-emerald-600" /> {t("contractSummary")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("contractSummarySub", "نظرة شاملة وتفصيلية على العقود، المستأجرين، والوضع المالي")}
              </p>
           </div>
        </div>

        {/* --- Main Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
           
           {/* Left Sidebar: Contract List */}
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
                          onClick={() => loadFullContract(c.id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all border group relative
                             ${selected?.id === c.id 
                                ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {selected?.id === c.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-600 rounded-r-full" />}
                          <div className="flex justify-between items-start mb-1">
                             <p className={`font-semibold text-sm truncate max-w-[70%] ${selected?.id === c.id ? "text-emerald-800" : "text-gray-700"}`}>
                                {c.tenant_name}
                             </p>
                             <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-white border border-gray-100 text-gray-500">
                                #{c.contract_no}
                             </Badge>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 gap-3">
                             <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400"/> {c.unit_no}</span>
                             <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.contract_status === 'نشط' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
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
              {loadingDetails ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-[400px] rounded-xl" />
                 </div>
              ) : selected && analytics ? (
                 <>
                    {/* 1. Header & Actions */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                عقد رقم: {selected.contract_no}
                                <Badge
                                  variant="outline"
                                  className={
                                    isActiveByEndDate
                                      ? 'text-green-600 bg-green-50 border-green-200'
                                      : 'text-gray-500 bg-red-50 text-red-600 border-red-200'
                                  }
                                >
                                  {isActiveByEndDate ? t("active", "مفعل") : t("expired", "منتهي")}
                                </Badge>
                             </h2>
                          </div>
                          <Button onClick={generateReport} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100">
                             {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"/> : <Download size={16} className="ml-2"/>} 
                             {t("generatePDF")}
                          </Button>
                       </CardContent>
                    </Card>

                    {/* 2. Overview Grid (Property, Tenant, Timeline) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       
                       {/* Tenant Card */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <User size={16} className="text-blue-500"/> بيانات المستأجر
                             </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                   {selected.tenants?.[0]?.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                   <p className="font-bold text-gray-900 line-clamp-1">{selected.tenants?.[0]?.name}</p>
                                   <p className="text-xs text-gray-500">ID: {selected.tenants?.[0]?.id || "-"}</p>
                                </div>
                             </div>
                             <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                   <Phone size={12}/> {selected.tenants?.[0]?.phone || "غير متوفر"}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                   <Mail size={12}/> {selected.tenants?.[0]?.email || "غير متوفر"}
                                </div>
                             </div>
                          </CardContent>
                       </Card>

                       {/* Property Card */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Home size={16} className="text-purple-500"/> بيانات الوحدة
                             </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                             <div className="pt-1">
                                <h3 className="font-bold text-gray-900">{selected.property?.property_name}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                   <MapPin size={10}/> {selected.property?.city || "الرياض"}
                                </p>
                             </div>
                             <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="bg-gray-50 p-2 rounded text-center">
                                   <p className="text-[10px] text-gray-400">رقم الوحدة</p>
                                   <p className="font-semibold text-sm">{selected.units?.[0]?.unit_no}</p>
                                </div>
                                <div className="bg-gray-50 p-2 rounded text-center">
                                   <p className="text-[10px] text-gray-400">النوع</p>
                                   <p className="font-semibold text-sm">{selected.units?.[0]?.unit_type}</p>
                                </div>
                             </div>
                          </CardContent>
                       </Card>

                       {/* Time Progress Card */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100 flex flex-col justify-between">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Clock size={16} className="text-amber-500"/> مدة العقد
                             </CardTitle>
                          </CardHeader>
                          <CardContent>
                             <div className="flex justify-between text-xs text-gray-500 mb-2">
                                <span>{selected.tenancy_start?.split("T")[0]}</span>
                                <span>{selected.tenancy_end?.split("T")[0]}</span>
                             </div>
                             <Progress value={analytics.timeProgress} className="h-2.5 mb-2" />
                             <div className="flex justify-between items-center mt-2">
                                <span className="text-xs font-medium text-gray-600">
                                   انقضى {analytics.timeProgress.toFixed(0)}%
                                </span>
                                <Badge variant="secondary" className={`${analytics.daysRemaining < 30 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                                   متبقي {analytics.daysRemaining > 0 ? analytics.daysRemaining : 0} يوم
                                </Badge>
                             </div>
                          </CardContent>
                       </Card>
                    </div>

                    {/* 3. Financial Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       {/* Stats */}
                       <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <StatCard 
                             title={t("totalValue")} 
                             value={analytics.totalVal.toLocaleString()} 
                             icon={<DollarSign size={20}/>} 
                             colorClass="text-blue-600" 
                             bgClass="bg-blue-50"
                          />
                          <StatCard 
                             title={t("collected")} 
                             value={analytics.collected.toLocaleString()} 
                             subtext={`${analytics.collectionRate.toFixed(1)}% تم التحصيل`}
                             icon={<CheckCircle2 size={20}/>} 
                             colorClass="text-emerald-600" 
                             bgClass="bg-emerald-50"
                          />
                          <StatCard 
                             title={t("remaining")} 
                             value={analytics.remaining.toLocaleString()} 
                             icon={<Clock size={20}/>} 
                             colorClass="text-amber-600" 
                             bgClass="bg-amber-50"
                          />
                       </div>
                       
                       {/* Chart */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                          <CardContent className="p-0 h-[200px] relative flex items-center justify-center">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                   <Pie
                                      data={analytics.chartData}
                                      innerRadius={50}
                                      outerRadius={70}
                                      paddingAngle={5}
                                      dataKey="value"
                                   >
                                      {analytics.chartData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                   </Pie>
                                   <Tooltip />
                                   <Legend wrapperStyle={{fontSize: '12px', paddingTop: '0px'}} />
                                </PieChart>
                             </ResponsiveContainer>
                             {/* Center Text */}
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                                <span className="text-xs font-bold text-gray-400">التحصيل</span>
                             </div>
                          </CardContent>
                       </Card>
                    </div>

                    {/* 4. Tables Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Payments */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                          <CardHeader className="bg-white border-b border-gray-100 pb-3">
                             <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ClipboardList size={16} className="text-emerald-600"/> {t("payments")}
                             </CardTitle>
                          </CardHeader>
                          <div className="overflow-x-auto max-h-[300px]">
                             <table className="w-full text-xs text-right">
                                <thead className="bg-gray-50/50 text-gray-500 sticky top-0">
                                   <tr>
                                      <th className="p-3">تاريخ الاستحقاق</th>
                                      <th className="p-3">المبلغ</th>
                                      <th className="p-3">الحالة</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                   {selected.payments?.map((p, i) => (
                                      <tr key={i} className="hover:bg-gray-50">
                                         <td className="p-3">{p.due_date?.split("T")[0]}</td>
                                         <td className="p-3 font-semibold">{Number(p.amount).toLocaleString()}</td>
                                         <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                               p.status === 'مدفوعة' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                               {p.status}
                                            </span>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </Card>

                       {/* Receipts */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                          <CardHeader className="bg-white border-b border-gray-100 pb-3">
                             <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Receipt size={16} className="text-blue-600"/> {t("receipts")}
                             </CardTitle>
                          </CardHeader>
                          <div className="overflow-x-auto max-h-[300px]">
                             <table className="w-full text-xs text-right">
                                <thead className="bg-gray-50/50 text-gray-500 sticky top-0">
                                   <tr>
                                      <th className="p-3">المرجع</th>
                                      <th className="p-3">المبلغ</th>
                                      <th className="p-3">التاريخ</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                   {selected.receipts?.map((r, i) => (
                                      <tr key={i} className="hover:bg-gray-50">
                                         <td className="p-3 font-mono text-gray-500">{r.reference_no}</td>
                                         <td className="p-3 font-semibold text-blue-600">{Number(r.amount).toLocaleString()}</td>
                                         <td className="p-3">{r.date?.split("T")[0]}</td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </Card>
                    </div>

                 </>
              ) : (
                 // Empty State
                 <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                       <Activity size={48} className="text-emerald-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">اختر عقداً للمعاينة</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       قم باختيار عقد من القائمة لعرض الملخص الشامل، بيانات المستأجر، وتحليل الأداء المالي.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}