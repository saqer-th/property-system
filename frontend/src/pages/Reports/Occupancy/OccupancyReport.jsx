import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { 
  PieChart as PieChartIcon, 
  Download, 
  FileSpreadsheet,
  Home,
  Users,
  DoorOpen,
  Building2,
  ArrowUpDown,
  Search
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { Input } from "@/components/ui/input";

// --- Constants ---
const COLORS = ['#e11d48', '#5c80caff']; // Rose-600 (Occupied), Gray-200 (Vacant)
const PROPERTY_COLORS = ['#e11d48', '#db2777', '#c026d3', '#7c3aed', '#4f46e5'];

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

export default function OccupancyReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'unit_no', direction: 'asc' });

  /* ==================== LOAD DATA ==================== */
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/reports/occupancy/summary`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        });
        const json = await res.json();
        // FIX: The API returns { success: true, data: { ... } }, so we must access json.data
        if (json.success && json.data) {
          setSummary(json.data);
        } else {
          // Fallback if structure is different
          setSummary(json.data || json); 
        }
      } catch (err) {
        console.error("Error loading summary:", err);
      }
      setLoading(false);
    }
    loadSummary();
  }, [user.token, user.activeRole]);

  /* ==================== ANALYTICS ==================== */
  
  // 1. Filter & Sort Units
  const processedUnits = useMemo(() => {
    if (!summary?.units) return [];
    
    let items = [...summary.units];

    // Filter
    if (filterQuery) {
      const lowerQ = filterQuery.toLowerCase();
      items = items.filter(u => 
        String(u.unit_no).toLowerCase().includes(lowerQ) || 
        (u.property_name && u.property_name.toLowerCase().includes(lowerQ)) ||
        (u.unit_type && u.unit_type.toLowerCase().includes(lowerQ))
      );
    }

    // Sort
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        
        // Handle numeric unit numbers if possible
        if (sortConfig.key === 'unit_no' && !isNaN(aVal) && !isNaN(bVal)) {
            aVal = Number(aVal);
            bVal = Number(bVal);
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [summary, filterQuery, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // 2. Chart: Overall Occupancy (Pie)
  const occupancyPieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: t("occupied"), value: summary.occupied_units },
      { name: t("vacant"), value: summary.empty_units },
    ];
  }, [summary, t]);

  // 3. Chart: Property Breakdown (Bar)
  const propertyStats = useMemo(() => {
    if (!summary?.units) return [];
    const props = {};
    
    summary.units.forEach(u => {
      // Use a fallback for property name if missing
      const pName = u.property_name || "Unknown Property";
      
      if (!props[pName]) {
        props[pName] = { name: pName, total: 0, occupied: 0 };
      }
      props[pName].total += 1;
      if (u.occupied > 0) props[pName].occupied += 1;
    });

    return Object.values(props).map(p => ({
      ...p,
      rate: p.total > 0 ? Math.round((p.occupied / p.total) * 100) : 0
    })).sort((a,b) => b.rate - a.rate);
  }, [summary]);

  /* ==================== ACTIONS ==================== */
  const generatePDF = () => {
    const lang = i18n.language;
    const url = `${API_URL}/reports?type=occupancy&auth=${user.token}&lang=${lang}`;
    window.open(url, "_blank");
  };

  const exportCSV = () => {
    if (!processedUnits.length) return;
    const headers = ["Unit No,Type,Property,Status\n"];
    const rows = processedUnits.map(u => 
      `${u.unit_no},${u.unit_type},"${u.property_name}",${u.occupied > 0 ? 'Occupied' : 'Vacant'}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `occupancy-report.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                 <PieChartIcon className="text-rose-600" /> {t("occupancySummary")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t("occupancySub", "تحليل معدلات الإشغال والشواغر للوحدات العقارية")}
              </p>
           </div>
           
           <div className="flex gap-2 w-full md:w-auto">
             <Button onClick={exportCSV} variant="outline" className="flex-1 md:w-auto text-green-600 border-green-200 hover:bg-green-50">
                <FileSpreadsheet size={16} className="mr-2"/> CSV
             </Button>
             <Button onClick={generatePDF} className="flex-1 md:w-auto bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100">
                <Download size={16} className="mr-2"/> PDF
             </Button>
           </div>
        </div>

        {/* --- Content --- */}
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
                    title={t("totalUnits")} 
                    value={summary.total_units} 
                    icon={<Building2 size={20}/>} 
                    colorClass="text-gray-600" 
                    bgClass="bg-gray-100" 
                 />
                 <StatCard 
                    title={t("occupiedUnits")} 
                    value={summary.occupied_units} 
                    icon={<Users size={20}/>} 
                    colorClass="text-rose-600" 
                    bgClass="bg-rose-50" 
                 />
                 <StatCard 
                    title={t("emptyUnits")} 
                    value={summary.empty_units} 
                    icon={<DoorOpen size={20}/>} 
                    colorClass="text-amber-600" 
                    bgClass="bg-amber-50" 
                 />
                 <StatCard 
                    title={t("occupancyRate")} 
                    value={`${Number(summary.occupancy_rate).toFixed(1)}%`} 
                    subtext="معدل الإشغال الكلي"
                    icon={<PieChartIcon size={20}/>} 
                    colorClass="text-blue-600" 
                    bgClass="bg-blue-50" 
                 />
              </div>

              {/* 2. Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Overall Pie */}
                 <Card className="border-0 shadow-sm ring-1 ring-gray-100">
                    <CardHeader>
                       <CardTitle className="text-base flex items-center gap-2">
                          <PieChartIcon size={18} className="text-gray-500"/> {t("overallStatus", "الحالة العامة")}
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie
                                data={occupancyPieData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                             >
                                <Cell fill={COLORS[0]} /> {/* Occupied */}
                                <Cell fill={COLORS[1]} /> {/* Vacant */}
                             </Pie>
                             <Tooltip contentStyle={{borderRadius: '8px'}} />
                             <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                             <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 text-lg font-bold">
                                {Number(summary.occupancy_rate).toFixed(1)}%
                             </text>
                          </PieChart>
                       </ResponsiveContainer>
                    </CardContent>
                 </Card>

                 {/* Property Bar Chart */}
                 <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-gray-100">
                    <CardHeader>
                       <CardTitle className="text-base flex items-center gap-2">
                          <Home size={18} className="text-gray-500"/> {t("occupancyByProperty", "الإشغال حسب العقار")}
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={propertyStats} layout="vertical" margin={{left: 20, right: 20}}>
                             <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
                             <XAxis type="number" hide />
                             <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={100} 
                                tick={{fontSize: 11, fill: '#64748b'}} 
                                axisLine={false} 
                                tickLine={false} 
                             />
                             <Tooltip 
                                cursor={{fill: '#f9fafb'}}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(val) => [`${val}%`, 'Occupancy Rate']}
                             />
                             <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={20} background={{ fill: '#f8fafc' }}>
                                {propertyStats.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={PROPERTY_COLORS[index % PROPERTY_COLORS.length]} />
                                ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </CardContent>
                 </Card>
              </div>

              {/* 3. Detailed Table */}
              <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                 <CardHeader className="bg-white border-b border-gray-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                       <CardTitle className="text-base flex items-center gap-2">
                          <Home size={18} className="text-gray-500"/> {t("unitsList")}
                       </CardTitle>
                       <Badge variant="outline" className="bg-gray-50">{processedUnits.length}</Badge>
                    </div>
                    
                    <div className="relative w-full sm:w-64">
                       <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                       <Input 
                          placeholder={t("searchUnits", "بحث عن وحدة أو عقار...")} 
                          className="pr-9 h-9 text-sm bg-gray-50"
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                       />
                    </div>
                 </CardHeader>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                       <thead className="bg-gray-50/50 text-gray-500">
                          <tr>
                             <th className="p-4 font-medium cursor-pointer hover:text-rose-600" onClick={() => requestSort('unit_no')}>
                                <div className="flex items-center gap-1">رقم الوحدة <ArrowUpDown size={12}/></div>
                             </th>
                             <th className="p-4 font-medium cursor-pointer hover:text-rose-600" onClick={() => requestSort('unit_type')}>
                                <div className="flex items-center gap-1">النوع <ArrowUpDown size={12}/></div>
                             </th>
                             <th className="p-4 font-medium cursor-pointer hover:text-rose-600" onClick={() => requestSort('property_name')}>
                                <div className="flex items-center gap-1">العقار <ArrowUpDown size={12}/></div>
                             </th>
                             <th className="p-4 font-medium cursor-pointer hover:text-rose-600" onClick={() => requestSort('occupied')}>
                                <div className="flex items-center gap-1">الحالة <ArrowUpDown size={12}/></div>
                             </th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {processedUnits.map((u, i) => (
                             <tr key={i} className="hover:bg-rose-50/30 transition-colors group">
                                <td className="p-4 font-bold text-gray-900">{u.unit_no}</td>
                                <td className="p-4 text-gray-600">{u.unit_type}</td>
                                <td className="p-4 text-gray-600 flex items-center gap-2">
                                   <Building2 size={14} className="text-gray-400"/> {u.property_name}
                                </td>
                                <td className="p-4">
                                   <Badge variant="outline" className={`font-normal border ${
                                      u.occupied > 0 
                                         ? "bg-rose-50 text-rose-700 border-rose-200" 
                                         : "bg-blue-50 text-blue-700 border-blue-200"
                                   }`}>
                                      {u.occupied > 0 ? t("occupied") : t("vacant")}
                                   </Badge>
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

           </div>
        ) : (
           <div className="p-10 text-center text-red-500">Failed to load data.</div>
        )}

      </div>
    </DashboardLayout>
  );
}