import React, { useState } from "react";
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

export default function AddPropertyDrawer({ open, setOpen, refresh }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    type: "",
    city: "",
    national_address: "",
    num_units: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const API_URL = "http://localhost:8085/properties";

  // 🧠 تحديث الحقول
  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // 💾 حفظ العقار
  async function handleSave() {
    if (!form.name || !form.city || !form.type)
      return toast.error(t("fillRequiredFields"));

    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(t("propertyAdded"));
      setForm({
        name: "",
        type: "",
        city: "",
        national_address: "",
        num_units: "",
        notes: "",
      });
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
            {t("addProperty")}
          </DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <InputField
            label={t("propertyName")}
            value={form.name}
            onChange={(v) => handleChange("name", v)}
          />
          <InputField
            label={t("propertyType")}
            value={form.type}
            onChange={(v) => handleChange("type", v)}
          />
          <InputField
            label={t("city")}
            value={form.city}
            onChange={(v) => handleChange("city", v)}
          />
          <InputField
            label={t("nationalAddress")}
            value={form.national_address}
            onChange={(v) => handleChange("national_address", v)}
          />
          <InputField
            label={t("numUnits")}
            type="number"
            value={form.num_units}
            onChange={(v) => handleChange("num_units", v)}
          />
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
