import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { Loader2, Smartphone, ShieldCheck } from "lucide-react";

export default function LoginPhone() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1️⃣ إدخال الجوال | 2️⃣ إدخال الكود
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState(""); // لعرض كود الاختبار

  // ===============================
  // 📤 إرسال كود التحقق
  // ===============================
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const saudiRegex = /^05\d{8}$/;
      if (!saudiRegex.test(phone)) {
        throw new Error("📱 أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX");
      }

      const res = await fetch(`${API_URL}/auth/login-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ phone }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "فشل إرسال كود التحقق");

      toast.success("📩 تم إرسال كود التحقق إلى رقمك");
      setOtpCode(data.otp_demo); // عرض كود مؤقت للتجربة
      setStep(2);
    } catch (err) {
      console.error("❌ Send code error:", err);
      toast.error(err.message || "حدث خطأ أثناء إرسال الكود");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🔐 التحقق من كود OTP
  // ===============================
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ phone, otp_code: otp }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "❌ كود التحقق غير صحيح");

      const userData = data.data;
      if (userData.status === "pending") {
        toast("⌛ طلبك قيد المراجعة من الإدارة", { icon: "⏳" });
        setTimeout(() => navigate("/pending"), 2000);
        return;
      }
      if (userData.status === "suspended") {
        toast.error("🚫 حسابك موقوف مؤقتاً، تواصل مع الدعم");
        return;
      }

      // ✅ حفظ بيانات المستخدم في السياق
      login({
        id: userData.id,
        name: userData.name || "مستخدم جديد",
        phone: userData.phone,
        roles: userData.roles || ["tenant"],
        activeRole: userData.activeRole || userData.roles?.[0] || "tenant",
        token: data.token,
      });

      toast.success("✅ تم تسجيل الدخول بنجاح");
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Verify error:", err);
      toast.error(err.message || "فشل التحقق من الكود");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🧱 واجهة المستخدم
  // ===============================
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-emerald-50 to-white px-4">
      <Card className="w-full max-w-md shadow-lg border border-gray-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-emerald-700 mb-1">
            تسجيل الدخول أو إنشاء حساب
          </CardTitle>
          <p className="text-gray-500 text-sm">
            أدخل رقم الجوال لتسجيل الدخول أو إنشاء حساب جديد
          </p>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            // ==========================
            // 📱 الخطوة الأولى: إدخال الجوال
            // ==========================
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">
                  رقم الجوال <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                  <Smartphone className="absolute right-3 top-2.5 text-gray-400" size={18} />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-5 h-5" /> جاري الإرسال...
                  </span>
                ) : (
                  "إرسال كود التحقق"
                )}
              </Button>

              {otpCode && (
                <p className="text-xs text-center text-gray-400">
                  (كود الاختبار: <span className="font-bold">{otpCode}</span>)
                </p>
              )}

              <p className="text-center text-sm text-gray-500 mt-2">
                لديك مكتب عقاري؟{" "}
                <span
                  className="text-emerald-600 cursor-pointer hover:underline"
                  onClick={() => navigate("/register-office")}
                >
                  سجل مكتبك هنا
                </span>
              </p>
            </form>
          ) : (
            // ==========================
            // 🔑 الخطوة الثانية: إدخال كود OTP
            // ==========================
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">
                  كود التحقق
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="أدخل الكود المرسل"
                  className="w-full border rounded-lg px-3 py-2 text-center font-bold text-lg tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-5 h-5" /> جاري التحقق...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={18} /> تأكيد الدخول
                  </span>
                )}
              </Button>

              <p
                className="text-center text-sm text-emerald-600 cursor-pointer hover:underline"
                onClick={() => setStep(1)}
              >
                🔁 إعادة إدخال رقم الجوال
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
