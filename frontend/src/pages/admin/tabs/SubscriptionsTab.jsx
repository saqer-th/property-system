import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, RotateCcw, Calendar, Loader2 } from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function SubscriptionsTab() {
  const [subs, setSubs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  // ==============================
  // 🔹 تحميل الاشتراكات
  // ==============================
  useEffect(() => {
    fetchSubs();
  }, []);

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
      toast.error("❌ فشل تحميل الاشتراكات");
      console.error("❌ Error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // 🔍 البحث
  // ==============================
  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      subs.filter((s) => s.office_name?.toLowerCase().includes(term))
    );
  }, [search, subs]);

  // ==============================
  // 🔁 تجديد الاشتراك
  // ==============================
  async function renewSubscription(id) {
    if (renewing) return;
    setRenewing(true);
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
        toast.success("✅ تم تجديد الاشتراك بنجاح");
        fetchSubs();
      } else {
        toast.error("⚠️ فشل في التجديد");
      }
    } catch (err) {
      toast.error("❌ خطأ في الاتصال بالسيرفر");
      console.error(err);
    } finally {
      setRenewing(false);
    }
  }

  // ==============================
  // 🧠 حالة الاشتراك + الأيام المتبقية
  // ==============================
  const getStatusBadge = (isActive, endDate) => {
    if (!endDate)
      return <Badge className="bg-gray-400 text-white">غير محدد</Badge>;

    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = Math.floor((end - now) / (1000 * 60 * 60 * 24));

    if (!isActive)
      return (
        <Badge className="bg-red-500 text-white">
          منتهي ({Math.abs(daysLeft)} يوم)
        </Badge>
      );
    if (daysLeft < 0)
      return (
        <Badge className="bg-red-500 text-white">
          منتهي ({Math.abs(daysLeft)} يوم)
        </Badge>
      );
    if (daysLeft < 30)
      return (
        <Badge className="bg-yellow-500 text-white">
          قريب الانتهاء ({daysLeft} يوم)
        </Badge>
      );

    return (
      <Badge className="bg-green-500 text-white">
        نشط ({daysLeft} يوم)
      </Badge>
    );
  };

  // ==============================
  // 🧱 الواجهة
  // ==============================
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>💳 إدارة الاشتراكات</span>
          <div className="flex items-center gap-2">
            <Input
              placeholder="🔍 بحث باسم المكتب"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-60"
            />
            <Button variant="outline" onClick={fetchSubs}>
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
          <p className="text-center py-6 text-gray-500">
            لا توجد اشتراكات حالياً
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center border">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">المكتب</th>
                  <th className="p-2 border">رقم الجوال</th>
                  <th className="p-2 border">الباقة</th>
                  <th className="p-2 border">الحالة</th>
                  <th className="p-2 border">تاريخ البداية</th>
                  <th className="p-2 border">تاريخ الانتهاء</th>
                  <th className="p-2 border">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const start = s.start_date
                    ? new Date(s.start_date).toLocaleDateString("ar-SA")
                    : "-";
                  const end = s.end_date
                    ? new Date(s.end_date).toLocaleDateString("ar-SA")
                    : "-";
                  return (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 border">{i + 1}</td>
                      <td className="p-2 border font-medium">
                        {s.office_name}
                      </td>
                      <td className="p-2 border text-gray-600">
                        {s.office_phone || "-"}
                      </td>
                      <td className="p-2 border">{s.plan_name || "Basic"}</td>
                      <td className="p-2 border">
                        {getStatusBadge(s.is_active, s.end_date)}
                      </td>
                      <td className="p-2 border text-gray-600">{start}</td>
                      <td className="p-2 border text-gray-600 flex items-center justify-center gap-1">
                        <Calendar size={14} />
                        {end}
                      </td>
                      <td className="p-2 border">
                        {renewing ? (
                          <Loader2
                            className="animate-spin mx-auto text-blue-500"
                            size={16}
                          />
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => renewSubscription(s.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <RotateCcw size={16} className="mr-1" /> تجديد سنة
                          </Button>
                        )}
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
  );
}
