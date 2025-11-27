import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2,
  Home,
  FileText,
  PlusCircle,
  Loader2,
  ShieldAlert,
  MapPin,
  Zap,
  Droplets,
  LayoutGrid,
  ArrowRight,
  Edit3,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import AddUnitDrawer from "@/components/units/AddUnitDrawer";
import EditDrawer from "@/components/common/EditDrawer";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

// --- Sub-Components ---
const DetailCard = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all">
    <div className="p-2 bg-gray-50 rounded-lg text-emerald-600">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{value || "—"}</p>
    </div>
  </div>
);

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Drawers
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);

  const activeRole = user?.activeRole;
  const canEdit = activeRole === "office_admin"; 
  const canAdd = ["office_admin", "office", "admin"].includes(activeRole);

  // 1. Fetch Data
  async function fetchProperty() {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/properties/${id}`, {
        headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user.token}`, "x-active-role": activeRole },
      });

      if (res.status === 401) throw new Error(t("noPermission"));
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const data = json.data || json;
      setProperty(data);
      setUnits(data.units || []);
    } catch (err) {
      setError(err.message);
      toast.error(t("failedToLoadProperty"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProperty();
  }, [id]);

  if (loading) return (
    <DashboardLayout>
       <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-2">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p>{t("loadingData")}</p>
       </div>
    </DashboardLayout>
  );

  if (error || !property) return (
    <DashboardLayout>
       <div className="flex flex-col items-center justify-center h-[70vh] text-red-500 gap-2">
          <ShieldAlert size={40} />
          <p>{error || t("noPropertyFound")}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>{t("goBack")}</Button>
       </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      
      <div className="min-h-screen bg-gray-50/30 pb-10" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* 🖼️ Visual Header */}
        <div className="relative h-48 bg-gradient-to-r from-emerald-800 to-teal-600 overflow-hidden">
           <div className="absolute inset-0 bg-black/10"></div>
           <div className="absolute top-6 left-6">
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}>
                 <ArrowRight size={18} className={`mr-2 ${isRtl ? "rotate-180" : ""}`} /> {t("back")}
              </Button>
           </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
           
           {/* 🏢 Property Profile Card */}
           <Card className="border-none shadow-lg mb-6 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                 <div className="w-24 h-24 bg-white rounded-xl border-4 border-white shadow-md flex items-center justify-center text-emerald-600">
                    <Building2 size={40} />
                 </div>
                 
                 <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                       <h1 className="text-3xl font-bold text-gray-900">{property.property_name || t("unnamedProperty")}</h1>
                       <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">
                          {property.usage || t("residential")}
                       </Badge>
                    </div>
                    <p className="text-gray-500 flex items-center gap-1">
                       <MapPin size={14} /> {property.city} - {property.national_address}
                    </p>
                 </div>

                 <div className="flex gap-2 mt-4 md:mt-0">
                    {canEdit && (
                       <Button onClick={() => setEditDrawerOpen(true)} variant="outline" className="gap-2 border-gray-300 text-gray-700">
                          <Edit3 size={16} /> {t("edit")}
                       </Button>
                    )}
                    {canAdd && (
                       <Button onClick={() => setUnitDrawerOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                          <PlusCircle size={16} /> {t("addUnit")}
                       </Button>
                    )}
                 </div>
              </div>
           </Card>

           {/* 🧭 Tabs & Content */}
           <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white border p-1 h-auto rounded-xl shadow-sm inline-flex">
                 <TabsTrigger value="overview" className="px-6 py-2 text-sm">{t("overview")}</TabsTrigger>
                 <TabsTrigger value="units" className="px-6 py-2 text-sm flex items-center gap-2">
                    {t("units")} <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{units.length}</Badge>
                 </TabsTrigger>
              </TabsList>

              {/* 1️⃣ Overview Tab */}
              <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                 {/* Quick Stats Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailCard icon={<FileText size={20}/>} label={t("titleDeedNo")} value={property.title_deed_no} />
                    <DetailCard icon={<LayoutGrid size={20}/>} label={t("propertyType")} value={property.property_name} />
                    <DetailCard icon={<Home size={20}/>} label={t("numUnits")} value={property.num_units} />
                    <DetailCard icon={<MapPin size={20}/>} label={t("city")} value={property.city} />
                 </div>

                 {/* ✅ FIX: Map Placeholder Correctly Closed */}
                 <Card className="overflow-hidden border shadow-sm">
                    <CardHeader className="border-b bg-gray-50/50 pb-4">
                       <CardTitle className="text-base font-semibold text-gray-700">{t("location")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="h-64 bg-emerald-50/30 flex flex-col items-center justify-center text-emerald-600/40 relative overflow-hidden">
                           <div className="absolute inset-0 opacity-10 bg-[url(https://upload.wikimedia.org/wikipedia/commons/5/58/Riyadh%2C_Saudi_Arabia_locator_map.png)] bg-cover bg-center grayscale"></div> 
                           <MapPin size={48} className="drop-shadow-lg animate-bounce" />
                           <p className="font-medium mt-2 text-sm bg-white/80 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                              {property.national_address}
                           </p>
                        </div>
                    </CardContent>
                 </Card>
              </TabsContent>

              {/* 2️⃣ Units Tab */}
              <TabsContent value="units" className="animate-in fade-in slide-in-from-bottom-2">
                 <Card className="border shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b pb-4 flex flex-row justify-between items-center">
                       <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                          <Home className="text-emerald-600" size={20}/> {t("unitsList")}
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       {units.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                             <Home size={48} className="mb-2 opacity-20" />
                             <p>{t("noUnitsFound")}</p>
                          </div>
                       ) : (
                          <div className="overflow-x-auto">
                             <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                   <tr>
                                      <th className="px-6 py-4">{t("unitNo")}</th>
                                      <th className="px-6 py-4">{t("unitType")}</th>
                                      <th className="px-6 py-4">{t("unitArea")}</th>
                                      <th className="px-6 py-4">{t("services")}</th>
                                      <th className="px-6 py-4 text-center">{t("status")}</th>
                                      <th className="px-6 py-4 text-center">{t("actions")}</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                   {units.map((u, i) => (
                                      <tr key={i} className="group hover:bg-emerald-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/units/${u.unit_id}`)}>
                                         <td className="px-6 py-4 font-bold text-gray-900">{u.unit_no}</td>
                                         <td className="px-6 py-4">{u.unit_type}</td>
                                         <td className="px-6 py-4 text-gray-500 dir-ltr">{u.unit_area ? `${u.unit_area} m²` : "—"}</td>
                                         
                                         {/* Meters Info */}
                                         <td className="px-6 py-4">
                                            <div className="flex gap-3 text-xs text-gray-500">
                                               <span className="flex items-center gap-1" title={t("electricMeter")}>
                                                  <Zap size={12} className="text-yellow-500"/> {u.electric_meter_no || "-"}
                                               </span>
                                               <span className="flex items-center gap-1" title={t("waterMeter")}>
                                                  <Droplets size={12} className="text-blue-500"/> {u.water_meter_no || "-"}
                                               </span>
                                            </div>
                                         </td>

                                         {/* Status Badge */}
                                         <td className="px-6 py-4 text-center">
                                            {u.status === "occupied" ? (
                                               <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100 font-normal shadow-none">
                                                  <XCircle size={12} className="mr-1" /> {t("occupied")}
                                               </Badge>
                                            ) : (
                                               <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100 font-normal shadow-none">
                                                  <CheckCircle2 size={12} className="mr-1" /> {t("vacant")}
                                               </Badge>
                                            )}
                                         </td>

                                         <td className="px-6 py-4 text-center">
                                            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
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
           </Tabs>
        </div>

        {/* 🧱 Drawers */}
        {canEdit && (
          <EditDrawer
            open={editDrawerOpen}
            setOpen={(val) => { setEditDrawerOpen(val); if(!val) fetchProperty(); }}
            section="property"
            property={property}
            refresh={fetchProperty}
          />
        )}

        {canAdd && (
          <AddUnitDrawer
            open={unitDrawerOpen}
            setOpen={(val) => { setUnitDrawerOpen(val); if(!val) fetchProperty(); }}
            propertyId={property.id}
            refresh={fetchProperty}
          />
        )}

      </div>
    </DashboardLayout>
  );
}