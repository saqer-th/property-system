import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Save, 
  X, 
  Building2, 
  Ruler, 
  Zap, 
  Droplets, 
  FileText, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config";

export default function AddUnitDrawer({ open, setOpen, propertyId, editUnit, refresh }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // State
  const [form, setForm] = useState({
    unit_no: "",
    unit_type: "",
    unit_area: "",
    electric_meter_no: "",
    water_meter_no: "",
    status: "vacant",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // 📥 Populate form on open/edit
  useEffect(() => {
    if (open) {
      if (editUnit) {
        setForm({
          unit_no: editUnit.unit_no || "",
          unit_type: editUnit.unit_type || "",
          unit_area: editUnit.unit_area || "",
          electric_meter_no: editUnit.electric_meter_no || "",
          water_meter_no: editUnit.water_meter_no || "",
          status: editUnit.status || "vacant",
          notes: editUnit.notes || "",
        });
      } else {
        // Reset
        setForm({
          unit_no: "",
          unit_type: "",
          unit_area: "",
          electric_meter_no: "",
          water_meter_no: "",
          status: "vacant",
          notes: "",
        });
      }
    }
  }, [open, editUnit]);

  // ✍️ Handle Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (status) => {
    setForm((prev) => ({ ...prev, status }));
  };

  // 💾 Save / Update
  async function handleSave() {
    if (!form.unit_no || !form.unit_type) {
      return toast.error("يرجى تعبئة رقم الوحدة ونوعها");
    }

    setSaving(true);
    try {
      const method = editUnit ? "PUT" : "POST";
      const url = editUnit
        ? `${API_URL}/units/${editUnit.id}`
        : `${API_URL}/units`;

      const body = { ...form, property_id: propertyId };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "حدث خطأ أثناء حفظ الوحدة");
      }

      toast.success(editUnit ? "✅ تم تحديث الوحدة بنجاح" : "✅ تم إضافة الوحدة بنجاح");
      setOpen(false);
      if (refresh) refresh();
    } catch (err) {
      console.error("❌ Error saving unit:", err);
      toast.error(err.message || "فشل حفظ بيانات الوحدة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerContent className="h-full md:h-[95vh] max-w-lg ml-auto rounded-none md:rounded-l-xl border-l flex flex-col bg-white">
        
        {/* Header */}
        <DrawerHeader className="border-b px-6 py-4 flex justify-between items-center bg-gray-50/50">
          <div>
            <DrawerTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {editUnit ? "✏️ تعديل بيانات الوحدة" : "➕ إضافة وحدة جديدة"}
            </DrawerTitle>
            <DrawerDescription className="text-gray-500 mt-1">
              {editUnit ? "تحديث تفاصيل الوحدة الحالية" : "إدخال تفاصيل وحدة جديدة للعقار"}
            </DrawerDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full hover:bg-gray-200">
            <X size={20} className="text-gray-500" />
          </Button>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-4">البيانات الأساسية</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_no" className="flex items-center gap-2 text-gray-600">
                  <Building2 size={14} /> رقم الوحدة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit_no"
                  name="unit_no"
                  type="number" // ✅ تم التعديل ليقبل أرقام فقط
                  placeholder="مثال: 101"
                  value={form.unit_no}
                  onChange={handleChange}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_type" className="flex items-center gap-2 text-gray-600">
                  <Building2 size={14} /> نوع الوحدة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit_type"
                  name="unit_type"
                  placeholder="مثال: شقة، معرض"
                  value={form.unit_type}
                  onChange={handleChange}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_area" className="flex items-center gap-2 text-gray-600">
                <Ruler size={14} /> المساحة (م²)
              </Label>
              <Input
                id="unit_area"
                name="unit_area"
                type="number"
                placeholder="0"
                value={form.unit_area}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Meters Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-4">بيانات الخدمات</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="electric_meter_no" className="flex items-center gap-2 text-gray-600">
                  <Zap size={14} className="text-amber-500" /> عداد الكهرباء
                </Label>
                <Input
                  id="electric_meter_no"
                  name="electric_meter_no"
                  placeholder="رقم الحساب / العداد"
                  value={form.electric_meter_no}
                  onChange={handleChange}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="water_meter_no" className="flex items-center gap-2 text-gray-600">
                  <Droplets size={14} className="text-blue-500" /> عداد المياه
                </Label>
                <Input
                  id="water_meter_no"
                  name="water_meter_no"
                  placeholder="رقم الحساب / العداد"
                  value={form.water_meter_no}
                  onChange={handleChange}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="text-gray-600">حالة الوحدة</Label>
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => handleStatusChange("vacant")}
                className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all ${
                  form.status === "vacant" 
                    ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`p-2 rounded-full ${form.status === "vacant" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${form.status === "vacant" ? "text-emerald-700" : "text-gray-600"}`}>شاغرة</p>
                  <p className="text-xs text-gray-400">جاهزة للتأجير</p>
                </div>
              </div>

              <div 
                onClick={() => handleStatusChange("occupied")}
                className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all ${
                  form.status === "occupied" 
                    ? "bg-rose-50 border-rose-500 ring-1 ring-rose-500" 
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`p-2 rounded-full ${form.status === "occupied" ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-400"}`}>
                  <XCircle size={18} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${form.status === "occupied" ? "text-rose-700" : "text-gray-600"}`}>مؤجرة / مشغولة</p>
                  <p className="text-xs text-gray-400">غير متاحة حالياً</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2 text-gray-600">
              <FileText size={14} /> ملاحظات إضافية
            </Label>
            <Input
              id="notes"
              name="notes"
              placeholder="أي تفاصيل إضافية عن الوحدة..."
              value={form.notes}
              onChange={handleChange}
              className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

        </div>

        {/* Footer */}
        <DrawerFooter className="border-t p-6 bg-gray-50/50">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 h-11 text-base"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} /> جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="mr-2" size={18} /> حفظ البيانات
              </>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}