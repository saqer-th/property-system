import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  PauseCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function OfficesTab() {
  const [offices, setOffices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  // ✅ تحميل المكاتب من السيرفر
  useEffect(() => {
    fetchOffices();
  }, []);

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

      if (!res.ok || !data.success) {
        toast.error(data.message || "🚫 فشل تحميل المكاتب");
        setOffices([]);
        setFiltered([]);
        return;
      }

      // ✅ تأكد أن النتيجة مصفوفة
      const result = Array.isArray(data.data) ? data.data : [];
      setOffices(result);
      setFiltered(result);
    } catch (err) {
      console.error("❌ Error fetching offices:", err);
      toast.error("❌ فشل الاتصال بالسيرفر");
      setOffices([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  // 🔍 البحث بالاسم أو الجوال
  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      offices.filter(
        (o) =>
          o.name?.toLowerCase().includes(term) ||
          o.phone?.includes(term) ||
          o.owner_name?.toLowerCase().includes(term)
      )
    );
  }, [search, offices]);

  // 🔄 تحديث حالة المكتب
  async function updateStatus(id, newStatus) {
    setUpdating(true);
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
        toast.success("✅ تم تحديث الحالة بنجاح");
        fetchOffices();
      } else {
        toast.error(json.message || "⚠️ فشل في تحديث الحالة");
      }
    } catch (err) {
      console.error("❌ Error updating office status:", err);
      toast.error("❌ خطأ في الاتصال بالسيرفر");
    } finally {
      setUpdating(false);
    }
  }

  // 🧠 دالة مساعدة لعرض الحالة بألوان مختلفة
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">معتمد</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">قيد المراجعة</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">مرفوض</Badge>;
      case "suspended":
        return <Badge className="bg-gray-500">موقوف</Badge>;
      default:
        return <Badge className="bg-slate-400">غير معروف</Badge>;
    }
  };

  // 🔔 لون الاشتراك
  const getSubscriptionBadge = (endDate, isActive) => {
    if (!endDate) return <Badge className="bg-gray-300">لا يوجد اشتراك</Badge>;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.floor((end - now) / (1000 * 60 * 60 * 24));

    if (!isActive) return <Badge className="bg-red-500">منتهي</Badge>;
    if (diffDays < 30) return <Badge className="bg-yellow-500">قارب الانتهاء</Badge>;
    return <Badge className="bg-green-500">نشط</Badge>;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🏢 المكاتب العقارية</span>
          <div className="flex items-center gap-2">
            <Input
              placeholder="🔍 بحث بالاسم أو الجوال"
              className="w-60"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={fetchOffices}>
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
          <p className="text-center py-6 text-gray-500">لا توجد مكاتب مسجلة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center border">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">اسم المكتب</th>
                  <th className="p-2 border">صاحب المكتب</th>
                  <th className="p-2 border">رقم الجوال</th>
                  <th className="p-2 border">البريد الإلكتروني</th>
                  <th className="p-2 border">الحالة</th>
                  <th className="p-2 border">الاشتراك</th>
                  <th className="p-2 border">انتهاء الاشتراك</th>
                  <th className="p-2 border">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-2 border">{i + 1}</td>
                    <td className="p-2 border font-medium">{o.name}</td>
                    <td className="p-2 border">{o.owner_name || "-"}</td>
                    <td className="p-2 border">{o.phone}</td>
                    <td className="p-2 border">{o.email || "-"}</td>

                    {/* 🏷️ الحالة */}
                    <td className="p-2 border">{getStatusBadge(o.status)}</td>

                    {/* 💳 حالة الاشتراك */}
                    <td className="p-2 border">
                      {getSubscriptionBadge(o.end_date, o.subscription_active)}
                    </td>

                    {/* 📅 تاريخ الانتهاء */}
                    <td className="p-2 border text-gray-600">
                      {o.end_date ? (
                        <div className="flex justify-center items-center gap-1">
                          <Calendar size={14} />{" "}
                          {new Date(o.end_date).toLocaleDateString("ar-SA")}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* 🎛️ أزرار الإجراءات */}
                    <td className="p-2 border">
                      {updating ? (
                        <Loader2 className="animate-spin mx-auto" size={16} />
                      ) : (
                        <div className="flex justify-center gap-2">
                          {o.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateStatus(o.id, "approved")}
                              >
                                <CheckCircle size={16} className="mr-1" /> اعتماد
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateStatus(o.id, "rejected")}
                              >
                                <XCircle size={16} className="mr-1" /> رفض
                              </Button>
                            </>
                          )}

                          {o.status === "approved" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-gray-600 hover:bg-gray-700 text-white"
                              onClick={() => updateStatus(o.id, "suspended")}
                            >
                              <PauseCircle size={16} className="mr-1" /> إيقاف
                            </Button>
                          )}

                          {o.status === "suspended" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => updateStatus(o.id, "approved")}
                            >
                              <CheckCircle size={16} className="mr-1" /> إعادة تفعيل
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
