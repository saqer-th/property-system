import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { Loader2, User, Smartphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterOwner() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const saudiRegex = /^05\d{8}$/;
      if (!saudiRegex.test(phone)) {
        throw new Error("📱 أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX");
      }

      const res = await fetch(`${API_URL}/auth/register-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "فشل تسجيل المالك");
      }

      // 🔐 تسجيل الدخول تلقائي
      login({
        id: data.data.user.id,
        name: data.data.user.name,
        phone: data.data.user.phone,
        roles: ["self_office_admin"],
        activeRole: "self_office_admin",
        token: data.token,
      });

      toast.success("🎉 تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول للتحقق من رقم الجوال.");

      navigate("/login");

    } catch (err) {
      console.error("❌ register-owner error:", err);
      toast.error(err.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-emerald-50 to-white px-4">
      <Card className="w-full max-w-md shadow-lg border border-gray-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-emerald-700 mb-1">
            تسجيل كـ مالك عقار
          </CardTitle>
          <p className="text-gray-500 text-sm">
            قم بإنشاء حساب لإدارة عقاراتك بسهولة
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* الاسم */}
            <div>
              <label className="block text-sm font-medium mb-1">
                الاسم كامل <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: محمد بن خالد"
                  className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <User className="absolute right-3 top-2.5 text-gray-400" size={18} />
              </div>
            </div>

            {/* رقم الجوال */}
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
                  <Loader2 className="animate-spin w-5 h-5" /> جاري التسجيل...
                </span>
              ) : (
                "إنشاء الحساب"
              )}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-2">
              لديك حساب مسبقًا؟{" "}
              <span
                className="text-emerald-600 cursor-pointer hover:underline"
                onClick={() => navigate("/login")}
              >
                سجّل الدخول
              </span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
