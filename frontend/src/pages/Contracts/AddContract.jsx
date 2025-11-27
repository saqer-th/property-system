import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  PlusCircle,
  Save,
  Loader2,
  FileUp,
  Edit3,
  Languages,
  CheckCircle2,
  Building2,
  Users,
  FileText,
  CreditCard,
  LayoutGrid,
  Search,
  ArrowRight,
  UploadCloud,
  X,
  AlertTriangle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Editable from "@/components/common/Editable";
import PartySection from "@/components/common/PartySection";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { API_URL, API_KEY } from "@/config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SAUDI_CITIES = ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الخبر", "الظهران", "القطيف", "الإحساء", "بريدة", "عنيزة", "حائل", "تبوك", "الطائف", "نجران", "جيزان", "أبها", "خميس مشيط", "بيشة", "ينبع", "الجوف", "عرعر", "القريات", "سكاكا", "الباحة", "القنفذة", "محايل عسير", "رابغ", "الليث", "طريف", "المجمعة", "الخفجي", "رأس تنورة", "حفر الباطن", "الزلفي", "الدوادمي", "شقراء", "وادي الدواسر", "الخرج", "السليل", "الدمام", "صفوى", "سيهات", "تاروت", "الجبيل"];

// ✅ FIX 1: Define Initial State for Manual Mode
const INITIAL_STATE = {
  contract_no: "",
  title_deed_no: "",
  tenancy_start: "",
  tenancy_end: "",
  annual_rent: "",
  total_contract_value: "",
  lessors: [{ name: "", id: "", phone: "", email: "" }], // Start with 1 empty lessor
  tenants: [{ name: "", id: "", phone: "", email: "" }], // Start with 1 empty tenant
  payments: [{ due_date: "", amount: "" }],              // Start with 1 empty payment
  property: { property_type: "", property_usage: "", num_units: "", city: "", national_address: "" },
  units: [],
  brokerage_entity: { name: "", cr_no: "", phone: "", address: "" }
};

