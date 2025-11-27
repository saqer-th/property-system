import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Home, 
  FileText, 
  Loader2, 
  Wrench, 
  ShieldAlert, 
  ArrowRight, 
  Zap, 
  Droplets, 
  Ruler, 
  LayoutGrid,
  CheckCircle2,
  XCircle,
  History
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

// --- Sub-Component: Detail Card ---
const DetailCard = ({ icon, label, value, subtext, colorClass, bgClass }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
    <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <h3 className="text-lg font-bold text-gray-900">{value || "—"}</h3>
      {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
    </div>
  </div>
);

export default function UnitDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [unit, setUnit] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("contracts");

  // 📦 Fetch Data
  useEffect(() => {
    async function fetchUnit() {
      if (!user?.token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/units/${id}`, {
          headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user.token}` },
        });

        if (res.status === 401) throw new Error(t("noPermission"));
        const json = await res.json();
        if (!json.success) throw new Error(json.message);

        const data = json.data || json;
        setUnit(data);
        setContracts(data.contracts || []);
        setExpenses(data.expenses || []);
      } catch (err) {
        setError(t("failedToLoadUnit"));
        toast.error(t("failedToLoadUnit"));
      } finally {
        setLoading(false);
      }
    }
    fetchUnit();
  }, [id, user]);

  // 🎨 Helpers
  const getStatusBadge = (status) => {
    return status === "occupied" ? (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 gap-1 px-3 py-1">
        <CheckCircle2 size={14} /> {t("occupied")}
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 gap-1 px-3 py-1">
        <XCircle size={14} /> {t("vacant")}
      </Badge>
    );
  };

  if (loading) return (
    <DashboardLayout>
       <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-2">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p>{t("loadingData")}</p>
       </div>
    </DashboardLayout>
  );

  if (error || !unit) return (
    <DashboardLayout>
       <div className="flex flex-col items-center justify-center h-[70vh] text-red-500 gap-4">
          <ShieldAlert size={48} />
          <p className="text-lg font-medium">{error || t("noUnitFound")}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>{t("goBack")}</Button>
       </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* 🔙 Navigation & Header */}
        <div className="flex flex-col gap-4">
           <Button variant="ghost" className="w-fit text-gray-500 hover:text-gray-900 p-0 hover:bg-transparent" onClick={() => navigate(-1)}>
              <ArrowRight size={18} className={`mr-2 ${isRtl ? "rotate-180" : ""}`} /> {t("backToProperty")}
           </Button>
           
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                    <Home size={32} />
                 </div>
                 <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t("unit")} #{unit.unit_no}</h1>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-gray-500 text-sm">{unit.property_type || "Unknown Property"}</span>
                       <span className="text-gray-300">|</span>
                       {getStatusBadge(unit.status)}
                    </div>
                 </div>
              </div>
            
           </div>
        </div>

        {/* 📊 Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <DetailCard 
              label={t("unitType")} 
              value={unit.unit_type} 
              icon={<LayoutGrid size={20}/>} 
              colorClass="text-purple-600" 
              bgClass="bg-purple-50" 
           />
           <DetailCard 
              label={t("unitArea")} 
              value={`${unit.unit_area || 0} m²`} 
              icon={<Ruler size={20}/>} 
              colorClass="text-blue-600" 
              bgClass="bg-blue-50" 
           />
           <DetailCard 
              label={t("electricMeter")} 
              value={unit.electric_meter_no} 
              subtext="Electricity"
              icon={<Zap size={20}/>} 
              colorClass="text-yellow-600" 
              bgClass="bg-yellow-50" 
           />
           <DetailCard 
              label={t("waterMeter")} 
              value={unit.water_meter_no} 
              subtext="Water"
              icon={<Droplets size={20}/>} 
              colorClass="text-cyan-600" 
              bgClass="bg-cyan-50" 
           />
        </div>

        {/* 🧭 Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
           <TabsList className="bg-white border p-1 h-auto rounded-xl shadow-sm inline-flex w-full sm:w-auto">
              <TabsTrigger value="contracts" className="flex-1 sm:flex-none px-6 py-2 text-sm flex items-center gap-2">
                 <FileText size={16} /> {t("relatedContracts")} <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{contracts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1 sm:flex-none px-6 py-2 text-sm flex items-center gap-2">
                 <Wrench size={16} /> {t("unitExpenses")} <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{expenses.length}</Badge>
              </TabsTrigger>
           </TabsList>

           {/* 1️⃣ Contracts Tab */}
           <TabsContent value="contracts" className="animate-in fade-in slide-in-from-bottom-2">
              <Card className="border shadow-sm overflow-hidden">
                 <CardContent className="p-0">
                    {contracts.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                          <FileText size={48} className="mb-3 opacity-20" />
                          <p>{t("noContractsFound")}</p>
                       </div>
                    ) : (
                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-right">
                             <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                   <th className="px-6 py-4">{t("contractNo")}</th>
                                   <th className="px-6 py-4">{t("tenantName")}</th>
                                   <th className="px-6 py-4 text-center">{t("startDate")}</th>
                                   <th className="px-6 py-4 text-center">{t("endDate")}</th>
                                   <th className="px-6 py-4 text-center">{t("status")}</th>
                                   <th className="px-6 py-4 text-center">{t("actions")}</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                {contracts.map((c, i) => (
                                   <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="px-6 py-4 font-mono font-medium text-gray-800">{c.contract_no || "—"}</td>
                                      <td className="px-6 py-4 font-medium">{c.tenant_name || "—"}</td>
                                      <td className="px-6 py-4 text-center text-gray-500">{c.tenancy_start ? c.tenancy_start.split("T")[0] : "—"}</td>
                                      <td className="px-6 py-4 text-center text-gray-500">{c.tenancy_end ? c.tenancy_end.split("T")[0] : "—"}</td>
                                      <td className="px-6 py-4 text-center">
                                         <Badge variant="outline" className={`font-normal ${c.contract_status === 'active' || c.contract_status === 'نشط' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                                            {c.contract_status === 'active' || c.contract_status === 'نشط' ? t("active") : t("expired")}
                                         </Badge>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                         <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => navigate(`/contracts/${c.id}`)}>
                                            {t("viewDetails")}
                                         </Button>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    )}
                 </CardContent>
              </Card>
           </TabsContent>

           {/* 2️⃣ Expenses Tab */}
           <TabsContent value="expenses" className="animate-in fade-in slide-in-from-bottom-2">
              <Card className="border shadow-sm overflow-hidden">
                 <CardContent className="p-0">
                    {expenses.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                          <Wrench size={48} className="mb-3 opacity-20" />
                          <p>{t("noExpensesFound")}</p>
                       </div>
                    ) : (
                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-right">
                             <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                   <th className="px-6 py-4">{t("expenseType")}</th>
                                   <th className="px-6 py-4 text-center">{t("amount")}</th>
                                   <th className="px-6 py-4 text-center">{t("onWhom")}</th>
                                   <th className="px-6 py-4 text-center">{t("date")}</th>
                                   <th className="px-6 py-4 w-1/3">{t("notes")}</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                {expenses.map((e, i) => (
                                   <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="px-6 py-4 font-medium text-gray-900">{e.expense_type || "—"}</td>
                                      <td className="px-6 py-4 text-center font-bold text-red-600">{Number(e.amount).toLocaleString()} SAR</td>
                                      <td className="px-6 py-4 text-center">
                                         <Badge variant="secondary" className="font-normal bg-gray-100 text-gray-700">{e.on_whom || "—"}</Badge>
                                      </td>
                                      <td className="px-6 py-4 text-center text-gray-500">{e.date ? e.date.split("T")[0] : "—"}</td>
                                      <td className="px-6 py-4 text-gray-500 truncate max-w-xs" title={e.notes}>{e.notes || "—"}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    )}
                 </CardContent>
              </Card>
           </TabsContent>
        </Tabs>

      </div>
    </DashboardLayout>
  );
}