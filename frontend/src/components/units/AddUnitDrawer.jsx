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

export default function AddUnitDrawer({ open, setOpen, propertyId, editUnit, refresh }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    unit_no: "",
    unit_type: "",
    unit_area: "",
    ac_type: "",
    floor: "",
    status: "vacant",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const API_URL = "http://localhost:8085/units";

  // 📥 إذا نعدل وحدة، نعبّي بياناتها
  useEffect(() => {
    if (editUnit) setForm(editUnit);
  }, [editUnit]);

  // ✍️ تحديث الحقول
  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // 💾 حفظ الوحدة (جديدة أو محدثة)
  async function handleSave() {
    if (!form.unit_no || !form.unit_type)
      return toast.error(t("fillRequiredFields"));

    setSaving(true);
    try {
      const method = editUnit ? "PUT" : "POST";
      const url = editUnit ? `${API_URL}/${editUnit.id}` : API_URL;
      const body = { ...form, property_id: propertyId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(editUnit ? t("unitUpdated") : t("unitAdded"));
      setOpen(false);
      if (refresh) refresh();
    } catch (err) {
      console.error(err);
      toast.error(t("saveFailed"));
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
            {editUnit ? t("editUnit") : t("addUnit")}
          </DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <InputField
            label={t("unitNo")}
            value={form.unit_no}
            onChange={(v) => handleChange("unit_no", v)}
          />
          <InputField
            label={t("unitType")}
            value={form.unit_type}
            onChange={(v) => handleChange("unit_type", v)}
          />
          <InputField
            label={t("unitArea")}
            type="number"
            value={form.unit_area}
            onChange={(v) => handleChange("unit_area", v)}
          />
          <InputField
            label={t("acType")}
            value={form.ac_type}
            onChange={(v) => handleChange("ac_type", v)}
          />
          <InputField
            label={t("floor")}
            value={form.floor}
            onChange={(v) => handleChange("floor", v)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t("status")}
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-300 outline-none"
            >
              <option value="vacant">{t("vacant")}</option>
              <option value="occupied">{t("occupied")}</option>
            </select>
          </div>
          <InputField
            label={t("notes")}
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
            {saving ? t("saving") : t("save")}
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
