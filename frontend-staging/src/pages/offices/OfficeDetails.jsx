import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, Users, Home, Loader2, ShieldAlert, 
  FileText, Phone, Mail, Calendar, User, CheckCircle2, 
  Ban, MapPin, Edit, Briefcase, Globe
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import OfficeEmployees from "./OfficeEmployees";
import toast, { Toaster } from "react-hot-toast";

export default function OfficeDetails() {
  const { user } = useAuth();
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  async function fetchOffice() {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/offices/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "فشل تحميل بيانات المكتب");
      setOffice(data.data);
    } catch (err) {
      console.error("❌ Error fetching office:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffice();
  }, []);

  // 🌀 Loading State
  if (loading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-sm font-medium">جاري تحميل ملف المكتب...</p>
      </div>
    </DashboardLayout>
  );

  // ⚠️ Error State
  if (error) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[70vh] text-red-600 gap-4">
        <div className="bg-red-50 p-4 rounded-full">
          <ShieldAlert size={40} />
        </div>
        <p className="font-semibold">{error}</p>
        <Button variant="outline" onClick={fetchOffice}>إعادة المحاولة</Button>
      </div>
    </DashboardLayout>
  );

  // 🚫 No Office State
  if (!office) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500 gap-4">
        <Building2 size={48} className="text-gray-300" />
        <p className="text-lg font-medium">لا يوجد مكتب مرتبط بهذا الحساب</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        
         {/* 🏢 Header Section */}
         <Card className="border-none shadow-sm bg-white overflow-hidden">

         {/* Cover Background */}
         <div className="h-32 bg-gradient-to-r from-emerald-700 to-emerald-100 relative">

            {/* Status Badge */}
            <div className="absolute top-4 left-4">
               <Badge
               className={
                  office.status === "approved"
                     ? "bg-emerald-400/20 text-white backdrop-blur-sm border-0"
                     : "bg-red-500/20 text-white"
               }
               >
               {office.status === "approved" ? (
                  <>
                     <CheckCircle2 size={14} className="mr-1" /> نشط
                  </>
               ) : (
                  <>
                     <Ban size={14} className="mr-1" /> موقوف
                  </>
               )}
               </Badge>
            </div>

            {/* Office Name Overlay */}
            <h1 className="
               absolute bottom-3 left-6 
               text-3xl font-bold text-white 
               drop-shadow-lg
            ">
               {office.name || "مكتب عقاري"}
            </h1>
         </div>

         {/* Content */}
         <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-4">

               {/* Logo */}
               <Avatar className="w-24 h-24 border-4 border-white shadow-md bg-white">
               <AvatarImage src={office.logo_url} />
               <AvatarFallback className="bg-emerald-50 text-emerald-700 text-2xl font-bold">
                  {office.name ? office.name.charAt(0) : "M"}
               </AvatarFallback>
               </Avatar>

               {/* Office Info */}
               <div className="flex-1 pt-2 md:pt-0">
               <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                     <User size={14} /> المالك: {office.owner_name}
                  </span>

                  <span className="hidden md:inline text-gray-300">|</span>

                  <span className="flex items-center gap-1">
                     <Calendar size={14} /> تأسس في:{" "}
                     {office.created_at
                     ? new Date(office.created_at).toLocaleDateString("en-GB")
                     : "—"}
                  </span>
               </div>
               </div>

               {/* Actions */}
               <div className="flex gap-2 mt-4 md:mt-0">
               <Button variant="outline" className="border-gray-300 text-gray-700">
                  <Edit size={16} className="ml-2" /> تعديل البيانات
               </Button>
               </div>
            </div>
         </div>
         </Card>


         <Tabs value={tab} onValueChange={setTab} className="space-y-6">
           <TabsList className="w-full md:w-auto bg-white border border-gray-200 p-1 h-auto rounded-xl flex justify-start overflow-x-auto">
             <TabItem value="overview" icon={<Building2 size={16} />} label="نظرة عامة" active={tab === "overview"} />
             {user?.activeRole === "office_admin" && (
               <TabItem value="employees" icon={<Users size={16} />} label="الموظفين" active={tab === "employees"} />
             )}
           </TabsList>

           {/* 1️⃣ Overview Tab */}
          <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid md:grid-cols-3 gap-6">
               
               {/* Contact Info */}
               <Card className="md:col-span-1 h-fit">
                  <CardHeader>
                     <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Phone size={18} className="text-emerald-600"/> معلومات التواصل
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <InfoRow icon={<Phone size={16}/>} label="الهاتف" value={office.phone} dir="ltr" />
                     <Separator />
                     <InfoRow icon={<Mail size={16}/>} label="البريد" value={office.email} />
                     <Separator />
                     <InfoRow icon={<MapPin size={16}/>} label="العنوان" value={office.address || "الرياض - المملكة العربية السعودية"} />
                     <Separator />
                     <InfoRow icon={<Globe size={16}/>} label="الموقع" value="—" />
                  </CardContent>
               </Card>

               {/* Legal Details & Description */}
               <div className="md:col-span-2 space-y-6">
                  {/* Legal Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <StatCard 
                        icon={<FileText size={24} className="text-blue-600"/>}
                        label="السجل التجاري"
                        value={office.commercial_reg || "—"}
                        bgColor="bg-blue-50"
                     />
                     <StatCard 
                        icon={<Briefcase size={24} className="text-purple-600"/>}
                        label="رقم الترخيص"
                        value={office.license_no || "—"}
                        bgColor="bg-purple-50"
                     />
                  </div>

                  {/* Description */}
                  <Card>
                     <CardHeader>
                        <CardTitle className="text-base font-semibold">نبذة عن المكتب</CardTitle>
                     </CardHeader>
                     <CardContent>
                        <p className="text-gray-600 leading-relaxed text-sm">
                           {office.description || "لا يوجد وصف متاح للمكتب حالياً."}
                        </p>
                     </CardContent>
                  </Card>
               </div>
            </div>
          </TabsContent>

          {/* 2️⃣ Employees Tab */}
          <TabsContent value="employees" className="animate-in fade-in slide-in-from-bottom-2">
            <OfficeEmployees officeId={office.id} />
          </TabsContent>


        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* --- Helper Components --- */

function TabItem({ value, icon, label, active }) {
   return (
      <TabsTrigger 
         value={value}
         className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            active 
            ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100" 
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
         }`}
      >
         {icon} {label}
      </TabsTrigger>
   )
}

function InfoRow({ icon, label, value, dir }) {
   return (
      <div className="flex items-center justify-between text-sm">
         <div className="flex items-center gap-2 text-gray-500">
            {icon} <span>{label}</span>
         </div>
         <span className="font-medium text-gray-900" dir={dir || "auto"}>{value || "—"}</span>
      </div>
   )
}

function StatCard({ icon, label, value, bgColor }) {
   return (
      <Card className="border-none shadow-sm bg-white">
         <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgColor}`}>
               {icon}
            </div>
            <div>
               <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
               <p className="text-lg font-bold text-gray-900 font-mono mt-0.5">{value}</p>
            </div>
         </CardContent>
      </Card>
   )
}