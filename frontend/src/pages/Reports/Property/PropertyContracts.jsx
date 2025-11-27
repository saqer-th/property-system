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
  Loader2,
  Building2,
  MapPin,
  Download,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowUpDown,
  Calendar
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
const COLORS = ['#8b5cf6', '#10b981', '#ef4444', '#f59e0b']; // Purple, Emerald, Red, Amber

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

export default function PropertyContractsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // State
  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'tenancy_end', direction: 'desc' });

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
      } catch (err) { console.error(err); }
      setLoadingList(false);
    }
    load();
  }, [user.token, user.activeRole]);

  /* ===============================
      Load Contracts
  =============================== */
  const loadContracts = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/properties/${id}/contracts`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setContracts(json.data || []);
    } catch (err) {
      console.error("Contracts error:", err);
    }
    setLoadingDetails(false);
  };

  const handleSelect = (p) => {
    if (selected?.id === p.id) return;
    setSelected(p);
    loadContracts(p.id);
  };

  /* ===============================
      Data Processing
  =============================== */
  
  // 1. Filter Properties
  const filteredProperties = useMemo(() => {
    if (!query) return properties;
    const lowerQ = query.toLowerCase();
    return properties.filter((p) =>
      `${p.property_name} ${p.title_deed_no} ${p.city}`.toLowerCase().includes(lowerQ)
    );
  }, [properties, query]);

  // 2. Sort Contracts
  const sortedContracts = useMemo(() => {
    let items = [...contracts];
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
  }, [contracts, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // 3. Analytics
  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter(c => (c.status || c.contract_status) === "نشط" || (c.status || c.contract_status) === "Active").length;
    const expired = contracts.filter(c => (c.status || c.contract_status) === "منتهي" || (c.status || c.contract_status) === "Expired").length;
    const totalValue = contracts.reduce((acc, c) => acc + Number(c.total_contract_value || 0), 0);
    
    // Status Data for Chart
    const statusCounts = {};
    contracts.forEach(c => {
      const s = c.status || c.contract_status || "Unknown";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const chartData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));

    return { total, active, expired, totalValue, chartData };
  }, [contracts]);

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
                 <FileText className="text-purple-600" /> {t("contractsByProperty")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("propertyReportSub", "استعراض العقود، الإيجارات، والحالة المالية لكل عقار")}
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
                                ? "bg-purple-50 border-purple-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {selected?.id === p.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-purple-600 rounded-r-full" />}
                          <div className="flex justify-between items-start mb-1">
                             <p className={`font-semibold text-sm truncate max-w-[80%] ${selected?.id === p.id ? "text-purple-800" : "text-gray-700"}`}>
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

           {/* Right Content: Details */}
           <div className="lg:col-span-9 space-y-6">
              {loadingDetails ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-[400px] rounded-xl" />
                 </div>
              ) : selected ? (
                 <>
                    {/* Header Card */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <Building2 size={20} className="text-purple-600"/>
                                {selected.property_name}
                             </h2>
                             <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{selected.property_type}</span>
                                <span className="flex items-center gap-1"><MapPin size={12}/> {selected.city}, {selected.district}</span>
                             </div>
                          </div>
                          <Button onClick={generateReport} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-100">
                             <Download size={16} className="ml-2"/> {t("generatePDF")}
                          </Button>
                       </CardContent>
                    </Card>

                    {contracts.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                          <FileText size={48} className="text-purple-200 mb-4"/>
                          <h3 className="text-lg font-semibold text-gray-700">لا توجد عقود</h3>
                          <p className="text-sm">لم يتم العثور على أي عقود مسجلة لهذا العقار.</p>
                       </div>
                    ) : (
                       <>
                          {/* Stats & Charts */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             {/* Stats Grid */}
                             <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <StatCard 
                                   title={t("activeContracts")} 
                                   value={stats.active} 
                                   icon={<CheckCircle2 size={20}/>} 
                                   colorClass="text-green-600" 
                                   bgClass="bg-green-50" 
                                />
                                <StatCard 
                                   title={t("contractsCount")} 
                                   value={stats.total} 
                                   icon={<FileText size={20}/>} 
                                   colorClass="text-purple-600" 
                                   bgClass="bg-purple-50" 
                                />
                                <StatCard 
                                   title={t("totalValue")} 
                                   value={stats.totalValue.toLocaleString()} 
                                   icon={<Wallet size={20}/>} 
                                   colorClass="text-blue-600" 
                                   bgClass="bg-blue-50" 
                                />
                                <StatCard 
                                   title={t("expiredContracts")} 
                                   value={stats.expired} 
                                   icon={<AlertCircle size={20}/>} 
                                   colorClass="text-red-600" 
                                   bgClass="bg-red-50" 
                                />
                             </div>

                             {/* Status Chart */}
                             <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                                <CardHeader className="pb-2">
                                   <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                      <PieChartIcon size={16}/> {t("statusDistribution", "توزيع الحالات")}
                                   </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[180px]">
                                   <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                         <Pie
                                            data={stats.chartData}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                         >
                                            {stats.chartData.map((entry, index) => (
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
                                   <FileText size={18} className="text-gray-500"/> {t("contractsList")}
                                </CardTitle>
                             </CardHeader>
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                   <thead className="bg-gray-50/50 text-gray-500">
                                      <tr>
                                         <th className="p-4 font-medium">{t("contractNo")}</th>
                                         <th className="p-4 font-medium">{t("tenant")}</th>
                                         <th className="p-4 font-medium">{t("unit")}</th>
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
                                            <td className="p-4 text-gray-600">{c.tenant_name}</td>
                                            <td className="p-4 text-gray-600">
                                               {c.unit_no} <span className="text-xs text-gray-400">({c.unit_type})</span>
                                            </td>
                                            <td className="p-4 text-gray-600 font-mono text-xs">
                                               {c.tenancy_end ? c.tenancy_end.split("T")[0] : "-"}
                                            </td>
                                            <td className="p-4 font-bold text-gray-900">
                                               {Number(c.total_contract_value).toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                               <Badge variant="outline" className={`font-normal border ${
                                                  (c.status === 'Active' || c.contract_status === 'نشط') ? "bg-green-50 text-green-700 border-green-200" :
                                                  (c.status === 'Expired' || c.contract_status === 'منتهي') ? "bg-red-50 text-red-700 border-red-200" :
                                                  "bg-gray-100 text-gray-600 border-gray-200"
                                               }`}>
                                                  {c.status || c.contract_status}
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
                    <h2 className="text-xl font-bold text-gray-800 mb-2">ابدأ باختيار عقار</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       قم بتحديد أحد العقارات من القائمة الجانبية لعرض كافة العقود والبيانات المالية المرتبطة به.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}