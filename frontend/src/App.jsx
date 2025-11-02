import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 📊 لوحة التحكم العامة
import Dashboard from "@/pages/Dashboard";

// 📑 العقود
import ContractsList from "@/pages/Contracts/ContractsList";
import ContractDetails from "@/pages/Contracts/ContractDetails";
import AddContract from "@/pages/Contracts/AddContract";

// 🏢 الأملاك
import PropertiesList from "@/pages/Properties/PropertiesList";
import PropertyDetails from "@/pages/Properties/PropertyDetails";

// 🏘️ الوحدات
import UnitDetails from "@/pages/Units/UnitDetails";

// 💰 المالية
import PaymentsList from "@/pages/Payments/PaymentsList";
import ExpensesList from "@/pages/Expenses/ExpensesList";
import ReceiptsList from "@/pages/Receipts/ReceiptsList";
import MaintenanceList from "@/pages/Maintenance/MaintenanceList";

// 🔐 الدخول
import Login from "@/pages/Auth/Login";
import Unauthorized from "@/pages/Auth/Unauthorized";
import RegisterOffice from "@/pages/Auth/RegisterOffice";

// 🧱 لوحة الأدمن
import AdminDashboard from "@/pages/admin/AdminDashboard";

// 🏢 المكاتب
import OfficeDetails from "@/pages/offices/OfficeDetails";
import EmployeesList from "@/pages/offices/Employees/EmployeesList";

// 🔔 التذكيرات (Reminders)
import RemindersSettings from "@/pages/offices/RemindersSettings";
import RemindersLog from "@/pages/offices/RemindersLog";
import TemplatesPreview from "@/pages/offices/TemplatesPreview";

// 🧱 الحماية والسياق
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";

// 🌍 الترجمة والتنسيق
import "@/i18n";
import "@/index.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 🔐 صفحة الدخول */}
          <Route path="/login" element={<Login />} />

          {/* 🚫 صفحة عدم الصلاحية */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* 🏢 تسجيل مكتب جديد */}
          <Route path="/register-office" element={<RegisterOffice />} />

          {/* ================================
              🔒 صفحات محمية بالصلاحيات
              ================================ */}

          {/* 📊 لوحة التحكم */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute page="dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 🏢 تفاصيل المكتب */}
          <Route
            path="/offices/:id"
            element={
              <ProtectedRoute page="offices">
                <OfficeDetails />
              </ProtectedRoute>
            }
          />

          {/* 👥 موظفو المكتب */}
          <Route
            path="/offices/:id/employees"
            element={
              <ProtectedRoute page="offices">
                <EmployeesList />
              </ProtectedRoute>
            }
          />

          {/* 🏢 قائمة الأملاك */}
          <Route
            path="/properties"
            element={
              <ProtectedRoute page="properties">
                <PropertiesList />
              </ProtectedRoute>
            }
          />

          {/* 🏢 تفاصيل العقار */}
          <Route
            path="/properties/:id"
            element={
              <ProtectedRoute page="properties">
                <PropertyDetails />
              </ProtectedRoute>
            }
          />

          {/* 🏘️ تفاصيل الوحدة */}
          <Route
            path="/units/:id"
            element={
              <ProtectedRoute page="units">
                <UnitDetails />
              </ProtectedRoute>
            }
          />

          {/* 📑 العقود */}
          <Route
            path="/contracts"
            element={
              <ProtectedRoute page="contracts">
                <ContractsList />
              </ProtectedRoute>
            }
          />

          {/* ➕ إضافة عقد */}
          <Route
            path="/contracts/add"
            element={
              <ProtectedRoute page="contracts" permission="can_edit">
                <AddContract />
              </ProtectedRoute>
            }
          />

          {/* 📄 تفاصيل العقد */}
          <Route
            path="/contracts/:id"
            element={
              <ProtectedRoute page="contracts">
                <ContractDetails />
              </ProtectedRoute>
            }
          />

          {/* 💰 المدفوعات */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute page="payments">
                <PaymentsList />
              </ProtectedRoute>
            }
          />

          {/* 🧾 السندات */}
          <Route
            path="/receipts"
            element={
              <ProtectedRoute page="receipts">
                <ReceiptsList />
              </ProtectedRoute>
            }
          />

          {/* 💸 المصروفات */}
          <Route
            path="/expenses"
            element={
              <ProtectedRoute page="expenses">
                <ExpensesList />
              </ProtectedRoute>
            }
          />

          {/* 🧰 الصيانة */}
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute page="maintenance">
                <MaintenanceList />
              </ProtectedRoute>
            }
          />


          {/* 📜 سجل التذكيرات */}
          <Route
            path="/office/reminders/log"
            element={
              <ProtectedRoute page="reminders">
                <RemindersLog />
              </ProtectedRoute>
            }
          />



          {/* 🛡️ لوحة الأدمن */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute page="AdminPanel">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* 🏠 الصفحة الافتراضية */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ⚠️ صفحة الخطأ العامة */}
          <Route
            path="*"
            element={
              <div className="flex h-screen items-center justify-center text-gray-500 text-lg">
                404 | الصفحة غير موجودة
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
