import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { API_URL, API_KEY } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Save, UserCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🧠 تحميل بيانات المستخدم عند الدخول
  useEffect(() => {
    if (!user?.token) return;
    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/me`, {
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
        });
      } catch (err) {
        console.error("❌ Error fetching user:", err);
        toast.error("فشل تحميل بيانات المستخدم");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [user]);

  // 🔄 تعديل القيم
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 💾 حفظ التعديلات
  async function handleSave() {
    if (!user?.token) return toast.error("الرجاء تسجيل الدخول أولاً");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "فشل حفظ التعديلات");

      toast.success("✅ تم حفظ التعديلات بنجاح");
      setUser({ ...user, name: form.name, email: form.email, phone: form.phone });
    } catch (err) {
      console.error("❌ Error saving user:", err);
      toast.error(err.message || "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-emerald-700 mb-6 flex items-center gap-2">
          <UserCircle size={24} /> إعدادات الحساب
        </h1>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <Loader2 className="animate-spin mr-2" /> جاري تحميل بياناتك...
          </div>
        ) : (
          <Card className="shadow-sm border border-gray-200 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-emerald-700 text-lg">بيانات المستخدم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputField
                label="الاسم الكامل"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
              <InputField
                label="رقم الجوال"
                value={form.phone}
                disabled
              />
              <InputField
                label="البريد الإلكتروني"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function InputField({ label, value, onChange, disabled = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <Input
        type="text"
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className={`${disabled ? "bg-gray-100" : ""}`}
      />
    </div>
  );
}
