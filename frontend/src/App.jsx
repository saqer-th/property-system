import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import "@/i18n";
import "@/index.css";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";

// Auth
import Login from "@/pages/Auth/Login";
import Unauthorized from "@/pages/Auth/Unauthorized";
import RegisterOffice from "@/pages/Auth/RegisterOffice";

// Dashboard
import Dashboard from "@/pages/Dashboard";

// Properties
import PropertiesList from "@/pages/Properties/PropertiesList";
import PropertyDetails from "@/pages/Properties/PropertyDetails";

// Units
import UnitDetails from "@/pages/Units/UnitDetails";

// Contracts
import ContractsList from "@/pages/Contracts/ContractsList";
import AddContract from "@/pages/Contracts/AddContract";
import ContractDetails from "@/pages/Contracts/ContractDetails";

// Finance
import PaymentsList from "@/pages/Payments/PaymentsList";
import ExpensesList from "@/pages/Expenses/ExpensesList";
import ReceiptsList from "@/pages/Receipts/ReceiptsList";
import MaintenanceList from "@/pages/Maintenance/MaintenanceList";

// Office / Reminders
import RemindersLog from "@/pages/offices/RemindersLog";
import RemindersSettings from "@/pages/offices/RemindersSettings";
import TemplatesPreview from "@/pages/offices/TemplatesPreview";

// Office management
import OfficeDetails from "@/pages/offices/OfficeDetails";
import EmployeesList from "@/pages/offices/Employees/EmployeesList";

// Settings
import Settings from "@/pages/Settings/Settings";

// Admin
import AdminDashboard from "@/pages/admin/AdminDashboard";

// =============================
//  📊 NEW REPORTS PAGES
// =============================

// Reports home
import ReportsHome from "@/pages/Reports/ReportsHome";

// Property Reports
import PropertySummaryReport from "@/pages/Reports/Property/PropertySummary";
import PropertyUnitsReport from "@/pages/Reports/Property/PropertyUnits";
import PropertyContractsReport from "@/pages/Reports/Property/PropertyContracts";

// Unit Reports
import UnitSummaryReport from "@/pages/Reports/Unit/UnitSummary";
import UnitContractsReport from "@/pages/Reports/Unit/UnitContracts";

// Contract Reports
import ContractSummaryReport from "@/pages/Reports/Contract/ContractSummary";
import ContractPaymentsReport from "@/pages/Reports/Contract/ContractPayments";
import ContractExpensesReport from "@/pages/Reports/Contract/ContractExpenses";

// Financial Reports
import FinancialPaymentsReport from "@/pages/Reports/Financial/Payments";
import FinancialExpensesReport from "@/pages/Reports/Financial/Expenses";
import FinancialReceiptsReport from "@/pages/Reports/Financial/Receipts";

// Occupancy
import OccupancyReport from "@/pages/Reports/Occupancy/OccupancyReport";

// Profit
import ProfitReport from "@/pages/Reports/Profit/ProfitReport";

