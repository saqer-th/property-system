import React, { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RotateCcw, X } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function AddExpenseDrawer({ open, setOpen, refresh }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);

  const [form, setForm] = useState({
    expense_type: "",
    custom_expense_type: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    on_whom: "",
    link_type: "",
    property_id: "",
    unit_id: "",
    contract_id: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  const popularExpenses = [
    "كهرباء",
    "ماء",
    "صيانة عامة",
    "دهان",
    "تنظيف",
    "صيانة مصعد",
    "تنسيق حدائق",
    "رسوم بلدية",
    "رسوم صيانة سنوية",
    "إيجار مولد",
    "أخرى",
  ];

  // 📦 تحميل البيانات
  useEffect(() => {
    if (!open) return;
    async function fetchData() {
      setLoadingData(true);
      try {
        const headers = {
          "x-api-key": API_KEY,
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        };
        const [props, unts, conts] = await Promise.all([
          fetch(`${API_URL}/properties/my`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/units/my`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/contracts/my`, { headers }).then((r) => r.json()),
        ]);
        setProperties(props.data || []);
        setUnits(unts.data || []);
        setContracts(conts.data || []);
      } catch (err) {
        console.error("❌ Error loading related data:", err);
        toast.error("فشل تحميل البيانات المرتبطة");
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [open, user]);

  // 🔄 تحديث الوحدات عند اختيار عقار
  useEffect(() => {
    if (form.property_id) {
      const related = units.filter(
        (u) => u.property_id === Number(form.property_id)
      );
      setFilteredUnits(related);
    } else {
      setFilteredUnits([]);
    }
  }, [form.property_id, units]);

  // 🧠 تحديث الحقول
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // ✅ تحقق قبل الحفظ
  const validateForm = () => {
    const newErrors = {};
    if (!form.expense_type) newErrors.expense_type = "اختر نوع المصروف";
    if (!form.amount || Number(form.amount) <= 0)
      newErrors.amount = "أدخل مبلغًا صحيحًا";
    if (!form.date) newErrors.date = "اختر تاريخ الصرف";
    if (!form.on_whom) newErrors.on_whom = "حدد على من المصروف";
    if (form.expense_type === "أخرى" && !form.custom_expense_type)
      newErrors.custom_expense_type = "اكتب نوع المصروف";

    if (form.link_type === "unit" && (!form.property_id || !form.unit_id)) {
      newErrors.property_id = "مطلوب";
      newErrors.unit_id = "مطلوب";
    }
    if (form.link_type === "contract" && !form.contract_id)
      newErrors.contract_id = "مطلوب";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💾 حفظ
  async function handleSave() {
    if (!validateForm()) {
      toast.error("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    setSaving(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      };
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "فشل في حفظ المصروف");

      toast.success("✅ تم إضافة المصروف بنجاح");
      setOpen(false);
      refresh?.();
      resetForm();
    } catch (err) {
      console.error("❌ Error saving expense:", err);
      toast.error("حدث خطأ أثناء حفظ المصروف");
    } finally {
      setSaving(false);
    }
  }

  // ♻️ إعادة التعيين
  const resetForm = () => {
    setForm({
      expense_type: "",
      custom_expense_type: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      on_whom: "",
      link_type: "",
      property_id: "",
      unit_id: "",
      contract_id: "",
      notes: "",
    });
    setErrors({});
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-md ml-auto h-[100vh] flex flex-col">
        <DrawerHeader className="flex justify-between items-center border-b p-4">
          <DrawerTitle className="text-lg font-bold text-emerald-700">
            💸 إضافة مصروف جديد
          </DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {loadingData ? (
            <div className="text-center text-gray-500 flex flex-col items-center gap-2 mt-10">
              <Loader2 className="animate-spin" size={20} />
              جاري تحميل البيانات...
            </div>
          ) : (
            <>
              <SelectField
                label="نوع المصروف"
                value={form.expense_type}
                onChange={(v) => handleChange("expense_type", v)}
                error={errors.expense_type}
                options={[
                  { value: "", label: "اختر..." },
                  ...popularExpenses.map((e) => ({ value: e, label: e })),
                ]}
              />

              {form.expense_type === "أخرى" && (
                <InputField
                  label="أدخل نوع المصروف"
                  value={form.custom_expense_type}
                  onChange={(v) => handleChange("custom_expense_type", v)}
                  error={errors.custom_expense_type}
                />
              )}

              <InputField
                label="المبلغ (ريال)"
                type="number"
                value={form.amount}
                onChange={(v) => handleChange("amount", v)}
                error={errors.amount}
              />

              <InputField
                label="تاريخ الصرف"
                type="date"
                value={form.date}
                onChange={(v) => handleChange("date", v)}
                error={errors.date}
              />

              <SelectField
                label="على من"
                value={form.on_whom}
                onChange={(v) => handleChange("on_whom", v)}
                error={errors.on_whom}
                options={[
                  { value: "", label: "اختر..." },
                  { value: "مالك", label: "مالك" },
                  { value: "مستأجر", label: "مستأجر" },
                  { value: "مكتب", label: "مكتب" },
                  { value: "أخرى", label: "أخرى" },
                ]}
              />

              <SelectField
                label="الربط"
                value={form.link_type}
                onChange={(v) => handleChange("link_type", v)}
                error={errors.link_type}
                options={[
                  { value: "", label: "بدون ربط" },
                  { value: "property", label: "عقار 🏢" },
                  { value: "unit", label: "وحدة 🏘️" },
                  { value: "contract", label: "عقد 📄" },
                ]}
              />

              {form.link_type === "property" && (
                <SelectField
                  label="اختر العقار"
                  value={form.property_id}
                  onChange={(v) => handleChange("property_id", v)}
                  error={errors.property_id}
                  options={[
                    { value: "", label: "اختر..." },
                    ...properties.map((p) => ({
                      value: p.id,
                      label:
                        p.property_name || p.title_deed_no || `عقار #${p.id}`,
                    })),
                  ]}
                />
              )}

              {form.link_type === "unit" && (
                <>
                  <SelectField
                    label="اختر العقار"
                    value={form.property_id}
                    onChange={(v) => handleChange("property_id", v)}
                    options={[
                      { value: "", label: "اختر..." },
                      ...properties.map((p) => ({
                        value: p.id,
                        label:
                          p.property_name ||
                          p.title_deed_no ||
                          `عقار #${p.id}`,
                      })),
                    ]}
                  />
                  <SelectField
                    label="اختر الوحدة"
                    value={form.unit_id}
                    onChange={(v) => handleChange("unit_id", v)}
                    options={[
                      { value: "", label: "اختر..." },
                      ...filteredUnits.map((u) => ({
                        value: u.id,
                        label: `${u.unit_no || "—"} (${u.unit_type || ""})`,
                      })),
                    ]}
                  />
                </>
              )}

              {form.link_type === "contract" && (
                <SelectField
                  label="اختر العقد"
                  value={form.contract_id}
                  onChange={(v) => handleChange("contract_id", v)}
                  options={[
                    { value: "", label: "اختر..." },
                    ...contracts.map((c) => ({
                      value: c.id,
                      label: `${c.contract_no || "—"} – ${
                        c.tenant_name || "بدون مستأجر"
                      }`,
                    })),
                  ]}
                />
              )}

              <InputField
                label="ملاحظات"
                value={form.notes}
                onChange={(v) => handleChange("notes", v)}
                placeholder="أدخل أي تفاصيل إضافية"
              />
            </>
          )}
        </div>

        <DrawerFooter className="border-t p-4 flex justify-between">
          <Button
            variant="outline"
            onClick={resetForm}
            className="flex items-center gap-2"
          >
            <RotateCcw size={16} /> إعادة تعيين
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/* 🧱 المكونات الصغيرة */
function InputField({ label, value, onChange, error, type = "text", placeholder }) {
  return (
    <div>
      <Label className="text-gray-600">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 border rounded-lg focus:ring-2 ${
          error ? "border-red-400 focus:ring-red-200" : "focus:ring-emerald-300"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, error }) {
  return (
    <div>
      <Label className="text-gray-600">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-lg p-2 mt-1 focus:ring-2 ${
          error ? "border-red-400 focus:ring-red-200" : "focus:ring-emerald-300"
        }`}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
