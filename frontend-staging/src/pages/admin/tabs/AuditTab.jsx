import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Clock,
  Eye,
  Search,
  Activity,
  PlusCircle,
  Edit3,
  Trash2,
  Filter,
  Server,
  Globe,
  User
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

// --- Diff Helper ---
const DataViewer = ({ data, title, type }) => {
  if (!data || Object.keys(data).length === 0) return null;

  const bgClass = type === 'old' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100';
  const textClass = type === 'old' ? 'text-red-800' : 'text-green-800';

  return (
    <div className={`flex-1 rounded-lg border ${bgClass} overflow-hidden`}>
      <div className={`px-3 py-2 border-b ${type === 'old' ? 'border-red-200 bg-red-100/50' : 'border-green-200 bg-green-100/50'} text-xs font-bold uppercase tracking-wide ${textClass}`}>
        {title}
      </div>
      <div className="p-3 overflow-x-auto">
        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default function AuditTab() {
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 1. Fetch Data
  async function fetchAudit() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/audit`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      
      const data = json.data || [];
      setLogs(data);
      setFiltered(data);
    } catch (err) {
      toast.error("فشل تحميل سجل العمليات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAudit();
  }, []);

  // 2. Filter Logic
  useEffect(() => {
    let results = logs;
    const term = search.toLowerCase();

    // Text Search
    if (term) {
      results = results.filter(log => 
        log.user_name?.toLowerCase().includes(term) ||
        log.table_name?.toLowerCase().includes(term) ||
        log.description?.toLowerCase().includes(term)
      );
    }

    // Action Filter
    if (actionFilter !== "all") {
      results = results.filter(log => log.action === actionFilter);
    }

    setFiltered(results);
  }, [search, actionFilter, logs]);

  // 3. Helpers
  const parseJSON = (str) => {
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch { return {}; }
  };

  const openDetails = (log) => {
    setSelectedLog({
      ...log,
      parsedOld: parseJSON(log.old_data),
      parsedNew: parseJSON(log.new_data)
    });
    setIsDialogOpen(true);
  };

  const getActionConfig = (action) => {
    switch (action) {
      case 'INSERT': return { label: "إضافة", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: PlusCircle };
      case 'UPDATE': return { label: "تعديل", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Edit3 };
      case 'DELETE': return { label: "حذف", color: "bg-red-100 text-red-700 border-red-200", icon: Trash2 };
      default: return { label: action, color: "bg-gray-100 text-gray-700", icon: Activity };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 🎛️ Controls & Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
               <Activity className="text-gray-500" size={20}/> سجل العمليات (Audit Logs)
            </CardTitle>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
               {/* Action Filter */}
               <div className="relative">
                  <select 
                    className="h-10 pl-3 pr-8 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                  >
                     <option value="all">جميع العمليات</option>
                     <option value="INSERT">➕ إضافة</option>
                     <option value="UPDATE">✏️ تعديل</option>
                     <option value="DELETE">🗑️ حذف</option>
                  </select>
                  <Filter size={14} className="absolute top-3 left-3 text-gray-400 pointer-events-none" />
               </div>

               {/* Search */}
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute top-3 right-3 text-gray-400" size={16} />
                  <Input 
                    placeholder="بحث بالمستخدم، الجدول..." 
                    className="pr-9 h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>

               {/* Refresh */}
               <Button variant="outline" size="icon" onClick={fetchAudit} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
                <p>جاري تحليل السجلات...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="bg-gray-50 p-4 rounded-full mb-3">
                   <Activity size={32} className="text-gray-300" />
                </div>
                <p>لا توجد سجلات مطابقة</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="p-4">العملية</th>
                    <th className="p-4">المستخدم</th>
                    <th className="p-4">الكيان / الجدول</th>
                    <th className="p-4">الوصف</th>
                    <th className="p-4 text-center">الوقت</th>
                    <th className="p-4 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((log) => {
                    const conf = getActionConfig(log.action);
                    const Icon = conf.icon;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => openDetails(log)}>
                        <td className="p-4">
                           <Badge variant="outline" className={`font-normal ${conf.color} flex items-center gap-1 w-fit`}>
                              <Icon size={12} /> {conf.label}
                           </Badge>
                        </td>
                        <td className="p-4 font-medium text-gray-900">
                           {log.user_name || "System"}
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-600">
                           {log.table_name}
                        </td>
                        <td className="p-4 text-gray-500 max-w-xs truncate">
                           {log.description}
                        </td>
                        <td className="p-4 text-center text-xs text-gray-400 dir-ltr">
                           {new Date(log.created_at).toLocaleString('en-GB')}
                        </td>
                        <td className="p-4 text-center">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                              <Eye size={16} />
                           </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🔎 Details Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
               <Badge variant="outline" className={`${getActionConfig(selectedLog?.action).color} px-3 py-1`}>
                  {getActionConfig(selectedLog?.action).label}
               </Badge>
               <DialogTitle className="text-lg">تفاصيل العملية</DialogTitle>
            </div>
            <DialogDescription>
               {selectedLog?.description}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-1">
             <div className="flex flex-col md:flex-row gap-4 my-4">
                {/* Show OLD data only if UPDATE or DELETE */}
                {(selectedLog?.action === 'UPDATE' || selectedLog?.action === 'DELETE') && (
                   <DataViewer data={selectedLog?.parsedOld} title="قبل التعديل (Old Data)" type="old" />
                )}
                
                {/* Show NEW data only if INSERT or UPDATE */}
                {(selectedLog?.action === 'INSERT' || selectedLog?.action === 'UPDATE') && (
                   <DataViewer data={selectedLog?.parsedNew} title="بعد التعديل (New Data)" type="new" />
                )}
             </div>

             <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 mt-4">
                <div className="space-y-1">
                   <span className="flex items-center gap-1 font-medium text-gray-900"><User size={12}/> المستخدم</span>
                   <p>{selectedLog?.user_name} (ID: {selectedLog?.user_id})</p>
                </div>
                <div className="space-y-1">
                   <span className="flex items-center gap-1 font-medium text-gray-900"><Clock size={12}/> التوقيت</span>
                   <p className="dir-ltr text-right">{selectedLog && new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                   <span className="flex items-center gap-1 font-medium text-gray-900"><Globe size={12}/> IP Address</span>
                   <p className="font-mono">{selectedLog?.ip_address || "Unknown"}</p>
                </div>
                <div className="space-y-1">
                   <span className="flex items-center gap-1 font-medium text-gray-900"><Server size={12}/> Endpoint</span>
                   <p className="font-mono truncate" title={selectedLog?.endpoint}>{selectedLog?.endpoint || "-"}</p>
                </div>
             </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}