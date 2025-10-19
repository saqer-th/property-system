import React, { useEffect, useState } from "react";
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
import { API_URL, API_KEY } from "@/config";

export default function AddReceiptDrawer({ open, setOpen, refresh }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    type: "receive",
    amount: "",
    date: "",
    reason: "",
    property_id: "",
    unit_id: "",
    contract_id: "",
    payer_type: "",
    payer_name: "",
    receiver_type: "",
    receiver_name: "",
    notes: "",
    link_type: "",
  });

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [contracts, setContracts] = useState([]);

  // 📦 تحميل القوائم المرتبطة (عقارات / وحدات / عقود)
  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingData(true);
        const [props, unts, conts] = await Promise.all([
          fetch(`${API_URL}/properties`, { headers: { "x-api-key": API_KEY } }).then((r) =>
            r.json()
          ),
          fetch(`${API_URL}/units`, { headers: { "x-api-key": API_KEY } }).then((r) =>
            r.json()
          ),
          fetch(`${API_URL}/contracts`, { headers: { "x-api-key": API_KEY } }).then((r) =>
            r.json()
          ),
        ]);

        setProperties(Array.isArray(props) ? props : props.data || []);
        setUnits(Array.isArray(unts) ? unts : unts.data || []);
        setContracts(Array.isArray(conts) ? conts : conts.data || []);
      } catch (err) {
        console.error("❌ Error loading related data:", err);
        toast.error(t("failedToLoadData"));
      } finally {
        setLoadingData(false);
      }
    }

    if (open) fetchData();
  }, [open, t]);

  // 🧠 تحديث الحقول
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // 💾 حفظ السند
  async function handleSave() {
    if (!form.amount || !form.type) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/receipts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      toast.success(t("receiptAdded"));

      // إعادة التعيين
      setForm({
        type: "receive",
        amount: "",
        date: "",
        reason: "",
        property_id: "",
        unit_id: "",
        contract_id: "",
        payer_type: "",
        payer_name: "",
        receiver_type: "",
        receiver_name: "",
        notes: "",
        link_type: "",
      });

      setOpen(false);
      if (typeof refresh === "function") refresh();
    } catch (err) {
      console.error("❌ Error saving receipt:", err);
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
          <DrawerTitle className="text-lg font-bold">{t("addReceipt")}</DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {loadingData ? (
            <div className="text-center text-gray-500 flex flex-col items-center gap-2 mt-10">
              <Loader2 className="animate-spin" size={20} />
              {t("loadingData")}
            </div>
          ) : (
            <>
              {/* نوع السند */}
              <SelectField
                label={t("receiptType")}
                value={form.type}
                onChange={(v) => handleChange("type", v)}
                options={[
                  { value: "receive", label: t("receive") },
                  { value: "payment", label: t("payment") },
                  { value: "adjustment", label: t("adjustment") },
                ]}
              />

              <InputField
                label={t("amount")}
                type="number"
                value={form.amount}
                onChange={(v) => handleChange("amount", v)}
              />

              <InputField
                label={t("date")}
                type="date"
                value={form.date}
                onChange={(v) => handleChange("date", v)}
              />

              <InputField
                label={t("reason")}
                value={form.reason}
                onChange={(v) => handleChange("reason", v)}
              />

              {/* الربط */}
              <SelectField
                label={t("linkType")}
                value={form.link_type}
                onChange={(v) => handleChange("link_type", v)}
                options={[
                  { value: "", label: t("noLink") },
                  { value: "property", label: t("property") },
                  { value: "unit", label: t("unit") },
                  { value: "contract", label: t("contract") },
                ]}
              />

              {form.link_type === "property" && (
                <SelectField
                  label={t("selectProperty")}
                  value={form.property_id}
                  options={properties.map((p) => ({
                    value: p.id,
                    label: p.property_name || p.title_deed_no || `#${p.id}`,
                  }))}
                  onChange={(v) => handleChange("property_id", v)}
                />
              )}

              {form.link_type === "unit" && (
                <SelectField
                  label={t("selectUnit")}
                  value={form.unit_id}
                  options={units.map((u) => ({
                    value: u.id,
                    label: `${u.unit_no || "—"} - ${u.unit_type || ""}`,
                  }))}
                  onChange={(v) => handleChange("unit_id", v)}
                />
              )}

              {form.link_type === "contract" && (
                <SelectField
                  label={t("selectContract")}
                  value={form.contract_id}
                  options={contracts.map((c) => ({
                    value: c.id,
                    label: `${c.contract_no || "—"} - ${c.tenant_name || ""}`,
                  }))}
                  onChange={(v) => handleChange("contract_id", v)}
                />
              )}

              {/* من / إلى */}
              <SelectField
                label={t("payerType")}
                value={form.payer_type}
                options={[
                  { value: "", label: t("choose") },
                  { value: "tenant", label: t("tenant") },
                  { value: "owner", label: t("owner") },
                  { value: "broker", label: t("broker") },
                  { value: "vendor", label: t("vendor") },
                  { value: "other", label: t("other") },
                ]}
                onChange={(v) => handleChange("payer_type", v)}
              />
              <InputField
                label={t("payerName")}
                value={form.payer_name}
                onChange={(v) => handleChange("payer_name", v)}
              />
              <SelectField
                label={t("receiverType")}
                value={form.receiver_type}
                options={[
                  { value: "", label: t("choose") },
                  { value: "tenant", label: t("tenant") },
                  { value: "owner", label: t("owner") },
                  { value: "broker", label: t("broker") },
                  { value: "vendor", label: t("vendor") },
                  { value: "other", label: t("other") },
                ]}
                onChange={(v) => handleChange("receiver_type", v)}
              />
              <InputField
                label={t("receiverName")}
                value={form.receiver_name}
                onChange={(v) => handleChange("receiver_name", v)}
              />
              <InputField
                label={t("notes")}
                value={form.notes}
                onChange={(v) => handleChange("notes", v)}
              />
            </>
          )}
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

/* 🧱 مكونات الإدخال */
function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        inputMode={type === "date" ? "none" : undefined}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        min={type === "date" ? "1900-01-01" : undefined}
        max={type === "date" ? "2100-12-31" : undefined}
        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-300 outline-none"
        onFocus={(e) => type === "date" && e.target.showPicker?.()} // 💡 forces date picker popup in Chrome
      />
    </div>
  );
}


function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-300 outline-none"
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
