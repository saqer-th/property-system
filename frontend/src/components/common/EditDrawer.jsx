import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Save, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

export default function EditDrawer({ open, setOpen, section, contract, setContract }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const API_BASE = "http://localhost:8085";

  // 🧭 تحديد بيانات القسم الحالي
  useEffect(() => {
    if (!section || !contract) return;

    switch (section) {
      case "contract":
        setForm({
          contract_no: contract.contract_no,
          start_date: contract.start_date?.split("T")[0],
          end_date: contract.end_date?.split("T")[0],
          rent_amount: contract.rent_amount,
          title_deed_no: contract.title_deed_no,
        });
        break;
      case "tenants":
      case "lessors":
        setForm({ list: contract[section] || [] });
        break;
      case "broker":
        setForm(contract.brokerage_entity || {});
        break;
      case "property":
        setForm(contract.property || {});
        break;
      case "units":
        setForm({ list: contract.units || [] });
        break;
      case "payments":
        setForm({ list: contract.payments || [] });
        break;
      case "expenses":
        setForm({ list: contract.expenses || [] });
        break;
      case "receipts":
        setForm({ list: contract.receipts || [] });
        break;
      default:
        setForm({});
    }
  }, [section, contract]);

  // 💾 حفظ التعديلات
  async function handleSave() {
    try {
      setSaving(true);
      let updated = { ...contract };

      if (["tenants", "lessors", "units", "payments", "expenses", "receipts"].includes(section)) {
        updated[section] = form.list;
      } else if (section === "broker") {
        updated.brokerage_entity = form;
      } else if (section === "property") {
        updated.property = form;
      } else if (section === "contract") {
        Object.assign(updated, form);
      }

      // تحديث الحالة محليًا
      setContract(updated);

      // حفظ في الخادم
      const res = await fetch(`${API_BASE}/contracts/${contract.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(t("dataSavedSuccessfully"));
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleListChange = (index, key, value) =>
    setForm((prev) => {
      const newList = [...prev.list];
      newList[index] = { ...newList[index], [key]: value };
      return { ...prev, list: newList };
    });

  const addListItem = () => {
    const item = {};
    switch (section) {
      case "tenants":
      case "lessors":
        Object.assign(item, { name: "", id: "", phone: "" });
        break;
      case "units":
        Object.assign(item, { unit_no: "", unit_type: "", unit_area: "", ac_type: "" });
        break;
      case "payments":
        Object.assign(item, { due_date: "", amount: "", description: "" });
        break;
      case "expenses":
        Object.assign(item, { type: "", amount: "", notes: "" });
        break;
      case "receipts":
        Object.assign(item, { receipt_no: "", type: "", date: "", amount: "", notes: "" });
        break;
    }
    setForm((p) => ({ ...p, list: [...(p.list || []), item] }));
  };

  const removeListItem = (i) =>
    setForm((p) => ({
      ...p,
      list: p.list.filter((_, idx) => idx !== i),
    }));

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-md ml-auto p-0 h-[100vh] flex flex-col">
        <DrawerHeader className="flex justify-between items-center border-b p-4">
          <DrawerTitle className="text-lg font-bold">
            {t("editSection")}: {t(section)}
          </DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* أقسام متعددة */}
          {["contract", "broker", "property"].includes(section) &&
            Object.keys(form).map((key) => (
              <EditableField
                key={key}
                label={t(key)}
                value={form[key]}
                onChange={(v) => handleChange(key, v)}
              />
            ))}

          {/* أقسام فيها قوائم */}
          {form.list &&
            form.list.map((item, i) => (
              <div key={i} className="border p-3 rounded-lg relative space-y-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 text-red-600"
                  onClick={() => removeListItem(i)}
                >
                  <X size={16} />
                </Button>
                {Object.keys(item).map((key) => (
                  <EditableField
                    key={key}
                    label={t(key)}
                    value={item[key]}
                    onChange={(v) => handleListChange(i, key, v)}
                  />
                ))}
              </div>
            ))}

          {/* زر إضافة عنصر */}
          {["tenants", "lessors", "units", "payments", "expenses", "receipts"].includes(
            section
          ) && (
            <Button
              onClick={addListItem}
              variant="outline"
              className="w-full mt-3 flex items-center justify-center gap-1"
            >
              {t("add")} +
            </Button>
          )}
        </div>

        <DrawerFooter className="border-t p-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? t("saving") : t("save")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/* 🧩 حقل إدخال بسيط */
function EditableField({ label, value, onChange, type = "text" }) {
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
