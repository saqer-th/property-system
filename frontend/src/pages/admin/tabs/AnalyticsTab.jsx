import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().split("T")[0];
}

function statusLabel(office) {
  if (office?.usage_label === "Ready to Pay") return "Ready to Pay";
  if (office?.office_status === "Semi-active") return "Semi";
  return office?.office_status || "-";
}

export default function AnalyticsTab() {
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [offices, setOffices] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState(null);
  const [officeDetails, setOfficeDetails] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const headers = {
        "x-api-key": API_KEY,
        Authorization: `Bearer ${user?.token}`,
        "x-active-role": activeRole,
      };

      const [overviewRes, officesRes, featuresRes] = await Promise.all([
        fetch(`${API_URL}/admin/analytics/overview`, { headers }),
        fetch(`${API_URL}/admin/analytics/offices`, { headers }),
        fetch(`${API_URL}/admin/analytics/features`, { headers }),
      ]);

      const overviewJson = await overviewRes.json();
      const officesJson = await officesRes.json();
      const featuresJson = await featuresRes.json();

      if (!overviewJson.success) throw new Error("Failed to load overview");
      if (!officesJson.success) throw new Error("Failed to load offices");
      if (!featuresJson.success) throw new Error("Failed to load features");

      setOverview(overviewJson.data);
      setOffices(officesJson.data || []);
      setFeatures(featuresJson.data || []);
    } catch (err) {
      console.error("❌ Analytics fetch error:", err);
      toast.error("تعذر تحميل تحليلات الاستخدام");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOfficeDetails(officeId) {
    setDetailLoading(true);
    try {
      const headers = {
        "x-api-key": API_KEY,
        Authorization: `Bearer ${user?.token}`,
        "x-active-role": activeRole,
      };
      const res = await fetch(
        `${API_URL}/admin/analytics/offices/${officeId}`,
        { headers }
      );
      const json = await res.json();
      if (!json.success) throw new Error("Failed to load office details");
      setOfficeDetails(json.data);
    } catch (err) {
      console.error("❌ Office details error:", err);
      toast.error("تعذر تحميل تفاصيل المكتب");
    } finally {
      setDetailLoading(false);
    }
  }

  function onOfficeClick(officeId) {
    setSelectedOfficeId(officeId);
    fetchOfficeDetails(officeId);
  }

  const filteredOffices = useMemo(() => {
    let list = [...offices];

    if (statusFilter === "Ready to Pay") {
      list = list.filter((o) => o.usage_label === "Ready to Pay");
    } else if (statusFilter === "Active") {
      list = list.filter((o) => o.office_status === "Active");
    } else if (statusFilter === "Semi") {
      list = list.filter((o) => o.office_status === "Semi-active");
    } else if (statusFilter === "Dormant") {
      list = list.filter((o) => o.office_status === "Dormant");
    }

    list.sort((a, b) => {
      const diff = Number(a.usage_score || 0) - Number(b.usage_score || 0);
      return sortDir === "asc" ? diff : -diff;
    });

    return list;
  }, [offices, statusFilter, sortDir]);

  const recommendations = useMemo(() => {
    const items = [];
    const office = officeDetails?.office;
    const timeline = officeDetails?.timeline || [];
    const reportCount = timeline.filter(
      (item) => item.event_type === "report_pdf_download"
    ).length;

    if (reportCount >= 5) {
      items.push("High report usage → suggest Pro plan");
    }

    if (office?.office_status === "Dormant") {
      items.push("No activity 14+ days → send reminder");
    }

    return items;
  }, [officeDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        جاري تحميل تحليلات الاستخدام...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-100">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">إجمالي المكاتب</p>
            <p className="text-2xl font-semibold text-gray-900">
              {overview?.total_offices ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">مكاتب نشطة (7 أيام)</p>
            <p className="text-2xl font-semibold text-gray-900">
              {overview?.active_offices_7d ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">مكاتب خاملة (14 يوم)</p>
            <p className="text-2xl font-semibold text-gray-900">
              {overview?.dormant_offices_14d ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">إجمالي الأحداث (30 يوم)</p>
            <p className="text-2xl font-semibold text-gray-900">
              {overview?.total_events_30d ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Offices Table */}
      <Card className="border border-gray-100">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">نشاط المكاتب</CardTitle>
          <div className="flex flex-wrap gap-3">
            <select
              className="border border-gray-200 rounded-md px-3 py-1 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">الكل</option>
              <option value="Active">نشط</option>
              <option value="Semi">نصف نشط</option>
              <option value="Dormant">خامل</option>
              <option value="Ready to Pay">جاهز للدفع</option>
            </select>
            <button
              className="border border-gray-200 rounded-md px-3 py-1 text-sm"
              onClick={() =>
                setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              ترتيب حسب السكور ({sortDir})
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right" dir="rtl">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-right px-4 py-3">اسم المكتب</th>
                  <th className="text-right px-4 py-3">آخر نشاط</th>
                  <th className="text-right px-4 py-3">الأحداث (30 يوم)</th>
                  <th className="text-right px-4 py-3">الميزات المستخدمة</th>
                  <th className="text-right px-4 py-3">سكور الاستخدام</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffices.map((office) => (
                  <tr
                    key={office.office_id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => onOfficeClick(office.office_id)}
                  >
                    <td className="px-4 py-3 text-gray-900">
                      {office.office_name || `Office ${office.office_id}`}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(office.last_activity_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {office.events_count_30d}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {office.distinct_features_used}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {office.usage_score}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {statusLabel(office)}
                    </td>
                  </tr>
                ))}
                {!filteredOffices.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Score Rules */}
      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg">كيف يتم حساب السكور؟</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-1">
              <p>dashboard_view = 5</p>
              <p>contract_open = 10</p>
              <p>contract_create = 20</p>
            </div>
            <div className="space-y-1">
              <p>report_pdf_download = 30</p>
              <p>payment_paid = 40</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            التصنيف حسب مجموع نقاط آخر 30 يوم:
            <div>جاهز للدفع: 100+ | نشط: 40–99 | استخدام منخفض: أقل من 40</div>
          </div>
        </CardContent>
      </Card>

      {/* Top Features */}
      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg">أكثر الميزات استخدامًا (30 يوم)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {features.map((feature) => (
              <div
                key={feature.event_type}
                className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2"
              >
                <span className="text-sm text-gray-800">
                  {feature.event_type}
                </span>
                <span className="text-sm text-gray-500">
                  {feature.usage_count}
                </span>
              </div>
            ))}
            {!features.length && (
              <p className="text-sm text-gray-400">لا توجد بيانات</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Office Details */}
      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg">تفاصيل المكتب</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedOfficeId && (
            <p className="text-sm text-gray-400">اختر مكتبًا لعرض التفاصيل</p>
          )}
          {selectedOfficeId && detailLoading && (
            <p className="text-sm text-gray-400">جاري تحميل التفاصيل...</p>
          )}
          {selectedOfficeId && officeDetails && !detailLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-100 rounded-md p-3">
                  <p className="text-xs text-gray-500">سكور الاستخدام</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {officeDetails.office.usage_score}
                  </p>
                </div>
                <div className="border border-gray-100 rounded-md p-3">
                  <p className="text-xs text-gray-500">التصنيف</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {officeDetails.office.usage_label}
                  </p>
                </div>
                <div className="border border-gray-100 rounded-md p-3">
                  <p className="text-xs text-gray-500">آخر نشاط</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(officeDetails.office.last_activity_date)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  الخط الزمني (آخر 100 حدث)
                </h4>
                <div className="border border-gray-100 rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-right px-3 py-2">الوقت</th>
                        <th className="text-right px-3 py-2">الحدث</th>
                        <th className="text-right px-3 py-2">الكيان</th>
                        <th className="text-right px-3 py-2">رقم الكيان</th>
                      </tr>
                    </thead>
                    <tbody>
                      {officeDetails.timeline.map((row, idx) => (
                        <tr key={`${row.event_type}-${idx}`} className="border-t">
                          <td className="px-3 py-2 text-gray-700">
                            {row.created_at}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.event_type}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.entity_type || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.entity_id || "-"}
                          </td>
                        </tr>
                      ))}
                      {!officeDetails.timeline.length && (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-3 py-3 text-center text-gray-400"
                          >
                            لا توجد أحداث
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  توصيات
                </h4>
                {recommendations.length ? (
                  <ul className="list-disc pr-5 text-sm text-gray-700 space-y-1">
                    {recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">لا توجد توصيات حالياً</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
