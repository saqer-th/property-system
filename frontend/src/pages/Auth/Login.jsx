import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { 
  Loader2, 
  Smartphone, 
  ShieldCheck, 
  Building2, 
  User, 
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info
} from "lucide-react";

export default function LoginPhone() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isValid, setIsValid] = useState(false);
  
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(0);

  // Countdown Timer
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // 🟢 Phone Validation Logic
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // Only numbers
    if (val.length > 10) return; // Max 10 digits

    setPhone(val);

    // Real-time Validation
    if (val.length === 0) {
      setPhoneError("");
      setIsValid(false);
    } else if (!val.startsWith("05")) {
      setPhoneError("يجب أن يبدأ الرقم بـ 05");
      setIsValid(false);
    } else if (val.length < 10) {
      setPhoneError("الرقم غير مكتمل (10 أرقام)");
      setIsValid(false);
    } else {
      setPhoneError("");
      setIsValid(true);
    }
  };

  // ===============================
  // 📤 Send Code
  // ===============================
  const handleSendCode = async (e) => {
    e.preventDefault();
    
    if (!isValid) {
      setPhoneError("يرجى إدخال رقم صحيح للمتابعة");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      toast.success("تم إرسال الكود بنجاح");
      setOtpCode(data.otp_demo);
      setStep(2);
      setTimer(60);
    } catch (err) {
      toast.error(err.message || "فشل إرسال الكود");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🔐 Verify OTP
  // ===============================
  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 4) return toast.error("الرجاء إدخال الكود كاملاً");
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ phone, otp_code: otp }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      const userData = data.data;
      
      if (userData.status === "pending") {
        navigate("/pending");
        return;
      }
      
      if (userData.status === "suspended") {
        toast.error("حسابك موقوف، يرجى التواصل مع الإدارة");
        return;
      }

      login({
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        roles: userData.roles,
        activeRole: userData.activeRole,
        token: data.token,
      });

      toast.success("مرحباً بك مجدداً 👋");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "كود التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50" dir="rtl">
      
      {/* 🖼️ Left Side: Visual / Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4">نظام إدارة العقارات الذكي</h1>
          <p className="text-emerald-100 text-lg max-w-md leading-relaxed">
            بوابة الدخول للمكاتب العقارية، الملاك، والمستأجرين. إدارة أملاكك وعقودك أصبحت أسهل.
          </p>
        </div>
        
        {/* Features List */}
        <div className="relative z-10 space-y-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-800/50 rounded-lg"><ShieldCheck /></div>
              <span>توثيق آمن للعقود والبيانات</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-800/50 rounded-lg"><Building2 /></div>
              <span>إدارة شاملة للوحدات والمرافق</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-800/50 rounded-lg"><User /></div>
              <span>لوحة تحكم خاصة لكل مستخدم</span>
           </div>
        </div>
      </div>

      {/* 📝 Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">تسجيل الدخول</h2>
            <p className="text-gray-500 text-sm">
              للمكاتب، الملاك، والمستأجرين المسجلين
            </p>
          </div>

          {/* ℹ️ Tenant Note */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start text-sm text-blue-700">
             <Info className="w-5 h-5 shrink-0 mt-0.5" />
             <div>
               <span className="font-bold block mb-1">أنت مستأجر أو مالك؟</span>
               إذا كان لديك عقد مسجل مع أحد مكاتبنا الشريكة، يمكنك الدخول مباشرة باستخدام رقم جوالك المسجل في العقد.
             </div>
          </div>

          {/* STEP 1: Phone Input */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">رقم الجوال</label>
                <div className="relative flex items-center" dir="ltr">
                  
                  {/* Left Icon (SA Flag or Code) */}
                  <div className="absolute left-3 flex items-center gap-2 pointer-events-none">
                    <span className="text-gray-400 text-sm font-semibold border-r border-gray-300 pr-2">+966</span>
                    <Smartphone size={18} className="text-gray-400" />
                  </div>

                  <Input
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={phone}
                    onChange={handlePhoneChange}
                    className={`pl-24 pr-10 h-12 text-lg font-medium rounded-xl bg-white transition-all
                      ${phoneError ? "border-red-500 focus:ring-red-200" : isValid ? "border-emerald-500 focus:ring-emerald-200" : "border-gray-200 focus:ring-emerald-500"}
                    `}
                    required
                  />

                  {/* Validation Icons (Right Side) */}
                  <div className="absolute right-3">
                    {isValid && <CheckCircle2 className="text-emerald-500 animate-in zoom-in" size={20} />}
                    {phoneError && <XCircle className="text-red-500 animate-in zoom-in" size={20} />}
                  </div>
                </div>

                {/* Validation Message */}
                {phoneError && (
                  <p className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <AlertCircle size={12} /> {phoneError}
                  </p>
                )}
                {!phoneError && <p className="text-xs text-gray-400 text-right">مثال: 0501234567</p>}
              </div>

              <Button 
                type="submit" 
                className={`w-full h-12 font-bold rounded-xl text-base transition-all shadow-lg 
                  ${isValid ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100" : "bg-gray-300 text-gray-500 cursor-not-allowed"}
                `}
                disabled={loading || !isValid}
              >
                {loading ? <Loader2 className="animate-spin" /> : "متابعة"}
              </Button>
            </form>
          )}

          {/* STEP 2: OTP Input */}
          {step === 2 && (
            <form onSubmit={handleVerify} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="text-center mb-4">
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  تم الإرسال إلى <span className="font-mono font-bold text-gray-800">{phone}</span>
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block text-center">كود التحقق</label>
                <Input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="- - - -"
                  className="h-14 text-center text-3xl font-bold tracking-[1rem] rounded-xl border-gray-200 focus:border-emerald-500 text-emerald-700 placeholder:text-gray-200 bg-white"
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-emerald-100" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "تأكيد الدخول"}
              </Button>

              <div className="flex justify-between items-center text-sm mt-4">
                <button 
                  type="button" 
                  onClick={() => { setStep(1); setPhoneError(""); }}
                  className="text-gray-500 hover:text-emerald-600 transition-colors"
                >
                  تغيير الرقم؟
                </button>
                
                <button
                  type="button"
                  disabled={timer > 0}
                  onClick={handleSendCode}
                  className={`font-medium ${timer > 0 ? "text-gray-400 cursor-not-allowed" : "text-emerald-600 hover:underline"}`}
                >
                  {timer > 0 ? `إعادة الإرسال (${timer}s)` : "إعادة إرسال الكود"}
                </button>
              </div>

              {otpCode && (
                <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg text-center border border-yellow-100">
                  لأغراض التجربة: الكود هو <strong>{otpCode}</strong>
                </div>
              )}
            </form>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-gray-500">تسجيل جديد (شركاء النظام)</span>
            </div>
          </div>

          {/* Registration Options */}
          <div className="grid grid-cols-2 gap-4">
            <RegisterCard 
              icon={<Building2 className="text-blue-600" />} 
              title="تسجيل مكتب" 
              desc="لأصحاب المكاتب" 
              onClick={() => navigate("/register-office")} 
            />
            <RegisterCard 
              icon={<User className="text-purple-600" />} 
              title="تسجيل مالك" 
              desc="لأصحاب العقارات" 
              onClick={() => navigate("/register-owner")} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Sub Component for Registration Cards ---
function RegisterCard({ icon, title, desc, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group text-center"
    >
      <div className="bg-gray-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-50 transition-colors">
        {icon}
      </div>
      <h3 className="font-bold text-gray-800 text-sm group-hover:text-emerald-700">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}