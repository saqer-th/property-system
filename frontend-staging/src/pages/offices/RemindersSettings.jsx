import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  PlusCircle,
  Edit3,
  Trash2,
  Send,
  Bell,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function RemindersSettings() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    trigger_event: "payment_due",
    days_before: 3,
    message_text: "",
    send_whatsapp: true,
    send_email: false,
    send_sms: false,
    is_active: true,
  });

  // 🧩 تحميل التذكيرات
  async function fetchReminders() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reminders/${user.office_id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setReminders(data.data);
    } catch (err) {
      console.error("❌ fetchReminders error:", err);
      toast.error("فشل تحميل التذكيرات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.office_id) fetchReminders();
  }, [user]);

  // ✏️ حفظ تذكير (جديد أو تعديل)
  async function handleSaveReminder(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/reminders/${user.office_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({ ...form, id: editing?.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      setFormOpen(false);
      setEditing(null);
      fetchReminders();
    } catch (err) {
      console.error("❌ saveReminder error:", err);
      toast.error(err.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  // 🔄 تفعيل/تعطيل
  async function toggleActive(reminder) {
    try {
      await fetch(`${API_URL}/reminders/${reminder.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({ is_active: !reminder.is_active }),
      });
      fetchReminders();
      toast.success("تم تحديث الحالة");
    } catch (err) {
      console.error("❌ toggleActive error:", err);
      toast.error("فشل تحديث الحالة");
    }
  }

  // 🚀 إرسال يدوي
  async function sendNow(reminder) {
    const phone = prompt("أدخل رقم جوال العميل:");
    if (!phone) return;
    try {
      const res = await fetch(`${API_URL}/reminders/${reminder.id}/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({ target_phone: phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("✅ تم إرسال التذكير (تجريبي)");
    } catch (err) {
      toast.error(err.message || "فشل الإرسال");
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <Bell className="w-6 h-6" /> إدارة التذكيرات
          </h1>
          <Button
            onClick={() => {
              setFormOpen(!formOpen);
              setEditing(null);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <PlusCircle size={16} /> {formOpen ? "إلغاء" : "إضافة تذكير"}
          </Button>
        </div>

        {/* 🔹 نموذج الإضافة */}
        {formOpen && (
          <Card className="border border-emerald-200 bg-emerald-50 p-4 rounded-xl">
            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>اسم التذكير</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>نوع الحدث</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={form.trigger_event}
                    onChange={(e) =>
                      setForm({ ...form, trigger_event: e.target.value })
                    }
                  >
                    <option value="payment_due">دفعة مستحقة</option>
                    <option value="payment_overdue">دفعة متأخرة</option>
                    <option value="contract_end">انتهاء عقد</option>
                    <option value="maintenance_due">صيانة</option>
                  </select>
                </div>

                <div>
                  <Label>عدد الأيام قبل الحدث</Label>
                  <Input
                    type="number"
                    value={form.days_before}
                    onChange={(e) =>
                      setForm({ ...form, days_before: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-4 items-center mt-2">
                  <Label>إرسال عبر:</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.send_whatsapp}
                      onCheckedChange={(v) =>
                        setForm({ ...form, send_whatsapp: v })
                      }
                    />
                    <span>واتساب</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.send_email}
                      onCheckedChange={(v) =>
                        setForm({ ...form, send_email: v })
                      }
                    />
                    <span>إيميل</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.send_sms}
                      onCheckedChange={(v) =>
                        setForm({ ...form, send_sms: v })
                      }
                    />
                    <span>SMS</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>نص الرسالة</Label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows="3"
                  value={form.message_text}
                  onChange={(e) =>
                    setForm({ ...form, message_text: e.target.value })
                  }
                  placeholder="اكتب نص التذكير هنا... يمكنك استخدام {{name}} أو {{amount}} أو {{due_date}}"
                />
              </div>

              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  "حفظ التذكير"
                )}
              </Button>
            </form>
          </Card>
        )}

        {/* 🔹 جدول التذكيرات */}
        <Card className="shadow-sm border rounded-xl">
          <CardHeader>
            <CardTitle className="text-emerald-700">قائمة التذكيرات</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500">جاري التحميل...</p>
            ) : reminders.length === 0 ? (
              <p className="text-center text-gray-500 py-6">
                لا توجد تذكيرات بعد
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-gray-600">
                      <th className="p-2 text-start">الاسم</th>
                      <th className="p-2 text-start">الحدث</th>
                      <th className="p-2 text-start">الأيام قبل الحدث</th>
                      <th className="p-2 text-start">الحالة</th>
                      <th className="p-2 text-start">خيارات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminders.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b hover:bg-emerald-50 transition"
                      >
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">
                          {r.trigger_event === "payment_due"
                            ? "دفعة مستحقة"
                            : r.trigger_event === "payment_overdue"
                            ? "دفعة متأخرة"
                            : r.trigger_event === "contract_end"
                            ? "انتهاء عقد"
                            : "صيانة"}
                        </td>
                        <td className="p-2">{r.days_before}</td>
                        <td className="p-2">
                          <Switch
                            checked={r.is_active}
                            onCheckedChange={() => toggleActive(r)}
                          />
                        </td>
                        <td className="p-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(r);
                              setForm(r);
                              setFormOpen(true);
                            }}
                          >
                            <Edit3 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendNow(r)}
                          >
                            <Send size={14} />
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
