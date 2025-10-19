import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, Building2, MapPin, FileText } from "lucide-react";
import AddPropertyDrawer from "@/components/properties/AddPropertyDrawer";
import { API_URL, API_KEY } from "@/config";

export default function PropertiesList() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 🏢 تحميل العقارات من السيرفر
  async function fetchProperties() {
    try {
      const res = await fetch(`${API_URL}/properties`, {
        headers: { "x-api-key": API_KEY },
      });
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setProperties(list);
      setFiltered(list);
    } catch (err) {
      console.error("❌ Error loading properties:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProperties();
  }, []);

  // 🔍 فلترة العقارات
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const results = properties.filter(
      (p) =>
        p.title_deed_no?.toLowerCase().includes(lower) ||
        p.property_type?.toLowerCase().includes(lower) ||
        p.national_address?.toLowerCase().includes(lower)
    );
    setFiltered(results);
  }, [searchTerm, properties]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* ✅ العنوان والبحث */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <Building2 /> {t("propertiesList") || "قائمة العقارات"}
          </h1>

          <div className="flex items-center gap-3">
            {/* 🔍 حقل البحث */}
            <div className="relative w-64">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t("searchProperty") || "ابحث عن عقار..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* ➕ زر إضافة عقار */}
            <Button
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setDrawerOpen(true)}
            >
              <PlusCircle size={16} />
              {t("addProperty") || "إضافة عقار"}
            </Button>
          </div>
        </div>

        {/* ✅ جدول العقارات */}
        <Card className="bg-card border border-border shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              {t("properties") || "العقارات"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-gray-500 text-center py-8">
                {t("loadingData") || "جاري تحميل البيانات..."}
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t("noPropertiesFound") || "لا توجد عقارات حالياً"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600 border-b">
                    <tr>
                      <th className="p-3 text-start">{t("titleDeedNo") || "رقم الصك"}</th>
                      <th className="p-3 text-start">{t("propertyType") || "نوع العقار"}</th>
                      <th className="p-3 text-start">{t("propertyUsage") || "الاستخدام"}</th>
                      <th className="p-3 text-start">{t("numUnits") || "عدد الوحدات"}</th>
                      <th className="p-3 text-start">{t("nationalAddress") || "العنوان الوطني"}</th>
                      <th className="p-3 text-start">{t("actions") || "إجراءات"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr
                        key={i}
                        className="border-b hover:bg-emerald-50 transition cursor-pointer"
                      >
                        <td className="p-3 font-semibold text-emerald-700">
                          {p.title_deed_no || "—"}
                        </td>
                        <td className="p-3">{p.property_type || "—"}</td>
                        <td className="p-3">{p.property_usage || "—"}</td>
                        <td className="p-3">{p.num_units || 0}</td>
                        <td className="p-3 flex items-center gap-1 text-gray-600">
                          <MapPin size={14} className="text-gray-400" />
                          {p.national_address || "—"}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/properties/${p.id}`)
                            }
                            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          >
                            {t("viewDetails") || "عرض التفاصيل"}
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

        {/* ➕ Drawer الإضافة */}
        <AddPropertyDrawer
          open={drawerOpen}
          setOpen={setDrawerOpen}
          refresh={fetchProperties}
        />
      </div>
    </DashboardLayout>
  );
}
