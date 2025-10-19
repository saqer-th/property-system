import React, { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";

export default function AddExpenseDrawer({ open, setOpen, refresh }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expense_type: "",
    on_whom: "",
    amount: "",
    notes: "",
    date: "",
    property_id: "",
    contract_id: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSave() {
    if (!form.expense_type || !form.amount) {
      toast.error("يجب إدخال نوع المصروف والمبلغ");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok || !json.success) throw new Error(json.message || "حدث خطأ أثناء الحفظ");

      toast.success("✅ تم إضافة المصروف بنجاح");
      setOpen(false);
      refresh?.();
      setForm({
        expense_type: "",
        on_whom: "",
        amount: "",
        notes: "",
        date: "",
        property_id: "",
        contract_id: "",
      });
    } catch (err) {
      console.error("❌ Error saving expense:", err);
      toast.error(err.message || "فشل في حفظ المصروف");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-w-lg mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold text-emerald-700">
            ➕ إضافة مصروف جديد
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-4 space-y-4">
          {/* 🏷️ نوع المصروف */}
          <div>
            <Label>نوع المصروف</Label>
            <Input
              name="expense_type"
              placeholder="مثل: صيانة، كهرباء، ماء"
              value={form.expense_type}
              onChange={handleChange}
            />
          </div>

          {/* 👥 على من */}
          <div>
            <Label>على من (المستأجر / المالك)</Label>
            <Input
              name="on_whom"
              placeholder="مثل: المستأجر / المالك"
              value={form.on_whom}
              onChange={handleChange}
            />
          </div>

          {/* 💰 المبلغ */}
          <div>
            <Label>المبلغ (ريال)</Label>
            <Input
              type="number"
              name="amount"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
            />
          </div>

          {/* 📅 التاريخ */}
          <div>
            <Label>تاريخ الصرف</Label>
            <Input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
            />
          </div>

          {/* 🏢 العقار (اختياري) */}
          <div>
            <Label>رقم العقار (اختياري)</Label>
            <Input
              name="property_id"
              placeholder="أدخل رقم العقار إن وجد"
              value={form.property_id}
              onChange={handleChange}
            />
          </div>

          {/* 📑 العقد (اختياري) */}
          <div>
            <Label>رقم العقد (اختياري)</Label>
            <Input
              name="contract_id"
              placeholder="أدخل رقم العقد إن وجد"
              value={form.contract_id}
              onChange={handleChange}
            />
          </div>

          {/* 📝 ملاحظات */}
          <div>
            <Label>ملاحظات</Label>
            <Input
              name="notes"
              placeholder="أدخل أي ملاحظات إضافية"
              value={form.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        <DrawerFooter className="flex justify-between items-center px-4 pb-4">
          <DrawerClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DrawerClose>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
