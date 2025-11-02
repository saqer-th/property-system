import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center px-4">
      <ShieldAlert className="text-amber-500 w-16 h-16 mb-4" />
      <h1 className="text-2xl font-bold mb-2 text-gray-700">
        🚫 لا تملك صلاحية الوصول
      </h1>
      <p className="text-gray-500 mb-6">
        هذه الصفحة مخصصة لمستخدمين ذوي صلاحيات محددة فقط.
      </p>
      <Button
        onClick={() => navigate("/dashboard")}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
      >
        العودة للوحة التحكم
      </Button>
    </div>
  );
}
