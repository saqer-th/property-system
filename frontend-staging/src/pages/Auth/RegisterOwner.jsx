import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { 
  Loader2, 
  User, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  Key, 
  ShieldCheck, 
  TrendingUp 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterOwner() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!name.trim()) throw new Error("الرجاء إدخال الاسم");
      
      const res = await fetch(`${API_URL}/auth/register-owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "فشل تسجيل المالك");
      }

      // Show success UI instead of immediate redirect
      setIsSuccess(true);

    } catch (err) {
      console.error("❌ register-owner error:", err);
      toast.error(err.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  // Phone input change + validation
  const handlePhoneChange = (e) => {
    // أرقام فقط و حد أقصى 10
    const val = String(e.target.value || "").replace(/\D/g, "");
    if (val.length > 10) return;

    setPhone(val);

    // منطق التحقق
    if (val.length === 0) {
      setPhoneError("");
      setIsPhoneValid(false);
    } else if (!val.startsWith("05")) {
      setPhoneError("يجب أن يبدأ الرقم بـ 05");
      setIsPhoneValid(false);
    } else if (val.length < 10) {
      setPhoneError("الرقم غير مكتمل (10 أرقام)");
      setIsPhoneValid(false);
    } else {
      setPhoneError("");
      setIsPhoneValid(true);
    }
  };

  // 🟢 Success View
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <Card className="w-full max-w-md text-center p-8 shadow-lg border-emerald-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم إنشاء الحساب بنجاح!</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            أهلاً بك شريكاً معنا. يمكنك الآن تسجيل الدخول باستخدام رقم جوالك للبدء في إدارة عقاراتك.
          </p>
          <Button 
            onClick={() => navigate("/login")} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-medium"
          >
            تسجيل الدخول الآن
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-white" dir="rtl">
      
      {/* 🖼️ Left Side: Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2073&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6 text-emerald-400">
             <Key size={32} />
             <span className="text-xl font-bold tracking-wider">PRO SYSTEM</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            أدر عقاراتك بذكاء<br/> ومن مكان واحد
          </h1>
          <p className="text-slate-300 text-lg max-w-md">
            سجل الآن كمالك عقار واستفد من أدوات متقدمة لمتابعة التحصيل، العقود، والصيانة.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
           <div className="flex items-start gap-4">
              <div className="p-2 bg-white/10 rounded-lg"><TrendingUp size={20} className="text-emerald-400"/></div>
              <div>
                 <h3 className="font-bold text-white">متابعة مالية دقيقة</h3>
                 <p className="text-slate-400 text-sm">تتبع الإيجارات والمصروفات لحظة بلحظة.</p>
              </div>
           </div>
           <div className="flex items-start gap-4">
              <div className="p-2 bg-white/10 rounded-lg"><ShieldCheck size={20} className="text-emerald-400"/></div>
              <div>
                 <h3 className="font-bold text-white">عقود موثقة</h3>
                 <p className="text-slate-400 text-sm">أرشفة إلكترونية لجميع عقودك ومستنداتك.</p>
              </div>
           </div>
        </div>
      </div>

      {/* 📝 Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div>
            <Button 
               variant="ghost" 
               className="pl-0 text-gray-500 hover:text-gray-900 hover:bg-transparent mb-2" 
               onClick={() => navigate("/login")}
            >
               <ArrowRight size={16} className="ml-2"/> العودة
            </Button>
            <h2 className="text-3xl font-bold text-gray-900">تسجيل مالك جديد</h2>
            <p className="text-gray-500 mt-2">أنشئ حسابك في ثوانٍ وابدأ بإدارة أملاكك.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-1.5">
               <label className="text-sm font-medium text-gray-700">الاسم الكامل <span className="text-red-500">*</span></label>
               <div className="relative">
                  <User className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={18} />
                  <Input
                     type="text"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="مثال: محمد عبدالله"
                     className="pr-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                     required
                  />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-sm font-medium text-gray-700">رقم الجوال <span className="text-red-500">*</span></label>
               <div className="relative">
                  <Smartphone className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={18} />
                  <Input
                     type="tel"
                     placeholder="05XXXXXXXX"
                     value={!phone.startsWith('0') ? phone.substring(1) : phone}
                     onChange={handlePhoneChange}
                     className={`pl-24 pr-10 h-11 bg-gray-50 transition-all focus:bg-white
                         ${phoneError ? "border-red-500 focus:ring-red-200" : isPhoneValid ? "border-emerald-500 focus:ring-emerald-200" : "border-gray-200 focus:ring-emerald-500"}
                     `}
                     required
                  />
               </div>
               {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
               <p className="text-xs text-gray-400">سيتم استخدام هذا الرقم لتسجيل الدخول</p>
            </div>

            <Button 
               type="submit" 
               disabled={loading} 
               className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-medium shadow-lg shadow-emerald-100 transition-all mt-4"
            >
               {loading ? <Loader2 className="animate-spin" /> : "إنشاء الحساب"}
            </Button>

            <div className="text-center pt-2">
               <p className="text-sm text-gray-500">
                  لديك حساب بالفعل؟{" "}
                  <span 
                     className="text-emerald-600 font-semibold cursor-pointer hover:underline"
                     onClick={() => navigate("/login")}
                  >
                     سجّل الدخول
                  </span>
               </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}