import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Loader2,
  CheckCircle,
  XCircle,
  PauseCircle,
  RefreshCw,
  Calendar,
  Building2,
  Search,
  Filter,
  MoreVertical,
  Phone,
  User,
  CreditCard,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
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

export default function OfficesTab() {
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  const [offices, setOffices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null); // ID of office being updated

  // 1. Fetch Data
  async function fetchOffices() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/offices`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      
      const result = Array.isArray(data.data) ? data.data : [];
      setOffices(result);
      setFiltered(result);
    } catch (err) {
      toast.error("فشل تحميل المكاتب");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffices();
  }, []);

  // 2. Filtering Logic
  useEffect(() => {
    let results = offices;

    // Search
    if (search) {
      const term = search.toLowerCase();
      results = results.filter(o => 
        o.name?.toLowerCase().includes(term) || 
        o.phone?.includes(term) || 
        o.owner_name?.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (statusFilter !== "all") {
      results = results.filter(o => o.status === statusFilter);
    }

    setFiltered(results);
  }, [search, statusFilter, offices]);

  // 3. Stats Calculation
  const stats = useMemo(() => {
    return {
      total: offices.length,
      active: offices.filter(o => o.status === 'approved').length,
      pending: offices.filter(o => o.status === 'pending').length,
      subscriptions: offices.filter(o => o.subscription_active).length
    };
  }, [offices]);

  // 4. Actions
  async function updateStatus(id, newStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`${API_URL}/admin/offices/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم تحديث الحالة بنجاح");
        fetchOffices();
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      toast.error("فشل تحديث الحالة");
    } finally {
      setUpdating(null);
    }
  }

  // Helpers
  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      suspended: "bg-gray-100 text-gray-700 border-gray-200",
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    const labels = { active:"نشط", approved: "نشط", pending: "قيد المراجعة", rejected: "مرفوض", suspended: "موقوف" };
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.suspended}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 📊 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المكاتب" value={stats.total} icon={<Building2 size={20}/>} colorClass="text-blue-600" bgClass="bg-blue-50"/>
        <StatCard title="مكاتب نشطة" value={stats.active} icon={<CheckCircle size={20}/>} colorClass="text-emerald-600" bgClass="bg-emerald-50"/>
        <StatCard title="طلبات معلقة" value={stats.pending} icon={<AlertCircle size={20}/>} colorClass="text-amber-600" bgClass="bg-amber-50"/>
        <StatCard title="اشتراكات سارية" value={stats.subscriptions} icon={<CreditCard size={20}/>} colorClass="text-purple-600" bgClass="bg-purple-50"/>
      </div>

      {/* 🎛️ Controls & Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
               <Building2 className="text-gray-500" size={20}/> إدارة المكاتب
            </CardTitle>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
               {/* Status Filter */}
               <div className="relative">
                  <select 
                    className="h-10 pl-3 pr-8 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                     <option value="all">جميع الحالات</option>
                     <option value="approved">✅ نشط</option>
                     <option value="pending">⏳ قيد المراجعة</option>
                     <option value="suspended">⛔ موقوف</option>
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

               {/* Refresh */}
               <Button variant="outline" size="icon" onClick={fetchOffices} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="bg-gray-50 p-4 rounded-full mb-3">
                   <Building2 size={32} className="text-gray-300" />
                </div>
                <p>لا توجد مكاتب مطابقة للبحث</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="p-4">المكتب</th>
                    <th className="p-4">المالك / التواصل</th>
                    <th className="p-4 text-center">حالة الحساب</th>
                    <th className="p-4 text-center">الاشتراك</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/60 transition-colors group">
                      
                      {/* Office Info */}
                      <td className="p-4">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 bg-blue-50 border border-blue-100">
                               <AvatarFallback className="text-blue-700 font-bold">{o.name ? o.name.charAt(0) : "O"}</AvatarFallback>
                            </Avatar>
                            <div>
                               <p className="font-bold text-gray-900">{o.name}</p>
                               <p className="text-xs text-gray-500">{o.email || "لا يوجد بريد"}</p>
                            </div>
                         </div>
                      </td>

                      {/* Owner Info */}
                      <td className="p-4">
                         <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                               <User size={14} className="text-gray-400"/> {o.owner_name || "—"}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dir-ltr text-right">
                               <Phone size={12}/> {o.phone}
                            </div>
                         </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                         {getStatusBadge(o.status)}
                      </td>

                      {/* Subscription */}
                      <td className="p-4 text-center">
                         <div className="flex flex-col items-center gap-1">
                            {o.subscription_active ? (
                               <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal">ساري</Badge>
                            ) : (
                               <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-normal">منتهي</Badge>
                            )}
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                               <Calendar size={10}/> {o.end_date ? new Date(o.end_date).toLocaleDateString('en-GB') : "—"}
                            </span>
                         </div>
                      </td>

                      {/* Actions Dropdown */}
                      <td className="p-4 text-center">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                  {updating === o.id ? <Loader2 className="animate-spin" size={16} /> : <MoreVertical size={16} />}
                               </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                               <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                               <DropdownMenuSeparator />
                               
                               {o.status !== "approved" && (
                                  <DropdownMenuItem onClick={() => updateStatus(o.id, "approved")} className="text-green-600 focus:text-green-700 cursor-pointer">
                                     <CheckCircle size={14} className="ml-2"/> اعتماد
                                  </DropdownMenuItem>
                               )}
                               
                               {o.status !== "suspended" && (
                                  <DropdownMenuItem onClick={() => updateStatus(o.id, "suspended")} className="text-gray-600 focus:text-gray-700 cursor-pointer">
                                     <PauseCircle size={14} className="ml-2"/> إيقاف مؤقت
                                  </DropdownMenuItem>
                               )}

                               {o.status === "pending" && (
                                  <DropdownMenuItem onClick={() => updateStatus(o.id, "rejected")} className="text-red-600 focus:text-red-700 cursor-pointer">
                                     <XCircle size={14} className="ml-2"/> رفض الطلب
                                  </DropdownMenuItem>
                               )}
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
    </div>
  );
}