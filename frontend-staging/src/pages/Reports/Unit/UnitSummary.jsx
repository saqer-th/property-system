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
  Loader2,
  Search,
  Building2,
  MapPin,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Download,
  Wallet,
  TrendingUp,
  TrendingDown,
  User,
  Zap,
  Droplets,
  Ruler,
  FileText,
  Wrench,
  DollarSign
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";

// --- Constants ---
const FINANCIAL_COLORS = { income: '#10b981', expense: '#ef4444' };

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

export default function UnitSummaryReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // Navigation State
  const [view, setView] = useState("properties"); // 'properties' | 'units'
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Data State
  const [query, setQuery] = useState("");
  const [unitDetails, setUnitDetails] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  /* ===============================
      Load Properties (Initial)
  =================================*/
  useEffect(() => {
    async function loadProperties() {
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
        console.error("Error loading properties:", err);
      }
      setLoadingList(false);
    }
    loadProperties();
  }, [user.token, user.activeRole]);

  /* ===============================
      Load Units for Property
  =================================*/
  const loadUnitsForProperty = async (property) => {
    setSelectedProperty(property);
    setView("units");
    setQuery("");
    setLoadingList(true);
    
    try {
      // Assuming summary endpoint creates a good list of units
      const res = await fetch(`${API_URL}/properties/${property.id}/summary`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setUnits(json.data?.units || []);
    } catch (err) {
      console.error("Error loading units:", err);
      setUnits([]);
    }
    setLoadingList(false);
  };

  const handleBackToProperties = () => {
    setView("properties");
    setSelectedProperty(null);
    setSelectedUnit(null);
    setUnits([]);
    setQuery("");
    setUnitDetails(null);
  };

  /* ===============================
      Load Unit Full Details
  =================================*/
  const loadUnitDetails = async (unitId) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/units/${unitId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setUnitDetails(json.data);
    } catch (err) {
      console.error("Error loading unit details:", err);
    }
    setLoadingDetails(false);
  };

  const handleSelectUnit = (u) => {
    if (selectedUnit?.id === u.id) return;
    setSelectedUnit(u);
    loadUnitDetails(u.id);
  };

  /* ===============================
      Filtering & Analytics
  =================================*/
  
  const filteredList = useMemo(() => {
    if (!query) return view === "properties" ? properties : units;
    const lowerQ = query.toLowerCase();
    
    if (view === "properties") {
      return properties.filter(p => 
        `${p.property_type} ${p.title_deed_no} ${p.city}`.toLowerCase().includes(lowerQ)
      );
    } else {
      return units.filter(u => 
        `${u.unit_no} ${u.unit_type}`.toLowerCase().includes(lowerQ)
      );
    }
  }, [properties, units, query, view]);

  const analytics = useMemo(() => {
    if (!unitDetails) return null;

    // Financials
    // Assuming unit details might contain expenses/contracts/receipts arrays
    // If not directly available in standard endpoint, we rely on what's provided or fallback to 0
    const contracts = unitDetails.contracts || [];
    const expenses = unitDetails.expenses || [];
    
    // Status
    const activeContract = contracts.find(c => c.contract_status === "نشط" || c.contract_status === "Active");
    const tenantName = activeContract ? activeContract.tenant_name : "---";
    
    // Calculations
    const totalIncome = contracts.reduce((sum, c) => sum + Number(c.total_contract_value || 0), 0); // Simplified income proxy
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netYield = totalIncome - totalExpenses;

    const financialChart = [
        { name: t("income"), amount: totalIncome },
        { name: t("expenses"), amount: totalExpenses }
    ];

    return { 
        activeContract, 
        tenantName, 
        totalIncome, 
        totalExpenses, 
        netYield, 
        financialChart 
    };
  }, [unitDetails, t]);

  /* ===============================
      Generate PDF
  =================================*/
  const generateReport = () => {
    if (!selectedUnit) return;
    const url = `${API_URL}/reports?type=unit&id=${selectedUnit.id}&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <Home className="text-blue-600" /> {t("unitSummary")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("unitSummarySub", "لوحة معلومات شاملة للوحدة: المستأجرين، الصيانة، والأداء المالي")}
              </p>
           </div>
        </div>

        {/* --- Main Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
           
           {/* Left Sidebar: Navigation */}
           <Card className="lg:col-span-3 lg:sticky lg:top-8 h-[500px] lg:h-[calc(100vh-140px)] flex flex-col border-0 shadow-sm ring-1 ring-gray-100">
              
              <div className="p-4 border-b space-y-3">
                 {view === "properties" ? (
                    <h2 className="font-semibold text-gray-700">{t("propertiesList", "اختر عقاراً")}</h2>
                 ) : (
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="sm" onClick={handleBackToProperties} className="p-0 h-8 w-8 rounded-full hover:bg-gray-100">
                          {dir === "rtl" ? <ArrowRight size={16}/> : <ArrowLeft size={16}/>}
                       </Button>
                       <div>
                          <h2 className="font-semibold text-gray-900 text-sm line-clamp-1">{selectedProperty?.property_type}</h2>
                          <p className="text-xs text-gray-500">{t("selectUnit", "اختر وحدة")}</p>
                       </div>
                    </div>
                 )}
                 
                 <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                    <Input 
                       placeholder={view === "properties" ? t("searchProperty") : t("searchUnit")} 
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
                 ) : filteredList.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                       <p>لا توجد نتائج</p>
                    </div>
                 ) : (
                    filteredList.map((item) => (
                       <div 
                          key={item.id} 
                          onClick={() => view === "properties" ? loadUnitsForProperty(item) : handleSelectUnit(item)}
                          className={`p-3 rounded-lg cursor-pointer transition-all border group relative
                             ${(view === "properties" ? selectedProperty?.id === item.id : selectedUnit?.id === item.id)
                                ? "bg-blue-50 border-blue-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {/* Selection Indicator */}
                          {((view === "properties" && selectedProperty?.id === item.id) || (view === "units" && selectedUnit?.id === item.id)) && 
                             <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />
                          }

                          <div className="flex justify-between items-center">
                             <div>
                                <p className={`font-semibold text-sm truncate max-w-[180px] ${(view === "properties" ? selectedProperty?.id === item.id : selectedUnit?.id === item.id) ? "text-blue-800" : "text-gray-700"}`}>
                                   {view === "properties" ? item.property_type : `وحدة رقم: ${item.unit_no}`}
                                </p>
                                <div className="flex items-center text-xs text-gray-500 gap-2 mt-1">
                                   {view === "properties" ? (
                                      <>
                                         <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {item.city}</span>
                                      </>
                                   ) : (
                                      <>
                                         <span className="bg-gray-100 px-1.5 rounded">{item.unit_type}</span>
                                      </>
                                   )}
                                </div>
                             </div>
                             {view === "properties" && (
                                dir === "rtl" ? <ChevronLeft size={14} className="text-gray-300"/> : <ChevronRight size={14} className="text-gray-300"/>
                             )}
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </Card>

           {/* Right Content: Dashboard */}
           <div className="lg:col-span-9 space-y-6">
              {loadingDetails ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                       <Skeleton className="h-[300px] rounded-xl" />
                       <Skeleton className="h-[300px] rounded-xl" />
                    </div>
                 </div>
              ) : selectedUnit && unitDetails && analytics ? (
                 <>
                    {/* Header Card */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                {unitDetails.unit_type} رقم {unitDetails.unit_no}
                                {analytics.activeContract ? (
                                   <Badge className="bg-green-100 text-green-700 border-green-200">مؤجرة</Badge>
                                ) : (
                                   <Badge variant="outline" className="text-gray-500 bg-gray-50">شاغرة</Badge>
                                )}
                             </h2>
                             <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><Building2 size={14}/> {selectedProperty?.property_type}</span>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1"><MapPin size={14}/> {selectedProperty?.city}</span>
                             </div>
                          </div>
                          <Button onClick={generateReport} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100">
                             <Download size={16} className="ml-2"/> {t("generatePDF")}
                          </Button>
                       </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       <StatCard 
                          title={t("currentTenant")} 
                          value={analytics.tenantName} 
                          icon={<User size={20}/>} 
                          colorClass="text-blue-600" 
                          bgClass="bg-blue-50"
                          subtext={analytics.activeContract ? `انتهاء: ${analytics.activeContract.tenancy_end?.split("T")[0]}` : "لا يوجد مستأجر"}
                       />
                       <StatCard 
                          title={t("netYield")} 
                          value={analytics.netYield.toLocaleString()} 
                          icon={<Wallet size={20}/>} 
                          colorClass="text-emerald-600" 
                          bgClass="bg-emerald-50"
                          subtext="صافي العائد"
                       />
                       <StatCard 
                          title={t("expenses")} 
                          value={analytics.totalExpenses.toLocaleString()} 
                          icon={<Wrench size={20}/>} 
                          colorClass="text-red-600" 
                          bgClass="bg-red-50"
                          subtext="تكاليف الصيانة"
                       />
                       <StatCard 
                          title={t("unitArea")} 
                          value={unitDetails.unit_area || "-"} 
                          subtext="متر مربع"
                          icon={<Ruler size={20}/>} 
                          colorClass="text-purple-600" 
                          bgClass="bg-purple-50"
                       />
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       
                       {/* Left Column: Info & Financials */}
                       <div className="lg:col-span-1 space-y-6">
                          
                          {/* Unit Info */}
                          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                             <CardHeader className="pb-3 border-b border-gray-50">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                   <Home size={16} className="text-gray-500"/> {t("unitInfo", "بيانات الوحدة")}
                                </CardTitle>
                             </CardHeader>
                             <CardContent className="pt-4 space-y-3">
                                <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                                   <span className="text-sm text-gray-500 flex items-center gap-2"><Zap size={14}/> عداد الكهرباء</span>
                                   <span className="font-mono text-sm">{unitDetails.electric_meter_no || "-"}</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                                   <span className="text-sm text-gray-500 flex items-center gap-2"><Droplets size={14}/> عداد المياه</span>
                                   <span className="font-mono text-sm">{unitDetails.water_meter_no || "-"}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                   <span className="text-sm text-gray-500">عدد الغرف</span>
                                   <span className="font-semibold text-sm">{unitDetails.rooms_count || "-"}</span>
                                </div>
                             </CardContent>
                          </Card>

                          {/* Financial Chart */}
                          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                             <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                   <TrendingUp size={16}/> {t("financialOverview")}
                                </CardTitle>
                             </CardHeader>
                             <CardContent className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={analytics.financialChart}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                      <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                      <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                      <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px'}} />
                                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40}>
                                         {analytics.financialChart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? FINANCIAL_COLORS.income : FINANCIAL_COLORS.expense} />
                                         ))}
                                      </Bar>
                                   </BarChart>
                                </ResponsiveContainer>
                             </CardContent>
                          </Card>
                       </div>

                       {/* Right Column: Tables */}
                       <div className="lg:col-span-2 space-y-6">
                          
                          {/* Contracts History */}
                          <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                             <CardHeader className="bg-white border-b border-gray-100 pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700">
                                   <FileText size={16}/> {t("contractsHistory", "سجل العقود")}
                                </CardTitle>
                             </CardHeader>
                             <div className="overflow-x-auto max-h-[200px]">
                                <table className="w-full text-xs text-right">
                                   <thead className="bg-blue-50 text-blue-800 sticky top-0">
                                      <tr>
                                         <th className="p-3">رقم العقد</th>
                                         <th className="p-3">المستأجر</th>
                                         <th className="p-3">الفترة</th>
                                         <th className="p-3">الحالة</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-50">
                                      {unitDetails.contracts?.map((c) => (
                                         <tr key={c.id} className="hover:bg-blue-50/30">
                                            <td className="p-3 font-medium">{c.contract_no}</td>
                                            <td className="p-3 text-gray-600">{c.tenant_name}</td>
                                            <td className="p-3 text-gray-500 font-mono">
                                               {c.tenancy_start?.split("T")[0]} - {c.tenancy_end?.split("T")[0]}
                                            </td>
                                            <td className="p-3">
                                               <Badge variant="outline" className={`font-normal text-[10px] border ${
                                                  (c.contract_status === "نشط" || c.contract_status === "Active") ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"
                                               }`}>
                                                  {c.contract_status}
                                               </Badge>
                                            </td>
                                         </tr>
                                      ))}
                                      {!unitDetails.contracts?.length && (
                                         <tr><td colSpan="4" className="p-4 text-center text-gray-400">لا يوجد سجل عقود</td></tr>
                                      )}
                                   </tbody>
                                </table>
                             </div>
                          </Card>

                          {/* Recent Maintenance/Expenses */}
                          <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                             <CardHeader className="bg-white border-b border-gray-100 pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                                   <Wrench size={16}/> {t("maintenanceLog", "سجل الصيانة والمصروفات")}
                                </CardTitle>
                             </CardHeader>
                             <div className="overflow-x-auto max-h-[200px]">
                                <table className="w-full text-xs text-right">
                                   <thead className="bg-red-50 text-red-800 sticky top-0">
                                      <tr>
                                         <th className="p-3">التاريخ</th>
                                         <th className="p-3">المبلغ</th>
                                         <th className="p-3">الوصف</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-50">
                                      {unitDetails.expenses?.map((e) => (
                                         <tr key={e.id} className="hover:bg-red-50/30">
                                            <td className="p-3 text-gray-500">{e.date}</td>
                                            <td className="p-3 font-bold text-gray-900">{Number(e.amount).toLocaleString()}</td>
                                            <td className="p-3 text-gray-600 truncate max-w-[200px]">{e.description || e.notes || "-"}</td>
                                         </tr>
                                      ))}
                                      {!unitDetails.expenses?.length && (
                                         <tr><td colSpan="3" className="p-4 text-center text-gray-400">لا توجد مصروفات مسجلة</td></tr>
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
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                       <Building2 size={48} className="text-blue-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">ابدأ باختيار عقار ثم وحدة</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       قم بتحديد الوحدة من القائمة الجانبية لعرض الملف الشامل، السجل المالي، وتاريخ الصيانة.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}