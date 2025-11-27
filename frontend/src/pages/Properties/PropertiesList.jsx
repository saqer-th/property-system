import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Building2,
  MapPin,
  FileText,
  ShieldAlert,
  LayoutGrid,
  List,
  Filter
} from "lucide-react";
import AddPropertyDrawer from "@/components/properties/AddPropertyDrawer";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function PropertiesList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'

  const activeRole = user?.activeRole;

  // 🔒 صلاحيات الإضافة
  const canAdd = ["admin", "office_admin", "office"].includes(activeRole);

  // 🏢 تحميل العقارات الخاصة بالمستخدم الحالي
  async function fetchProperties() {
    if (!user?.token) {
      setError("يرجى تسجيل الدخول للوصول إلى العقارات الخاصة بك.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/properties/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": activeRole,
        },
      });

      if (res.status === 401 || res.status === 403) {
        setError("ليس لديك صلاحية للوصول إلى هذه البيانات.");
        setProperties([]);
        setFiltered([]);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setProperties(list);
      setFiltered(list);
      setError("");
    } catch (err) {
      console.error("❌ Error loading properties:", err);
      setError("حدث خطأ أثناء تحميل العقارات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProperties();
  }, [user]);

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
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="text-primary" />
              {t("propertiesList") || "قائمة العقارات"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {t("propertiesSubtitle") || "Manage your real estate portfolio efficiently."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="bg-gray-100 p-1 rounded-lg flex items-center">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"}`}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700"}`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>


          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t("searchProperty") || "ابحث عن عقار..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

        </div>

        {/* Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm">{t("loadingData")}</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-red-700 mb-2">Error Loading Data</h3>
            <p className="text-red-600">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <Building2 size={64} className="mx-auto text-gray-200 mb-6" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t("noPropertiesFound")}</h3>
            <p className="text-gray-500 mb-6">No properties match your search criteria.</p>
            {canAdd && (
              <Button onClick={() => setDrawerOpen(true)} variant="outline">
                {t("addProperty")}
              </Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "list" ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                      <tr>
                        <th className="p-4">{t("titleDeedNo")}</th>
                        <th className="p-4">{t("propertyType")}</th>
                        <th className="p-4">{t("propertyUsage")}</th>
                        <th className="p-4">{t("numUnits")}</th>
                        <th className="p-4">{t("city")}</th>
                        <th className="p-4">{t("nationalAddress")}</th>
                        <th className="p-4 text-right">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((p, i) => (
                        <tr
                          key={i}
                          className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                          onClick={() => (window.location.href = `/properties/${p.id}`)}
                        >
                          <td className="p-4 font-semibold text-gray-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <FileText size={16} />
                              </div>
                              {p.title_deed_no || "—"}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {p.property_type || "—"}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">{p.property_usage || "—"}</td>
                          <td className="p-4 font-medium">{p.num_units || 0}</td>
                          <td className="p-4 text-gray-600">{p.city || "—"}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <MapPin size={14} />
                              <span className="truncate max-w-[200px]">{p.national_address || "—"}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/5 hover:text-primary font-medium"
                            >
                              {t("viewDetails")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p, i) => (
                  <Card
                    key={i}
                    className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-gray-100 overflow-hidden"
                    onClick={() => (window.location.href = `/properties/${p.id}`)}
                  >
                    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                        {p.property_type}
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-primary transition-colors">
                        {p.title_deed_no || "Untitled Property"}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mb-4">
                        <MapPin size={12} />
                        {p.city} • {p.national_address}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="text-center">
                          <p className="text-xs text-gray-400 uppercase font-bold">Units</p>
                          <p className="font-bold text-gray-900">{p.num_units || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 uppercase font-bold">Usage</p>
                          <p className="font-bold text-gray-900">{p.property_usage || "-"}</p>
                        </div>
                        <Button size="sm" variant="secondary" className="h-8 text-xs">
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ➕ Drawer الإضافة (يظهر فقط للمصرح لهم) */}
        {canAdd && (
          <AddPropertyDrawer
            open={drawerOpen}
            setOpen={setDrawerOpen}
            refresh={fetchProperties}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
