import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Home,
  FileText,
  PlusCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import AddUnitDrawer from "@/components/units/AddUnitDrawer";
import EditDrawer from "@/components/common/EditDrawer";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function PropertyDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);

  const activeRole = user?.activeRole;
  const canEdit = activeRole === "office_admin"; // المدير فقط
  const canAdd = ["office_admin", "office"].includes(activeRole); // المدير والموظف

  // 📦 تحميل بيانات العقار والوحدات
  useEffect(() => {
    async function fetchProperty() {
      if (!user?.token) {
        setError(t("pleaseLogin") || "الرجاء تسجيل الدخول أولاً");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/properties/${id}`, {
          headers: {
            "x-api-key": API_KEY,
            Authorization: `Bearer ${user.token}`,
            "x-active-role": activeRole,
          },
        });

        if (res.status === 401 || res.status === 403) {
          setError(t("noPermission") || "🚫 لا تملك صلاحية لعرض هذا العقار");
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to fetch property");
        }

        const data = json.data || json;
        setProperty(data);
        setUnits(data.units || []);
        setError("");
      } catch (err) {
        console.error("❌ Error loading property:", err);
        setError(t("failedToLoadProperty") || "فشل تحميل بيانات العقار");
        toast.error(t("failedToLoadProperty") || "فشل تحميل بيانات العقار");
      } finally {
        setLoading(false);
      }
    }

    fetchProperty();
  }, [id, user, t]);

  // 🕓 حالة التحميل
  if (loading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          {t("loadingData") || "جاري تحميل البيانات..."}
        </div>
      </DashboardLayout>
    );

  // 🚫 حالة الخطأ
  if (error)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-red-600">
          <ShieldAlert size={36} className="mb-2" />
          <p className="text-center max-w-md">{error}</p>
        </div>
      </DashboardLayout>
    );

  if (!property)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("noPropertyFound")}</p>
      </DashboardLayout>
    );

  // =============================== JSX ===============================
  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-6 space-y-6">
        {/* 🏢 معلومات العقار */}
        <Card className="bg-card border border-border shadow-md">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-emerald-700">
              <Building2 size={18} />
              {property.property_name ||
                property.title_deed_no ||
                t("propertyDetails")}
            </CardTitle>

            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setEditDrawerOpen(true)}
                className="flex items-center gap-1"
              >
                <FileText size={14} />
                {t("editProperty")}
              </Button>
            )}
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p>
              <b>{t("titleDeedNo")}:</b> {property.title_deed_no || "—"}
            </p>
            <p>
              <b>{t("propertyType")}:</b> {property.property_type || "—"}
            </p>
            <p>
              <b>{t("propertyUsage")}:</b> {property.property_usage || "—"}
            </p>
            <p>
              <b>{t("numUnits")}:</b> {property.num_units || 0}
            </p>
            <p>
              <b>{t("nationalAddress")}:</b> {property.national_address || "—"}
            </p>
          </CardContent>
        </Card>

        {/* 🏘️ الوحدات التابعة */}
        <Card className="bg-card border border-border shadow-md">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-600">
              <Home size={18} /> {t("unitsList")}
            </CardTitle>

            {canAdd && (
              <Button
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setUnitDrawerOpen(true)}
              >
                <PlusCircle size={16} />
                {t("addUnit")}
              </Button>
            )}
          </CardHeader>

          <CardContent>
            {units.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noUnitsFound")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("unitNo")}</th>
                      <th className="p-2 text-start">{t("unitType")}</th>
                      <th className="p-2 text-start">{t("unitArea")}</th>
                      <th className="p-2 text-start">{t("electricMeter")}</th>
                      <th className="p-2 text-start">{t("waterMeter")}</th>
                      <th className="p-2 text-start">{t("status")}</th>
                      <th className="p-2 text-start">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u, i) => (
                      <tr
                        key={i}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="p-2">{u.unit_no || "—"}</td>
                        <td className="p-2">{u.unit_type || "—"}</td>
                        <td className="p-2">
                          {u.unit_area ? `${u.unit_area} م²` : "—"}
                        </td>
                        <td className="p-2">{u.electric_meter_no || "—"}</td>
                        <td className="p-2">{u.water_meter_no || "—"}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              u.status === "occupied"
                                ? "text-emerald-600 bg-emerald-50"
                                : "text-gray-600 bg-gray-100"
                            }`}
                          >
                            {u.status === "occupied"
                              ? t("occupied")
                              : t("vacant")}
                          </span>
                        </td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/units/${u.id}`)
                            }
                          >
                            {t("viewDetails")}
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

        {/* 🧱 Drawers */}
        {canEdit && (
          <EditDrawer
            open={editDrawerOpen}
            setOpen={(val) => {
              setEditDrawerOpen(val);
              if (!val) window.location.reload();
            }}
            section="property"
            contract={property}
            setContract={setProperty}
          />
        )}

        {canAdd && (
          <AddUnitDrawer
            open={unitDrawerOpen}
            setOpen={setUnitDrawerOpen}
            propertyId={property.id}
            refresh={() => window.location.reload()}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
