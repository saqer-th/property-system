import React from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Building,
  Home,
  FileSpreadsheet,
  BarChart2,
  ClipboardList,
  Wrench,
  PieChart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ReportsHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const reportCategories = [
    /* ----------------------------------------------
       🟩 Property Reports
    ---------------------------------------------- */
    {
      title: t("propertyReports") || "Property Reports",
      icon: <Home size={28} className="text-emerald-600" />,
      items: [
        {
          label: t("propertySummary"),
          desc: t("report_property_summary_desc"),
          type: "property",
          soon: false,
        },
        {
          label: t("unitsByProperty"),
          desc: t("report_units_by_property_desc"),
          type: "property-units",
          soon: false,
        },
        {
          label: t("contractsByProperty"),
          desc: t("report_contracts_by_property_desc"),
          type: "property-contracts",
          soon: false,
        },
      ],
      color: "from-emerald-50 to-white",
    },

    /* ----------------------------------------------
       🟦 Unit Reports
    ---------------------------------------------- */
    {
      title: t("unitReports") || "Unit Reports",
      icon: <Building size={28} className="text-blue-600" />,
      items: [
        {
          label: t("unitSummary"),
          desc: t("report_unit_summary_desc"),
          type: "unit",
          soon: false,
        },
        {
          label: t("unitContracts"),
          desc: t("report_unit_contracts_desc"),
          type: "unit-contracts",
          soon: false,
        },
      ],
      color: "from-blue-50 to-white",
    },

    /* ----------------------------------------------
       🟪 Contract Reports
    ---------------------------------------------- */
    {
      title: t("contractReports") || "Contract Reports",
      icon: <FileText size={28} className="text-purple-600" />,
      items: [
        {
          label: t("contractSummary"),
          desc: t("report_contract_summary_desc"),
          type: "contract",
          soon: false,
        },
        {
          label: t("paymentsReport"),
          desc: t("report_contract_payments_desc"),
          type: "contract-payments",
          soon: false,
        },
        {
          label: t("expensesReport"),
          desc: t("report_contract_expenses_desc"),
          type: "contract-expenses",
          soon: false,
        },
      ],
      color: "from-purple-50 to-white",
    },

    /* ----------------------------------------------
       🟧 Financial Reports
    ---------------------------------------------- */
    {
      title: t("financialReports") || "Financial Reports",
      icon: <FileSpreadsheet size={28} className="text-orange-600" />,
      items: [
        {
          label: t("officePayments"),
          desc: t("report_office_payments_desc"),
          type: "payments",
          soon: false,
        },
        {
          label: t("officeExpenses"),
          desc: t("report_office_expenses_desc"),
          type: "expenses",
          soon: false,
        },
        {
          label: t("officeReceipts"),
          desc: t("report_office_receipts_desc"),
          type: "receipts",
          soon: false,
        },
      ],
      color: "from-orange-50 to-white",
    },

    /* ----------------------------------------------
       🛠 Maintenance Reports (SOON)
    ---------------------------------------------- */
    {
      title: t("maintenanceReports") || "Maintenance",
      icon: <Wrench size={28} className="text-teal-600" />,
      items: [
        {
          label: t("maintenanceActivities"),
          desc: t("report_maintenance_desc"),
          type: "maintenance",
          soon: true, // SOON
        },
      ],
      color: "from-teal-50 to-white",
    },

    /* ----------------------------------------------
       🟥 Occupancy Reports
    ---------------------------------------------- */
    {
      title: t("occupancyReports") || "Occupancy Reports",
      icon: <PieChart size={28} className="text-rose-600" />,
      items: [
        {
          label: t("occupancySummary"),
          desc: t("report_occupancy_desc"),
          type: "occupancy/summary",
          soon: false,
        },
      ],
      color: "from-rose-50 to-white",
    },

    /* ----------------------------------------------
       🟫 Profit Reports
    ---------------------------------------------- */
    {
      title: t("profitReports") || "Profit Reports",
      icon: <BarChart2 size={28} className="text-amber-700" />,
      items: [
        {
          label: t("profitSummary"),
          desc: t("report_profit_desc"),
          type: "profit",
          soon: false,
        },
      ],
      color: "from-amber-50 to-white",
    },

    /* ----------------------------------------------
       🟩 Portfolio Summary
    ---------------------------------------------- */
    {
      title: t("portfolioReports") || "Portfolio Summary",
      icon: <BarChart2 size={28} className="text-emerald-700" />,
      items: [
        {
          label: t("portfolioSummary"),
          desc: t("report_portfolio_summary_desc"),
          type: "portfolio",
          soon: false,
        },
      ],
      color: "from-emerald-50 to-white",
    },

    /* ----------------------------------------------
       ⚙️ System Reports (SOON)
    ---------------------------------------------- */
    {
      title: t("systemReports") || "System Reports",
      icon: <ClipboardList size={28} className="text-gray-700" />,
      items: [
        {
          label: t("auditLog"),
          desc: t("report_audit_log_desc"),
          type: "audit",
          soon: true, // SOON
        },
      ],
      color: "from-gray-100 to-white",
    },
  ];

  return (
    <DashboardLayout>
      <div
        dir={dir}
        className="p-6 space-y-8
          bg-gradient-to-br from-emerald-50/30 via-white to-emerald-50/20
          rounded-xl backdrop-blur-sm shadow-inner"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-emerald-700 drop-shadow-sm">
            {t("reportsCenter") || "Reports Center"}
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            {t("reportsDescription") ||
              "Generate high-quality PDF reports for all property operations in your office."}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {reportCategories.map((cat, index) => (
            <Card
              key={index}
              className={`p-5 rounded-2xl shadow-md transition-all duration-300
                bg-gradient-to-br ${cat.color} border border-gray-200/50
                hover:shadow-lg hover:-translate-y-1 hover:bg-white/80 backdrop-blur-xl`}
            >
              <div className="flex items-center gap-3 mb-4">
                {cat.icon}
                <h2 className="text-xl font-semibold text-gray-700">
                  {cat.title}
                </h2>
              </div>

              <div className="space-y-3">

                {cat.items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/60 border px-4 py-3 rounded-xl 
                      hover:bg-white transition shadow-sm space-y-1"
                  >
                    <div className="flex justify-between items-center">

                      <span className="font-medium text-gray-700">
                        {item.label}
                      </span>

                      {/* Soon or Open button */}
                      {item.soon ? (
                        <Button
                          size="sm"
                          disabled
                          className="bg-gray-300 text-gray-600 cursor-not-allowed"
                        >
                          {t("soon") || "Soon"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => navigate(`/reports/${item.type}`)}
                        >
                          {t("open") || "Open"}
                        </Button>
                      )}

                    </div>

                    <div className="text-gray-500 text-xs">{item.desc}</div>
                  </div>
                ))}

              </div>
            </Card>
          ))}

        </div>

      </div>
    </DashboardLayout>
  );
}
