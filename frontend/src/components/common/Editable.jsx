import React from "react";

export default function Editable({ label, value, onChange, type = "text" }) {
  return (
    <div className="mb-3">
      <label className="block text-gray-600 text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200 focus:outline-none"
      />
    </div>
  );
}
