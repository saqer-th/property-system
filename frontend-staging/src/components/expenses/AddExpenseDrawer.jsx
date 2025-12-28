import React, { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Save, RotateCcw, X, Wallet, 
  Calendar, Link as LinkIcon, Building, 
  FileText, Coins, User, AlignLeft 
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function AddExpenseDrawer({ open, setOpen, refresh }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

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
    "كهرباء", "ماء", "صيانة عامة", "دهان", "تنظيف", 
    "صيانة مصعد", "تنسيق حدائق", "رسوم بلدية", 
    "رسوم صيانة سنوية", "إيجار مولد", "أخرى",
  ];

  // 📦 Load Data
  useEffect(() => {
    if (!open) return;
    async function fetchData() {
      setLoadingData(true);
      try {
        const headers = { "x-api-key": API_KEY, ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) };
        const [props, unts, conts] = await Promise.all([
          fetch(`${API_URL}/properties/my`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/units/my`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/contracts/my`, { headers }).then((r) => r.json()),
        ]);
        setProperties(props.data || []);
        setUnits(unts.data || []);
        setContracts(conts.data || []);
      } catch (err) {
        console.error("❌ Error loading data:", err);
        toast.error("فشل تحميل البيانات");
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [open, user]);

  // 🔄 Filter Units
  useEffect(() => {
    if (form.property_id) {
      const related = units.filter((u) => u.property_id === Number(form.property_id));
      setFilteredUnits(related);
    } else {
      setFilteredUnits([]);
    }
  }, [form.property_id, units]);

  // 🧠 Handle Change
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // ✅ Validation
  const validateForm = () => {
    const newErrors = {};
    if (!form.expense_type) newErrors.expense_type = "اختر نوع المصروف";
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = "المبلغ مطلوب";
    if (!form.date) newErrors.date = "التاريخ مطلوب";
    if (!form.on_whom) newErrors.on_whom = "حدد المسؤول";
    if (form.expense_type === "أخرى" && !form.custom_expense_type) newErrors.custom_expense_type = "حدد النوع";

    if (form.link_type === "unit" && (!form.property_id || !form.unit_id)) {
      newErrors.property_id = "مطلوب";
      newErrors.unit_id = "مطلوب";
    }
    if (form.link_type === "contract" && !form.contract_id) newErrors.contract_id = "مطلوب";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💾 Save
  async function handleSave() {
    if (!validateForm()) return toast.error("أكمل الحقول المطلوبة");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY, ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "فشل الحفظ");

      toast.success("✅ تم إضافة المصروف");
      setOpen(false);
      refresh?.();
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const resetForm = () => {
    setForm({
      expense_type: "", custom_expense_type: "", amount: "", date: new Date().toISOString().split("T")[0],
      on_whom: "", link_type: "", property_id: "", unit_id: "", contract_id: "", notes: "",
    });
    setErrors({});
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-xl ml-auto p-0 h-screen flex flex-col bg-gray-50/50 rounded-none sm:rounded-l-2xl border-l border-gray-200">
        
        {/* 🔴 Header */}
        <DrawerHeader className="flex justify-between items-center border-b bg-white px-6 py-4 shadow-sm flex-none z-10">
          <DrawerTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <span className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <Wallet size={20} />
            </span>
            <span>تسجيل مصروف جديد</span>
          </DrawerTitle>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-rose-500 rounded-full" onClick={() => setOpen(false)}>
            <X size={20} />
          </Button>
        </DrawerHeader>

        {/* 📜 Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingData ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
               <Loader2 className="animate-spin mb-2 text-rose-500" size={32} />
               <p>جاري تحميل البيانات...</p>
             </div>
          ) : (
            <>
              {/* 1️⃣ Details Section */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
                  <span className="w-1 h-4 bg-rose-500 rounded-full"></span> تفاصيل المصروف
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="sm:col-span-2">
                     <SelectField 
                       label="نوع المصروف" 
                       value={form.expense_type} 
                       onChange={(v) => handleChange("expense_type", v)} 
                       error={errors.expense_type}
                       options={popularExpenses.map(e => ({ value: e, label: e }))} 
                     />
                   </div>
                   
                   {form.expense_type === "أخرى" && (
                     <div className="sm:col-span-2 animate-in slide-in-from-top-2 fade-in">
                       <InputField 
                         label="تحديد النوع" 
                         value={form.custom_expense_type} 
                         onChange={(v) => handleChange("custom_expense_type", v)} 
                         error={errors.custom_expense_type} 
                         placeholder="اكتب نوع المصروف..."
                       />
                     </div>
                   )}

                   <InputField 
                     label="المبلغ (ريال)" 
                     type="number" 
                     value={form.amount} 
                     onChange={(v) => handleChange("amount", v)} 
                     error={errors.amount} 
                     icon={<Coins size={14}/>} 
                   />

                   <InputField 
                     label="تاريخ الصرف" 
                     type="date" 
                     value={form.date} 
                     onChange={(v) => handleChange("date", v)} 
                     error={errors.date} 
                     icon={<Calendar size={14}/>} 
                   />

                   <div className="sm:col-span-2">
                     <SelectField 
                       label="على حساب من؟" 
                       value={form.on_whom} 
                       onChange={(v) => handleChange("on_whom", v)} 
                       error={errors.on_whom}
                       options={[
                         { value: "مالك", label: "المالك (Owner)" },
                         { value: "مستأجر", label: "المستأجر (Tenant)" },
                         { value: "مكتب", label: "المكتب (Office)" },
                         { value: "أخرى", label: "أخرى" },
                       ]} 
                     />
                   </div>
                </div>
              </div>

              {/* 2️⃣ Allocation Section (Context) */}
              <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 space-y-4">
                 <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2 mb-2">
                    <LinkIcon size={16}/> تخصيص المصروف
                 </h3>
                 <div className="grid grid-cols-1 gap-4">
                    <SelectField 
                      label="نوع الربط" 
                      value={form.link_type} 
                      onChange={(v) => handleChange("link_type", v)} 
                      error={errors.link_type}
                      options={[
                        { value: "", label: "مصروف عام (بدون ربط)" },
                        { value: "property", label: "مرتبط بعقار 🏢" },
                        { value: "unit", label: "مرتبط بوحدة 🏘️" },
                        { value: "contract", label: "مرتبط بعقد 📄" },
                      ]} 
                    />

                    {(form.link_type === "property" || form.link_type === "unit") && (
                       <SelectField 
                         label="اختر العقار" 
                         value={form.property_id} 
                         onChange={(v) => handleChange("property_id", v)} 
                         error={errors.property_id}
                         options={properties.map(p => ({ value: p.id, label: `${p.property_type} - ${p.title_deed_no || `Ref: ${p.id}`}` }))} 
                       />
                    )}

                    {form.link_type === "unit" && (
                       <SelectField 
                         label="اختر الوحدة" 
                         value={form.unit_id} 
                         onChange={(v) => handleChange("unit_id", v)} 
                         error={errors.unit_id}
                         options={filteredUnits.map(u => ({ value: u.id, label: `${u.unit_no} - ${u.unit_type}` }))} 
                         placeholder={form.property_id ? "اختر الوحدة..." : "اختر العقار أولاً"}
                       />
                    )}

                    {form.link_type === "contract" && (
                       <SelectField 
                         label="اختر العقد" 
                         value={form.contract_id} 
                         onChange={(v) => handleChange("contract_id", v)} 
                         error={errors.contract_id}
                         options={contracts.map(c => ({ value: c.id, label: `${c.contract_no} - ${c.tenant_name}` }))} 
                       />
                    )}
                 </div>
              </div>

              {/* 3️⃣ Notes */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <InputField 
                   label="ملاحظات وتفاصيل" 
                   value={form.notes} 
                   onChange={(v) => handleChange("notes", v)} 
                   type="textarea"
                   icon={<AlignLeft size={14}/>}
                   placeholder="تفاصيل إضافية حول المصروف..."
                 />
              </div>

            </>
          )}
        </div>

        {/* 🔴 Footer */}
        <DrawerFooter className="border-t bg-white p-5 flex-none z-10">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={resetForm} className="flex-1 h-11 border-gray-200">
              <RotateCcw className="mr-2" size={16} /> إعادة تعيين
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-11 shadow-lg shadow-rose-200"
            >
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
              {saving ? "جاري الحفظ..." : "حفظ المصروف"}
            </Button>
          </div>
        </DrawerFooter>
        
      </DrawerContent>
    </Drawer>
  );
}

/* 🧩 Reusable Components */

function InputField({ label, value, onChange, error, type = "text", icon, placeholder }) {
  const isTextarea = type === "textarea";
  
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      <div className="relative group">
        <div className={`absolute left-3 ${isTextarea ? 'top-3' : 'top-2.5'} text-gray-400 group-focus-within:text-rose-500 transition-colors`}>
          {icon || (type === "date" ? <Calendar size={16}/> : <FileText size={16}/>)}
        </div>
        
        {isTextarea ? (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={cn(
               "w-full bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-rose-100 focus:border-rose-400 outline-none transition-all placeholder:text-gray-300 resize-none",
               error && "border-red-300 focus:ring-red-100 focus:border-red-400"
            )}
          />
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "w-full bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-rose-100 focus:border-rose-400 outline-none transition-all placeholder:text-gray-300",
               error && "border-red-300 focus:ring-red-100 focus:border-red-400"
            )}
            onFocus={(e) => { if (type==="date" && e.target.showPicker) e.target.showPicker(); }}
          />
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium animate-in slide-in-from-top-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options = [], error, placeholder = "اختر..." }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-rose-100 focus:border-rose-400 outline-none transition-all cursor-pointer",
            error && "border-red-300 focus:ring-red-100 focus:border-red-400"
          )}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium animate-in slide-in-from-top-1">{error}</p>}
    </div>
  );
}