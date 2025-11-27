import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { 
  Building2, 
  Loader2, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  CheckCircle2,
  ArrowRight,
  Smartphone,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function RegisterOffice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Phone Validation State
  const [phoneError, setPhoneError] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    email: "",
    commercial_reg: "",
    license_number: "",
    address: "",
  });

  // Handle Standard Input Change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🟢 Handle Phone Change with Real-time Validation
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // أرقام فقط
    if (val.length > 10) return; // حد أقصى 10

    setForm({ ...form, phone: val });

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

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, owner_name, phone, email, commercial_reg, license_number, address } = form;

    // Basic Validation
    if (!name || !owner_name) {
      return toast.error("يرجى تعبئة اسم المكتب واسم المالك");
    }

    if (!isPhoneValid) {
      return toast.error("يرجى إدخال رقم جوال صحيح");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/offices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({
          name,
          owner_name,
          phone,
          email,
          commercial_reg,
          license_no: license_number,
          address,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setIsSuccess(true);
      
    } catch (err) {
      console.error("❌ Register error:", err);
      toast.error(err.message || "حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح!</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            شكراً لتسجيل مكتبك معنا. سيقوم فريق الإدارة بمراجعة بياناتك والتحقق من التراخيص خلال 24 ساعة. سيصلك إشعار عند التفعيل.
          </p>
          <Button 
            onClick={() => navigate("/login")} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            العودة لصفحة الدخول
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-white" dir="rtl">
      
      {/* 🖼️ Left Side: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6 text-emerald-400">
             <Building2 size={32} />
             <span className="text-xl font-bold tracking-wider">PRO SYSTEM</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            انضم لأكبر شبكة مكاتب عقارية موثوقة
          </h1>
          <p className="text-slate-300 text-lg max-w-md">
            سجل مكتبك الآن وابدأ في إدارة عقاراتك وعملائك بذكاء وكفاءة عالية.
          </p>
        </div>
        
        <div className="relative z-10">
           <div className="flex gap-2 text-sm text-slate-400">
              <span>© 2026 Pro System</span>
              <span>•</span>
              <span>شروط الخدمة</span>
           </div>
        </div>
      </div>

      {/* 📝 Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-xl space-y-8">
          
          {/* Header */}
          <div>
            <Button 
               variant="ghost" 
               className="pl-0 text-gray-500 hover:text-gray-900 hover:bg-transparent mb-2" 
               onClick={() => navigate("/login")}
            >
               <ArrowRight size={16} className="ml-2"/> العودة
            </Button>
            <h2 className="text-3xl font-bold text-gray-900">تسجيل مكتب جديد</h2>
            <p className="text-gray-500 mt-2">املأ البيانات أدناه لإنشاء ملف مكتبك.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 👤 Owner Section */}
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <User size={16} className="text-emerald-600"/> معلومات المالك
               </h3>
               <div className="grid md:grid-cols-2 gap-4">
                  <InputGroup icon={<User/>} name="owner_name" label="اسم المالك" value={form.owner_name} onChange={handleChange} placeholder="الاسم الثلاثي" required />
                  
                  {/* 📱 Custom Phone Input */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex gap-1">
                        رقم الجوال <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center" dir="ltr">
                        <div className="absolute left-3 flex items-center gap-2 pointer-events-none">
                            <span className="text-gray-400 text-sm font-semibold border-r border-gray-300 pr-2">+966</span>
                            <Smartphone size={18} className="text-gray-400" />
                        </div>
                        <Input
                            type="tel"
                            placeholder="05XXXXXXXX"
                            value={!form.phone.startsWith('0') ? form.phone.substring(1) : form.phone}
                            onChange={handlePhoneChange}
                            className={`pl-24 pr-10 h-11 bg-gray-50 transition-all focus:bg-white
                                ${phoneError ? "border-red-500 focus:ring-red-200" : isPhoneValid ? "border-emerald-500 focus:ring-emerald-200" : "border-gray-200 focus:ring-emerald-500"}
                            `}
                            required
                        />
                        <div className="absolute right-3 pointer-events-none">
                            {isPhoneValid && <CheckCircle2 className="text-emerald-500 animate-in zoom-in" size={18} />}
                            {phoneError && <XCircle className="text-red-500 animate-in zoom-in" size={18} />}
                        </div>
                    </div>
                    {phoneError && (
                        <p className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1 text-right" dir="rtl">
                            <AlertCircle size={12} /> {phoneError}
                        </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                     <InputGroup icon={<Mail/>} name="email" label="البريد الإلكتروني" value={form.email} onChange={handleChange} placeholder="name@example.com" type="email" />
                  </div>
               </div>
            </div>

            {/* 🏢 Office Section */}
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <Building2 size={16} className="text-emerald-600"/> بيانات المكتب
               </h3>
               <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                     <InputGroup icon={<Building2/>} name="name" label="اسم المكتب التجاري" value={form.name} onChange={handleChange} placeholder="مؤسسة ... العقارية" required />
                  </div>
                  <InputGroup icon={<FileText/>} name="commercial_reg" label="رقم السجل التجاري" value={form.commercial_reg} onChange={handleChange} placeholder="70xxxxxxxx" />
                  <InputGroup icon={<Briefcase/>} name="license_number" label="رقم رخصة فال" value={form.license_number} onChange={handleChange} placeholder="12xxxxxxxx" />
                  <div className="md:col-span-2">
                     <InputGroup icon={<MapPin/>} name="address" label="العنوان الوطني / المدينة" value={form.address} onChange={handleChange} placeholder="الرياض - حي الملقا" />
                  </div>
               </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
               <Button 
                  type="submit" 
                  disabled={loading || (form.phone.length > 0 && !isPhoneValid)} 
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-medium shadow-lg shadow-emerald-100 transition-all"
               >
                  {loading ? <Loader2 className="animate-spin" /> : "إرسال طلب التسجيل"}
               </Button>
               <p className="text-center text-xs text-gray-400 mt-4">
                  بإرسال الطلب أنت توافق على شروط الاستخدام وسياسة الخصوصية
               </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// --- Reusable Input Component ---
function InputGroup({ label, name, value, onChange, placeholder, type = "text", required, icon }) {
   return (
      <div className="space-y-1.5">
         <label className="text-sm font-medium text-gray-700 flex gap-1">
            {label} {required && <span className="text-red-500">*</span>}
         </label>
         <div className="relative">
            <div className="absolute right-3 top-2.5 text-gray-400 pointer-events-none">
               {React.cloneElement(icon, { size: 18 })}
            </div>
            <Input
               type={type}
               name={name}
               value={value}
               onChange={onChange}
               placeholder={placeholder}
               required={required}
               className="pr-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 transition-all"
            />
         </div>
      </div>
   )
}