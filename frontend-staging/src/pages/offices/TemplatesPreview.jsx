import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, RefreshCcw, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function TemplatesList() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({
    id: "",
    name: "",
    trigger_event: "manual",
    template: "",
    available_vars: ["name", "contract_number", "amount", "end_date", "property"],
    channel: "whatsapp",
    is_active: true,
  });

  /* =========================================================
     📦 1️⃣ جلب القوالب
  ========================================================= */
  async function fetchTemplates() {
    if (!user?.office_id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reminders/${user.office_id}/templates`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTemplates(data.data);
    } catch (err) {
      console.error("❌ fetch templates error:", err);
      toast.error("فشل تحميل القوالب");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  /* =========================================================
     ✏️ 2️⃣ تعبئة النموذج للتعديل
  ========================================================= */
  function handleEdit(tmpl) {
    setForm({
      ...tmpl,
      available_vars:
        tmpl.available_vars || ["name", "contract_number", "amount", "end_date", "property"],
    });
    setPreview("");
  }

  /* =========================================================
     🧹 3️⃣ إعادة تعيين النموذج
  ========================================================= */
  function resetForm() {
    setForm({
      id: "",
      name: "",
      trigger_event: "manual",
      template: "",
      available_vars: ["name", "contract_number", "amount", "end_date", "property"],
      channel: "whatsapp",
      is_active: true,
    });
    setPreview("");
  }

  /* =========================================================
     💾 4️⃣ حفظ أو تعديل القالب
  ========================================================= */
  async function handleSave() {
    if (!form.name || !form.template) return toast.error("املأ جميع الحقول");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/reminders/${user.office_id}/template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      resetForm();
      fetchTemplates();
    } catch (err) {
      console.error("❌ save template error:", err);
      toast.error("فشل حفظ القالب");
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     👁️ 5️⃣ معاينة فورية
  ========================================================= */
  function handlePreview() {
    if (!form.template.trim()) {
      toast.error("أدخل نص القالب أولاً");
      return;
    }

    const sampleData = {
      name: "أحمد محمد",
      contract_number: "CN-2025-001",
      amount: "25,000 ريال",
      end_date: "2025-12-31",
      property: "شقة رقم 101 - حي الربيع",
    };

    let result = form.template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const k = key.trim();
      return sampleData[k] || `[${k}]`;
    });

    const signature = `\n\n📩 مثال: هذه الرسالة من مكتب العقار ${user?.name || ""}`;
    setPreview(result + signature);
  }

  /* =========================================================
     🗑️ 6️⃣ حذف القالب
  ========================================================= */
  async function handleDelete(id) {
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    try {
      await fetch(`${API_URL}/reminders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
      });
      toast.success("تم حذف القالب");
      fetchTemplates();
    } catch (err) {
      console.error("❌ delete error:", err);
      toast.error("فشل حذف القالب");
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* العنوان */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-700">📋 إدارة القوالب</h1>
          <Button
            onClick={fetchTemplates}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <RefreshCcw size={16} /> تحديث
          </Button>
        </div>

        {/* 🧩 نموذج إنشاء / تعديل */}
        <Card className="border rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-emerald-700 text-lg">
              {form.id ? "تعديل القالب" : "إنشاء قالب جديد"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">اسم القالب</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثل: تذكير بدفعة إيجار"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">القناة</label>
                <select
                  className="border rounded-md w-full p-2"
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  <option value="whatsapp">واتساب</option>
                  <option value="sms">رسالة نصية</option>
                  <option value="email">بريد إلكتروني</option>
                </select>
              </div>
            </div>

            {/* نص القالب */}
            <div>
              <label className="text-sm text-gray-600">
                نص الرسالة{" "}
                <span className="text-xs text-gray-400">(استخدم المتغيرات بالأسفل)</span>
              </label>
              <Textarea
                rows={5}
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                placeholder="مرحبًا {{name}}، عقدك رقم {{contract_number}} ينتهي بتاريخ {{end_date}}."
              />
            </div>

            {/* المتغيرات */}
            <div>
              <p className="text-sm text-gray-600 mb-2">المتغيرات المتاحة:</p>
              <div className="flex flex-wrap gap-2">
                {form.available_vars.map((v) => (
                  <span
                    key={v}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-emerald-100"
                    onClick={() =>
                      setForm({ ...form, template: form.template + ` {{${v}}}` })
                    }
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) => setForm({ ...form, is_active: val })}
                />
                <span className="text-sm text-gray-700">تفعيل القالب</span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePreview}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <Eye size={16} /> معاينة
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  حفظ
                </Button>
              </div>
            </div>

            {/* المعاينة */}
            {preview && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg text-gray-700 whitespace-pre-line mt-3">
                <p className="font-semibold mb-1 text-emerald-700">📄 المعاينة:</p>
                <p>{preview}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📜 قائمة القوالب */}
        <Card className="border rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-emerald-700 text-lg">القوالب المتاحة</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Loader2 className="animate-spin mb-2" />
                جاري تحميل القوالب...
              </div>
            ) : templates.length === 0 ? (
              <p className="text-center text-gray-500 py-6">لا توجد قوالب حالياً</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50 border-b text-gray-600">
                    <tr>
                      <th className="p-2 text-start">الاسم</th>
                      <th className="p-2 text-start">القناة</th>
                      <th className="p-2 text-start">الحالة</th>
                      <th className="p-2 text-start">المتغيرات</th>
                      <th className="p-2 text-start">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((tmpl) => (
                      <tr key={tmpl.id} className="border-b hover:bg-emerald-50 transition">
                        <td className="p-2 font-medium text-gray-800">{tmpl.name}</td>
                        <td className="p-2">{tmpl.channel}</td>
                        <td className="p-2">
                          {tmpl.is_active ? (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs">
                              نشط
                            </span>
                          ) : (
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs">
                              موقوف
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-xs text-gray-600">
                          {tmpl.available_vars?.join(", ")}
                        </td>
                        <td className="p-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(tmpl)}
                            className="text-emerald-700 border-emerald-200"
                          >
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(tmpl.id)}
                          >
                            <Trash2 size={14} />
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
      </div>
    </DashboardLayout>
  );
}
