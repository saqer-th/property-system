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
  Loader2, Save, X, RotateCcw, FileText, 
  Coins, Calendar, Link as LinkIcon, Building, 
  User, FileSignature, AlignLeft 
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

  // 🔄 Load Data
  useEffect(() => {
    if (!open || !user?.token) return;

    async function loadData() {
      setLoadingData(true);
      try {
        const [props, conts] = await Promise.all([
          fetch(`${API_URL}/properties/my`, {
            headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user.token}` },
          }).then((r) => r.json()),
          fetch(`${API_URL}/contracts/my`, {
            headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user.token}` },
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

  // 🧠 Handle Change
  const handleChange = async (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));

    // 🔗 Auto-fill Parties from Contract
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

    // 🏢 Fetch Units on Property Select
    if (key === "property_id" && value) {
      setLoadingUnits(true);
      setFilteredUnits([]);
      try {
        const res = await fetch(`${API_URL}/units/by-property/${value}`, {
          headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user.token}` },
        });
        const json = await res.json();
        if (json.success) setFilteredUnits(json.data || []);
      } catch (err) {
        console.error("❌ Error fetching units:", err);
      } finally {
        setLoadingUnits(false);
      }
    }

    // 💡 Auto-fill Parties based on Type
    if (key === "type") {
      if (value === "قبض") {
        setForm((prev) => ({ ...prev, payer_name: prev.payer_name || "المستأجر", receiver_name: prev.receiver_name || "المالك" }));
      } else if (value === "صرف") {
        setForm((prev) => ({ ...prev, payer_name: prev.payer_name || "المالك", receiver_name: prev.receiver_name || "المستأجر" }));
      } else if (value === "tswya") {
        setForm((prev) => ({ ...prev, payer_name: "", receiver_name: "" }));
      }
    }
  };

  // ✅ Validation
  const validateForm = () => {
    const newErrors = {};
    const val = (v) => !v || String(v).trim() === "";

    if (val(form.type)) newErrors.type = "يرجى تحديد نوع السند";
    if (val(form.amount) || Number(form.amount) <= 0) newErrors.amount = "مبلغ غير صحيح";
    if (val(form.date)) newErrors.date = "تاريخ مطلوب";
    if (val(form.reason)) newErrors.reason = "السبب مطلوب";
    if (val(form.link_type)) newErrors.link_type = "نوع الربط مطلوب";

    if (form.link_type === "property" && val(form.property_id)) newErrors.property_id = "اختر العقار";
    if (form.link_type === "unit") {
      if (val(form.property_id)) newErrors.property_id = "اختر العقار";
      if (val(form.unit_id)) newErrors.unit_id = "اختر الوحدة";
    }
    if (form.link_type === "contract" && val(form.contract_id)) newErrors.contract_id = "اختر العقد";

    if (val(form.payer_name)) newErrors.payer_name = "اسم الدافع مطلوب";
    if (val(form.receiver_name)) newErrors.receiver_name = "اسم المستلم مطلوب";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💾 Save
  async function handleSave() {
    if (!user?.token) return toast.error("سجل دخولك أولاً");
    if (!validateForm()) return toast.error("يرجى إكمال الحقول المطلوبة");

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
      if (!res.ok || !json.success) throw new Error(json.message || "فشل الحفظ");

      toast.success("✅ تم إضافة السند بنجاح");
      setOpen(false);
      resetForm();
      if (refresh) refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const resetForm = () => {
    setForm({
      type: "", amount: "", date: new Date().toISOString().split("T")[0],
      reason: "", link_type: "", property_id: "", unit_id: "", contract_id: "",
      payer_name: "", receiver_name: "", notes: "",
    });
    setErrors({});
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="max-w-xl ml-auto p-0 h-screen flex flex-col bg-gray-50/50 rounded-none sm:rounded-l-2xl border-l border-gray-200">
        
        {/* 🟢 Header */}
        <DrawerHeader className="flex justify-between items-center border-b bg-white px-6 py-4 shadow-sm flex-none z-10">
          <DrawerTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText size={20} />
            </span>
            <span>إضافة سند جديد</span>
          </DrawerTitle>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 rounded-full" onClick={() => setOpen(false)}>
            <X size={20} />
          </Button>
        </DrawerHeader>

        {/* 📜 Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingData ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
               <Loader2 className="animate-spin mb-2 text-blue-500" size={32} />
               <p>جاري تحميل البيانات...</p>
             </div>
          ) : (
            <>
              {/* 1️⃣ Basic Info Section */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
                  <span className="w-1 h-4 bg-blue-500 rounded-full"></span> بيانات السند
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <SelectField 
                     label="نوع السند" 
                     value={form.type} 
                     onChange={(v) => handleChange("type", v)} 
                     error={errors.type}
                     options={[
                       { value: "قبض", label: "سند قبض 💰" },
                       { value: "صرف", label: "سند صرف 💸" },
                       { value: "تسوية", label: "سند تسوية ⚖️" },
                     ]} 
                   />
                   <InputField 
                     label="المبلغ (ريال)" 
                     type="number" 
                     value={form.amount} 
                     onChange={(v) => handleChange("amount", v)} 
                     error={errors.amount} 
                     icon={<Coins size={14}/>} 
                   />
                   <InputField 
                     label="تاريخ السند" 
                     type="date" 
                     value={form.date} 
                     onChange={(v) => handleChange("date", v)} 
                     error={errors.date} 
                     icon={<Calendar size={14}/>} 
                   />
                   <InputField 
                     label="سبب السند" 
                     value={form.reason} 
                     onChange={(v) => handleChange("reason", v)} 
                     error={errors.reason} 
                   />
                </div>
              </div>

              {/* 2️⃣ Linking Section (Context) */}
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                 <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
                    <LinkIcon size={16}/> ربط السند بـ...
                 </h3>
                 <div className="grid grid-cols-1 gap-4">
                    <SelectField 
                      label="نوع الربط" 
                      value={form.link_type} 
                      onChange={(v) => handleChange("link_type", v)} 
                      error={errors.link_type}
                      options={[
                        { value: "", label: "بدون ربط (عام)" },
                        { value: "contract", label: "عقد إيجار 📄" },
                        { value: "property", label: "عقار كامل 🏢" },
                        { value: "unit", label: "وحدة سكنية 🏘️" },
                      ]} 
                    />

                    {/* Dynamic Fields */}
                    {form.link_type === "contract" && (
                       <SelectField 
                         label="اختر العقد" 
                         value={form.contract_id} 
                         onChange={(v) => handleChange("contract_id", v)} 
                         error={errors.contract_id}
                         options={contracts.map(c => ({ value: c.id, label: `${c.contract_no || 'بدون رقم'} - ${c.tenant_name}` }))} 
                         placeholder="ابحث عن العقد..."
                       />
                    )}

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
                       <div className="animate-in slide-in-from-top-2 fade-in">
                          {loadingUnits ? (
                             <div className="text-xs text-blue-500 flex gap-2 items-center p-2"><Loader2 className="animate-spin" size={12}/> جاري جلب الوحدات...</div>
                          ) : (
                             <SelectField 
                               label="اختر الوحدة" 
                               value={form.unit_id} 
                               onChange={(v) => handleChange("unit_id", v)} 
                               error={errors.unit_id}
                               options={filteredUnits.map(u => ({ value: u.id, label: `${u.unit_no} - ${u.unit_type}` }))} 
                             />
                          )}
                       </div>
                    )}
                 </div>
              </div>

              {/* 3️⃣ Parties Section */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
                  <span className="w-1 h-4 bg-orange-500 rounded-full"></span> أطراف السند
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <InputField 
                     label="(الدافع)" 
                     value={form.payer_name} 
                     onChange={(v) => handleChange("payer_name", v)} 
                     error={errors.payer_name} 
                     icon={<User size={14}/>} 
                   />
                   <InputField 
                     label="(المستلم)" 
                     value={form.receiver_name} 
                     onChange={(v) => handleChange("receiver_name", v)} 
                     error={errors.receiver_name} 
                     icon={<User size={14}/>} 
                   />
                </div>
              </div>

              {/* 4️⃣ Notes */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <InputField 
                   label="ملاحظات إضافية" 
                   value={form.notes} 
                   onChange={(v) => handleChange("notes", v)} 
                   type="textarea"
                   icon={<AlignLeft size={14}/>}
                 />
              </div>

            </>
          )}
        </div>

        {/* 🟢 Footer */}
        <DrawerFooter className="border-t bg-white p-5 flex-none z-10">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={resetForm} className="flex-1 h-11 border-gray-200">
              <RotateCcw className="mr-2" size={16} /> إعادة تعيين
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 shadow-lg shadow-blue-200"
            >
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
              {saving ? "جاري الحفظ..." : "حفظ السند"}
            </Button>
          </div>
        </DrawerFooter>
        
      </DrawerContent>
    </Drawer>
  );
}

/* 🧩 Reusable Components (Styled) */

function InputField({ label, value, onChange, error, type = "text", icon }) {
  const isTextarea = type === "textarea";
  
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      <div className="relative group">
        <div className={`absolute left-3 ${isTextarea ? 'top-3' : 'top-2.5'} text-gray-400 group-focus-within:text-blue-500 transition-colors`}>
          {icon || (type === "date" ? <Calendar size={16}/> : <FileSignature size={16}/>)}
        </div>
        
        {isTextarea ? (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={cn(
               "w-full bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-300 resize-none",
               error && "border-red-300 focus:ring-red-100 focus:border-red-400"
            )}
          />
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-300",
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
            "w-full appearance-none bg-gray-50/50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer",
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