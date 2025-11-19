import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Save, Loader2, X, PlusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { API_KEY,API_URL } from "@/config";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function EditDrawer({ open, setOpen, section, contract, setContract, property, refresh }) {
  const { t } = useTranslation();
  const { user } = useAuth(); // ✅ هنا نجيب المستخدم الحالي (من AuthContext)
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");
  const activeRole = localStorage.getItem("activeRole");

  // 🔹 تحميل بيانات القسم عند فتح الـ Drawer
  useEffect(() => {
    if (!section || (!contract && !property)) return;

    const initialData = (() => {
      switch (section) {
        case "contract":
          return {
            ["contract_no"]: contract.contract_no || "",
            ["start_date"]: contract.tenancy_start?.split("T")[0] || "",
            ["end_date"]: contract.tenancy_end?.split("T")[0] || "",
            ["annual_rent"]: contract.annual_rent || "",
          };
        case "tenants":
        case "lessors":
        case "units":
          return { list: contract[section] || [] };
        case "payments":
           return {
            list: (contract.payments || []).map((p) => ({
              ...p,
              due_date: p.due_date ? new Date(p.due_date).toISOString().split("T")[0] : "",
              amount: p.amount || "",
              paid_amount: p.paid_amount || "",
              remaining_amount: p.remaining_amount || "",
              status: p.status || "",
              notes: p.notes || "",
            })),
          };
        case "expenses":
                  return {
          list: (contract.expenses || []).map((e) => ({
            ...e,
            date: e.date
              ? new Date(e.date).toISOString().split("T")[0]
              : "",
            expense_type: e.expense_type || "",
            on_whom: e.on_whom || "",
            paid_by: e.paid_by || "",
            amount: e.amount || "",
            notes: e.notes || "",
          })),
        };
        case "receipts":
        return {
          list: (contract.receipts || []).map((r) => ({
            ...r,
            date: r.date
              ? new Date(r.date).toISOString().split("T")[0]
              : "",
            receipt_type: r.receipt_type || "",
            payer: r.payer || "",
            payer_name: r.payer_name || "",
            receiver: r.receiver || "",
            receiver_name: r.receiver_name || "",
            amount: r.amount || "",
            reason: r.reason || "",
            notes: r.notes || "",
          })),
        };
        case "broker":
          return contract.brokerage_entity || {};
        case "property":
          // use provided property prop first, otherwise contract.property, otherwise contract (when contract payload is actually a property)
          const src = property || contract?.property || contract || {};
          return {
            title_deed_no: src.title_deed_no || "",
            property_name: src.property_name || "",
            usage: src.property_usage || src.usage || "",
            national_address: src.national_address || "",
            num_units: src.num_units || "",
            city : src.city || "",
          };
        default:
          return {};
      }
    })();

    setForm(initialData);
  }, [section, contract, property]);

  // 💾 حفظ التعديلات
  async function handleSave() {
    // If editing a property directly (from Properties page) allow missing contract
    if (!(section === "property" && property?.id) && !contract?.id) {
      return toast.error("Contract not found");
    }

    setSaving(true);

    try {
      // ✅ إضافات تحقق لقسم الوحدات
      if (section === "units") {
        const unitsList = form.list || [];

        // 1️⃣ تحقق أن رقم الوحدة أرقام فقط
        const invalidUnits = unitsList.filter(
          (u) => !/^\d+$/.test((u.unit_no || "").toString().trim())
        );
        if (invalidUnits.length > 0) {
          toast.error("❌ رقم الوحدة يجب أن يكون بالأرقام فقط.", { duration: 4000 });
          setSaving(false);
          return;
        }

        // 2️⃣ تحقق من وجود وحدات مكررة بنفس الرقم
        const seen = new Set();
        const duplicates = [];
        unitsList.forEach((u) => {
          const v = (u.unit_no || "").toString().trim();
          if (!v) return;
          if (seen.has(v) && !duplicates.includes(v)) duplicates.push(v);
          seen.add(v);
        });

        if (duplicates.length > 0) {
          toast.error(
            `⚠️ يوجد أكثر من وحدة بنفس الرقم (${duplicates.join(", ")}). يرجى التحقق.`,
            { duration: 5000 }
          );
          setSaving(false);
          return;
        }
      }

      // =========================
      // 🔁 Special handling for units: create/update each unit individually
      // =========================
      // =========================
      // 🔁 Special handling for units — send ALL units once
      // =========================
      if (section === "units") {
        const unitsList = form.list || [];

        try {
          const payloadUnits = unitsList.map((u) => ({
            unit_id: u.unit_id || null,  // القديمة
            unit_no: u.unit_no,
            unit_type: u.unit_type,
            unit_area: u.unit_area,
            electric_meter_no: u.electric_meter_no,
            water_meter_no: u.water_meter_no,
          }));

          const res = await fetch(`${API_URL}/contracts/${contract.id}/units`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": API_KEY,
              Authorization: `Bearer ${user?.token}`,
              "x-active-role": user?.activeRole,
            },
            body: JSON.stringify({ units: payloadUnits }),
          });

          const txt = await res.text();
          const json = txt && txt.startsWith("{") ? JSON.parse(txt) : null;

          if (!res.ok) {
            throw new Error(json?.message || txt || "فشل حفظ الوحدات");
          }

          toast.success("تم حفظ وحدات العقد بنجاح");
          setOpen(false);

          // refresh
          if (contract?.id && setContract) {
            const refreshed = await fetch(`${API_URL}/contracts/${contract.id}`, {
              headers: {
                "x-api-key": API_KEY,
                Authorization: `Bearer ${token}`,
                "x-active-role": activeRole,
              },
            }).then((r) => r.json());

            setContract(refreshed.data || refreshed);
          }

          return;
        } catch (err) {
          console.error("❌ Error saving units:", err);
          toast.error(err.message || "فشل حفظ الوحدات");
          setSaving(false);
          return;
        }
      }


      // Build endpoint & payload (support property update via /properties/:id when editing a property)
      let endpoint;
      let payload = form;

      if (section === "property" && property?.id) {
        // Update property directly
        endpoint = `${API_URL}/properties/${property.id}`;
      } else {
        // Work with contract endpoints
        endpoint = `${API_URL}/contracts/${contract.id}`;
        switch (section) {
          case "property":
            endpoint += "/property";
            break;
          case "tenants":
            endpoint += `/${section}`;
            payload = form.list || [];
            break;
          case "lessors":
            endpoint += `/${section}`;
            payload = form.list || [];
            break;
          case "units":
            endpoint += `/${section}`;
            payload = { units: form.list || [] };
            break;
          case "payments":
          case "expenses":
          case "receipts":
            endpoint += `/${section}`;
            payload = form.list || [];
            break;
          case "broker":
            endpoint += "/broker";
            break;
          default:
            break;
        }
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers:
         {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_API_KEY || API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": user?.activeRole,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = "حدث خطأ أثناء حفظ البيانات.";

        try {
          const text = await res.text();

          if (text && text.startsWith("{")) {
            const data = JSON.parse(text);
            message = data.message || message;
          } else if (text) {
            message = text;
          }
        } catch (err) {
          console.warn("⚠️ Error parsing error response:", err);
        }

        toast.error(message, {
          duration: 5000,
          icon: "❌",
        });
        return;
      }

      const json = await res.json();
      toast.success(json.message || t("dataSavedSuccessfully"), { duration: 4000 });

      // Refresh source: if we edited a property directly call refresh(), otherwise refresh contract
      try {
        if (property?.id && typeof refresh === "function") {
          await refresh();
        } else if (contract?.id && setContract) {
          const refreshed = await fetch(`${API_URL}/contracts/${contract.id}`, {
            headers: { "x-api-key": API_KEY, Authorization: `Bearer ${token}`, "x-active-role": activeRole },
          }).then((r) => r.json());

          if (setContract && refreshed) {
            setContract(refreshed.data || refreshed);
          }
        }
      } catch (err) {
        console.error("⚠️ Error refreshing after save:", err);
      }

      setOpen(false);
    } catch (err) {
      console.error("❌ Save error:", err);
      toast.error(err.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }


  // 🔁 التعامل مع الحقول
  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleListChange = (index, key, value) =>
    setForm((prev) => {
      const list = [...(prev.list || [])];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, list };
    });

  // ➕ إضافة عنصر جديد
  const addListItem = () => {
    const item = {};
    const ref = `R-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
    switch (section) {
      case "tenants":
      case "lessors":
        Object.assign(item, {
          name: "",
          id_number: "",
          phone: "",
          nationality: "",
        });
        break;
      case "units":
        Object.assign(item, {
          unit_no: "",
          unit_type: "",
          unit_area: "",
          electric_meter_no: "",
          water_meter_no: "",
        });
        break;
      case "payments":
        Object.assign(item, { due_date: "", amount: "" });
        break;
      case "expenses":
        Object.assign(item, {
          expense_type: "",
          on_whom: "",
          paid_by: "",
          amount: "",
          date: "",
          notes: "",
        });
        break;
      case "receipts":
        Object.assign(item, {
          type: "",
          reference_no: ref,
          amount: "",
          date: "",
          reason: "",
          link_type: "contract",
          payer: "",
          payer_name: "",
          receiver: "",
          receiver_name: "",
          notes: "",
        });
        break;
    }
    setForm((p) => ({ ...p, list: [...(p.list || []), item] }));
  };

  const removeListItem = (index) =>
    setForm((p) => ({
      ...p,
      list: p.list.filter((_, i) => i !== index),
    }));
  // 🧭 واجهة المستخدم
  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-md ml-auto p-0 h-[100vh] flex flex-col">
        <DrawerHeader className="flex justify-between items-center border-b p-4">
          <DrawerTitle className="text-lg font-bold text-emerald-700 flex items-center gap-2">
            ✏️ {t("edit")} {t(section)}
          </DrawerTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X size={18} />
          </Button>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* 🧩 أقسام فردية (عقد / عقار / وسيط) */}
          {["contract", "broker", "property"].includes(section) &&
            Object.entries(form).map(([key, value]) => (
              <EditableField
                key={key}
                label={t(key)}
                value={value}
                onChange={(v) => handleChange(key, v)}
                type={
                  key.includes("date")
                    ? "date"
                    : key.includes("amount")
                    ? "number"
                    : "text"
                }
              />
            ))}

          {/* 🧱 أقسام القوائم */}
          {form.list &&
            form.list.map((item, i) => (
              <div
                key={i}
                className="border border-gray-200 p-3 rounded-xl shadow-sm relative"
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 text-red-600"
                  onClick={() => removeListItem(i)}
                >
                  <X size={16} />
                </Button>

                <h3 className="font-semibold text-emerald-600 mb-2">
                  {t(section)} #{i + 1}
                </h3>

                {/* 🎯 تخصيص عرض الحقول حسب القسم */}
                {section === "expenses" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectField
                      label="نوع المصروف"
                      value={item.expense_type}
                      onChange={(v) => handleListChange(i, "expense_type", v)}
                      options={[
                        { value: "", label: "اختر..." },
                        { value: "كهرباء", label: "كهرباء" },
                        { value: "ماء", label: "ماء" },
                        { value: "صيانة عامة", label: "صيانة عامة" },
                        { value: "دهان", label: "دهان" },
                        { value: "تنظيف", label: "تنظيف" },
                        { value: "صيانة مصعد", label: "صيانة مصعد" },
                        { value: "تنسيق حدائق", label: "تنسيق حدائق" },
                        { value: "رسوم بلدية", label: "رسوم بلدية" },
                        { value: "رسوم صيانة سنوية", label: "رسوم صيانة سنوية" },
                        { value: "إيجار مولد", label: "إيجار مولد" },
                        { value: "أخرى", label: "أخرى" },
                      ]}
                    />

                    <SelectField
                      label="على من"
                      value={item.on_whom}
                      onChange={(v) => handleListChange(i, "on_whom", v)}
                      options={[
                        { value: "", label: "اختر..." },
                        { value: "مالك", label: "المالك" },
                        { value: "مستأجر", label: "المستأجر" },
                        { value: "مكتب", label: "المكتب" },
                        { value: "أخرى", label: "أخرى" },
                      ]}
                    />

                    <SelectField
                      label="الدافع"
                      value={item.paid_by}
                      onChange={(v) => handleListChange(i, "paid_by", v)}
                      options={[
                        { value: "", label: "اختر..." },
                        { value: "مالك", label: "المالك" },
                        { value: "مستأجر", label: "المستأجر" },
                        { value: "مكتب", label: "المكتب" },
                        { value: "مورد", label: "مورد" },
                        { value: "أخرى", label: "أخرى" },
                      ]}
                    />

                    <EditableField
                      label="المبلغ (ريال)"
                      value={item.amount}
                      onChange={(v) => handleListChange(i, "amount", v)}
                      type="number"
                    />

                    <EditableField
                      label="تاريخ الصرف"
                      value={item.date}
                      onChange={(v) => handleListChange(i, "date", v)}
                      type="date"
                    />

                    <EditableField
                      label="ملاحظات"
                      value={item.notes}
                      onChange={(v) => handleListChange(i, "notes", v)}
                      type="text"
                    />
                  </div>
                ) : section === "receipts" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectField
                      label="نوع السند"
                      value={item.receipt_type}
                      onChange={(v) => handleListChange(i, "receipt_type", v)}
                      options={[
                        { value: "", label: "اختر..." },
                        { value: "قبض", label: "قبض 💰" },
                        { value: "صرف", label: "صرف 💸" },
                        { value: "تسوية", label: "تسوية ⚖️" },
                      ]}
                    />

                    <EditableField
                      label="المبلغ (ريال)"
                      value={item.amount}
                      onChange={(v) => handleListChange(i, "amount", v)}
                      type="number"
                    />

                    <EditableField
                      label="تاريخ السند"
                      value={item.date}
                      onChange={(v) => handleListChange(i, "date", v)}
                      type="date"
                    />

                    <EditableField
                      label="سبب السند"
                      value={item.reason}
                      onChange={(v) => handleListChange(i, "reason", v)}
                      type="text"
                    />



                    <SelectField
                      label="نوع الدافع"
                      value={item.payer}
                      onChange={(v) => handleListChange(i, "payer", v)}
                      options={[
                        { value: "", label: "اختر..." },
                        { value: "tenant", label: "مستأجر" },
                        { value: "owner", label: "مالك" },
                        { value: "office", label: "مكتب" },
                        { value: "vendor", label: "مورد" },
                        { value: "other", label: "أخرى" },
                      ]}
                    />

                    <EditableField
                      label="اسم الدافع"
                      value={item.payer_name}
                      onChange={(v) => handleListChange(i, "payer_name", v)}
                      type="text"
                    />

                    <SelectField
                      label="نوع المستلم"
                      value={item.receiver}
                      onChange={(v) => handleListChange(i, "receiver", v)}
                      options={[
                        { value: "", label: "اختر..." },
                        { value: "tenant", label: "مستأجر" },
                        { value: "owner", label: "مالك" },
                        { value: "office", label: "مكتب" },
                        { value: "vendor", label: "مورد" },
                        { value: "other", label: "أخرى" },
                      ]}
                    />

                    <EditableField
                      label="اسم المستلم"
                      value={item.receiver_name}
                      onChange={(v) => handleListChange(i, "receiver_name", v)}
                      type="text"
                    />

                    <EditableField
                      label="ملاحظات إضافية"
                      value={item.notes}
                      onChange={(v) => handleListChange(i, "notes", v)}
                      type="text"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.keys(item)
                      .filter(
                        (key) =>
                          ![
                            "id",
                            "unit_id",
                            "property_id",
                            "contract_id",
                            "created_at",
                            "updated_at",
                            "status",
                            "receipt_id",
                          ].includes(key)
                      )
                      .map((key) => (
                        <EditableField
                          key={key}
                          label={t(key)}
                          value={item[key]}
                          onChange={(v) => handleListChange(i, key, v)}
                          type={
                            key === "unit_no"
                              ? "number"
                              :
                            key.includes("date")
                              ? "date"
                              : key.includes("amount") || key.includes("area")
                              ? "number"
                              : "text"
                          }
                        />
                      ))}
                  </div>
                )}
              </div>
            ))}

          {/* ➕ زر الإضافة */}
          {["tenants", "lessors", "units", "payments", "expenses", "receipts"].includes(
            section
          ) && (
            <Button
              onClick={addListItem}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-emerald-400 text-emerald-600"
            >
              <PlusCircle size={16} /> {t("add")}
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

/* 🧩 مكونات الحقول */
function EditableField({ label, value, onChange, type = "text" }) {
  const isDate = type === "date";
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="relative">
      <Label className="text-gray-600 mb-1 block">{label}</Label>
      <div className="relative">
        {isDate && (
          <span className="absolute right-3 top-2.5 text-gray-400 pointer-events-none">
            📅
          </span>
        )}
        <input
          type={type}
          value={value || (isDate ? today : "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded-lg p-2 pr-8 focus:ring-2 outline-none focus:ring-emerald-300"
          onFocus={(e) => {
            if (isDate && e.target.showPicker) e.target.showPicker();
          }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options = [], error }) {
  return (
    <div>
      <Label className="text-gray-600 mb-1 block">{label}</Label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg p-2 mt-1 focus:ring-2 focus:ring-emerald-300 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
