import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { API_URL, API_KEY } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  Loader2,
  ShieldAlert,
  User,
  Phone,
  Search,
  Trash2,
  Power,
  MoreVertical,
  Users
} from "lucide-react";
import toast from "react-hot-toast";

export default function OfficeEmployees({ officeId }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State for actions
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  // Action loading states
  const [actionLoading, setActionLoading] = useState(null); // ID of employee being processed

  const canManage = ["office_admin", "office", "self_office_admin"].includes(user?.activeRole);

  // 📦 Fetch Employees
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

  // ➕ Add Employee
  async function handleAddEmployee() {
    if (!newPhone.trim()) return toast.error("📱 أدخل رقم الجوال");
    if (!officeId) return toast.error("⚠️ لم يتم تحديد المكتب");

    setIsAdding(true);
    try {
      const res = await fetch(`${API_URL}/offices/${officeId}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({ phone: newPhone, name: newName }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("✅ تم إضافة الموظف بنجاح");
      setNewPhone("");
      setNewName("");
      setIsAddOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error("❌ Error adding employee:", err);
      toast.error(err.message || "فشل إضافة الموظف");
    } finally {
      setIsAdding(false);
    }
  }

  // 🔄 Toggle Status
  async function handleToggle(empId, currentStatus) {
    setActionLoading(empId);
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
      toast.error("فشل تحديث الحالة");
    } finally {
      setActionLoading(null);
    }
  }

  // ❌ Delete Employee
  async function handleDelete(empId) {
    if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    setActionLoading(empId);
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
      toast.error("فشل حذف الموظف");
    } finally {
      setActionLoading(null);
    }
  }

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
      {/* 🔹 Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-emerald-600" /> موظفو المكتب
          <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600">
             {filtered.length}
          </Badge>
        </h2>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
            <Input
              className="pr-9 h-9 text-sm"
              placeholder="بحث بالاسم أو الجوال..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canManage && (
            <Button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9">
              <PlusCircle size={16} className="ml-1" /> إضافة
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 Employees Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin mb-2 text-emerald-600" size={24} />
              جاري تحميل الموظفين...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 flex flex-col items-center">
              <div className="bg-gray-50 p-4 rounded-full mb-3">
                 <Users className="text-gray-300" size={32} />
              </div>
              <p>لا يوجد موظفين حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3">الموظف</th>
                    <th className="px-6 py-3">الدور</th>
                    <th className="px-6 py-3">الحالة</th>
                    <th className="px-6 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((emp) => (
                    <tr key={emp.user_id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-emerald-50 border border-emerald-100">
                            <AvatarFallback className="text-emerald-700 font-bold text-xs">
                               {emp.name ? emp.name.charAt(0) : <User size={16}/>}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                             <p className="font-medium text-gray-900">{emp.name || "مستخدم"}</p>
                             <p className="text-xs text-gray-500 font-mono dir-ltr text-right">{emp.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-normal text-gray-600 bg-white border-gray-200">
                           {emp.role === "manager" ? "مدير" : "موظف"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {emp.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> موقوف
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                              {actionLoading === emp.user_id ? <Loader2 className="animate-spin" size={16}/> : <MoreVertical size={16} />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggle(emp.user_id, emp.is_active)} className="cursor-pointer">
                              <Power size={14} className="ml-2" /> {emp.is_active ? "إيقاف الحساب" : "تفعيل الحساب"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(emp.user_id)} className="text-red-600 focus:text-red-600 cursor-pointer">
                              <Trash2 size={14} className="ml-2" /> حذف الموظف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ➕ Add Employee Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
            <DialogDescription>
               سيتمكن الموظف من الوصول إلى لوحة تحكم المكتب بناءً على الصلاحيات الممنوحة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">اسم الموظف</label>
              <Input
                placeholder="مثال: أحمد محمد"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">رقم الجوال <span className="text-red-500">*</span></label>
              <Input
                placeholder="05XXXXXXXX"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddEmployee} disabled={isAdding} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isAdding ? <Loader2 className="animate-spin ml-2" size={16} /> : <PlusCircle className="ml-2" size={16} />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}