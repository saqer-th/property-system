import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { 
  Save, Loader2, X, PlusCircle, Trash2, 
  Calendar, Coins, User, FileText, Hash, MapPin, Building 
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { API_KEY, API_URL } from "@/config";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils"; // Assuming you have a class merger utility

export default function EditDrawer({ open, setOpen, section, contract, setContract, property, refresh }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");
  const activeRole = localStorage.getItem("activeRole");

  // 🔹 Init Data (Logic preserved from original)
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
              status: p.status || "",
              notes: p.notes || "",
            })),
          };
        case "expenses":
              return {
          list: (contract.expenses || []).map((e) => ({
            ...e,
            date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
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
            date: r.date ? new Date(r.date).toISOString().split("T")[0] : "",
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
          return {
            name: contract.broker?.name || "",
            license_no: contract.broker?.license_no || "",
            address: contract.broker?.address || "",
            phone: contract.broker?.phone || "",
          };
        case "property":
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

  // 💾 Save Logic (Preserved)
  async function handleSave() {
    if (!(section === "property" && property?.id) && !contract?.id) {
      return toast.error("Contract not found");
    }
    setSaving(true);
    try {
      if (section === "units") {
        const unitsList = form.list || [];
        const invalidUnits = unitsList.filter((u) => !/^\d+$/.test((u.unit_no || "").toString().trim()));
        if (invalidUnits.length > 0) {
          toast.error("❌ رقم الوحدة يجب أن يكون بالأرقام فقط.", { duration: 4000 });
          setSaving(false);
          return;
        }
        const seen = new Set();
        const duplicates = [];
        unitsList.forEach((u) => {
          const v = (u.unit_no || "").toString().trim();
          if (!v) return;
          if (seen.has(v) && !duplicates.includes(v)) duplicates.push(v);
          seen.add(v);
        });
        if (duplicates.length > 0) {
          toast.error(`⚠️ يوجد أكثر من وحدة بنفس الرقم (${duplicates.join(", ")}).`, { duration: 5000 });
          setSaving(false);
          return;
        }
      }

      if (section === "units") {
        const unitsList = form.list || [];
        const payloadUnits = unitsList.map((u) => ({
          unit_id: u.unit_id || null,
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
        if (!res.ok) throw new Error(json?.message || txt || "فشل حفظ الوحدات");
        
        toast.success("تم حفظ وحدات العقد بنجاح");
        setOpen(false);
        if (contract?.id && setContract) {
          const refreshed = await fetch(`${API_URL}/contracts/${contract.id}`, {
            headers: { "x-api-key": API_KEY, Authorization: `Bearer ${token}`, "x-active-role": activeRole },
          }).then((r) => r.json());
          setContract(refreshed.data || refreshed);
        }
        return;
      }

      let endpoint;
      let payload = form;

      if (section === "property" && property?.id) {
        endpoint = `${API_URL}/properties/${property.id}`;
      } else {
        endpoint = `${API_URL}/contracts/${contract.id}`;
        switch (section) {
          case "property": endpoint += "/property"; break;
          case "tenants": endpoint += `/${section}`; payload = form.list || []; break;
          case "lessors": endpoint += `/${section}`; payload = form.list || []; break;
          case "units": endpoint += `/${section}`; payload = { units: form.list || [] }; break;
          case "payments":
          case "expenses":
          case "receipts": endpoint += `/${section}`; payload = form.list || []; break;
          case "broker": endpoint += "/broker"; break;
          default: break;
        }
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": user?.activeRole,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        const msg = text && text.startsWith("{") ? JSON.parse(text).message : text;
        throw new Error(msg || "حدث خطأ أثناء الحفظ");
      }

      const json = await res.json();
      toast.success(json.message || t("dataSavedSuccessfully"));

      if (property?.id && typeof refresh === "function") {
        await refresh();
      } else if (contract?.id && setContract) {
        const refreshed = await fetch(`${API_URL}/contracts/${contract.id}`, {
          headers: { "x-api-key": API_KEY, Authorization: `Bearer ${token}`, "x-active-role": activeRole },
        }).then((r) => r.json());
        if (setContract && refreshed) setContract(refreshed.data || refreshed);
      }
      setOpen(false);
    } catch (err) {
      console.error("❌ Save error:", err);
      toast.error(err.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  // Handlers
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleListChange = (index, key, value) => setForm((prev) => {
    const list = [...(prev.list || [])];
    list[index] = { ...list[index], [key]: value };
    return { ...prev, list };
  });

  const addListItem = () => {
    const item = {};
    const ref = `R-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    switch (section) {
      case "tenants":
      case "lessors": Object.assign(item, { name: "", id_number: "", phone: "", nationality: "" }); break;
      case "units": Object.assign(item, { unit_no: "", unit_type: "", unit_area: "", electric_meter_no: "", water_meter_no: "" }); break;
      case "payments": Object.assign(item, { due_date: "", amount: "" }); break;
      case "expenses": Object.assign(item, { expense_type: "", on_whom: "", paid_by: "", amount: "", date: "", notes: "" }); break;
      case "receipts": Object.assign(item, { type: "", reference_no: ref, amount: "", date: "", reason: "", link_type: "contract", payer: "", payer_name: "", receiver: "", receiver_name: "", notes: "" }); break;
    }
    setForm((p) => ({ ...p, list: [...(p.list || []), item] }));
  };

  const removeListItem = (index) => setForm((p) => ({ ...p, list: p.list.filter((_, i) => i !== index) }));

  // 🖼️ Get Section Icon
  const getSectionIcon = () => {
    switch (section) {
      case "tenants": return <User className="w-5 h-5" />;
      case "payments": return <Coins className="w-5 h-5" />;
      case "units": return <Building className="w-5 h-5" />;
      case "receipts": return <FileText className="w-5 h-5" />;
      case "contract": return <FileText className="w-5 h-5" />;
      default: return <Hash className="w-5 h-5" />;
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      {/* H-[100vh] ensures full height, flex-col organizes header/body/footer */}
      <DrawerContent className="max-w-xl ml-auto p-0 h-screen flex flex-col bg-gray-50/50 rounded-none sm:rounded-l-2xl border-l border-gray-200">
        
        {/* 🟢 Header */}
        <DrawerHeader className="flex justify-between items-center border-b bg-white px-6 py-4 shadow-sm flex-none z-10">
          <DrawerTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              {getSectionIcon()}
            </span>
            <span>{t("edit")} {t(section)}</span>
          </DrawerTitle>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-full" onClick={() => setOpen(false)}>
            <X size={20} />
          </Button>
        </DrawerHeader>

        {/* 📜 Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* A. Single Object Fields (Contract/Broker/Property) */}
          {["contract", "broker", "property"].includes(section) && (
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 gap-5">
               {Object.entries(form).map(([key, value]) => (
                 <EditableField
                   key={key}
                   label={t(key)}
                   value={value}
                   onChange={(v) => handleChange(key, v)}
                   type={key.includes("date") ? "date" : key.includes("amount") ? "number" : "text"}
                 />
               ))}
             </div>
          )}

          {/* B. List Arrays (Units/Payments/Tenants...) */}
          {form.list && (
            <div className="space-y-4">
              {form.list.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Hash size={20} />
                  </div>
                  <p className="text-gray-500 font-medium">لا توجد بيانات حالياً</p>
                  <p className="text-sm text-gray-400 mb-4">اضغط على زر الإضافة للبدء</p>
                </div>
              )}

              {form.list.map((item, i) => (
                <div key={i} className="group bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all relative animate-in slide-in-from-bottom-2 fade-in duration-300">
                  
                  {/* Item Header */}
                  <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md">#{i + 1}</span>
                      <h3 className="font-semibold text-gray-700">{t(section)}</h3>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-gray-300 hover:text-red-600 hover:bg-red-50 h-8 w-8 -mr-2"
                      onClick={() => removeListItem(i)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  {/* Dynamic Fields Grid */}
                  <div className={cn("grid gap-4", section === "expenses" || section === "receipts" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                    
                    {/* --- EXPENSES --- */}
                    {section === "expenses" && (
                      <>
                        <SelectField label="نوع المصروف" value={item.expense_type} onChange={(v) => handleListChange(i, "expense_type", v)}
                          options={[{ value: "كهرباء", label: "كهرباء ⚡" }, { value: "ماء", label: "ماء 💧" }, { value: "صيانة عامة", label: "صيانة 🔧" }, { value: "أخرى", label: "أخرى" }]} />
                        <SelectField label="على من" value={item.on_whom} onChange={(v) => handleListChange(i, "on_whom", v)}
                          options={[{ value: "مالك", label: "المالك" }, { value: "مستأجر", label: "المستأجر" }]} />
                        <EditableField label="المبلغ" value={item.amount} onChange={(v) => handleListChange(i, "amount", v)} type="number" icon={<Coins size={14}/>} />
                        <EditableField label="التاريخ" value={item.date} onChange={(v) => handleListChange(i, "date", v)} type="date" />
                        <div className="sm:col-span-2">
                           <EditableField label="ملاحظات" value={item.notes} onChange={(v) => handleListChange(i, "notes", v)} type="textarea" />
                        </div>
                      </>
                    )}

                    {/* --- RECEIPTS --- */}
                    {section === "receipts" && (
                      <>
                        <SelectField label="نوع السند" value={item.receipt_type} onChange={(v) => handleListChange(i, "receipt_type", v)}
                          options={[{ value: "قبض", label: "قبض 📥" }, { value: "صرف", label: "صرف 📤" }]} />
                         <EditableField label="المبلغ" value={item.amount} onChange={(v) => handleListChange(i, "amount", v)} type="number" icon={<Coins size={14}/>} />
                         <EditableField label="التاريخ" value={item.date} onChange={(v) => handleListChange(i, "date", v)} type="date" />
                         <EditableField label="السبب" value={item.reason} onChange={(v) => handleListChange(i, "reason", v)} />
                         
                         <div className="sm:col-span-2 border-t pt-2 mt-2 grid sm:grid-cols-2 gap-4">
                            <SelectField label="الدافع" value={item.payer} onChange={(v) => handleListChange(i, "payer", v)} options={[{value: "tenant", label: "مستأجر"}]} />
                            <EditableField label="اسم الدافع" value={item.payer_name} onChange={(v) => handleListChange(i, "payer_name", v)} icon={<User size={14}/>} />
                         </div>
                      </>
                    )}

                    {/* --- GENERIC FALLBACK --- */}
                    {!["expenses", "receipts"].includes(section) && Object.keys(item)
                      .filter(k => !["id", "unit_id", "property_id", "contract_id", "created_at", "updated_at", "status", "receipt_id"].includes(k))
                      .map((key) => (
                        <EditableField
                          key={key}
                          label={t(key)}
                          value={item[key]}
                          onChange={(v) => handleListChange(i, key, v)}
                          type={key === "unit_no" || key.includes("amount") || key.includes("area") ? "number" : key.includes("date") ? "date" : "text"}
                          icon={
                             key.includes("date") ? <Calendar size={14}/> : 
                             key.includes("amount") ? <Coins size={14}/> : 
                             key.includes("phone") ? <Hash size={14}/> : 
                             null
                          }
                        />
                      ))}
                  </div>
                </div>
              ))}
              
              {/* Add Button */}
              {["tenants", "lessors", "units", "payments", "expenses", "receipts"].includes(section) && (
                <Button onClick={addListItem} variant="outline" className="w-full py-6 border-dashed border-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all rounded-xl mt-4">
                  <PlusCircle className="mr-2" size={18} /> {t("add_new_item") || "إضافة سجل جديد"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 🟢 Footer */}
        <DrawerFooter className="border-t bg-white p-5 flex-none z-10">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 h-11 border-gray-200">
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11 shadow-lg shadow-emerald-200"
            >
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
              {saving ? t("saving") : t("save_changes")}
            </Button>
          </div>
        </DrawerFooter>

      </DrawerContent>
    </Drawer>
  );
}

/* 🧩 UI Components */

function EditableField({ label, value, onChange, type = "text", icon }) {
  const isDate = type === "date";
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      <div className="relative group">
        <div className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
          {icon ? icon : isDate ? <Calendar size={16} /> : type === 'number' ? <Hash size={16} /> : <FileText size={16} />}
        </div>
        <input
          type={type}
          value={value || (isDate ? "" : "")} // Removed default today to avoid accidental saves
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all placeholder:text-gray-300 hover:bg-white"
          onFocus={(e) => { if (isDate && e.target.showPicker) e.target.showPicker(); }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all cursor-pointer hover:bg-white"
        >
          <option value="" disabled>اختر...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
    </div>
  );
}