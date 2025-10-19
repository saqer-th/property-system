import React from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import Editable from "./Editable";

export default function PartySection({
  title,
  arr,
  data,
  handleArrayChange,
  deleteItem,
}) {
  const items = data?.[arr] || [];

  const addItem = () => {
    const newItem = { name: "", id: "", phone: "", email: "" };
    handleArrayChange(arr, items.length, null, newItem);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{title}</h3>
        <button
          onClick={addItem}
          className="flex items-center gap-1 text-blue-600 hover:underline"
        >
          <PlusCircle size={16} /> إضافة
        </button>
      </div>

      {items.map((person, i) => (
        <div
          key={i}
          className="border p-3 rounded-lg bg-gray-50 space-y-2 relative mb-3"
        >
          <button
            onClick={() => deleteItem && deleteItem(arr, i)}
            className="absolute top-2 left-2 text-red-600 hover:text-red-800"
          >
            <Trash2 size={16} />
          </button>

          <Editable
            label="الاسم"
            value={person.name}
            onChange={(v) => handleArrayChange(arr, i, "name", v)}
          />
          <Editable
            label="رقم الهوية"
            value={person.id}
            onChange={(v) => handleArrayChange(arr, i, "id", v)}
          />
          <Editable
            label="رقم الجوال"
            type="tel"
            value={person.phone}
            onChange={(v) => handleArrayChange(arr, i, "phone", v)}
          />
          <Editable
            label="البريد الإلكتروني"
            type="email"
            value={person.email}
            onChange={(v) => handleArrayChange(arr, i, "email", v)}
          />
        </div>
      ))}
    </div>
  );
}
