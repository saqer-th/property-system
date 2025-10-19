import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 📊 لوحة التحكم
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
// يمكنك لاحقًا إضافة قائمة الوحدات
// import UnitsList from "@/pages/Units/UnitsList";

// 💰 المالية
import PaymentsList from "@/pages/Payments/PaymentsList";
import ExpensesList from "@/pages/Expenses/ExpensesList";
import ReceiptsList from "@/pages/Receipts/ReceiptsList";
import MaintenanceList from "@/pages/Maintenance/MaintenanceList";

// 🔐 الدخول
import Login from "@/pages/Auth/Login";

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

          {/* 📊 لوحة التحكم */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 🏢 الأملاك */}
          <Route
            path="/properties"
            element={
              <ProtectedRoute>
                <PropertiesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <ProtectedRoute>
                <PropertyDetails />
              </ProtectedRoute>
            }
          />

          {/* 🏘️ الوحدات */}
          {/* <Route
            path="/units"
            element={
              <ProtectedRoute>
                <UnitsList />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/units/:id"
            element={
              <ProtectedRoute>
                <UnitDetails />
              </ProtectedRoute>
            }
          />

          {/* 📑 العقود */}
          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <ContractsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/add"
            element={
              <ProtectedRoute>
                <AddContract />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:id"
            element={
              <ProtectedRoute>
                <ContractDetails />
              </ProtectedRoute>
            }
          />

          {/* 💰 المدفوعات */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentsList />
              </ProtectedRoute>
            }
          />

          {/* 🧾 السندات */}
          <Route
            path="/receipts"
            element={
              <ProtectedRoute>
                <ReceiptsList />
              </ProtectedRoute>
            }
          />

          {/* 💸 المصروفات */}
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpensesList />
              </ProtectedRoute>
            }
          />

          {/* 🧰 الصيانة */}
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <MaintenanceList />
              </ProtectedRoute>
            }
          />

          {/* 🏠 الصفحة الافتراضية */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 🚫 صفحة الخطأ */}
          <Route
            path="*"
            element={
              <div className="flex h-screen items-center justify-center text-gray-500 text-lg">
                404 | {`الصفحة غير موجودة`}
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
