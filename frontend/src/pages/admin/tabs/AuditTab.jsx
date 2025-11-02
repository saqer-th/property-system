import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  Clock,
  Eye,
  X,
  FileDiff,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  // ✅ تحميل السجل عند أول تشغيل
  useEffect(() => {
    fetchAudit();
  }, []);

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

      if (!json.success) {
        toast.error("🚫 لا تملك صلاحية عرض السجل أو حدث خطأ");
        return;
      }

      const data = json.data || [];
      setLogs(data);
      setFiltered(data);
    } catch (err) {
      console.error("❌ Error fetching audit:", err);
      toast.error("❌ فشل في تحميل سجل العمليات");
    } finally {
      setLoading(false);
    }
  }

  // 🔍 البحث حسب المستخدم / العملية / الكيان / الوصف
  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      logs.filter(
        (log) =>
          log.user_name?.toLowerCase().includes(term) ||
          log.action?.toLowerCase().includes(term) ||
          log.table_name?.toLowerCase().includes(term) ||
          log.description?.toLowerCase().includes(term)
      )
    );
  }, [search, logs]);

  // 🎨 ألوان العمليات
  const actionColors = {
    INSERT: "bg-green-500 text-white",
    UPDATE: "bg-blue-500 text-white",
    DELETE: "bg-red-500 text-white",
  };

  // 🧩 مقارنة بيانات قبل وبعد (إظهار الفروقات)
  function renderDiff(oldData, newData) {
    if (!oldData && !newData)
      return <p className="text-gray-400">لا توجد بيانات</p>;

    let oldObj = {};
    let newObj = {};
    try {
      oldObj = typeof oldData === "string" ? JSON.parse(oldData || "{}") : oldData || {};
      newObj = typeof newData === "string" ? JSON.parse(newData || "{}") : newData || {};
    } catch (err) {
      console.warn("⚠️ Error parsing JSON:", err);
    }

    const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];
    return (
      <table className="w-full text-sm border border-gray-200 mt-2">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-1">الحقل</th>
            <th className="border p-1">قبل</th>
            <th className="border p-1">بعد</th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map((key) => {
            const oldVal = oldObj[key];
            const newVal = newObj[key];
            const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <tr key={key} className={changed ? "bg-yellow-50" : ""}>
                <td className="border p-1 font-medium">{key}</td>
                <td className="border p-1 text-gray-500">{String(oldVal ?? "-")}</td>
                <td className="border p-1 text-gray-700 font-semibold">
                  {String(newVal ?? "-")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg font-semibold">🧾 سجل العمليات (Audit Log)</span>
            <div className="flex items-center gap-2">
              <Input
                placeholder="🔍 بحث بالاسم، العملية أو الكيان"
                className="w-72"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="outline" onClick={fetchAudit}>
                <RefreshCw size={16} className="mr-1" /> تحديث
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10 text-gray-500">
              <Loader2 className="animate-spin mr-2" /> جاري التحميل...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-6 text-gray-500">لا توجد سجلات حالياً</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-center border border-gray-200">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">المستخدم</th>
                    <th className="p-2 border">العملية</th>
                    <th className="p-2 border">الكيان</th>
                    <th className="p-2 border">التفاصيل</th>
                    <th className="p-2 border">الوقت</th>
                    <th className="p-2 border">عرض</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => (
                    <tr
                      key={log.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-2 border">{i + 1}</td>
                      <td className="p-2 border font-medium text-gray-700">
                        {log.user_name || "مستخدم"}
                      </td>
                      <td className="p-2 border">
                        <Badge
                          className={`${actionColors[log.action] || "bg-gray-400 text-white"} px-3 py-1`}
                        >
                          {log.action === "INSERT"
                            ? "إضافة"
                            : log.action === "UPDATE"
                            ? "تعديل"
                            : log.action === "DELETE"
                            ? "حذف"
                            : log.action}
                        </Badge>
                      </td>
                      <td className="p-2 border text-gray-700">
                        {log.table_name || "-"}
                      </td>
                      <td className="p-2 border text-gray-600 text-left px-3 max-w-md truncate">
                        {log.description || "-"}
                      </td>
                      <td className="p-2 border text-gray-500 text-sm">
                        <div className="flex items-center justify-center gap-1">
                          <Clock size={14} />
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString("ar-SA")
                            : "-"}
                        </div>
                      </td>
                      <td className="p-2 border">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center gap-1"
                        >
                          <Eye size={15} /> عرض
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

      {/* 🪟 نافذة التفاصيل */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-4xl p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileDiff className="text-blue-500" /> تفاصيل العملية
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedLog.description || "-"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">📂 البيانات قبل التعديل</h3>
                {renderDiff(selectedLog.old_data, "{}")}
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">🆕 البيانات بعد التعديل</h3>
                {renderDiff("{}", selectedLog.new_data)}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>👤 المستخدم: <strong>{selectedLog.user_name || "مستخدم"}</strong></p>
              <p>📁 الكيان: <strong>{selectedLog.table_name}</strong></p>
              <p>🕒 الوقت: {new Date(selectedLog.created_at).toLocaleString("ar-SA")}</p>
              <p>🌐 IP: {selectedLog.ip_address}</p>
              <p>🔗 المسار: {selectedLog.endpoint}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
