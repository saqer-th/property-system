import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { API_URL, API_KEY } from "@/config";
import {
  PlusCircle,
  Loader2,
  ShieldAlert,
  User,
  Phone,
  Search,
  Trash2,
  Power,
} from "lucide-react";
import toast from "react-hot-toast";

export default function OfficeEmployees({ officeId }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");

  const canManage =
    user?.activeRole === "office_admin" || user?.activeRole === "office";

  // 📦 جلب الموظفين
  async function fetchEmployees() {
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

  // ➕ إضافة موظف جديد
  async function handleAddEmployee() {
    if (!phone.trim()) return toast.error("📱 أدخل رقم الجوال");
    if (!officeId) return toast.error("⚠️ لم يتم تحديد المكتب بعد");

    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/offices/${officeId}/employees`, {
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
      setDrawerOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error("❌ Error adding employee:", err);
      toast.error(err.message || "فشل إضافة الموظف");
    } finally {
      setAdding(false);
    }
  }

  // 🔄 تفعيل/إيقاف موظف
  async function handleToggle(empId, currentStatus) {
    if (!officeId) return;
    setToggling(empId);
    try {
      const res = await fetch(
        `${API_URL}/offices/${officeId}/employees/${empId}/active`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("✅ تم تحديث حالة الموظف");
      fetchEmployees();
    } catch (err) {
      console.error("❌ Toggle error:", err);
      toast.error(err.message || "فشل تحديث الحالة");
    } finally {
      setToggling(null);
    }
  }

  // ❌ حذف موظف
  async function handleDelete(empId) {
    if (!officeId) return;
    if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    setDeleting(empId);
    try {
      const res = await fetch(
        `${API_URL}/offices/${officeId}/employees/${empId}`,
        {
          method: "DELETE",
          headers: {
            "x-api-key": API_KEY,
            Authorization: `Bearer ${user.token}`,
            "x-active-role": user.activeRole,
          },
        }
      );

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("🗑️ تم حذف الموظف بنجاح");
      fetchEmployees();
    } catch (err) {
      console.error("❌ Delete error:", err);
      toast.error(err.message || "فشل حذف الموظف");
    } finally {
      setDeleting(null);
    }
  }

  // 🚀 تحميل الموظفين عند توفر المكتب
  useEffect(() => {
    if (officeId) fetchEmployees();
  }, [officeId]);

  const filtered = employees.filter(
    (e) =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 🔹 العنوان والبحث */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h2 className="text-lg font-bold text-emerald-700 flex items-center gap-2">
          👥 موظفو المكتب
        </h2>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-2 top-3 text-gray-400" />
            <Input
              className="pl-8 pr-2 py-2 text-sm"
              placeholder="بحث بالاسم أو الجوال..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canManage && (
            <Button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <PlusCircle size={16} /> إضافة موظف
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 نموذج الإضافة */}
      {drawerOpen && (
        <Card className="p-4 border border-emerald-200 bg-emerald-50 rounded-2xl animate-fadeIn">
          <div className="grid md:grid-cols-3 gap-4">
            <Input
              placeholder="اسم الموظف"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="رقم الجوال 05XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              onClick={handleAddEmployee}
              disabled={adding}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {adding ? <Loader2 className="animate-spin w-4 h-4" /> : "إضافة"}
            </Button>
          </div>
        </Card>
      )}

      {/* 🔹 جدول الموظفين */}
      <Card className="border rounded-2xl shadow-md overflow-hidden">
        <CardHeader className="bg-emerald-50 border-b border-emerald-100">
          <CardTitle className="text-emerald-700 text-base font-semibold">
            قائمة الموظفين ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin mb-2" size={22} />
              جاري تحميل الموظفين...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShieldAlert className="mx-auto mb-2 text-gray-400" size={26} />
              لا يوجد موظفون حاليًا
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full text-sm text-gray-700 border-collapse">
                <thead className="bg-emerald-100 text-emerald-700">
                  <tr>
                    <th className="p-3 text-start w-1/3">الموظف</th>
                    <th className="p-3 text-start">الدور</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-start">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr
                      key={emp.user_id}
                      className="border-b hover:bg-emerald-50 transition-all"
                    >
                      <td className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-emerald-600" />
                            <span className="font-medium">{emp.name || "—"}</span>
                          </div>
                          <div className="flex items-center text-gray-500 text-sm mt-1 sm:mt-0">
                            <Phone size={14} className="mr-1 text-gray-400" />
                            {emp.phone}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {emp.role === "employee"
                          ? "موظف"
                          : emp.role === "manager"
                          ? "مدير"
                          : emp.role}
                      </td>
                      <td className="p-3">
                        {emp.is_active ? (
                          <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full text-xs">
                            نشط
                          </span>
                        ) : (
                          <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-xs">
                            موقوف
                          </span>
                        )}
                      </td>
                      <td className="p-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle(emp.user_id, emp.is_active)}
                          disabled={toggling === emp.user_id}
                          className="border-emerald-300"
                        >
                          {toggling === emp.user_id ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                          ) : (
                            <Power size={14} className="text-emerald-700" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(emp.user_id)}
                          disabled={deleting === emp.user_id}
                        >
                          {deleting === emp.user_id ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                          ) : (
                            <Trash2 size={14} />
                          )}
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
  );
}
