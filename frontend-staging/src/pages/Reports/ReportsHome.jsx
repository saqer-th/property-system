import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Building,
  Home,
  FileSpreadsheet,
  BarChart2,
  ClipboardList,
  Wrench,
  PieChart,
  Search,
  Clock,
  ArrowUpRight,
  Download,
  Star,
  LayoutGrid,
  List
} from "lucide-react";

// --- Components ---
const ReportCard = ({ item, onClick }) => (
  <div 
    onClick={!item.soon ? onClick : undefined}
    className={`
      group flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200
      ${!item.soon ? "hover:shadow-md hover:border-blue-200 cursor-pointer" : "opacity-60 cursor-not-allowed bg-gray-50"}
    `}
  >
    <div className={`p-3 rounded-lg shrink-0 transition-colors ${item.soon ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"}`}>
      {item.icon}
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900 truncate">{item.label}</h3>
        {item.soon && <Badge variant="secondary" className="text-[10px] px-1.5 h-5">Coming Soon</Badge>}
      </div>
      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.desc}</p>
    </div>

    {!item.soon && (
      <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
        <ArrowUpRight size={18} />
      </div>
    )}
  </div>
);

export default function ReportsHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Define Categories & Items
  const categories = [
    { id: "property", label: t("propertyReports") || "Property", icon: <Building size={18}/> },
    { id: "unit", label: t("unitReports") || "Units", icon: <Home size={18}/> },
    { id: "contract", label: t("contractReports") || "Contracts", icon: <FileText size={18}/> },
    { id: "financial", label: t("financialReports") || "Financial", icon: <FileSpreadsheet size={18}/> },
    { id: "maintenance", label: t("maintenanceReports") || "Maintenance", icon: <Wrench size={18}/> },
    { id: "analytics", label: t("analytics") || "Analytics", icon: <PieChart size={18}/> },
  ];

  const allReports = [
    // Property
    { id: "prop_1", cat: "property", label: t("propertySummary"), desc: t("Comprehensive overview of all properties"), type: "property", icon: <Building size={20}/> },
    { id: "prop_2", cat: "property", label: t("unitsByProperty"), desc: t("Breakdown of units per property"), type: "property-units", icon: <LayoutGrid size={20}/> },
    { id: "prop_3", cat: "property", label: t("contractsByProperty"), desc: t("Active contracts linked to properties"), type: "property-contracts", icon: <FileText size={20}/> },
    
    // Units
    { id: "unit_1", cat: "unit", label: t("unitSummary"), desc: t("Status summary of all units"), type: "unit", icon: <Home size={20}/> },
    { id: "unit_2", cat: "unit", label: t("unitContracts"), desc: t("History of contracts per unit"), type: "unit-contracts", icon: <ClipboardList size={20}/> },

    // Contracts
    { id: "cont_1", cat: "contract", label: t("contractSummary"), desc: t("Expiry and renewal status"), type: "contract", icon: <FileText size={20}/> },
    { id: "cont_2", cat: "contract", label: t("paymentsReport"), desc: t("Scheduled vs collected payments"), type: "contract-payments", icon: <FileSpreadsheet size={20}/> },
    { id: "cont_3", cat: "contract", label: t("expensesReport"), desc: t("Expenses linked to contracts"), type: "contract-expenses", icon: <BarChart2 size={20}/> },

    // Financial
    { id: "fin_1", cat: "financial", label: t("officePayments"), desc: t("All incoming payments log"), type: "payments", icon: <FileSpreadsheet size={20}/> },
    { id: "fin_2", cat: "financial", label: t("officeExpenses"), desc: t("Office-wide expense tracking"), type: "expenses", icon: <FileSpreadsheet size={20}/> },
    { id: "fin_3", cat: "financial", label: t("officeReceipts"), desc: t("Generated receipts log"), type: "receipts", icon: <ClipboardList size={20}/> },

    // Analytics
    { id: "occ_1", cat: "analytics", label: t("occupancySummary"), desc: t("Occupancy rates visualization"), type: "occupancy/summary", icon: <PieChart size={20}/> },
    { id: "prof_1", cat: "analytics", label: t("profitSummary"), desc: t("Profit/Loss analysis"), type: "profit", icon: <BarChart2 size={20}/> },
    { id: "port_1", cat: "analytics", label: t("portfolioSummary"), desc: t("High-level portfolio health"), type: "portfolio", icon: <BarChart2 size={20}/> },

    // Maintenance (Soon)
    { id: "maint_1", cat: "maintenance", label: t("maintenanceActivities"), desc: t("Maintenance requests log"), type: "maintenance", icon: <Wrench size={20}/>, soon: true },
    { id: "sys_1", cat: "analytics", label: t("auditLog"), desc: t("System activity logs"), type: "audit", icon: <ClipboardList size={20}/>, soon: true },
  ];

  // Filter Logic
  const filteredReports = useMemo(() => {
    return allReports.filter(item => {
      const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) || item.desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCategory === "all" || item.cat === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchTerm, activeCategory, allReports]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-blue-600" /> {t("reportsCenter")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{t("reportsDesc") || "Access and generate detailed reports for your properties."}</p>
          </div>
          <div className="w-full md:w-72 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <Input 
              placeholder={t("searchReports") || "Search reports..."} 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 🧭 Sidebar Filters (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-none shadow-sm bg-transparent lg:bg-white lg:border">
              <CardContent className="p-2 lg:p-4">
                <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar">
                  <Button 
                    variant={activeCategory === "all" ? "secondary" : "ghost"} 
                    className={`justify-start ${activeCategory === "all" ? "bg-blue-50 text-blue-700" : "text-gray-600"}`}
                    onClick={() => setActiveCategory("all")}
                  >
                    <LayoutGrid size={16} className="mr-2" /> {t("allReports") || "All Reports"}
                  </Button>
                  <div className="my-2 h-px bg-gray-100 hidden lg:block" />
                  {categories.map(cat => (
                    <Button 
                      key={cat.id}
                      variant={activeCategory === cat.id ? "secondary" : "ghost"} 
                      className={`justify-start ${activeCategory === cat.id ? "bg-blue-50 text-blue-700" : "text-gray-600"}`}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <span className="mr-2 text-gray-400">{cat.icon}</span> {cat.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* 📑 Main Grid (9 cols) */}
          <div className="lg:col-span-9">
            <div className="mb-4 flex items-center justify-between">
               <h2 className="font-bold text-lg text-gray-800">
                  {activeCategory === 'all' ? (t("allReports") || "All Reports") : categories.find(c => c.id === activeCategory)?.label}
                  <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600">{filteredReports.length}</Badge>
               </h2>
               {/* View Toggle (Optional) */}
               <div className="flex bg-gray-100 p-1 rounded-lg">
                  <div className="p-1.5 bg-white rounded shadow-sm"><LayoutGrid size={14}/></div>
                  <div className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"><List size={14}/></div>
               </div>
            </div>

            {filteredReports.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
                  {filteredReports.map((report) => (
                     <ReportCard 
                        key={report.id}
                        item={report}
                        onClick={() => navigate(`/reports/${report.type}`)}
                     />
                  ))}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50">
                  <Search size={48} className="mb-2 opacity-20"/>
                  <p>{t("noReportsMatch") || "No reports match your search"}</p>
                  <Button variant="link" onClick={() => {setSearchTerm(""); setActiveCategory("all");}}>
                     {t("clearFilters") || "Clear filters"}
                  </Button>
               </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}