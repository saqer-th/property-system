import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";
import { useTranslation } from "react-i18next";
import {
  Home,
  Search,
  Building2,
  FileText,
  Loader2,
  MapPin,
  Download,
  PieChart as PieChartIcon,
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

// --- Constants ---
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
const FINANCIAL_COLORS = { income: '#10b981', expense: '#ef4444' };

const StatCard = ({ title, value, subtext, icon, colorClass, bgClass, trend, loading }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
    <div className="space-y-1">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
      )}
      {subtext && !loading && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
           {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-500"/>}
           {trend === 'down' && <ArrowDownRight size={12} className="text-red-500"/>}
           {subtext}
        </div>
      )}
    </div>
    <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
      {icon}
    </div>
  </div>
);

export default function PropertySummaryReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // State
  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  /* ===============================
      Load Properties
  =============================== */
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      try {
        const res = await fetch(`${API_URL}/properties/my`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        });
        const json = await res.json();
        setProperties(json.data || json || []);
      } catch (err) {
        console.error("ERR loading properties:", err);
      }
      setLoadingList(false);
    }
    load();
  }, [user.token, user.activeRole]);

  /* ===============================
      Load Property Details
  =============================== */
  const loadPropertyDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/properties/${id}/summary`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setPropertyDetails(json.data);
    } catch (err) {
      console.error("ERR loading property details:", err);
    }
    setLoadingDetails(false);
  };

  const handleSelect = (p) => {
    if (selected?.id === p.id) return;
    setSelected(p);
    loadPropertyDetails(p.id);
  };

  /* ===============================
      Data Processing
  =============================== */
  
  // 1. Filter Properties
  const filteredProperties = useMemo(() => {
    if (!query) return properties;
    const lowerQ = query.toLowerCase();
    return properties.filter((p) =>
      `${p.property_name} ${p.city} ${p.title_deed_no}`.toLowerCase().includes(lowerQ)
    );
  }, [properties, query]);

  // 2. Analytics Calculation
  const analytics = useMemo(() => {
    if (!propertyDetails) return null;

    // Financials
    const totalIncome = propertyDetails.receipts?.reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;
    const totalExpenses = propertyDetails.expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
    const netIncome = totalIncome - totalExpenses;
    const financialData = [
        { name: t("income"), amount: totalIncome },
        { name: t("expenses"), amount: totalExpenses }
    ];

    // Units Breakdown
    const unitTypes = {};
    propertyDetails.units?.forEach(u => {
        const type = u.unit_type || t("other");
        unitTypes[type] = (unitTypes[type] || 0) + 1;
    });
    const unitChartData = Object.keys(unitTypes).map(key => ({ name: key, value: unitTypes[key] }));

    // Contracts Stats
    const activeContracts = propertyDetails.contracts?.filter(c => c.status === "Active" || c.status === "نشط").length || 0;
    const totalContractsValue = propertyDetails.contracts?.reduce((sum, c) => sum + Number(c.total_contract_value || 0), 0) || 0;
    const totalUnits = propertyDetails.units?.length || 0;

    return { 
        totalIncome, 
        totalExpenses, 
        netIncome, 
        financialData, 
        unitChartData, 
        activeContracts,
        totalContractsValue,
        totalUnits
    };
  }, [propertyDetails, t]);

  /* ===============================
      Generate PDF
  =============================== */
  const generateReport = () => {
    if (!selected) return;
    const url = `${API_URL}/reports?type=property&id=${selected.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <Home className="text-emerald-600" /> {t("propertySummary")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("propertySummarySub", "ملف شامل للعقار: الوحدات، العقود، والتحليل المالي")}
              </p>
           </div>
        </div>

        {/* --- Main Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
           
           {/* Left Sidebar: Property List */}
           <Card className="lg:col-span-3 lg:sticky lg:top-8 h-[500px] lg:h-[calc(100vh-140px)] flex flex-col border-0 shadow-sm ring-1 ring-gray-100">
              <div className="p-4 border-b space-y-3">
                 <h2 className="font-semibold text-gray-700">{t("propertiesList", "قائمة العقارات")}</h2>
                 <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                    <Input 
                       placeholder={t("searchProperty")} 
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
                 ) : filteredProperties.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                       <p>لا توجد عقارات مطابقة</p>
                    </div>
                 ) : (
                    filteredProperties.map(p => (
                       <div 
                          key={p.id} 
                          onClick={() => handleSelect(p)}
                          className={`p-3 rounded-lg cursor-pointer transition-all border group relative
                             ${selected?.id === p.id 
                                ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {selected?.id === p.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-600 rounded-r-full" />}
                          <div className="flex justify-between items-start mb-1">
                             <p className={`font-semibold text-sm truncate max-w-[80%] ${selected?.id === p.id ? "text-emerald-800" : "text-gray-700"}`}>
                                {p.property_name || p.title_deed_no}
                             </p>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 gap-2">
                             <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400"/> {p.city}</span>
                             <span className="text-gray-300">|</span>
                             <span>{p.property_type}</span>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </Card>

           {/* Right Content: Property Details */}
           <div className="lg:col-span-9 space-y-6">
              {loadingDetails ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Skeleton className="h-[300px] rounded-xl" />
                       <Skeleton className="h-[300px] rounded-xl" />
                    </div>
                 </div>
              ) : selected && propertyDetails && analytics ? (
                 <>
                    {/* Header Card */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <Building2 size={20} className="text-emerald-600"/>
                                {selected.property_name}
                             </h2>
                             <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200">{selected.property_type}</span>
                                <span className="flex items-center gap-1"><MapPin size={12}/> {selected.city}</span>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1"><FileText size={12}/> {selected.title_deed_no}</span>
                             </div>
                          </div>
                          <Button onClick={generateReport} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100">
                             <Download size={16} className="ml-2"/> {t("generatePDF")}
                          </Button>
                       </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       <StatCard 
                          title={t("netIncome")} 
                          value={analytics.netIncome.toLocaleString()} 
                          icon={<DollarSign size={20}/>} 
                          colorClass="text-emerald-600" 
                          bgClass="bg-emerald-50"
                          trend={analytics.netIncome >= 0 ? "up" : "down"}
                          subtext="صافي الدخل"
                       />
                       <StatCard 
                          title={t("totalUnits")} 
                          value={analytics.totalUnits} 
                          icon={<Home size={20}/>} 
                          colorClass="text-blue-600" 
                          bgClass="bg-blue-50"
                          subtext="إجمالي الوحدات"
                       />
                       {/* Replaced Occupancy Rate with Active Contracts */}
                       <StatCard 
                          title={t("activeContracts")} 
                          value={analytics.activeContracts} 
                          icon={<ClipboardList size={20}/>} 
                          colorClass="text-purple-600" 
                          bgClass="bg-purple-50"
                          subtext="عقد نشط"
                       />
                       <StatCard 
                          title={t("expenses")} 
                          value={analytics.totalExpenses.toLocaleString()} 
                          icon={<TrendingDown size={20}/>} 
                          colorClass="text-red-600" 
                          bgClass="bg-red-50"
                          subtext="إجمالي المصروفات"
                       />
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       
                       {/* Financial Overview */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                          <CardHeader>
                             <CardTitle className="text-base flex items-center gap-2">
                                <Wallet size={18} className="text-gray-500"/> {t("financialOverview", "الأداء المالي")}
                             </CardTitle>
                          </CardHeader>
                          <CardContent className="h-[250px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.financialData}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                   <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                   <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                   <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px'}} />
                                   <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={50}>
                                      {analytics.financialData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={index === 0 ? FINANCIAL_COLORS.income : FINANCIAL_COLORS.expense} />
                                      ))}
                                   </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                          </CardContent>
                       </Card>

                       {/* Unit Distribution */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                          <CardHeader>
                             <CardTitle className="text-base flex items-center gap-2">
                                <PieChartIcon size={18} className="text-gray-500"/> {t("unitMix", "توزيع الوحدات")}
                             </CardTitle>
                          </CardHeader>
                          <CardContent className="h-[250px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                   <Pie
                                      data={analytics.unitChartData}
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                   >
                                      {analytics.unitChartData.map((entry, index) => (
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

                    {/* Detailed Lists */}
                    <div className="space-y-6">
                        
                        {/* Contracts Table - Added as requested */}
                        <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                           <CardHeader className="bg-white border-b border-gray-100 pb-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                 <ClipboardList size={18} className="text-purple-600"/> {t("contractsList", "قائمة العقود")}
                              </CardTitle>
                           </CardHeader>
                           <div className="overflow-x-auto max-h-[300px]">
                              <table className="w-full text-sm text-right">
                                 <thead className="bg-purple-50 text-purple-900 sticky top-0">
                                    <tr>
                                       <th className="p-4">رقم العقد</th>
                                       <th className="p-4">المستأجر</th>
                                       <th className="p-4">القيمة</th>
                                       <th className="p-4">النهاية</th>
                                       <th className="p-4">الحالة</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-50">
                                    {propertyDetails.contracts?.map((c) => (
                                       <tr key={c.id} className="hover:bg-purple-50/30">
                                          <td className="p-4 font-medium text-gray-900">{c.contract_no}</td>
                                          <td className="p-4 text-gray-600">{c.tenant_name}</td>
                                          <td className="p-4 font-bold text-gray-900">{Number(c.total_contract_value).toLocaleString()}</td>
                                          <td className="p-4 text-gray-600 text-xs">{c.tenancy_end?.split("T")[0]}</td>
                                          <td className="p-4">
                                             <Badge variant="outline" className={`font-normal border ${
                                                (c.status === 'Active' || c.status === 'نشط') ? "bg-green-50 text-green-700 border-green-200" :
                                                "bg-gray-100 text-gray-600 border-gray-200"
                                             }`}>
                                                {c.status}
                                             </Badge>
                                          </td>
                                       </tr>
                                    ))}
                                    {(!propertyDetails.contracts || propertyDetails.contracts.length === 0) && (
                                       <tr><td colSpan="6" className="p-6 text-center text-gray-400">لا توجد عقود مسجلة</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </Card>

                        {/* Units Table */}
                        <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                           <CardHeader className="bg-white border-b border-gray-100 pb-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                 <Home size={18} className="text-gray-500"/> {t("unitsList")}
                              </CardTitle>
                           </CardHeader>
                           <div className="overflow-x-auto max-h-[300px]">
                              <table className="w-full text-sm text-right">
                                 <thead className="bg-gray-50/50 text-gray-500 sticky top-0">
                                    <tr>
                                       <th className="p-4">{t("unitNumber")}</th>
                                       <th className="p-4">{t("type")}</th>
                                       <th className="p-4">{t("area")}</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-50">
                                    {propertyDetails.units?.map((u) => (
                                       <tr key={u.id} className="hover:bg-emerald-50/30">
                                          <td className="p-4 font-medium text-gray-900">{u.unit_no}</td>
                                          <td className="p-4 text-gray-600">{u.unit_type}</td>
                                          <td className="p-4 text-gray-600" dir="ltr">{u.unit_area || "-"} m²</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </Card>

                        {/* Recent Transactions Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           
                           {/* Receipts */}
                           <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                              <CardHeader className="bg-white border-b border-gray-100 pb-3">
                                 <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700">
                                    <TrendingUp size={16}/> {t("latestReceipts")}
                                 </CardTitle>
                              </CardHeader>
                              <div className="overflow-x-auto max-h-[250px]">
                                 <table className="w-full text-xs text-right">
                                    <thead className="bg-emerald-50 text-emerald-800 sticky top-0">
                                       <tr>
                                          <th className="p-3">التاريخ</th>
                                          <th className="p-3">المبلغ</th>
                                          <th className="p-3">النوع</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                       {propertyDetails.receipts?.slice(0, 5).map((r) => (
                                          <tr key={r.id}>
                                             <td className="p-3 text-gray-500">{r.date?.split("T")[0]}</td>
                                             <td className="p-3 font-bold text-gray-900">{Number(r.amount).toLocaleString()}</td>
                                             <td className="p-3 text-gray-600">{r.receipt_type}</td>
                                          </tr>
                                       ))}
                                       {propertyDetails.receipts?.length === 0 && (
                                          <tr><td colSpan="3" className="p-4 text-center text-gray-400">لا توجد بيانات</td></tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </Card>

                           {/* Expenses */}
                           <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                              <CardHeader className="bg-white border-b border-gray-100 pb-3">
                                 <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                                    <TrendingDown size={16}/> {t("latestExpenses")}
                                 </CardTitle>
                              </CardHeader>
                              <div className="overflow-x-auto max-h-[250px]">
                                 <table className="w-full text-xs text-right">
                                    <thead className="bg-red-50 text-red-800 sticky top-0">
                                       <tr>
                                          <th className="p-3">التاريخ</th>
                                          <th className="p-3">المبلغ</th>
                                          <th className="p-3">الوصف</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                       {propertyDetails.expenses?.slice(0, 5).map((e) => (
                                          <tr key={e.id}>
                                             <td className="p-3 text-gray-500">{e.date}</td>
                                             <td className="p-3 font-bold text-gray-900">{Number(e.amount).toLocaleString()}</td>
                                             <td className="p-3 text-gray-600 truncate max-w-[150px]">{e.description || e.notes || "-"}</td>
                                          </tr>
                                       ))}
                                       {propertyDetails.expenses?.length === 0 && (
                                          <tr><td colSpan="3" className="p-4 text-center text-gray-400">لا توجد بيانات</td></tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </Card>

                        </div>
                    </div>
                 </>
              ) : (
                 // Empty State
                 <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                       <Building2 size={48} className="text-emerald-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">اختر عقاراً للتحليل</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       قم باختيار عقار من القائمة لعرض ملخص الأداء المالي، الوحدات، والعقود المرتبطة به.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}