import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  PlusCircle,
  Save,
  Loader2,
  FileUp,
  Edit3,
  Languages,
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
import { Button } from "@/components/ui/button"; // <-- added

const SAUDI_CITIES = [
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الخبر",
  "الظهران",
  "القطيف",
  "الإحساء",
  "بريدة",
  "عنيزة",
  "حائل",
  "تبوك",
  "الطائف",
  "نجران",
  "جيزان",
  "أبها",
  "خميس مشيط",
  "بيشة",
  "ينبع",
  "الجوف",
  "عرعر",
  "القريات",
  "سكاكا",
  "الباحة",
  "القنفذة",
  "محايل عسير",
  "رابغ",
  "الليث",
  "طريف",
  "المجمعة",
  "الخفجي",
  "رأس تنورة",
  "حفر الباطن",
  "الزلفي",
  "الدوادمي",
  "شقراء",
  "وادي الدواسر",
  "الخرج",
  "السليل",
  "الدمام",
  "صفوى",
  "سيهات",
  "تاروت",
  "الجبيل",
];

export default function AddContract() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState("auto");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({});
  const [activeTab, setActiveTab] = useState("contract");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const API_EXTRACT = `${API_URL}/api/extract`;
  const API_SAVE = `${API_URL}/contracts/full`;

  // 🌐 تبديل اللغة
  const toggleLang = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
    toast.success(
      newLang === "ar" ? "تم التبديل إلى العربية" : "Switched to English"
    );
  };

  // 📤 تحليل العقد (PDF)
  async function handleExtract() {
    if (!file) return toast.error(t("selectPDFFirst"));
    if (!file.name.toLowerCase().endsWith(".pdf"))
      return toast.error(t("mustBePDF"));
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
      try {
        json = JSON.parse(text);
      } catch {
        console.error("❌ Invalid JSON:", text);
        throw new Error("الرد من السيرفر غير صالح (Invalid JSON)");
      }

      if (json.error) throw new Error(json.error);

      console.log("✅ Extracted JSON:", json);

      // 👥 المستأجرين
      const tenantData =
        Array.isArray(json.tenants) && json.tenants.length > 0
          ? json.tenants
          : json.tenant?.name
          ? [json.tenant]
          : json.tenant_reps?.length
          ? [json.tenant_reps[0]]
          : [];

      // 👤 المؤجرين
      const lessorData =
        Array.isArray(json.lessors) && json.lessors.length > 0
          ? json.lessors
          : json.lessor_name
          ? [
              {
                name: json.lessor_name,
                id: json.lessor_id || "",
                phone: json.lessor_phone || "",
                email: json.lessor_email || "",
              },
            ]
          : [];

      // 💼 الوسيط
      const brokerData =
        json.brokerage_entity && Object.keys(json.brokerage_entity).length > 0
          ? json.brokerage_entity
          : {
              name: json.brokerage_name || "",
              cr_no: json.brokerage_cr_no || "",
              phone:
                json.brokerage_phone ||
                json.brokerage_landline ||
                json.landline ||
                "",
              address: json.brokerage_address || "",
            };

      // 🏢 العقار
      const propertyData =
        json.property && Object.keys(json.property).length > 0
          ? json.property
          : {
              property_type: json.property_type || "",
              property_usage: json.property_usage || "",
              num_units: json.num_units || "",
              national_address: json.national_address || "",
            };

      // 🏘️ الوحدات
      const unitsData = Array.isArray(json.units)
        ? json.units.map((u) => ({
            unit_no: u.unit_no || "",
            unit_type: u.unit_type || "",
            unit_area: u.unit_area || "",
            electric_meter_no: u.electric_meter_no || "",
            water_meter_no: u.water_meter_no || "",
          }))
        : json.unit_no
        ? [
            {
              unit_no: json.unit_no,
              unit_type: json.unit_type || "",
              unit_area: json.unit_area || "",
              electric_meter_no: json.electric_meter_no || "",
              water_meter_no: json.water_meter_no || "",
            },
          ]
        : [];

      // 💰 الدفعات
      const paymentsData = Array.isArray(json.payments)
        ? json.payments
        : json.installment_amount
        ? [
            {
              amount: json.installment_amount,
              due_date: json.first_payment || "",
            },
          ]
        : [];

      // 🧾 تعبئة البيانات
      setData({
        contract_no: json.contract_no || "",
        title_deed_no: json.title_deed_no || json.ownership_no || "",
        tenancy_start: json.tenancy_start || "",
        tenancy_end: json.tenancy_end || "",
        annual_rent: json.annual_rent || "",
        total_contract_value: json.total_contract_value || "",
        tenants: tenantData,
        lessors: lessorData,
        payments: paymentsData,
        units: unitsData,
        property: propertyData,
        brokerage_entity: brokerData,
      });

      toast.success(t("contractExtracted"));
      setMode("manual");
      setActiveTab("contract");
    } catch (err) {
      console.error("❌ Error extracting contract:", err);
      toast.error(t("extractFailed"));
    } finally {
      setLoading(false);
    }
  }
