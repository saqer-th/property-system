import React, { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, RotateCcw, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function AddReceiptDrawer({ open, setOpen, refresh }) {
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [properties, setProperties] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [contracts, setContracts] = useState([]);

  const [form, setForm] = useState({
    type: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
    link_type: "",
    property_id: "",
    unit_id: "",
    contract_id: "",
    payer_name: "",
    receiver_name: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  // 🔄 تحميل العقارات والعقود فقط (الوحدات تُجلب لاحقاً)
  useEffect(() => {
    if (!open || !user?.token) return;

    async function loadData() {
      setLoadingData(true);
      try {
        const [props, conts] = await Promise.all([
          fetch(`${API_URL}/properties/my`, {
            headers: {
              "x-api-key": API_KEY,
              Authorization: `Bearer ${user.token}`,
            },
          }).then((r) => r.json()),
          fetch(`${API_URL}/contracts/my`, {
            headers: {
              "x-api-key": API_KEY,
              Authorization: `Bearer ${user.token}`,
            },
          }).then((r) => r.json()),
        ]);
        setProperties(props.data || []);
        setContracts(conts.data || []);
      } catch (err) {
        console.error("❌ Error loading related data:", err);
        toast.error("فشل تحميل البيانات");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [open, user]);

  // 🧠 تغيير الحقول والتفاعلات
  const handleChange = async (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));

    // 🔗 تعبئة تلقائية للأطراف عند اختيار عقد
    if (key === "contract_id" && value) {
      const selected = contracts.find((c) => c.id === Number(value));
      if (selected) {
        setForm((prev) => ({
          ...prev,
          payer_name: selected.tenant_name || "",
          receiver_name: selected.lessor_name || "",
        }));
      }
    }

    // 🏢 عند اختيار العقار → جلب الوحدات من السيرفر
    if (key === "property_id" && value) {
      setLoadingUnits(true);
      setFilteredUnits([]);
      try {
        const res = await fetch(`${API_URL}/units/by-property/${value}`, {
          headers: {
            "x-api-key": API_KEY,
            Authorization: `Bearer ${user.token}`,
          },
        });
        const json = await res.json();
        if (!res.ok || !json.success)
          throw new Error(json.message || "فشل جلب الوحدات");
        setFilteredUnits(json.data || []);
      } catch (err) {
        console.error("❌ Error fetching units:", err);
        toast.error("فشل تحميل الوحدات");
      } finally {
        setLoadingUnits(false);
      }
    }

    // 💡 تعبئة تلقائية حسب نوع السند
    if (key === "type") {
      if (value === "قبض") {
        setForm((prev) => ({
          ...prev,
          payer_name: prev.payer_name || "المستأجر",
          receiver_name: prev.receiver_name || "المالك",
        }));
      } else if (value === "صرف") {
        setForm((prev) => ({
          ...prev,
          payer_name: prev.payer_name || "المالك",
          receiver_name: prev.receiver_name || "المستأجر",
        }));
      } else if (value === "تسوية") {
        setForm((prev) => ({
          ...prev,
          payer_name: "",
          receiver_name: "",
        }));
      }
    }
  };

  // ✅ تحقق قبل الحفظ
  const validateForm = () => {
    const newErrors = {};
    const val = (v) => v === undefined || v === null || String(v).trim() === "";

    if (val(form.type)) newErrors.type = "يرجى تحديد نوع السند (قبض / صرف / تسوية)";
    if (val(form.amount) || Number(form.amount) <= 0)
      newErrors.amount = "يرجى إدخال مبلغ صحيح للسند";
    if (val(form.date)) newErrors.date = "يرجى اختيار تاريخ السند";
    if (val(form.reason)) newErrors.reason = "يرجى إدخال سبب السند";
    if (val(form.link_type)) newErrors.link_type = "يرجى اختيار نوع الربط";

    if (form.link_type === "property") {
      if (val(form.property_id)) newErrors.property_id = "يرجى اختيار العقار المرتبط بالسند";
    }
    if (form.link_type === "unit") {
      if (val(form.property_id)) newErrors.property_id = "يرجى اختيار العقار المرتبط بالوحدة";
      if (val(form.unit_id)) newErrors.unit_id = "يرجى اختيار الوحدة المرتبطة بالسند";
    }
    if (form.link_type === "contract") {
      if (val(form.contract_id)) newErrors.contract_id = "يرجى اختيار العقد المرتبط بالسند";
    }

    if (val(form.payer_name))
      newErrors.payer_name = "يرجى إدخال اسم الدافع (المستأجر أو المالك)";
    if (val(form.receiver_name))
      newErrors.receiver_name = "يرجى إدخال اسم المستلم (الطرف الآخر)";

    if (form.notes && form.notes.length > 300)
      newErrors.notes = "الملاحظات يجب ألا تتجاوز 300 حرف";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة قبل الحفظ");
      return false;
    }
    return true;
  };

  // 💾 حفظ السند
  async function handleSave() {
    if (!user?.token) return toast.error("الرجاء تسجيل الدخول أولاً");
    if (!["office", "office_admin"].includes(user.activeRole)) {
      return toast.error("🚫 لا تملك صلاحية لإضافة سند");
  }

    if (!validateForm()) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/receipts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "فشل حفظ السند");

      toast.success("✅ تم إضافة السند بنجاح");
      setOpen(false);
      if (refresh) refresh();
    } catch (err) {
      console.error("❌ Error saving receipt:", err);
      toast.error(err.message || "فشل حفظ السند");
    } finally {
      setSaving(false);
    }
  }

  const resetForm = () => {
    setForm({
      type: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      reason: "",
      link_type: "",
      property_id: "",
      unit_id: "",
      contract_id: "",
      payer_name: "",
      receiver_name: "",
      notes: "",
    });
    setErrors({});
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-md ml-auto h-[100vh] flex flex-col">
        <DrawerHeader className="flex justify-between items-center border-b p-4">
          <DrawerTitle className="text-lg font-bold text-emerald-700 flex items-center gap-2">
            <FileText size={18} /> إضافة سند جديد
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
              <SelectField label="نوع السند" name="type" value={form.type} onChange={handleChange} error={errors.type}
                options={[
                  { value: "", label: "اختر..." },
                  { value: "قبض", label: "قبض 💰" },
                  { value: "صرف", label: "صرف 💸" },
                  { value: "تسوية", label: "تسوية ⚖️" },
                ]}
              />
              <InputField label="المبلغ" type="number" name="amount" value={form.amount} onChange={handleChange} error={errors.amount} />
              <InputField label="التاريخ" type="date" name="date" value={form.date} onChange={handleChange} error={errors.date} />
              <InputField label="السبب" name="reason" value={form.reason} onChange={handleChange} error={errors.reason} />

              <SelectField
                label="الربط"
                name="link_type"
                value={form.link_type}
                onChange={handleChange}
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
                  label="العقار"
                  name="property_id"
                  value={form.property_id}
                  onChange={handleChange}
                  error={errors.property_id}
                  options={[
                    { value: "", label: "اختر..." },
                    ...properties.map((p) => ({
                      value: p.id,
                      label: p.property_name || p.title_deed_no || `#${p.id}`,
                    })),
                  ]}
                />
              )}

              {form.link_type === "unit" && (
                <>
                  <SelectField
                    label="العقار"
                    name="property_id"
                    value={form.property_id}
                    onChange={handleChange}
                    error={errors.property_id}
                    options={[
                      { value: "", label: "اختر..." },
                      ...properties.map((p) => ({
                        value: p.id,
                        label: p.property_name || p.title_deed_no || `#${p.id}`,
                      })),
                    ]}
                  />
                  {loadingUnits ? (
                    <div className="text-center text-gray-500">
                      <Loader2 className="animate-spin inline mr-2" size={16} /> جاري تحميل الوحدات...
                    </div>
                  ) : (
                    <SelectField
                      label="الوحدة"
                      name="unit_id"
                      value={form.unit_id}
                      onChange={handleChange}
                      error={errors.unit_id}
                      options={[
                        { value: "", label: "اختر..." },
                        ...filteredUnits.map((u) => ({
                          value: u.id,
                          label: `${u.unit_no || "—"} (${u.unit_type || ""})`,
                        })),
                      ]}
                    />
                  )}
                </>
              )}

              {form.link_type === "contract" && (
                <SelectField
                  label="العقد"
                  name="contract_id"
                  value={form.contract_id}
                  onChange={handleChange}
                  error={errors.contract_id}
                  options={[
                    { value: "", label: "اختر..." },
                    ...contracts.map((c) => ({
                      value: c.id,
                      label: `${c.contract_no || "—"} – ${c.tenant_name || ""}`,
                    })),
                  ]}
                />
              )}

              <InputField label="اسم الدافع" name="payer_name" value={form.payer_name} onChange={handleChange} error={errors.payer_name} />
              <InputField label="اسم المستلم" name="receiver_name" value={form.receiver_name} onChange={handleChange} error={errors.receiver_name} />
              <InputField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} />
            </>
          )}
        </div>

        <DrawerFooter className="border-t p-4 flex justify-between">
          <Button variant="outline" onClick={resetForm} className="flex items-center gap-2">
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

/* 🧱 المكونات الفرعية */
function InputField({ label, name, value, onChange, error, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(name, e.target.value)}
        className={`w-full border rounded-lg p-2 focus:ring-2 outline-none ${
          error ? "border-red-400 focus:ring-red-200" : "focus:ring-emerald-300"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(name, e.target.value)}
        className={`w-full border rounded-lg p-2 focus:ring-2 outline-none ${
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
