import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  PlusCircle, Loader2, Phone, Power, Trash2, 
  Search, MoreVertical, User, ShieldCheck, Users, UserX 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";

// --- Stat Card Component ---
const StatCard = ({ title, value, icon, colorClass, bgClass }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
      {icon}
    </div>
  </div>
);

export default function EmployeesList() {
  const { user } = useAuth();

  const [office, setOffice] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Add State
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action States
  const [actionLoading, setActionLoading] = useState(null); // ID of employee being processed

  // 1. Fetch Office
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
      console.error(err);
      return null;
    }
  }

  // 2. Fetch Employees
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
      toast.error("فشل تحميل الموظفين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const off = await fetchMyOffice();
      if (off?.id) await fetchEmployees(off.id);
    })();
  }, []);

  // ➕ Add Employee
  async function handleAddEmployee() {
    if (!newPhone.trim()) return toast.error("أدخل رقم الجوال");
    if (!office?.id) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/offices/${office.id}/employees`, {
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

      toast.success("تم إضافة الموظف بنجاح");
      setIsAddOpen(false);
      setNewPhone("");
      setNewName("");
      fetchEmployees(office.id);
    } catch (err) {
      toast.error(err.message || "فشل إضافة الموظف");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 🔄 Toggle Status
  async function handleToggle(empId, currentStatus) {
    setActionLoading(empId);
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
      toast.success("تم تحديث الحالة");
      fetchEmployees(office.id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  // ❌ Delete
  async function handleDelete(empId) {
    if (!confirm("هل أنت متأكد من الحذف؟ لا يمكن التراجع.")) return;
    setActionLoading(empId);
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
      toast.success("تم الحذف بنجاح");
      fetchEmployees(office.id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  // 🔍 Filter Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.phone?.includes(searchTerm)
    );
  }, [employees, searchTerm]);

  // 📊 Stats Calculation
  const stats = useMemo(() => {
    return {
      total: employees.length,
      active: employees.filter(e => e.is_active).length,
      inactive: employees.filter(e => !e.is_active).length
    };
  }, [employees]);

  if (loading && !office) return (
    <DashboardLayout>
       <div className="flex h-[70vh] items-center justify-center text-gray-400 flex-col gap-2">
          <Loader2 className="animate-spin" size={32} />
          <p>جاري تحميل المكتب...</p>
       </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-emerald-600" /> إدارة الموظفين
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {office ? `إدارة صلاحيات الدخول لمكتب: ${office.name}` : "إدارة الفريق والصلاحيات"}
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
            <PlusCircle size={18} className="ml-2" /> إضافة موظف
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <StatCard title="إجمالي الموظفين" value={stats.total} icon={<Users size={20}/>} colorClass="text-blue-600" bgClass="bg-blue-50" />
           <StatCard title="موظف نشط" value={stats.active} icon={<ShieldCheck size={20}/>} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
           <StatCard title="حساب موقوف" value={stats.inactive} icon={<UserX size={20}/>} colorClass="text-red-600" bgClass="bg-red-50" />
        </div>

        {/* Main Card */}
        <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-100 pb-4">
             <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">قائمة الموظفين</CardTitle>
                <div className="relative w-64">
                   <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
                   <Input 
                      placeholder="بحث بالاسم أو الجوال..." 
                      className="pr-9 h-9 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
               <div className="py-12 flex justify-center text-gray-400">
                  <Loader2 className="animate-spin" />
               </div>
            ) : filteredEmployees.length === 0 ? (
               <div className="py-16 text-center text-gray-500 flex flex-col items-center">
                  <div className="bg-gray-50 p-4 rounded-full mb-3">
                     <UserX size={32} className="text-gray-300" />
                  </div>
                  <p>لا يوجد موظفين مطابقين للبحث</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                      <th className="px-6 py-3">الموظف</th>
                      <th className="px-6 py-3">رقم الجوال</th>
                      <th className="px-6 py-3">الدور</th>
                      <th className="px-6 py-3">الحالة</th>
                      <th className="px-6 py-3">تاريخ الانضمام</th>
                      <th className="px-6 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 bg-emerald-100 border border-emerald-200">
                                 <AvatarFallback className="text-emerald-700 font-bold">
                                    {emp.name ? emp.name.charAt(0) : <User size={16}/>}
                                 </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-gray-900">{emp.name || "مستخدم"}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-600 dir-ltr text-right">{emp.phone}</td>
                        <td className="px-6 py-4">
                           <Badge variant="outline" className="bg-gray-50 text-gray-600 font-normal border-gray-200">
                              {emp.role_in_office || "موظف"}
                           </Badge>
                        </td>
                        <td className="px-6 py-4">
                           {emp.is_active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> نشط
                              </span>
                           ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                 <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> موقوف
                              </span>
                           )}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                           {new Date(emp.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 group-hover:text-gray-700">
                                    {actionLoading === emp.id ? <Loader2 className="animate-spin" size={16} /> : <MoreVertical size={16} />}
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem onClick={() => handleToggle(emp.id, emp.is_active)} className="cursor-pointer">
                                    <Power size={14} className="ml-2" />
                                    {emp.is_active ? "إيقاف الحساب" : "تفعيل الحساب"}
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleDelete(emp.id)} className="text-red-600 focus:text-red-600 cursor-pointer">
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
                    أدخل بيانات الموظف لمنحه صلاحية الوصول إلى هذا المكتب.
                 </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">اسم الموظف</label>
                    <Input 
                       placeholder="مثال: محمد عبدالله" 
                       value={newName}
                       onChange={(e) => setNewName(e.target.value)}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">رقم الجوال <span className="text-red-500">*</span></label>
                    <Input 
                       placeholder="05XXXXXXXX" 
                       value={newPhone}
                       onChange={(e) => setNewPhone(e.target.value)}
                       type="tel"
                    />
                 </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                 <Button variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                 <Button onClick={handleAddEmployee} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isSubmitting ? <Loader2 className="animate-spin ml-2" size={16}/> : <PlusCircle className="ml-2" size={16}/>}
                    إضافة
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}