import React, { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { API_URL, API_KEY } from "@/config";

export default function AddPropertyDrawer({ open, setOpen, refresh }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [form, setForm] = useState({
    property_name: "",
    property_type: "",
    property_usage: "",
    city: "",
    national_address: "",
    num_units: "",
    title_deed_no: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 🧠 تحديث الحقول
  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // 💾 حفظ العقار
  async function handleSave() {
    if (!user?.token) {
      toast.error(t("pleaseLogin") || "الرجاء تسجيل الدخول أولاً");
      return;
    }

    if (!form.property_type || !form.city || !form.national_address) {
      toast.error(t("fillRequiredFields") || "يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }

    // 🚫 تحقق من الصلاحية
    if (user.roles?.includes("tenant")) {
      toast.error(t("noPermission") || "🚫 لا تملك صلاحية لإضافة عقار");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save property");
      }

      toast.success(t("propertyAdded") || "✅ تم إضافة العقار بنجاح");

      setForm({
        property_name: "",
        property_type: "",
        property_usage: "",
        city: "",
        national_address: "",
        num_units: "",
        title_deed_no: "",
        notes: "",
      });

      setOpen(false);
      if (refresh) refresh();
    } catch (err) {
      console.error("❌ Error saving property:", err);
      setError(err.message);
      toast.error(t("saveFailed") || "فشل حفظ العقار");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-md ml-auto p-0 h-[100vh] flex flex-col">
        {/* Header */}
        <DrawerHeader className="flex justify-between items-center border-b p-4">
          <DrawerTitle className="text-lg font-bold text-emerald-700">
            🏢 {t("addProperty") || "إضافة عقار"}
          </DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 flex items-center gap-2 border-b border-red-200">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <InputField
            label={t("propertyName") || "اسم العقار"}
            value={form.property_name}
            onChange={(v) => handleChange("property_name", v)}
          />
          <InputField
            label={t("propertyType") || "نوع العقار"}
            value={form.property_type}
            onChange={(v) => handleChange("property_type", v)}
          />
          <InputField
            label={t("propertyUsage") || "الاستخدام"}
            value={form.property_usage}
            onChange={(v) => handleChange("property_usage", v)}
          />
          <InputField
            label={t("city") || "المدينة"}
            value={form.city}
            onChange={(v) => handleChange("city", v)}
          />
          <InputField
            label={t("nationalAddress") || "العنوان الوطني"}
            value={form.national_address}
            onChange={(v) => handleChange("national_address", v)}
          />
          <InputField
            label={t("numUnits") || "عدد الوحدات"}
            type="number"
            value={form.num_units}
            onChange={(v) => handleChange("num_units", v)}
          />
          <InputField
            label={t("titleDeedNo") || "رقم الصك"}
            value={form.title_deed_no}
            onChange={(v) => handleChange("title_deed_no", v)}
          />
          <InputField
            label={t("notes") || "ملاحظات"}
            value={form.notes}
            onChange={(v) => handleChange("notes", v)}
          />
        </div>

        {/* Footer */}
        <DrawerFooter className="border-t p-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? t("saving") || "جاري الحفظ..." : t("save") || "حفظ"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/* 🧱 حقل إدخال عام */
function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-300 outline-none"
      />
    </div>
  );
}