// 📱 تحقق من رقم الجوال السعودي
function isValidSaudiPhone(phone) {
  // يقبل +9665XXXXXXXX أو 05XXXXXXXX
  const regex = /^(?:\+9665|05)[0-9]{8}$/;
  return regex.test(phone);
}

// 🪪 تحقق من رقم الهوية الوطنية (10 أرقام)
function isValidSaudiID(id) {
  const regex = /^[0-9]{10}$/;
  return regex.test(id);
}

// 📧 تحقق من البريد الإلكتروني
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
  // ✅ تحقق من صحة البيانات قبل الحفظ
function validateContract(data) {
  const errors = [];

  if (!data.contract_no) errors.push("رقم العقد");
  if (!data.tenancy_start) errors.push("تاريخ بداية العقد");
  if (!data.tenancy_end) errors.push("تاريخ نهاية العقد");
  if (!data.annual_rent) errors.push("قيمة الإيجار السنوي");
  if (!data.total_contract_value) errors.push("إجمالي قيمة العقد");
  if (!data.title_deed_no) errors.push("رقم الصك أو التملك");

  // 👤 المؤجر
  if (!data.lessors?.length) {
    errors.push("بيانات المؤجر مفقودة");
  } else {
    const l = data.lessors[0];
    if (!l.name) errors.push("اسم المؤجر");
    if (!l.id) errors.push("رقم هوية المؤجر");
    else if (!isValidSaudiID(l.id))
      errors.push("رقم هوية المؤجر غير صالح (يجب أن يتكون من 10 أرقام)");
    if (!l.phone) errors.push("رقم جوال المؤجر");
    else if (!isValidSaudiPhone(l.phone))
      errors.push("رقم جوال المؤجر غير صحيح (مثال: 0501234567)");
    if (l.email && !isValidEmail(l.email))
      errors.push("البريد الإلكتروني للمؤجر غير صحيح");
  }

  // 👥 المستأجر
  if (!data.tenants?.length) {
    errors.push("بيانات المستأجر مفقودة");
  } else {
    const t = data.tenants[0];
    if (!t.name) errors.push("اسم المستأجر");
    if (!t.id) errors.push("رقم هوية المستأجر");
    else if (!isValidSaudiID(t.id))
      errors.push("رقم هوية المستأجر غير صالح (10 أرقام)");
    if (!t.phone) errors.push("رقم جوال المستأجر");
    else if (!isValidSaudiPhone(t.phone))
      errors.push("رقم جوال المستأجر غير صحيح (مثال: 0509876543)");
  }

  // 🏢 العقار
  if (!data.property?.property_type) errors.push("نوع العقار");
  if (!data.property?.property_usage) errors.push("استخدام العقار");
  if (!data.property?.num_units) errors.push("عدد الوحدات");
  if (!data.property?.national_address) errors.push("العنوان الوطني");
  if (!data.property?.city) errors.push("مدينة العقار");   // 👈 إلزامي


  // 💰 الدفعات
  if (!data.payments?.length) errors.push("يجب إضافة دفعة واحدة على الأقل");

  if (!data.brokerage_entity?.phone) {
    errors.push("رقم جوال وسيط العقار");
  } else if (!isValidSaudiPhone(data.brokerage_entity.phone)) {
    errors.push("رقم جوال وسيط العقار غير صحيح (مثال: 0501234567)");
  }

  return errors;
}


  // 💾 حفظ العقد
  // 💾 حفظ العقد (محدث لدعم verifyToken والربط مع المستخدم)
