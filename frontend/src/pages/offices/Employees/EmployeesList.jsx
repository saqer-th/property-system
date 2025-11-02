import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Loader2, Phone, Power, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function EmployeesList() {
  const { user } = useAuth();

  const [office, setOffice] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // 🧩 1. جلب المكتب الحالي للمستخدم
  async function fetchMyOffice() {
    try {
      const res = await fetch(`${API_URL}/offices/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setOffice(json.data);
      return json.data;
    } catch (err) {
      console.error("❌ Error fetching office:", err);
      toast.error(err.message || "فشل تحميل المكتب");
      return null;
    }
  }

  // 🧩 2. جلب الموظفين للمكتب
  async function fetchEmployees(officeId) {
    if (!officeId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/offices/${officeId}/employees`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEmployees(json.data);
    } catch (err) {
      console.error("❌ Error fetching employees:", err);
      toast.error("فشل تحميل الموظفين");
    } finally {
      setLoading(false);
    }
  }

  // ⚡ تحميل المكتب والموظفين معًا عند التشغيل
  useEffect(() => {
    (async () => {
      const off = await fetchMyOffice();
      if (off?.id) await fetchEmployees(off.id);
    })();
  }, []);

  // ➕ إضافة موظف جديد
  async function handleAddEmployee() {
    if (!phone.trim()) return toast.error("📱 أدخل رقم الجوال");
    if (!office?.id) return toast.error("⚠️ لم يتم تحديد المكتب بعد");

    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/offices/${office.id}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({ phone, name }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("✅ تم إضافة الموظف بنجاح");
      setPhone("");
      setName("");
      fetchEmployees(office.id);
    } catch (err) {
      console.error("❌ Error adding employee:", err);
      toast.error(err.message || "فشل إضافة الموظف");
    } finally {
      setAdding(false);
    }
  }

  // 🔄 تفعيل/إيقاف موظف
  async function handleToggle(empId, currentStatus) {
    if (!office?.id) return;
    setToggling(empId);
    try {
      const res = await fetch(`${API_URL}/offices/${office.id}/employees/${empId}/active`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("✅ تم تحديث حالة الموظف");
      fetchEmployees(office.id);
    } catch (err) {
      console.error("❌ Toggle error:", err);
      toast.error(err.message || "فشل تحديث الحالة");
    } finally {
      setToggling(null);
    }
  }

  // ❌ حذف موظف
  async function handleDelete(empId) {
    if (!office?.id) return;
    if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    setDeleting(empId);
    try {
      const res = await fetch(`${API_URL}/offices/${office.id}/employees/${empId}`, {
        method: "DELETE",
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("🗑️ تم حذف الموظف بنجاح");
      fetchEmployees(office.id);
    } catch (err) {
      console.error("❌ Delete error:", err);
      toast.error(err.message || "فشل حذف الموظف");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <Card className="border shadow-sm">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold text-emerald-700 flex items-center gap-2">
              👥 موظفو المكتب
              {office && (
                <span className="text-gray-500 text-sm font-normal">
                  ({office.name})
                </span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* 🔹 إضافة موظف جديد */}
            <div className="mb-5 flex flex-col sm:flex-row items-center gap-2">
              <Input
                placeholder="اسم الموظف (اختياري)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full sm:w-1/3"
              />
              <Input
                placeholder="رقم الجوال 05XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full sm:w-1/3"
              />
              <Button
                onClick={handleAddEmployee}
                disabled={adding}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                {adding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <PlusCircle size={16} />
                )}
                <span>إضافة موظف</span>
              </Button>
            </div>

            {/* 🔹 جدول الموظفين */}
            {loading ? (
              <div className="text-center text-gray-500 py-8">
                <Loader2 className="animate-spin inline-block mr-1" />
                جاري التحميل...
              </div>
            ) : employees.length === 0 ? (
              <p className="text-center text-gray-500">لا يوجد موظفين حالياً</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">الاسم</th>
                      <th className="p-2">رقم الجوال</th>
                      <th className="p-2">الدور</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">تاريخ الإضافة</th>
                      <th className="p-2">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e, i) => (
                      <tr key={e.id} className="border-b hover:bg-gray-50 transition">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{e.name || "—"}</td>
                        <td className="p-2 flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          {e.phone}
                        </td>
                        <td className="p-2">{e.role_in_office || "موظف"}</td>
                        <td className="p-2">
                          {e.is_active ? (
                            <span className="text-emerald-600 font-medium">نشط</span>
                          ) : (
                            <span className="text-gray-400 font-medium">موقوف</span>
                          )}
                        </td>
                        <td className="p-2">
                          {new Date(e.created_at).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="p-2 flex items-center gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggle(e.id, e.is_active)}
                            disabled={toggling === e.id}
                            className={`flex items-center gap-1 ${
                              e.is_active
                                ? "text-red-600 border-red-300 hover:bg-red-50"
                                : "text-green-600 border-green-300 hover:bg-green-50"
                            }`}
                          >
                            {toggling === e.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Power size={14} />
                            )}
                            {e.is_active ? "إيقاف" : "تفعيل"}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(e.id)}
                            disabled={deleting === e.id}
                            className="text-gray-600 border-gray-300 hover:bg-red-50"
                          >
                            {deleting === e.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            حذف
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
