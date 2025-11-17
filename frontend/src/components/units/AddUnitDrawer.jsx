import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config"; // ✅ تم استيراد الإعدادات العامة

export default function AddUnitDrawer({ open, setOpen, propertyId, editUnit, refresh }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    unit_no: "",
    unit_type: "",
    unit_area: "",
    electric_meter_no: "",
    water_meter_no: "",
    status: "vacant",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // 📥 تعبئة بيانات الوحدة عند التعديل
  useEffect(() => {
    if (editUnit) setForm(editUnit);
  }, [editUnit]);

  // ✍️ التعامل مع التغييرات في الحقول
  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // 💾 حفظ أو تحديث الوحدة
  async function handleSave() {
    if (!form.unit_no || !form.unit_type)
      return toast.error("يرجى تعبئة رقم الوحدة ونوعها");

    setSaving(true);
    try {
      const method = editUnit ? "PUT" : "POST";
      const url = editUnit
        ? `${API_URL}/units/${editUnit.id}`
        : `${API_URL}/units`;

      const body = { ...form, property_id: propertyId };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY, // ✅ إضافة مفتاح الـ API
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json.message || "حدث خطأ أثناء حفظ الوحدة");
      }

      toast.success(editUnit ? "✅ تم تحديث الوحدة بنجاح" : "✅ تم إضافة الوحدة بنجاح");
      setOpen(false);
      if (refresh) refresh();
    } catch (err) {
      console.error("❌ Error saving unit:", err);
      toast.error(err.message || "فشل حفظ بيانات الوحدة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-md ml-auto p-0 h-[100vh] flex flex-col">
        {/* Header */}
        <DrawerHeader className="flex justify-between items-center border-b p-4">
          <DrawerTitle className="text-lg font-bold">
            {editUnit ? "✏️ تعديل الوحدة" : "➕ إضافة وحدة جديدة"}
          </DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          <InputField
            label="رقم الوحدة"
            type="number"
            value={form.unit_no}
            onChange={(v) => handleChange("unit_no", v)}
          />

          <InputField
            label="نوع الوحدة"
            value={form.unit_type}
            onChange={(v) => handleChange("unit_type", v)}
          />

          <InputField
            label="مساحة الوحدة (م²)"
            type="number"
            value={form.unit_area}
            onChange={(v) => handleChange("unit_area", v)}
          />

          <InputField
            label="رقم عداد الكهرباء"
            value={form.electric_meter_no}
            onChange={(v) => handleChange("electric_meter_no", v)}
          />

          <InputField
            label="رقم عداد الماء"
            value={form.water_meter_no}
            onChange={(v) => handleChange("water_meter_no", v)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              حالة الوحدة
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-300 outline-none"
            >
              <option value="vacant">شاغرة</option>
              <option value="occupied">مؤجرة</option>
            </select>
          </div>

          <InputField
            label="ملاحظات"
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
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/* 🧱 حقل إدخال بسيط */
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
