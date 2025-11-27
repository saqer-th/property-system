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
  FileText,
  Search,
  Building2,
  Loader2,
  Download,
  Wallet,
  CheckCircle2,
  History,
  PieChart as PieChartIcon,
  ArrowUpDown,
  User,
  MapPin,
  ArrowRight, // For RTL back button (or ArrowLeft depending on dir)
  ArrowLeft,
  ChevronRight,
  ChevronLeft
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
const COLORS = ['#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#6366f1'];

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

export default function UnitContractsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // State
  const [view, setView] = useState("properties"); // 'properties' | 'units'
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  
  const [query, setQuery] = useState("");
  const [unitContracts, setUnitContracts] = useState([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ key: 'tenancy_end', direction: 'desc' });

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
        console.error(err);
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
    setQuery(""); // Clear search
    setLoadingList(true);
    
    try {
      // Assuming summary endpoint returns units, or use specific units endpoint
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
    setUnitContracts([]); // Clear right panel
  };

  /* ===============================
      Load Contracts for Unit
  =================================*/
  const loadUnitContracts = async (unitId) => {
    setLoadingContracts(true);
    try {
      const res = await fetch(`${API_URL}/units/${unitId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setUnitContracts(json.data?.contracts || []);
    } catch (err) {
      console.error("Error loading unit contracts:", err);
    }
    setLoadingContracts(false);
  };

  const handleSelectUnit = (u) => {
    if (selectedUnit?.id === u.id) return;
    setSelectedUnit(u);
    loadUnitContracts(u.id);
  };

  /* ===============================
      Data Processing & Filtering
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

  // Sort Contracts
  const sortedContracts = useMemo(() => {
    let items = [...unitContracts];
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        
        if (sortConfig.key === 'total_contract_value') {
           aVal = Number(aVal);
           bVal = Number(bVal);
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [unitContracts, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Analytics
  const analytics = useMemo(() => {
    if (!selectedUnit) return null;
    
    const totalContracts = unitContracts.length;
    const activeContract = unitContracts.find(c => c.contract_status === "نشط" || c.contract_status === "Active");
    const totalValue = unitContracts.reduce((sum, c) => sum + Number(c.total_contract_value || 0), 0);
    
    const statusCounts = {};
    unitContracts.forEach(c => {
        const s = c.contract_status || "Unknown";
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));

    return { totalContracts, activeContract, totalValue, statusData };
  }, [unitContracts, selectedUnit]);

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
                 <FileText className="text-purple-600" /> {t("unitContracts")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("unitContractsSub", "سجل العقود والمستأجرين وتاريخ التأجير لكل وحدة")}
              </p>
           </div>
        </div>

        {/* --- Main Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
           
           {/* Left Sidebar: Navigation (Properties -> Units) */}
           <Card className="lg:col-span-3 lg:sticky lg:top-8 h-[500px] lg:h-[calc(100vh-140px)] flex flex-col border-0 shadow-sm ring-1 ring-gray-100">
              
              {/* Sidebar Header */}
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

              {/* Sidebar List */}
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
                                ? "bg-purple-50 border-purple-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {/* Selection Indicator */}
                          {((view === "properties" && selectedProperty?.id === item.id) || (view === "units" && selectedUnit?.id === item.id)) && 
                             <div className="absolute left-0 top-3 bottom-3 w-1 bg-purple-600 rounded-r-full" />
                          }

                          <div className="flex justify-between items-center">
                             <div>
                                <p className={`font-semibold text-sm truncate max-w-[180px] ${(view === "properties" ? selectedProperty?.id === item.id : selectedUnit?.id === item.id) ? "text-purple-800" : "text-gray-700"}`}>
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

           {/* Right Content: Contracts Details */}
           <div className="lg:col-span-9 space-y-6">
              {loadingContracts ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-[400px] rounded-xl" />
                 </div>
              ) : selectedUnit && analytics ? (
                 <>
                    {/* Header Card */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                {selectedUnit.unit_type} رقم {selectedUnit.unit_no}
                                {analytics.activeContract ? (
                                   <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">مؤجرة</Badge>
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
                          <Button onClick={generateReport} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-100">
                             <Download size={16} className="ml-2"/> {t("generatePDF")}
                          </Button>
                       </CardContent>
                    </Card>

                    {unitContracts.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                          <History size={48} className="text-purple-200 mb-4"/>
                          <h3 className="text-lg font-semibold text-gray-700">لا يوجد سجل عقود</h3>
                          <p className="text-sm">لم يتم تسجيل أي عقود سابقة لهذه الوحدة.</p>
                       </div>
                    ) : (
                       <>
                          {/* Stats & Charts */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             
                             {/* Stats Grid */}
                             <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <StatCard 
                                   title={t("contractsCount")} 
                                   value={analytics.totalContracts} 
                                   icon={<FileText size={20}/>} 
                                   colorClass="text-blue-600" 
                                   bgClass="bg-blue-50"
                                />
                                <StatCard 
                                   title={t("currentStatus")} 
                                   value={analytics.activeContract ? "مؤجرة" : "شاغرة"} 
                                   subtext={analytics.activeContract ? `عقد #${analytics.activeContract.contract_no}` : "جاهزة للتأجير"}
                                   icon={<CheckCircle2 size={20}/>} 
                                   colorClass={analytics.activeContract ? "text-green-600" : "text-gray-600"} 
                                   bgClass={analytics.activeContract ? "bg-green-50" : "bg-gray-50"}
                                />
                                <StatCard 
                                   title={t("totalValue")} 
                                   value={analytics.totalValue.toLocaleString()} 
                                   subtext="إجمالي قيمة العقود"
                                   icon={<Wallet size={20}/>} 
                                   colorClass="text-purple-600" 
                                   bgClass="bg-purple-50"
                                />
                                <StatCard 
                                   title={t("expiredContracts")} 
                                   value={unitContracts.length - (analytics.activeContract ? 1 : 0)} 
                                   subtext="عقود منتهية"
                                   icon={<History size={20}/>} 
                                   colorClass="text-amber-600" 
                                   bgClass="bg-amber-50"
                                />
                             </div>

                             {/* Status Chart */}
                             <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                                <CardHeader className="pb-2">
                                   <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                      <PieChartIcon size={16}/> {t("statusDistribution", "حالة العقود")}
                                   </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[180px]">
                                   <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                         <Pie
                                            data={analytics.statusData}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                         >
                                            {analytics.statusData.map((entry, index) => (
                                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                         </Pie>
                                         <Tooltip contentStyle={{borderRadius: '8px'}} />
                                         <Legend wrapperStyle={{fontSize: '12px', paddingTop: '0px'}}/>
                                      </PieChart>
                                   </ResponsiveContainer>
                                </CardContent>
                             </Card>
                          </div>

                          {/* Contracts Table */}
                          <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                             <CardHeader className="bg-white border-b border-gray-100 pb-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                   <FileText size={18} className="text-gray-500"/> {t("contractsHistory", "سجل العقود")}
                                </CardTitle>
                             </CardHeader>
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                   <thead className="bg-gray-50/50 text-gray-500">
                                      <tr>
                                         <th className="p-4 font-medium">{t("contractNo")}</th>
                                         <th className="p-4 font-medium">{t("tenant")}</th>
                                         <th className="p-4 font-medium cursor-pointer hover:text-purple-600" onClick={() => requestSort('tenancy_start')}>
                                            <div className="flex items-center gap-1">البداية <ArrowUpDown size={12}/></div>
                                         </th>
                                         <th className="p-4 font-medium cursor-pointer hover:text-purple-600" onClick={() => requestSort('tenancy_end')}>
                                            <div className="flex items-center gap-1">النهاية <ArrowUpDown size={12}/></div>
                                         </th>
                                         <th className="p-4 font-medium cursor-pointer hover:text-purple-600" onClick={() => requestSort('total_contract_value')}>
                                            <div className="flex items-center gap-1">القيمة <ArrowUpDown size={12}/></div>
                                         </th>
                                         <th className="p-4 font-medium">{t("status")}</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-50">
                                      {sortedContracts.map((c) => (
                                         <tr key={c.id} className="hover:bg-purple-50/30 transition-colors group">
                                            <td className="p-4 font-medium text-gray-900">{c.contract_no}</td>
                                            <td className="p-4 text-gray-600 flex items-center gap-2">
                                               <User size={14} className="text-gray-400"/> {c.tenant_name}
                                            </td>
                                            <td className="p-4 text-gray-500 text-xs font-mono">{c.tenancy_start?.split("T")[0]}</td>
                                            <td className="p-4 text-gray-500 text-xs font-mono">{c.tenancy_end?.split("T")[0]}</td>
                                            <td className="p-4 font-bold text-gray-900">{Number(c.total_contract_value).toLocaleString()}</td>
                                            <td className="p-4">
                                               <Badge variant="outline" className={`font-normal border ${
                                                  (c.contract_status === "نشط" || c.contract_status === "Active") ? "bg-green-50 text-green-700 border-green-200" :
                                                  "bg-gray-100 text-gray-500 border-gray-200"
                                               }`}>
                                                  {c.contract_status}
                                               </Badge>
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
              ) : (
                 // Empty State
                 <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                       <Building2 size={48} className="text-purple-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">ابدأ باختيار عقار ثم وحدة</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       اختر عقاراً من القائمة الجانبية، ثم حدد وحدة لعرض التاريخ التعاقدي الخاص بها.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}