async function handleSave() {
  if (!data) return toast.error(t("noDataToSave"));

  const errors = validateContract(data);
  if (errors.length > 0) {
    toast.error(`Please fill all required fields:\n${errors.join(", ")}`);
    return;
  }

  setSaving(true);
  try {
    // 🔐 جلب التوكن من التخزين
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = user?.token;

    if (!token) {
      toast.error("يرجى تسجيل الدخول أولاً");
      setSaving(false);
      return;
    }

    // 🧩 تجهيز البيانات النهائية للإرسال
    const payload = {
      ...data,
      created_by: user?.id,
      created_by_phone: user?.phone,
    };

    const res = await fetch(`${API_URL}/contracts/full`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || "Invalid server response");
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403)
        throw new Error("ليس لديك صلاحية لإضافة عقد جديد");
      throw new Error(json.message_ar || json.message_en || json.message);
    }

    if (json.success) {
      toast.success(json.message_ar || t("contractSaved"));
      setMode("auto");
      setFile(null);
      setData({});
    } else {
      throw new Error(json.message_ar || json.message || "فشل حفظ العقد");
    }
  } catch (err) {
    console.error("❌ Error saving contract:", err);
    toast.error(err.message || t("saveFailed"));
  } finally {
    setSaving(false);
  }
}


  // 🧠 تحديث الحقول
  const handleChange = (field, value) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const handleNestedChange = (parent, field, value) =>
    setData((prev) => ({
      ...prev,
      [parent]: { ...(prev[parent] || {}), [field]: value },
    }));

  const handleArrayChange = (arr, index, field, value) =>
    setData((prev) => {
      const copy = [...(prev[arr] || [])];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, [arr]: copy };
    });

  const tabs = [
    { id: "contract", label: t("tab_contract") },
    { id: "tenant", label: t("tab_tenant") },
    { id: "lessor", label: t("tab_lessor") },
    { id: "brokerage", label: t("tab_brokerage") },
    { id: "property", label: t("tab_property") },
    { id: "units", label: t("tab_units") },
    { id: "payments", label: t("tab_payments") },
    { id: "review", label: t("tab_review") },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <Toaster position="top-center" />
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow p-6">
          {/* 🌐 اللغة */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg"
            >
              <Languages size={16} />
              {i18n.language === "ar" ? "English" : "العربية"}
            </button>
          </div>

          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
            {t("addContract")}
          </h1>

          {/* 🔁 اختيار الوضع */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setMode("auto")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                mode === "auto"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              <FileUp size={18} />
              {t("autoMode")}
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                mode === "manual"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              <Edit3 size={18} />
              {t("manualMode")}
            </button>
          </div>

          {/* الوضع التلقائي */}
          {mode === "auto" && (
            <div className="text-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="border border-gray-300 p-2 rounded w-full md:w-auto mb-3"
              />
              <button
                onClick={handleExtract}
                disabled={!file || loading}
                className={`flex items-center gap-2 px-6 py-2 rounded text-white mx-auto ${
                  loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {t("analyzing")}
                  </>
                ) : (
                  t("analyzeContract")
                )}
              </button>

              {!data?.contract_no && (
                <p className="text-gray-500 mt-4">{t("uploadToAnalyze")}</p>
              )}
            </div>
          )}

          {/* الوضع اليدوي */}
          {mode === "manual" && (
            <>
              <div className="flex justify-center flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ================= تبويبات ================= */}
              <div className="border-t pt-4 space-y-4 text-sm">
                {/* عقد */}
                {activeTab === "contract" && (
                  <>
                    <Editable
                      label={t("contractNo")}
                      value={data?.contract_no}
                      onChange={(v) => handleChange("contract_no", v)}
                    />
                    <Editable
                      type="date"
                      label={t("startDate")}
                      value={data?.tenancy_start}
                      onChange={(v) => handleChange("tenancy_start", v)}
                    />
                    <Editable
                      type="date"
                      label={t("endDate")}
                      value={data?.tenancy_end}
                      onChange={(v) => handleChange("tenancy_end", v)}
                    />
                    <Editable
                      type="number"
                      label={t("annualRent")}
                      value={data?.annual_rent}
                      onChange={(v) => handleChange("annual_rent", v)}
                    />
                    <Editable
                      type="number"
                      label={t("totalValue")}
                      value={data?.total_contract_value}
                      onChange={(v) =>
                        handleChange("total_contract_value", v)
                      }
                    />
                    <Editable
                      label={t("titleDeedNo")}
                      value={data?.title_deed_no}
                      onChange={(v) => handleChange("title_deed_no", v)}
                    />
                  </>
                )}

                {/* مستأجر */}
                {activeTab === "tenant" && (
                  <PartySection
                    title={t("tenants")}
                    arr="tenants"
                    data={data}
                    handleArrayChange={handleArrayChange}
                  />
                )}

                {/* مؤجر */}
                {activeTab === "lessor" && (
                  <PartySection
                    title={t("lessors")}
                    arr="lessors"
                    data={data}
                    handleArrayChange={handleArrayChange}
                  />
                )}

                {/* وسيط */}
                {activeTab === "brokerage" && (
                  <>
                    <Editable
                      label={t("brokerageName")}
                      value={data?.brokerage_entity?.name}
                      onChange={(v) =>
                        handleNestedChange("brokerage_entity", "name", v)
                      }
                    />
                    <Editable
                      label={t("brokerageCR")}
                      value={data?.brokerage_entity?.cr_no}
                      onChange={(v) =>
                        handleNestedChange("brokerage_entity", "cr_no", v)
                      }
                    />
                    <Editable
                      label={t("brokeragePhone")}
                      value={data?.brokerage_entity?.phone}
                      onChange={(v) =>
                        handleNestedChange("brokerage_entity", "phone", v)
                      }
                    />
                    <Editable
                      label={t("brokerageAddress")}
                      value={data?.brokerage_entity?.address}
                      onChange={(v) =>
                        handleNestedChange("brokerage_entity", "address", v)
                      }
                    />
                  </>
                )}

                {/* عقار */}
                {activeTab === "property" && (
                  <>
                    <Editable
                      label={t("propertyType")}
                      value={data?.property?.property_type}
                      onChange={(v) =>
                        handleNestedChange("property", "property_type", v)
                      }
                    />
                    <Editable
                      label={t("propertyUsage")}
                      value={data?.property?.property_usage}
                      onChange={(v) =>
                        handleNestedChange("property", "property_usage", v)
                      }
                    />
                    <Editable
                      type="number"
                      label={t("numUnits")}
                      value={data?.property?.num_units}
                      onChange={(v) =>
                        handleNestedChange("property", "num_units", v)
                      }
                    />
                    <Editable
                      label={t("nationalAddress")}
                      value={data?.property?.national_address}
                      onChange={(v) =>
                        handleNestedChange(
                          "property",
                          "national_address",
                          v
                        )
                      }
                    />

                    {/* city dropdown */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("city")}
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                        value={data?.property?.city || ""}
                        onChange={(e) =>
                          handleNestedChange("property", "city", e.target.value)
                        }
                      >
                        <option value="">{t("selectCity") || "اختر المدينة"}</option>
                        {SAUDI_CITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* وحدات */}
                {activeTab === "units" && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{t("units")}</h3>
                      <button
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            units: [
                              ...(p?.units || []),
                              {
                                unit_no: "",
                                unit_type: "",
                                unit_area: "",
                                electric_meter_no: "",
                                water_meter_no: "",
                              },
                            ],
                          }))
                        }
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <PlusCircle size={16} /> {t("addUnit")}
                      </button>
                    </div>

                    {data?.units?.map((u, i) => (
                      <div
                        key={i}
                        className="border p-3 rounded-lg bg-gray-50 mb-3 space-y-2"
                      >
                        <Editable
                          label={t("unitNo")}
                          value={u.unit_no}
                          onChange={(v) =>
                            handleArrayChange("units", i, "unit_no", v)
                          }
                        />
                        <Editable
                          label={t("unitType")}
                          value={u.unit_type}
                          onChange={(v) =>
                            handleArrayChange("units", i, "unit_type", v)
                          }
                        />
                        <Editable
                          type="number"
                          label={t("unitArea")}
                          value={u.unit_area}
                          onChange={(v) =>
                            handleArrayChange("units", i, "unit_area", v)
                          }
                        />
                        <Editable
                          label={t("electricMeter")}
                          value={u.electric_meter_no}
                          onChange={(v) =>
                            handleArrayChange(
                              "units",
                              i,
                              "electric_meter_no",
                              v
                            )
                          }
                        />
                        <Editable
                          label={t("waterMeter")}
                          value={u.water_meter_no}
                          onChange={(v) =>
                            handleArrayChange("units", i, "water_meter_no", v)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* دفعات */}
                {activeTab === "payments" && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{t("payments")}</h3>
                      <button
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            payments: [
                              ...(p?.payments || []),
                              { due_date: "", amount: "" },
                            ],
                          }))
                        }
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <PlusCircle size={16} /> {t("addPayment")}
                      </button>
                    </div>

                    {data?.payments?.map((p, i) => (
                      <div
                        key={i}
                        className="border p-3 rounded-lg bg-gray-50 mb-3 space-y-2"
                      >
                        <Editable
                          type="date"
                          label={t("dueDate")}
                          value={p.due_date}
                          onChange={(v) =>
                            handleArrayChange("payments", i, "due_date", v)
                          }
                        />
                        <Editable
                          type="number"
                          label={t("amount")}
                          value={p.amount}
                          onChange={(v) =>
                            handleArrayChange("payments", i, "amount", v)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* مراجعة */}
                {activeTab === "review" && (
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-bold text-gray-700">
                      {t("reviewBeforeSave")}
                    </h3>
                    <p className="text-gray-500">{t("reviewNote")}</p>
                  </div>
                )}
              </div>

              {/* زر الحفظ */}
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowConfirmDialog(true)} 
                  disabled={saving}
                  className={`flex items-center gap-2 px-8 py-2 mx-auto rounded text-white ${
                    saving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {saving ? t("saving") : t("saveContract")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🧩 نافذة تأكيد الأسماء */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800">
              تأكيد أسماء المؤجرين والمستأجرين
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-1">
              تأكد أن الأسماء أدناه مكتوبة بشكل صحيح قبل حفظ العقد.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 border rounded-lg p-3 bg-gray-50 mt-3">
            <div>
              <h3 className="font-semibold text-blue-700 mb-2">المؤجرون</h3>
              <ul className="space-y-1">
                {(data?.lessors || []).length > 0 ? (
                  data.lessors.map((l, i) => (
                    <li key={i} className="text-gray-800">
                      • {l.name || "—"}
                    </li>
                  ))
                ) : (
                  <p className="text-gray-400">لا يوجد مؤجرون</p>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-green-700 mb-2">المستأجرون</h3>
              <ul className="space-y-1">
                {(data?.tenants || []).length > 0 ? (
                  data.tenants.map((t, i) => (
                    <li key={i} className="text-gray-800">
                      • {t.name || "—"}
                    </li>
                  ))
                ) : (
                  <p className="text-gray-400">لا يوجد مستأجرون</p>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter className="mt-5 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              ❌ إلغاء
            </Button>

            <Button
              disabled={confirming}
              onClick={async () => {
                setConfirming(true);
                await handleSave(); // ⚙️ نفّذ الحفظ بعد التأكيد
                setConfirming(false);
                setShowConfirmDialog(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {confirming ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                "✅ تأكيد الأسماء وحفظ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