// Portfolio
import PortfolioSummaryReport from "@/pages/Reports/Portfolio/PortfolioReport";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/register-office" element={<RegisterOffice />} />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute page="dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute page="settings">
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Offices */}
          <Route
            path="/offices/:id"
            element={
              <ProtectedRoute page="offices">
                <OfficeDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/offices/:id/employees"
            element={
              <ProtectedRoute page="offices">
                <EmployeesList />
              </ProtectedRoute>
            }
          />

          {/* Reminders */}
          <Route
            path="/office/reminders/log"
            element={
              <ProtectedRoute page="reminders">
                <RemindersLog />
              </ProtectedRoute>
            }
          />

          <Route
            path="/office/reminders/settings"
            element={
              <ProtectedRoute page="reminders">
                <RemindersSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/office/reminders/templates"
            element={
              <ProtectedRoute page="reminders">
                <TemplatesPreview />
              </ProtectedRoute>
            }
          />

          {/* Properties */}
          <Route
            path="/properties"
            element={
              <ProtectedRoute page="properties">
                <PropertiesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <ProtectedRoute page="properties">
                <PropertyDetails />
              </ProtectedRoute>
            }
          />

          {/* Units */}
          <Route
            path="/units/:id"
            element={
              <ProtectedRoute page="units">
                <UnitDetails />
              </ProtectedRoute>
            }
          />

          {/* Contracts */}
          <Route
            path="/contracts"
            element={
              <ProtectedRoute page="contracts">
                <ContractsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contracts/add"
            element={
              <ProtectedRoute page="contracts" permission="can_edit">
                <AddContract />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contracts/:id"
            element={
              <ProtectedRoute page="contracts">
                <ContractDetails />
              </ProtectedRoute>
            }
          />

          {/* Payments */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute page="payments">
                <PaymentsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/receipts"
            element={
              <ProtectedRoute page="receipts">
                <ReceiptsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedRoute page="expenses">
                <ExpensesList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/maintenance"
            element={
              <ProtectedRoute page="maintenance">
                <MaintenanceList />
              </ProtectedRoute>
            }
          />

          {/* =============================
              📊 NEW REPORT ROUTES
          ============================= */}

          {/* REPORT HOME */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute page="reports_office">
                <ReportsHome />
              </ProtectedRoute>
            }
          />

          {/* Property Reports */}
          <Route path="/reports/property" element={<ProtectedRoute page="reports_office"><PropertySummaryReport /></ProtectedRoute>} />
          <Route path="/reports/property-units" element={<ProtectedRoute page="reports_office"><PropertyUnitsReport /></ProtectedRoute>} />
          <Route path="/reports/property-contracts" element={<ProtectedRoute page="reports_office"><PropertyContractsReport /></ProtectedRoute>} />

          {/* Unit Reports */}
          <Route path="/reports/unit" element={<ProtectedRoute page="reports_office"><UnitSummaryReport /></ProtectedRoute>} />
          <Route path="/reports/unit-contracts" element={<ProtectedRoute page="reports_office"><UnitContractsReport /></ProtectedRoute>} />

          {/* Contract Reports */}
          <Route path="/reports/contract" element={<ProtectedRoute page="reports_office"><ContractSummaryReport /></ProtectedRoute>} />
          <Route path="/reports/contract-payments" element={<ProtectedRoute page="reports_office"><ContractPaymentsReport /></ProtectedRoute>} />
          <Route path="/reports/contract-expenses" element={<ProtectedRoute page="reports_office"><ContractExpensesReport /></ProtectedRoute>} />

          {/* Financial Reports */}
          <Route path="/reports/payments" element={<ProtectedRoute page="reports_office"><FinancialPaymentsReport /></ProtectedRoute>} />
          <Route path="/reports/expenses" element={<ProtectedRoute page="reports_office"><FinancialExpensesReport /></ProtectedRoute>} />
          <Route path="/reports/receipts" element={<ProtectedRoute page="reports_office"><FinancialReceiptsReport /></ProtectedRoute>} />

          {/* Occupancy */}
          <Route path="/reports/occupancy/summary" element={<ProtectedRoute page="reports_office"><OccupancyReport /></ProtectedRoute>} />

          {/* Profit */}
          <Route path="/reports/profit" element={<ProtectedRoute page="reports_office"><ProfitReport /></ProtectedRoute>} />

          {/* Portfolio */}
          <Route path="/reports/portfolio" element={<ProtectedRoute page="reports_office"><PortfolioSummaryReport /></ProtectedRoute>} />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute page="AdminPanel">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="flex h-screen items-center justify-center text-gray-500 text-lg">
                404 | الصفحة غير موجودة
              </div>
            }
          />
        </Routes>

        <Toaster position="top-right" reverseOrder={false} />
      </BrowserRouter>
    </AuthProvider>
  );
}
