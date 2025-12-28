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
  Building2,
  Search,
  Loader2,
  MapPin,
  Download,
  Home,
  Ruler,
  Zap,
  Droplets,
  ArrowUpDown,
  PieChart as PieChartIcon,
  Layers
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
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

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

export default function PropertyUnitsReport() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { user } = useAuth();

  // State
  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'unit_no', direction: 'asc' });

  /* ============================
      Load Properties
  ============================ */
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
        console.error("Error:", err);
      }
      setLoadingList(false);
    }
    load();
  }, [user.token, user.activeRole]);

  /* ============================
      Load Property Details
  ============================ */
  const loadPropertyDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/properties/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      setPropertyDetails(json.data);
    } catch (err) {
      console.error("Error loading details:", err);
    }
    setLoadingDetails(false);
  };

  const handleSelect = (p) => {
    if (selected?.id === p.id) return;
    setSelected(p);
    loadPropertyDetails(p.id);
  };

  /* ============================
      Data Processing
  ============================ */
  
  // 1. Filter Properties (Sidebar)
  const filteredProperties = useMemo(() => {
    if (!query) return properties;
    const lowerQ = query.toLowerCase();
    return properties.filter((p) =>
      `${p.property_name} ${p.city} ${p.title_deed_no}`.toLowerCase().includes(lowerQ)
    );
  }, [properties, query]);

  // 2. Filter & Sort Units (Main Content)
  const processedUnits = useMemo(() => {
    if (!propertyDetails?.units) return [];
    
    let items = [...propertyDetails.units];

    // Filter
    if (unitQuery) {
      const lowerQ = unitQuery.toLowerCase();
      items = items.filter(u => 
        String(u.unit_no).toLowerCase().includes(lowerQ) ||
        u.unit_type.toLowerCase().includes(lowerQ)
      );
    }

    // Sort
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        
        // Numeric sort for unit numbers
        if (sortConfig.key === 'unit_no' && !isNaN(aVal) && !isNaN(bVal)) {
           aVal = Number(aVal);
           bVal = Number(bVal);
        }
        
        // Numeric sort for area
        if (sortConfig.key === 'unit_area') {
           aVal = Number(aVal) || 0;
           bVal = Number(bVal) || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [propertyDetails, unitQuery, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // 3. Analytics
  const analytics = useMemo(() => {
    if (!propertyDetails?.units) return null;
    
    const totalUnits = propertyDetails.units.length;
    const totalArea = propertyDetails.units.reduce((sum, u) => sum + (Number(u.unit_area) || 0), 0);
    
    // Type Distribution
    const typeCounts = {};
    propertyDetails.units.forEach(u => {
        const t = u.unit_type || "Other";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const typeData = Object.keys(typeCounts).map(key => ({ name: key, value: typeCounts[key] }));
    
    // Most common type
    const mostCommonType = Object.keys(typeCounts).sort((a,b) => typeCounts[b] - typeCounts[a])[0];

    return { totalUnits, totalArea, typeData, mostCommonType };
  }, [propertyDetails]);

  /* ============================
      Generate PDF
  ============================ */
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
                 <Building2 className="text-blue-600" /> {t("unitsByProperty")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("unitsReportSub", "سجل الوحدات، المساحات، والبيانات التفصيلية لكل عقار")}
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
                                ? "bg-blue-50 border-blue-200 shadow-sm" 
                                : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                             }
                          `}
                       >
                          {selected?.id === p.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />}
                          <div className="flex justify-between items-start mb-1">
                             <p className={`font-semibold text-sm truncate max-w-[80%] ${selected?.id === p.id ? "text-blue-800" : "text-gray-700"}`}>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-[400px] rounded-xl" />
                 </div>
              ) : selected && propertyDetails && analytics ? (
                 <>
                    {/* Header Card */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                       <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                             <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <Building2 size={20} className="text-blue-600"/>
                                {selected.property_name}
                             </h2>
                             <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200">{selected.property_type}</span>
                                <span className="flex items-center gap-1"><MapPin size={12}/> {selected.city}</span>
                             </div>
                          </div>
                          <Button onClick={generateReport} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100">
                             <Download size={16} className="ml-2"/> {t("generatePDF")}
                          </Button>
                       </CardContent>
                    </Card>

                    {/* Stats & Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       
                       {/* Stats Grid */}
                       <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <StatCard 
                             title={t("unitsCount")} 
                             value={analytics.totalUnits} 
                             icon={<Home size={20}/>} 
                             colorClass="text-blue-600" 
                             bgClass="bg-blue-50"
                          />
                          <StatCard 
                             title={t("totalArea")} 
                             value={analytics.totalArea > 0 ? analytics.totalArea.toLocaleString() : "-"} 
                             subtext="متر مربع (إجمالي)"
                             icon={<Ruler size={20}/>} 
                             colorClass="text-emerald-600" 
                             bgClass="bg-emerald-50"
                          />
                          <StatCard 
                             title={t("dominantType")} 
                             value={analytics.mostCommonType || "-"} 
                             subtext="النوع الأكثر شيوعاً"
                             icon={<Layers size={20}/>} 
                             colorClass="text-purple-600" 
                             bgClass="bg-purple-50"
                          />
                          <StatCard 
                             title={t("services")} 
                             value={t("available")} 
                             subtext="كهرباء / مياه"
                             icon={<Zap size={20}/>} 
                             colorClass="text-amber-600" 
                             bgClass="bg-amber-50"
                          />
                       </div>

                       {/* Types Chart */}
                       <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <PieChartIcon size={16}/> {t("typeDistribution", "توزيع الأنواع")}
                             </CardTitle>
                          </CardHeader>
                          <CardContent className="h-[180px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                   <Pie
                                      data={analytics.typeData}
                                      innerRadius={50}
                                      outerRadius={70}
                                      paddingAngle={5}
                                      dataKey="value"
                                   >
                                      {analytics.typeData.map((entry, index) => (
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

                    {/* Units Table */}
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                       <CardHeader className="bg-white border-b border-gray-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <CardTitle className="text-base flex items-center gap-2">
                             <Home size={18} className="text-gray-500"/> {t("unitsList")}
                          </CardTitle>
                          <div className="relative w-full sm:w-64">
                             <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                             <Input 
                                placeholder={t("searchUnits", "بحث برقم الوحدة أو النوع...")} 
                                className="pr-9 h-9 text-sm bg-gray-50"
                                value={unitQuery}
                                onChange={(e) => setUnitQuery(e.target.value)}
                             />
                          </div>
                       </CardHeader>
                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-right">
                             <thead className="bg-gray-50/50 text-gray-500">
                                <tr>
                                   <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('unit_no')}>
                                      <div className="flex items-center gap-1">رقم الوحدة <ArrowUpDown size={12}/></div>
                                   </th>
                                   <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('unit_type')}>
                                      <div className="flex items-center gap-1">النوع <ArrowUpDown size={12}/></div>
                                   </th>
                                   <th className="p-4 font-medium cursor-pointer hover:text-blue-600" onClick={() => requestSort('unit_area')}>
                                      <div className="flex items-center gap-1">المساحة <ArrowUpDown size={12}/></div>
                                   </th>
                                   <th className="p-4 font-medium">{t("electricMeter")}</th>
                                   <th className="p-4 font-medium">{t("waterMeter")}</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50">
                                {processedUnits.map((u) => (
                                   <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                                      <td className="p-4 font-bold text-gray-900">{u.unit_no}</td>
                                      <td className="p-4">
                                         <Badge variant="outline" className="font-normal bg-gray-50 text-gray-700 border-gray-200">
                                            {u.unit_type}
                                         </Badge>
                                      </td>
                                      <td className="p-4 text-gray-600 font-mono" dir="ltr">
                                         {u.unit_area ? `${u.unit_area} m²` : "-"}
                                      </td>
                                      <td className="p-4 text-gray-500 text-xs">
                                         {u.electric_meter_no ? (
                                            <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                                               <Zap size={10}/> {u.electric_meter_no}
                                            </div>
                                         ) : "-"}
                                      </td>
                                      <td className="p-4 text-gray-500 text-xs">
                                         {u.water_meter_no ? (
                                            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                                               <Droplets size={10}/> {u.water_meter_no}
                                            </div>
                                         ) : "-"}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                          {processedUnits.length === 0 && (
                             <div className="p-8 text-center text-gray-400">لا توجد وحدات تطابق البحث</div>
                          )}
                       </div>
                    </Card>
                 </>
              ) : (
                 // Empty State
                 <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                       <Building2 size={48} className="text-blue-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">ابدأ باختيار عقار</h2>
                    <p className="text-gray-500 max-w-md text-center leading-relaxed">
                       قم بتحديد عقار من القائمة الجانبية لعرض جرد الوحدات والمساحات وعدادات الخدمات.
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}