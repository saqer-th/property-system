import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { API_URL, API_KEY } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, Save, User, Mail, Phone, Lock, 
  ShieldCheck, Camera, AlertTriangle 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function Settings() {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "", // assuming backend sends role
  });

  // Password State (UI Only for now)
  const [passForm, setPassForm] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  // 🧠 Fetch User Data
  useEffect(() => {
    if (!user?.token) return;
    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: {
            "x-api-key": API_KEY,
            Authorization: `Bearer ${user.token}`,
          },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);
        
        setForm({
          name: json.data.name || "",
          phone: json.data.phone || "",
          email: json.data.email || "",
          role: json.data.activeRole || "User",
        });
      } catch (err) {
        console.error(err);
        toast.error("فشل تحميل بيانات المستخدم");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [user]);

  // 💾 Save Profile
  async function handleSaveProfile() {
    if (!user?.token) return toast.error("الرجاء تسجيل الدخول");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
           name: form.name,
           email: form.email
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "فشل الحفظ");

      toast.success("✅ تم تحديث الملف الشخصي");
      // Update Context
      login({ ...user, name: form.name, email: form.email });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // 🔒 Save Password (Mock)
  const handleSavePassword = () => {
     if(passForm.new !== passForm.confirm) return toast.error("كلمات المرور غير متطابقة");
     toast.success("تم تغيير كلمة المرور (تجريبي)");
     setPassForm({ current: "", new: "", confirm: "" });
  }

  if (loading) return (
    <DashboardLayout>
       <div className="flex h-[70vh] items-center justify-center flex-col gap-2 text-gray-500">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p>جاري تحميل إعدادات الحساب...</p>
       </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
           <h1 className="text-3xl font-bold text-gray-900">إعدادات الحساب</h1>
           <p className="text-gray-500 mt-1">إدارة ملفك الشخصي وتفضيلات الأمان.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-gray-100 p-1 rounded-lg">
             <TabsTrigger value="general" className="px-6">الملف الشخصي</TabsTrigger>
          </TabsList>

          {/* 👤 General Profile Tab */}
          <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
             
             {/* Avatar Card */}
             <Card>
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
                   <div className="relative">
                      <Avatar className="w-24 h-24 border-4 border-emerald-50">
                         <AvatarImage src="" />
                         <AvatarFallback className="bg-emerald-600 text-white text-3xl font-bold">
                            {form.name ? form.name.charAt(0).toUpperCase() : "U"}
                         </AvatarFallback>
                      </Avatar>
                      <button className="absolute bottom-0 right-0 bg-white border p-1.5 rounded-full shadow-sm hover:bg-gray-50 text-gray-600">
                         <Camera size={16} />
                      </button>
                   </div>
                   <div className="text-center sm:text-right space-y-1">
                      <h2 className="text-xl font-bold text-gray-900">{form.name}</h2>
                      <p className="text-sm text-gray-500">{form.email}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                         {form.role}
                      </span>
                   </div>
                </CardContent>
             </Card>

             {/* Form Card */}
             <Card>
                <CardHeader>
                   <CardTitle>بياناتك الشخصية</CardTitle>
                   <CardDescription>قم بتحديث معلومات الاتصال الخاصة بك.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label>الاسم الكامل</Label>
                         <div className="relative">
                            <User className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                               className="pr-9" 
                               value={form.name} 
                               onChange={(e) => setForm({...form, name: e.target.value})} 
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <Label>البريد الإلكتروني</Label>
                         <div className="relative">
                            <Mail className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                               className="pr-9" 
                               value={form.email} 
                               onChange={(e) => setForm({...form, email: e.target.value})} 
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <Label>رقم الجوال <span className="text-xs text-red-500">(غير قابل للتعديل)</span></Label>
                         <div className="relative">
                            <Phone className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                               className="pr-9 bg-gray-50 text-gray-500 cursor-not-allowed" 
                               value={form.phone} 
                               readOnly 
                            />
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                         </div>
                      </div>
                   </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-end">
                   <Button onClick={handleSaveProfile} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                      {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                      حفظ التغييرات
                   </Button>
                </CardFooter>
             </Card>
          </TabsContent>


        </Tabs>
      </div>
    </DashboardLayout>
  );
}