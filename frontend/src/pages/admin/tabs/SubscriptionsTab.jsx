import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw,
  RotateCcw,
  Calendar,
  Loader2,
  Search,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Filter,
  Building2
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import toast, { Toaster } from "react-hot-toast";
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

// --- Progress Bar for Days Remaining ---
const SubscriptionProgress = ({ startDate, endDate }) => {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  
  const totalDuration = end - start;
  const elapsed = now - start;
  const percentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  
  // Inverse logic: low percentage means just started (green), high means ending (red)
  let color = "bg-emerald-500";
  if (percentage > 75) color = "bg-amber-500";
  if (percentage > 90) color = "bg-red-500";

  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
    </div>
  );
};

export default function SubscriptionsTab() {
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  const [subs, setSubs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, expiring, expired
  const [loading, setLoading] = useState(false);
  const [renewing, setRenewing] = useState(null); // ID of sub being renewed

  // 1. Fetch Data
  async function fetchSubs() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/subscriptions`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : [];
      setSubs(list);
      setFiltered(list);
    } catch (err) {
      toast.error("فشل تحميل الاشتراكات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubs();
  }, []);

  // 2. Filter Logic
  useEffect(() => {
    let results = subs;

    // Search
    if (search) {
      const term = search.toLowerCase();
      results = results.filter(s => 
        s.office_name?.toLowerCase().includes(term) ||
        s.office_phone?.includes(term)
      );
    }

    // Status Filter
    if (statusFilter !== "all") {
      const now = new Date();
      results = results.filter(s => {
        const end = new Date(s.end_date);
        const daysLeft = Math.floor((end - now) / (1000 * 60 * 60 * 24));
        
        if (statusFilter === "active") return s.is_active && daysLeft >= 30;
        if (statusFilter === "expiring") return s.is_active && daysLeft < 30 && daysLeft >= 0;
        if (statusFilter === "expired") return !s.is_active || daysLeft < 0;
        return true;
      });
    }

    setFiltered(results);
  }, [search, statusFilter, subs]);

  // 3. Actions
  async function renewSubscription(id) {
    setRenewing(id);
    try {
      const res = await fetch(`${API_URL}/admin/subscriptions/${id}/renew`, {
        method: "PUT",
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم تجديد الاشتراك لمدة سنة");
        fetchSubs();
      } else {
        toast.error("فشل التجديد");
      }
    } catch (err) {
      toast.error("خطأ في الاتصال");
    } finally {
      setRenewing(null);
    }
  }

  // 4. Stats Calculation
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: subs.length,
      active: subs.filter(s => s.is_active && new Date(s.end_date) > now).length,
      expiring: subs.filter(s => {
         const end = new Date(s.end_date);
         const days = (end - now) / (1000 * 60 * 60 * 24);
         return s.is_active && days < 30 && days >= 0;
      }).length,
      revenue: subs.reduce((acc, curr) => acc + (curr.price || 0), 0) // Assuming price field exists
    };
  }, [subs]);

  // Helper: Status Badge
  const getStatusBadge = (isActive, endDate) => {
    if (!endDate) return <Badge variant="secondary">غير محدد</Badge>;
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = Math.floor((end - now) / (1000 * 60 * 60 * 24));

    if (!isActive || daysLeft < 0) return <Badge variant="destructive">منتهي</Badge>;
    if (daysLeft < 30) return <Badge className="bg-amber-500 hover:bg-amber-600">قريب الانتهاء ({daysLeft} يوم)</Badge>;
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">نشط ({daysLeft} يوم)</Badge>;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      {/* 📊 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="إجمالي الاشتراكات" value={stats.total} icon={<CreditCard size={20}/>} colorClass="text-blue-600" bgClass="bg-blue-50"/>
        <StatCard title="اشتراكات نشطة" value={stats.active} icon={<CheckCircle2 size={20}/>} colorClass="text-emerald-600" bgClass="bg-emerald-50"/>
        <StatCard title="تنتهي قريباً" value={stats.expiring} icon={<AlertTriangle size={20}/>} colorClass="text-amber-600" bgClass="bg-amber-50"/>
      </div>

      {/* 🎛️ Controls & Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
               <CreditCard className="text-gray-500" size={20}/> إدارة الاشتراكات
            </CardTitle>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
               {/* Filter */}
               <div className="relative">
                  <select 
                    className="h-10 pl-3 pr-8 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                     <option value="all">جميع الحالات</option>
                     <option value="active">✅ نشط</option>
                     <option value="expiring">⚠️ ينتهي قريباً</option>
                     <option value="expired">⛔ منتهي</option>
                  </select>
                  <Filter size={14} className="absolute top-3 left-3 text-gray-400 pointer-events-none" />
               </div>

               {/* Search */}
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute top-3 right-3 text-gray-400" size={16} />
                  <Input 
                    placeholder="بحث باسم المكتب..." 
                    className="pr-9 h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>

               <Button variant="outline" size="icon" onClick={fetchSubs} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
                <p>جاري تحميل البيانات...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="bg-gray-50 p-4 rounded-full mb-3">
                   <CreditCard size={32} className="text-gray-300" />
                </div>
                <p>لا توجد اشتراكات مطابقة</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="p-4">المكتب</th>
                    <th className="p-4">الباقة</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">المدة المتبقية</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors group">
                      
                      {/* Office Info */}
                      <td className="p-4">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
                               <Building2 size={18}/>
                            </div>
                            <div>
                               <p className="font-bold text-gray-900">{s.office_name}</p>
                               <p className="text-xs text-gray-500 dir-ltr text-right">{s.office_phone || "—"}</p>
                            </div>
                         </div>
                      </td>

                      {/* Plan Info */}
                      <td className="p-4">
                         <Badge variant="outline" className="font-normal bg-white border-gray-300 text-gray-700">
                            {s.plan_name || "Basic Plan"}
                         </Badge>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                         {getStatusBadge(s.is_active, s.end_date)}
                      </td>

                      {/* Duration / Progress */}
                      <td className="p-4 w-48">
                         <div className="flex flex-col items-center">
                            <div className="flex justify-between w-full text-[10px] text-gray-500 mb-1">
                               <span>{new Date(s.start_date).toLocaleDateString('en-GB')}</span>
                               <span>{new Date(s.end_date).toLocaleDateString('en-GB')}</span>
                            </div>
                            <SubscriptionProgress startDate={s.start_date} endDate={s.end_date} />
                         </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                  {renewing === s.id ? <Loader2 className="animate-spin" size={16}/> : <MoreVertical size={16} />}
                               </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                               <DropdownMenuLabel>إدارة الاشتراك</DropdownMenuLabel>
                               <DropdownMenuSeparator />
                               <DropdownMenuItem onClick={() => renewSubscription(s.id)} className="cursor-pointer text-blue-600 focus:text-blue-700">
                                  <RotateCcw size={14} className="ml-2" /> تجديد لمدة سنة
                               </DropdownMenuItem>
                               <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                                  <Calendar size={14} className="ml-2" /> تغيير الباقة (قريباً)
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
    </div>
  );
}