export default function AddContract() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState("auto"); // 'auto', 'manual'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Initialize data with empty object usually, but handled carefully in logic
  const [data, setData] = useState({});
  
  const [activeTab, setActiveTab] = useState("contract");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const isRtl = i18n.language === "ar";

  const API_EXTRACT = `${API_URL}/api/extract`;

  // 🌐 Toggle Language
  const toggleLang = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  // 🛡️ Validation Helpers
  const isValidSaudiPhone = (phone) => /^(?:\+9665|05)[0-9]{8}$/.test(phone);
  const isValidSaudiID = (id) => /^[0-9]{10}$/.test(id);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // 🔍 Main Validation Function
  function validateContract(data) {
    const errors = [];

    // 1. Basic Contract Info
    if (!data.contract_no) errors.push(t("contractNo") || "رقم العقد مطلوب");
    if (!data.tenancy_start) errors.push(t("startDate") || "تاريخ البداية مطلوب");
    if (!data.tenancy_end) errors.push(t("endDate") || "تاريخ النهاية مطلوب");
    if (!data.annual_rent) errors.push(t("annualRent") || "الإيجار السنوي مطلوب");
    if (!data.total_contract_value) errors.push(t("totalValue") || "إجمالي العقد مطلوب");
    
    // 2. Lessor (Must have at least one valid lessor)
    if (!data.lessors || data.lessors.length === 0) {
      errors.push("بيانات المؤجر مفقودة");
    } else {
      const l = data.lessors[0];
      if (!l.name) errors.push("اسم المؤجر مطلوب");
      if (!l.id) errors.push("رقم هوية المؤجر مطلوب");
      else if (!isValidSaudiID(l.id)) errors.push("رقم هوية المؤجر غير صالح (10 أرقام)");
      
      if (!l.phone) errors.push("رقم جوال المؤجر مطلوب");
      else if (!isValidSaudiPhone(l.phone)) errors.push("رقم جوال المؤجر غير صحيح");
    }

    // 3. Tenant (Must have at least one valid tenant)
    if (!data.tenants || data.tenants.length === 0) {
      errors.push("بيانات المستأجر مفقودة");
    } else {
      const t = data.tenants[0];
      if (!t.name) errors.push("اسم المستأجر مطلوب");
      if (!t.id) errors.push("رقم هوية المستأجر مطلوب");
      else if (!isValidSaudiID(t.id)) errors.push("رقم هوية المستأجر غير صالح (10 أرقام)");
      
      if (!t.phone) errors.push("رقم جوال المستأجر مطلوب");
      else if (!isValidSaudiPhone(t.phone)) errors.push("رقم جوال المستأجر غير صحيح");
    }

    // 4. Property
    if (!data.property?.property_type) errors.push(t("propertyType") || "نوع العقار مطلوب");
    if (!data.property?.city) errors.push(t("city") || "المدينة مطلوبة");

    // 5. Units Validation (The Request Fix)
    // If units exist, EVERY unit must have a unit_no
    if (data.units && data.units.length > 0) {
      const missingUnitNo = data.units.some(u => !u.unit_no || u.unit_no.toString().trim() === "");
      if (missingUnitNo) {
        errors.push("يجب إدخال رقم الوحدة لكل وحدة مضافة");
      }
      // check the unit_no is numeric
      const nonNumericUnitNo = data.units.some(u => isNaN(Number(u.unit_no)));
      if (nonNumericUnitNo) {
        errors.push("رقم الوحدة يجب أن يكون رقمًا");
      }
    }

    // 6. Payments
    if (!data.payments || data.payments.length === 0) {
      errors.push("جدول الدفعات مطلوب");
    } else {
        // Optional: Check if first payment has amount
        if(!data.payments[0].amount) errors.push("قيمة الدفعة الأولى مطلوبة");
    }

    // brokerage_entity validation (optional)
    if (data.brokerage_entity) {
      if (!data.brokerage_entity.name) errors.push("اسم الوسيط مطلوب");
      if (!data.brokerage_entity.phone) errors.push("رقم جوال الوسيط مطلوب");
      else if (!isValidSaudiPhone(data.brokerage_entity.phone)) errors.push("رقم جوال الوسيط غير صحيح");
    }
    // check the tenancy_end is after tenancy_start
    if (data.tenancy_start && data.tenancy_end) {
      const start = new Date(data.tenancy_start);
      const end = new Date(data.tenancy_end);
      if (end <= start) {
        errors.push("تاريخ نهاية الإيجار يجب أن يكون بعد تاريخ البداية");
      }
    }

    return errors;
  }

  // 🖱️ Step 1: Pre-Save Check
  const handlePreSaveCheck = () => {
    console.log("Validating Data:", data); // Debugging
    const errors = validateContract(data);
    
    if (errors.length > 0) {
      console.warn("Validation Failed:", errors); // Debugging
      toast.error(
        <div className="text-sm" dir={isRtl ? "rtl" : "ltr"}>
          <strong>{t("fixErrors") || "يرجى تصحيح الأخطاء التالية:"}</strong>
          <ul className="list-disc list-inside mt-1">
            {errors.slice(0, 4).map((e, i) => <li key={i}>{e}</li>)}
            {errors.length > 4 && <li>...</li>}
          </ul>
        </div>,
        { duration: 4000 }
      );
      return; // 🛑 Stop execution
    }

    // ✅ Open Dialog
    setShowConfirmDialog(true);
  };

  // 💾 Step 2: Submit Data
  async function submitData() {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user?.token) throw new Error("يرجى تسجيل الدخول أولاً");

      const payload = { 
        ...data, 
        created_by: user?.id,
        created_by_phone: user?.phone 
      };

      const res = await fetch(`${API_URL}/contracts/full`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "x-api-key": API_KEY, 
            Authorization: `Bearer ${user.token}` 
        },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.message_ar || json.message || "فشل الحفظ");

      if (json.success) {
        toast.success(json.message_ar || t("contractSaved"));
        // Reset Logic
        setMode("auto"); 
        setFile(null);
        setData({});
        setShowConfirmDialog(false);
      } else {
        throw new Error(json.message || "خطأ غير متوقع");
      }

    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // 📤 Extract PDF
  async function handleExtract() {
    if (!file) return toast.error(t("selectPDFFirst"));
    if (!file.name.toLowerCase().endsWith(".pdf")) return toast.error(t("mustBePDF"));
    if (loading) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(API_EXTRACT, {
        method: "POST",
        headers: { "x-api-key": API_KEY },
        body: formData,
      });

      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error("Invalid Server Response"); }

      if (json.error) throw new Error(json.error);

      // Helper to ensure array
      const mapArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
      
      const payments = mapArr(json.payments);
      if(payments.length === 0 && json.installment_amount) {
         payments.push({amount: json.installment_amount, due_date: json.first_payment || ""});
      }

      const tenantData = mapArr(json.tenants || json.tenant);
      const lessorData = mapArr(json.lessors || (json.lessor_name ? {name: json.lessor_name, id: json.lessor_id, phone: json.lessor_phone} : null));

      setData({
        contract_no: json.contract_no || "",
        title_deed_no: json.title_deed_no || json.ownership_no || "",
        tenancy_start: json.tenancy_start || "",
        tenancy_end: json.tenancy_end || "",
        annual_rent: json.annual_rent || "",
        total_contract_value: json.total_contract_value || "",
        tenants: tenantData.length ? tenantData : [{name:"", id:"", phone:""}],
        lessors: lessorData.length ? lessorData : [{name:"", id:"", phone:""}],
        payments: payments.length ? payments : [{due_date: "", amount: ""}],
        units: mapArr(json.units || (json.unit_no ? {unit_no: json.unit_no, unit_type: json.unit_type} : null)),
        property: json.property || { property_type: json.property_type, num_units: json.num_units, city: json.city || "", national_address: json.national_address || "" },
        brokerage_entity: json.brokerage_entity || { name: json.brokerage_name, cr_no: json.brokerage_cr_no, phone: json.brokerage_phone, address: json.brokerage_address },
      });

      toast.success(t("contractExtracted"));
      setMode("manual");
      setActiveTab("contract");
    } catch (err) {
      console.error(err);
      toast.error(t("extractFailed"));
    } finally {
      setLoading(false);
    }
  }

  // Helper Change Handlers
  const handleChange = (field, value) => setData((prev) => ({ ...prev, [field]: value }));
  const handleNestedChange = (parent, field, value) => setData((prev) => ({ ...prev, [parent]: { ...(prev[parent] || {}), [field]: value } }));
  const handleArrayChange = (arr, index, field, value) => setData((prev) => {
    const copy = [...(prev[arr] || [])];
    if(!copy[index]) copy[index] = {}; // safety check
    copy[index] = { ...copy[index], [field]: value };
    return { ...prev, [arr]: copy };
  });

  const tabs = [
    { id: "contract", label: t("tab_contract"), icon: <FileText size={16}/> },
    { id: "tenant", label: t("tab_tenant"), icon: <Users size={16}/> },
    { id: "lessor", label: t("tab_lessor"), icon: <Users size={16}/> },
    { id: "property", label: t("tab_property"), icon: <Building2 size={16}/> },
    { id: "units", label: t("tab_units"), icon: <LayoutGrid size={16}/> },
    { id: "payments", label: t("tab_payments"), icon: <CreditCard size={16}/> },
    { id: "brokerage", label: t("tab_brokerage"), icon: <Search size={16}/> },
    { id: "review", label: t("tab_review"), icon: <CheckCircle2 size={16}/> },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 min-h-screen bg-gray-50/50 space-y-8" dir={isRtl ? "rtl" : "ltr"}>
        <Toaster position="top-center" />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t("addContract")}</h1>
            <p className="text-gray-500 mt-1">{t("addContractDesc") || "إضافة عقد جديد عبر التحليل الذكي أو الإدخال اليدوي"}</p>
          </div>
          <Button variant="ghost" onClick={toggleLang} className="flex gap-2">
            <Languages size={18} /> {i18n.language === "ar" ? "English" : "العربية"}
          </Button>
        </div>

        {/* 🚀 Mode Selection */}
        {mode === "auto" && !data.contract_no && (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-10">
            {/* AI Option */}
            <Card className={`cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg group ${file ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}>
              <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                   <FileUp size={32} />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-gray-900">{t("autoMode")}</h3>
                   <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">{t("autoModeDesc") || "ارفع ملف العقد (PDF) ليتم استخراج البيانات تلقائياً."}</p>
                </div>
                <div className="w-full">
                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-200 border-dashed rounded-xl cursor-pointer bg-blue-50/30 hover:bg-blue-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {loading ? (
                             <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                          ) : file ? (
                             <>
                               <FileText className="w-8 h-8 text-blue-600 mb-2" />
                               <p className="text-sm text-gray-600 font-medium">{file.name}</p>
                             </>
                          ) : (
                             <>
                               <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                               <p className="text-sm text-gray-500"><span className="font-semibold text-blue-600">{t("uploadToAnalyze") || "اضغط للرفع"}</span></p>
                             </>
                          )}
                      </div>
                      <input type="file" className="hidden" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} disabled={loading} />
                   </label>
                </div>
                <Button onClick={handleExtract} disabled={!file || loading} className="w-full bg-blue-600 hover:bg-blue-700">
                   {loading ? t("analyzing") : t("analyzeContract")}
                </Button>
              </CardContent>
            </Card>

            {/* Manual Option (FIXED CLICK HANDLER) */}
            <Card 
                className="cursor-pointer transition-all hover:border-emerald-500 hover:shadow-lg group" 
                onClick={() => {
                    setMode("manual");
                    setData(INITIAL_STATE); // ✅ Initialize state here!
                    setActiveTab("contract");
                }}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-6 justify-center h-full">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                   <Edit3 size={32} />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-gray-900">{t("manualMode")}</h3>
                   <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">{t("manualModeDesc") || "تعبئة بيانات العقد يدوياً من الصفر."}</p>
                </div>
                <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                   {t("startManual")} <ArrowRight size={16} className={`mx-2 ${isRtl ? "rotate-180" : ""}`} />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 📝 Editor Interface */}
        {(mode === "manual" || (mode === "auto" && data.contract_no)) && (
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4">
             
             {/* Sidebar Navigation */}
             <Card className="lg:w-64 h-fit border-none shadow-none bg-transparent lg:bg-white lg:shadow-sm lg:border">
                <CardContent className="p-2 lg:p-4">
                   <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 no-scrollbar">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-w-max lg:min-w-0 ${
                            activeTab === tab.id
                              ? "bg-blue-600 text-white shadow-md"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                   </div>
                   
                   <div className="mt-6 pt-6 border-t hidden lg:block space-y-3">
                      <Button variant="outline" className="w-full text-gray-500" onClick={() => {setMode("auto"); setData({}); setFile(null);}}>
                          <X size={16} className="mx-2"/> {t("cancel")}
                      </Button>
                      <Button onClick={handlePreSaveCheck} className="w-full bg-emerald-600 hover:bg-emerald-700">
                          <Save size={16} className="mx-2"/> {t("save")}
                      </Button>
                   </div>
                </CardContent>
             </Card>

             {/* Main Content Form */}
             <Card className="flex-1 border-gray-200 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg">
                      {tabs.find(t => t.id === activeTab)?.icon}
                      {tabs.find(t => t.id === activeTab)?.label}
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                   
                   {/* 1. Contract Details */}
                   {activeTab === "contract" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <Editable label={t("contractNo")} value={data.contract_no} onChange={(v) => handleChange("contract_no", v)} placeholder="Ejar-XXXXXXXX" />
                        <Editable label={t("titleDeedNo")} value={data.title_deed_no} onChange={(v) => handleChange("title_deed_no", v)} />
                        <Editable type="date" label={t("startDate")} value={data.tenancy_start} onChange={(v) => handleChange("tenancy_start", v)} />
                        <Editable type="date" label={t("endDate")} value={data.tenancy_end} onChange={(v) => handleChange("tenancy_end", v)} />
                        <Editable type="number" label={t("annualRent")} value={data.annual_rent} onChange={(v) => handleChange("annual_rent", v)} icon={<span className="text-gray-500 text-xs">SAR</span>} />
                        <Editable type="number" label={t("totalValue")} value={data.total_contract_value} onChange={(v) => handleChange("total_contract_value", v)} icon={<span className="text-gray-500 text-xs">SAR</span>} />
                      </div>
                   )}

                   {/* 2 & 3 Parties */}
                   {(activeTab === "tenant" || activeTab === "lessor") && (
                      <PartySection 
                        title={activeTab === "tenant" ? t("tenants") : t("lessors")} 
                        arr={activeTab === "tenant" ? "tenants" : "lessors"} 
                        data={data} 
                        handleArrayChange={handleArrayChange} 
                      />
                   )}

                   {/* 4. Property */}
                   {activeTab === "property" && (
                      <div className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <Editable label={t("propertyType")} value={data.property?.property_type} onChange={(v) => handleNestedChange("property", "property_type", v)} />
                            <Editable label={t("propertyUsage")} value={data.property?.property_usage} onChange={(v) => handleNestedChange("property", "property_usage", v)} />
                            <Editable type="number" label={t("numUnits")} value={data.property?.num_units} onChange={(v) => handleNestedChange("property", "num_units", v)} />
                            
                            <div className="space-y-1">
                               <label className="text-sm font-medium text-gray-700">{t("city")}</label>
                               <select 
                                 className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5"
                                 value={data.property?.city || ""}
                                 onChange={(e) => handleNestedChange("property", "city", e.target.value)}
                               >
                                 <option value="">{t("selectCity")}</option>
                                 {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                            </div>
                          </div>
                          <Editable label={t("nationalAddress")} value={data.property?.national_address} onChange={(v) => handleNestedChange("property", "national_address", v)} />
                      </div>
                   )}

                   {/* 5. Units */}
                   {activeTab === "units" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                           <Button size="sm" onClick={() => setData(p => ({ ...p, units: [...(p?.units || []), { unit_no: "", unit_type: "" }] }))} className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
                             <PlusCircle size={16} className="mx-1" /> {t("addUnit")}
                           </Button>
                        </div>
                        {(!data.units || data.units.length === 0) && <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">{t("noUnitsAdded")}</div>}
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          {data.units?.map((u, i) => (
                            <Card key={i} className={`bg-gray-50 border-gray-200 ${(!u.unit_no) ? 'border-red-300 ring-1 ring-red-100' : ''}`}>
                              <CardContent className="p-4 space-y-3">
                                 <div className="flex justify-between items-center mb-2">
                                    <Badge variant="outline" className="bg-white">Unit {i+1}</Badge>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => {
                                        const newUnits = [...data.units];
                                        newUnits.splice(i, 1);
                                        setData({...data, units: newUnits});
                                    }}><X size={14}/></Button>
                                 </div>
                                 <Editable label={t("unitNo")} value={u.unit_no} onChange={(v) => handleArrayChange("units", i, "unit_no", v)} placeholder="Required *" />
                                 <Editable label={t("unitType")} value={u.unit_type} onChange={(v) => handleArrayChange("units", i, "unit_type", v)} />
                                 <div className="grid grid-cols-2 gap-2">
                                    <Editable label={t("electricMeter")} value={u.electric_meter_no} onChange={(v) => handleArrayChange("units", i, "electric_meter_no", v)} />
                                    <Editable label={t("waterMeter")} value={u.water_meter_no} onChange={(v) => handleArrayChange("units", i, "water_meter_no", v)} />
                                 </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                   )}

                   {/* 6. Payments */}
                   {activeTab === "payments" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                           <div className="flex gap-2 items-center text-blue-800 text-sm font-medium">
                              <CreditCard size={18} />
                              <span>{t("total")}: {data.payments?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toLocaleString()} SAR</span>
                           </div>
                           <Button size="sm" variant="outline" onClick={() => setData(p => ({ ...p, payments: [...(p?.payments || []), { due_date: "", amount: "" }] }))}>
                             <PlusCircle size={14} className="mx-1" /> {t("addPayment")}
                           </Button>
                        </div>
                        
                        <div className="space-y-2">
                           {data.payments?.map((p, i) => (
                             <div key={i} className="flex gap-4 items-end p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                                <span className="text-gray-400 font-mono text-sm py-2">#{i+1}</span>
                                <div className="flex-1">
                                  <Editable type="date" label={i===0 ? t("dueDate") : ""} value={p.due_date} onChange={(v) => handleArrayChange("payments", i, "due_date", v)} />
                                </div>
                                <div className="flex-1">
                                  <Editable type="number" label={i===0 ? t("amount") : ""} value={p.amount} onChange={(v) => handleArrayChange("payments", i, "amount", v)} />
                                </div>
                                <Button variant="ghost" size="sm" className="mb-1 text-red-400" onClick={() => {
                                    const newP = [...data.payments];
                                    newP.splice(i,1);
                                    setData({...data, payments: newP});
                                }}><X size={16}/></Button>
                             </div>
                           ))}
                        </div>
                      </div>
                   )}

                   {/* 7. Brokerage */}
                   {activeTab === "brokerage" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <Editable label={t("brokerageName")} value={data.brokerage_entity?.name} onChange={(v) => handleNestedChange("brokerage_entity", "name", v)} />
                        <Editable label={t("brokerageCR")} value={data.brokerage_entity?.cr_no} onChange={(v) => handleNestedChange("brokerage_entity", "cr_no", v)} />
                        <Editable label={t("brokeragePhone")} value={data.brokerage_entity?.phone} onChange={(v) => handleNestedChange("brokerage_entity", "phone", v)} />
                        <Editable label={t("brokerageAddress")} value={data.brokerage_entity?.address} onChange={(v) => handleNestedChange("brokerage_entity", "address", v)} />
                      </div>
                   )}

                   {/* 8. Review */}
                   {activeTab === "review" && (
                      <div className="flex flex-col items-center justify-center py-10 space-y-6">
                          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-pulse">
                             <CheckCircle2 size={40} />
                          </div>
                          <div className="text-center space-y-2">
                             <h3 className="text-2xl font-bold text-gray-800">{t("readyToSave")}</h3>
                             <p className="text-gray-500 max-w-md">{t("reviewNote") || "يرجى مراجعة كافة البيانات قبل الحفظ النهائي."}</p>
                          </div>
                          
                          <Card className="w-full max-w-md bg-gray-50 border-gray-200">
                             <CardContent className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between border-b pb-2">
                                   <span className="text-gray-500">{t("contractNo")}</span>
                                   <span className="font-mono font-medium">{data.contract_no || "—"}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                   <span className="text-gray-500">{t("tenant")}</span>
                                   <span className="font-medium">{data.tenants?.[0]?.name || "—"}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                   <span className="text-gray-500">{t("totalValue")}</span>
                                   <span className="font-bold text-green-600">{Number(data.total_contract_value).toLocaleString()} SAR</span>
                                </div>
                             </CardContent>
                          </Card>

                          <Button size="lg" onClick={handlePreSaveCheck} className="bg-emerald-600 hover:bg-emerald-700 w-full max-w-xs shadow-lg shadow-emerald-500/20">
                             {t("saveContract")}
                          </Button>
                      </div>
                   )}

                   {/* Mobile Save Button */}
                   <div className="mt-8 pt-4 lg:hidden">
                      <Button className="w-full bg-emerald-600" onClick={handlePreSaveCheck}>{t("save")}</Button>
                   </div>
                </CardContent>
             </Card>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="text-emerald-600"/> {t("confirmSave") || "تأكيد الحفظ"}</DialogTitle>
              <DialogDescription>{t("confirmDesc") || "يرجى التحقق من الأطراف الرئيسية للعقد."}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
               <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-600 uppercase mb-2">{t("lessors")}</h4>
                  {data.lessors?.length ? data.lessors.map((l,i) => <p key={i} className="text-sm font-medium truncate">{l.name}</p>) : <p className="text-sm text-gray-400">--</p>}
               </div>
               <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <h4 className="text-xs font-bold text-green-600 uppercase mb-2">{t("tenants")}</h4>
                  {data.tenants?.length ? data.tenants.map((t,i) => <p key={i} className="text-sm font-medium truncate">{t.name}</p>) : <p className="text-sm text-gray-400">--</p>}
               </div>
            </div>
            
            {/* Warning if total value != sum of payments */}
            {Math.abs(Number(data.total_contract_value || 0) - (data.payments?.reduce((acc, c) => acc + Number(c.amount || 0), 0) || 0)) > 1 && (
               <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} />
                  <span>تنبيه: مجموع الدفعات لا يطابق قيمة العقد الإجمالية.</span>
               </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
               <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>{t("cancel")}</Button>
               <Button onClick={submitData} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                 {saving ? <Loader2 className="animate-spin" size={16}/> : t("confirmSave")}
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}