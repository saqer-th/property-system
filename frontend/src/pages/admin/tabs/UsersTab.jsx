import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Shield,
  Users,
  Building2,
  UserCog,
  Filter
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

// --- Stat Card ---
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

export default function UsersTab() {
  const { user } = useAuth();
  const activeRole = user?.activeRole;
  const canManage = ["admin", "office"].includes(activeRole);

  const [users, setUsers] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  
  // Filters & Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all, admin, office, owner, tenant
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Dialog State
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  // 1. Initial Fetch
  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  async function fetchRoles() {
    try {
      const res = await fetch(`${API_URL}/admin/roles`, {
        headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user?.token}`, "x-active-role": activeRole },
      });
      const data = await res.json();
      setRolesList(Array.isArray(data.roles) ? data.roles : []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user?.token}`, "x-active-role": activeRole },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const result = Array.isArray(data.data) ? data.data : [];
      setUsers(result);
      setFiltered(result);
    } catch (err) {
      toast.error("فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  }

  // 2. Filter Logic
  useEffect(() => {
    let results = users;
    const term = search.toLowerCase();

    // Search
    if (term) {
      results = results.filter(u => u.name?.toLowerCase().includes(term) || u.phone?.includes(term));
    }

    // Role Filter
    if (roleFilter !== "all") {
      results = results.filter(u => u.roles?.includes(roleFilter));
    }

    setFiltered(results);
  }, [search, roleFilter, users]);

  // 3. Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.is_active).length,
      admins: users.filter(u => u.roles?.includes("admin")).length,
      offices: users.filter(u => u.roles?.includes("office")).length,
    };
  }, [users]);

  // 4. Actions
  const handleRoleEditOpen = (user) => {
    setSelectedUser(user);
    // Map current role names to IDs
    const userRoleIds = user.roles.map(rName => rolesList.find(r => r.role_name === rName)?.id).filter(Boolean);
    setSelectedRoles(userRoleIds);
    setIsRoleDialogOpen(true);
  };

  async function saveUserRoles() {
    if (!selectedUser || !canManage) return;
    setProcessingId(selectedUser.id); // Just to show global loading if needed, though dialog handles it
    
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY, Authorization: `Bearer ${user?.token}`, "x-active-role": activeRole },
        body: JSON.stringify({ role_ids: selectedRoles }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم تحديث الصلاحيات");
        // Optimistic Update
        const newRoleNames = selectedRoles.map(id => rolesList.find(r => r.id === id)?.role_name).filter(Boolean);
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, roles: newRoleNames } : u));
        setIsRoleDialogOpen(false);
      } else {
        toast.error("فشل التحديث");
      }
    } catch (err) {
      toast.error("خطأ في الاتصال");
    } finally {
      setProcessingId(null);
    }
  }

  async function toggleActive(userId, isActive) {
    if (!canManage) return;
    setProcessingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/active`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY, Authorization: `Bearer ${user?.token}`, "x-active-role": activeRole },
        body: JSON.stringify({ is_active: !isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isActive ? "تم إيقاف الحساب" : "تم تفعيل الحساب");
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
      } else toast.error("فشل العملية");
    } catch (err) {
      toast.error("خطأ في الاتصال");
    } finally {
      setProcessingId(null);
    }
  }

  // Helper: Role Badges
  const getRoleBadge = (role) => {
    const styles = {
      admin: "bg-purple-100 text-purple-700 border-purple-200",
      office: "bg-blue-100 text-blue-700 border-blue-200",
      owner: "bg-green-100 text-green-700 border-green-200",
      tenant: "bg-amber-100 text-amber-700 border-amber-200",
      office_admin: "bg-blue-100 text-blue-700 border-blue-200",
      self_office_admin: "bg-blue-100 text-blue-700 border-blue-200",
    };
    const labels = { admin: "أدمن", office: "مكتب", owner: "مالك", tenant: "مستأجر" , office_admin: "أدمن مكتب", self_office_admin: "مكتب خاص" };
    
    return (
      <Badge key={role} variant="outline" className={`font-normal ${styles[role] || "bg-gray-100 text-gray-700"}`}>
        {labels[role] || role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      {/* 📊 Stats HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المستخدمين" value={stats.total} icon={<Users size={20}/>} colorClass="text-blue-600" bgClass="bg-blue-50"/>
        <StatCard title="حسابات نشطة" value={stats.active} icon={<CheckCircle2 size={20}/>} colorClass="text-emerald-600" bgClass="bg-emerald-50"/>
        <StatCard title="مدراء النظام" value={stats.admins} icon={<Shield size={20}/>} colorClass="text-purple-600" bgClass="bg-purple-50"/>
        <StatCard title="المكاتب المسجلة" value={stats.offices} icon={<Building2 size={20}/>} colorClass="text-amber-600" bgClass="bg-amber-50"/>
      </div>

      {/* 🎛️ Main Content */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
               <UserCog className="text-gray-500" size={20}/> إدارة المستخدمين
            </CardTitle>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
               {/* Role Filter */}
               <div className="relative">
                  <select 
                    className="h-10 pl-3 pr-8 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                     <option value="all">جميع الأدوار</option>
                     <option value="admin">أدمن</option>
                     <option value="office">مكتب</option>
                     <option value="owner">مالك</option>
                     <option value="tenant">مستأجر</option>
                  </select>
                  <Filter size={14} className="absolute top-3 left-3 text-gray-400 pointer-events-none" />
               </div>

               {/* Search */}
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute top-3 right-3 text-gray-400" size={16} />
                  <Input 
                    placeholder="بحث بالاسم، الجوال..." 
                    className="pr-9 h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>

               <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
                <p>جاري تحميل المستخدمين...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="bg-gray-50 p-4 rounded-full mb-3">
                   <Users size={32} className="text-gray-300" />
                </div>
                <p>لا يوجد مستخدمين مطابقين للبحث</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="p-4">المستخدم</th>
                    <th className="p-4">الصلاحيات / الأدوار</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">تاريخ التسجيل</th>
                    {canManage && <th className="p-4 text-center">إجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors group">
                      
                      {/* User Info */}
                      <td className="p-4">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 bg-emerald-50 border border-emerald-100">
                               <AvatarFallback className="text-emerald-700 font-bold text-xs">
                                  {u.name ? u.name.charAt(0) : "U"}
                               </AvatarFallback>
                            </Avatar>
                            <div>
                               <p className="font-bold text-gray-900">{u.name}</p>
                               <p className="text-xs text-gray-500 dir-ltr text-right">{u.phone}</p>
                            </div>
                         </div>
                      </td>

                      {/* Roles */}
                      <td className="p-4">
                         <div className="flex flex-wrap gap-1">
                            {u.roles?.length > 0 ? u.roles.map(r => getRoleBadge(r)) : <span className="text-gray-400 text-xs">لا يوجد</span>}
                         </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                         {u.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 font-medium">نشط</Badge>
                         ) : (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 font-medium">موقوف</Badge>
                         )}
                      </td>

                      {/* Date */}
                      <td className="p-4 text-center text-gray-500 text-xs">
                         {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : "—"}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="p-4 text-center">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                    {processingId === u.id ? <Loader2 className="animate-spin" size={16}/> : <MoreVertical size={16} />}
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                 <DropdownMenuLabel>خيارات المستخدم</DropdownMenuLabel>
                                 <DropdownMenuSeparator />
                                 
                                 <DropdownMenuItem onClick={() => handleRoleEditOpen(u)} className="cursor-pointer">
                                    <Shield size={14} className="ml-2" /> تعديل الصلاحيات
                                 </DropdownMenuItem>
                                 
                                 <DropdownMenuItem onClick={() => toggleActive(u.id, u.is_active)} className={`cursor-pointer ${u.is_active ? 'text-red-600 focus:text-red-700' : 'text-green-600 focus:text-green-700'}`}>
                                    {u.is_active ? <><XCircle size={14} className="ml-2"/> إيقاف الحساب</> : <><CheckCircle2 size={14} className="ml-2"/> تفعيل الحساب</>}
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </td>
                      )}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🛡️ Edit Roles Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل صلاحيات المستخدم</DialogTitle>
            <DialogDescription>
               حدد الأدوار التي ترغب في منحها للمستخدم <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
             {rolesList.map((role) => {
                const isChecked = selectedRoles.includes(role.id);
                return (
                   <div key={role.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${isChecked ? "border-emerald-500 bg-emerald-50" : "hover:bg-gray-50"}`}
                      onClick={() => {
                         if (isChecked) setSelectedRoles(prev => prev.filter(id => id !== role.id));
                         else setSelectedRoles(prev => [...prev, role.id]);
                      }}
                   >
                      <div className="flex items-center gap-2">
                         {getRoleBadge(role.role_name)}
                         <span className="text-sm text-gray-600 font-medium">{role.role_name === 'admin' ? 'مدير النظام الكامل' : role.role_name === 'office' ? 'إدارة مكتب عقاري' : role.role_name}</span>
                      </div>
                      <Checkbox checked={isChecked} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                   </div>
                )
             })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>إلغاء</Button>
            <Button onClick={saveUserRoles} className="bg-emerald-600 hover:bg-emerald-700">حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}