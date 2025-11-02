import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { Building2, Loader2, FileText } from "lucide-react";

export default function RegisterOffice() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    email: "",
    commercial_reg: "",
    license_number: "",
    address: "",
    password: "",
    confirm: "",
  });

  const [loading, setLoading] = useState(false);

  // ✅ تحديث الحقول
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 📤 إرسال التسجيل
  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      name,
      owner_name,
      phone,
      email,
      commercial_reg,
      license_number,
      address,
      password,
      confirm,
    } = form;

    if (!name || !phone || !password) {
      return toast.error("📝 يرجى تعبئة جميع الحقول المطلوبة");
    }

    if (password !== confirm) {
      return toast.error("⚠️ كلمة المرور غير متطابقة");
    }

    const saudiRegex = /^05\d{8}$/;
    if (!saudiRegex.test(phone)) {
      return toast.error("📱 أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/offices/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          name,
          owner_name,
          phone,
          email,
          commercial_reg,
          license_number,
          address,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "فشل التسجيل");

      toast.success("✅ تم إرسال طلب تسجيل المكتب بنجاح");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error("❌ Register error:", err);
      toast.error(err.message || "حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-white px-4">
      <Card className="w-full max-w-2xl shadow-lg border border-gray-100">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="text-emerald-600 w-10 h-10" />
          </div>
          <CardTitle className="text-2xl font-bold text-emerald-700">
            تسجيل مكتب عقاري جديد
          </CardTitle>
          <p className="text-gray-500 text-sm mt-1">
            أدخل معلومات مكتبك بدقة لإرسال طلب التسجيل إلى الإدارة
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* معلومات أساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  اسم المكتب <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="مكتب الهدى العقاري"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  اسم صاحب المكتب
                </label>
                <input
                  name="owner_name"
                  value={form.owner_name}
                  onChange={handleChange}
                  placeholder="سعود صقر"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* الجوال والبريد */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  رقم الجوال <span className="text-red-500">*</span>
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XXXXXXXX"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* السجل التجاري والترخيص */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  رقم السجل التجاري
                </label>
                <input
                  name="commercial_reg"
                  value={form.commercial_reg}
                  onChange={handleChange}
                  placeholder="1010XXXXXX"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  رقم الترخيص
                </label>
                <input
                  name="license_number"
                  value={form.license_number}
                  onChange={handleChange}
                  placeholder="TR-XXXXX"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* العنوان */}
            <div>
              <label className="block text-sm font-medium mb-1">العنوان</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="الرياض - حي العليا - شارع التحلية"
                rows="2"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
              ></textarea>
            </div>

            {/* كلمة المرور */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  تأكيد كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-5 h-5" /> جاري الإرسال...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FileText size={16} /> إرسال طلب التسجيل
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-2">
              لديك حساب بالفعل؟{" "}
              <span
                className="text-emerald-600 cursor-pointer hover:underline"
                onClick={() => navigate("/login")}
              >
                تسجيل الدخول
              </span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
