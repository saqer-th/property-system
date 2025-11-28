import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  PlusCircle,
  RefreshCcw,
  ShieldAlert,
  Loader2,
  Filter,
  Download,
  Building2,
  Home,
  FileText,
  Wallet,
  Briefcase,
  User,
  FileQuestion,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AddExpenseDrawer from "@/components/expenses/AddExpenseDrawer";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

// =========================
// 🎨 Sub-Components
// =========================

function StatCard({ title, value, icon, colorClass, bgClass }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
      </div>
    </div>
  );
}

function LinkBadge({ e, t }) {
  if (e.contract_no) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal flex gap-1.5 items-center w-fit px-2 py-1">
        <FileText size={12} /> {t("contract")} #{e.contract_no}
      </Badge>
    );
  }
  if (e.unit_no) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal flex gap-1.5 items-center w-fit px-2 py-1">
        <Home size={12} /> {t("unit")} {e.unit_no}
      </Badge>
    );
  }
  if (e.property_name) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-normal flex gap-1.5 items-center w-fit px-2 py-1">
        <Building2 size={12} /> {e.property_name}
      </Badge>
    );
  }
  return <span className="text-gray-400 text-xs">{t("general")}</span>;
}

function OnWhomBadge({ whom, t }) {
  const styles = {
    "مالك": "bg-blue-100 text-blue-700 border-blue-200",
    "owner": "bg-blue-100 text-blue-700 border-blue-200",
    "مستأجر": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "tenant": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "مكتب": "bg-purple-100 text-purple-700 border-purple-200",
    "office": "bg-purple-100 text-purple-700 border-purple-200",
  };
  
  // Default style
  const style = styles[whom?.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${style}`}>
      {whom || t("unknown")}
    </span>
  );
}

// =========================
// Main Component
// =========================

export default function ExpensesList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [expenses, setExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, owner, tenant, office
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage] = useState(20); // 🆕 Set to 20 rows per page

  const activeRole = user?.activeRole;
  const canAdd = ["admin", "office_admin", "office", "self_office_admin"].includes(activeRole);

  // 1. Fetch Data
  async function fetchExpenses() {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/expenses/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      if (res.status === 401) throw new Error(t("noPermission"));
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const data = json.data || [];
      setExpenses(data);
      setFiltered(data);
    } catch (err) {
      setError(err.message);
      toast.error(t("failedToLoadExpenses"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
  }, []);

  // 2. Filter Logic
  useEffect(() => {
    let results = [...expenses];
    const q = searchTerm.toLowerCase();

    // Search
    if (searchTerm) {
      results = results.filter((e) =>
        [e.property_name, e.expense_type, e.on_whom, e.description, e.notes]
          .filter(Boolean)
          .some((x) => x.toLowerCase().includes(q))
      );
    }

    // Tab Filter (Payer)
    if (activeTab === "owner") {
      results = results.filter(e => e.on_whom === "مالك" || e.on_whom === "owner");
    } else if (activeTab === "tenant") {
      results = results.filter(e => e.on_whom === "مستأجر" || e.on_whom === "tenant");
    } else if (activeTab === "office") {
      results = results.filter(e => e.on_whom === "مكتب" || e.on_whom === "office");
    }

    // Type Filter
    if (typeFilter) {
      results = results.filter((e) => e.expense_type?.toLowerCase() === typeFilter.toLowerCase());
    }

    // Date Filter
    if (dateFrom) results = results.filter((e) => new Date(e.date) >= new Date(dateFrom));
    if (dateTo) results = results.filter((e) => new Date(e.date) <= new Date(dateTo));

    setFiltered(results);
    setPage(1); // 🆕 Reset to first page on filter change
  }, [searchTerm, activeTab, typeFilter, dateFrom, dateTo, expenses]);

  // 3. Stats
  const stats = useMemo(() => {
    const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const onOwner = filtered
      .filter((e) => e.on_whom === "مالك" || e.on_whom === "owner")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const onTenant = filtered
      .filter((e) => e.on_whom === "مستأجر" || e.on_whom === "tenant")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const onOffice = filtered
      .filter((e) => e.on_whom === "مكتب" || e.on_whom === "office")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { total, onOwner, onTenant, onOffice };
  }, [filtered]);

  // 4. Chart Data
  const chartData = useMemo(() => {
    const grouped = {};
    filtered.forEach((e) => {
      const key = e.expense_type || t("unknown");
      grouped[key] = (grouped[key] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value) // Sort descending
      .slice(0, 6); // Top 6 categories
  }, [filtered]);

  // 🆕 Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginatedExpenses = filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  const formatAmount = (num) => new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", minimumFractionDigits: 2 }).format(num || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(isRtl ? "en-CA" : "en-GB") : "—";

  if (loading) return (
    <DashboardLayout>
       <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 gap-2">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p>{t("loadingData")}</p>
       </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50" dir={isRtl ? "rtl" : "ltr"}>
        <Toaster position="top-center" />

        {/* 🔝 Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
               {t("menu_expenses")}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">{t("expensesDesc") || "تتبع وتصنيف جميع المصروفات المتعلقة بالعقارات."}</p>
          </div>
          <div className="flex gap-2">

             {canAdd && (
                <Button onClick={() => setDrawerOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                   <PlusCircle size={16} className={`${isRtl ? "ml-2" : "mr-2"}`} /> {t("addExpense")}
                </Button>
             )}
          </div>
        </div>

        {/* 📊 Stats HUD */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard title={t("totalExpenses")} value={formatAmount(stats.total)} icon={<Wallet />} colorClass="text-red-600" bgClass="bg-red-50" />
           <StatCard title={t("onOwner")} value={formatAmount(stats.onOwner)} icon={<User />} colorClass="text-blue-600" bgClass="bg-blue-50" />
           <StatCard title={t("onTenant")} value={formatAmount(stats.onTenant)} icon={<User />} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
           <StatCard title={t("onOffice")} value={formatAmount(stats.onOffice)} icon={<Briefcase />} colorClass="text-purple-600" bgClass="bg-purple-50" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
           {/* 📋 Main List */}
           <Card className="lg:col-span-2 border border-gray-200 shadow-sm bg-white overflow-hidden rounded-xl">
              <CardHeader className="p-4 border-b border-gray-100">
                 <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-lg w-fit overflow-x-auto">
                       {[
                          {id: "all", label: t("all")},
                          {id: "owner", label: t("owner")},
                          {id: "tenant", label: t("tenant")},
                          {id: "office", label: t("office")},
                       ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                               activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            }`}
                          >
                             {tab.label}
                          </button>
                       ))}
                    </div>

                    {/* Search */}
                    <div className="flex gap-2 flex-1 justify-end">
                       <div className="relative w-full max-w-xs">
                          <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 ${isRtl ? "right-3" : "left-3"}`} />
                          <input 
                             type="text"
                             placeholder={t("searchExpenses")}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className={`pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full ${isRtl ? "pr-9 pl-4" : ""}`}
                          />
                       </div>
                       <Button variant={isFilterOpen ? "secondary" : "outline"} size="icon" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                          <Filter size={16} className={isFilterOpen ? "text-emerald-600" : "text-gray-500"} />
                       </Button>
                       {(searchTerm || typeFilter || dateFrom) && (
                          <Button variant="ghost" size="icon" onClick={() => {setSearchTerm(""); setTypeFilter(""); setDateFrom(""); setDateTo(""); setActiveTab("all");}} className="text-red-500">
                             <RefreshCcw size={16} />
                          </Button>
                       )}
                    </div>
                 </div>

                 {/* Advanced Filters */}
                 {isFilterOpen && (
                    <div className="mt-4 pt-4 border-t border-dashed grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                       <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{t("expenseType")}</label>
                          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-gray-50">
                             <option value="">{t("allTypes")}</option>
                             {[...new Set(expenses.map((e) => e.expense_type).filter(Boolean))].map((type, i) => (
                                <option key={i} value={type}>{type}</option>
                             ))}
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{t("dateFrom")}</label>
                          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-gray-50" />
                       </div>
                       <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{t("dateTo")}</label>
                          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-gray-50" />
                       </div>
                    </div>
                 )}
              </CardHeader>

              <CardContent className="p-0">
                 {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                       <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                          <FileQuestion className="text-gray-300" size={32} />
                       </div>
                       <h3 className="text-gray-900 font-medium">{t("noExpensesFound")}</h3>
                       <p className="text-gray-500 text-sm mt-1">{t("tryAdjustingFilters")}</p>
                    </div>
                 ) : (
                    <>
                    <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 font-medium">
                             <tr>
                                <th className={`px-6 py-4 ${isRtl ? "text-right" : "text-left"}`}>{t("expenseType")}</th>
                                <th className="px-6 py-4 text-center">{t("amount")}</th>
                                <th className="px-6 py-4 text-center">{t("onWhom")}</th> 
                                <th className="px-6 py-4">{t("linkedTo")}</th>
                                <th className="px-6 py-4 w-64">{t("notes")}</th> 
                                <th className="px-6 py-4 text-center">{t("date")}</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {paginatedExpenses.map((e, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                   <td className={`px-6 py-4 ${isRtl ? "text-right" : "text-left"}`}>
                                      <span className="font-medium text-gray-900 block">{e.expense_type || "—"}</span>
                                   </td>
                                   <td className="px-6 py-4 text-center text-red-600 font-bold">
                                      {formatAmount(e.amount)}
                                   </td>
                                   <td className="px-6 py-4 text-center">
                                      <OnWhomBadge whom={e.on_whom} t={t} />
                                   </td>
                                   <td className="px-6 py-4">
                                      <LinkBadge e={e} t={t} />
                                   </td>
                                   <td className="px-6 py-4">
                                      <p className="text-xs text-gray-600 truncate max-w-[250px]" title={e.notes || e.description}>
                                         {e.notes || e.description || t("noNotes")}
                                      </p>
                                   </td>
                                   <td className="px-6 py-4 text-center text-gray-500 text-xs">
                                      {formatDate(e.date)}
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>

                    {/* 🆕 Pagination Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100 bg-gray-50/30">
                        <div className="text-xs text-gray-500">
                           {t("showing")} <span className="font-medium text-gray-900">{(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)}</span> {t("of")} <span className="font-medium text-gray-900">{filtered.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button
                              variant="outline" size="sm"
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="h-8 w-8 p-0"
                           >
                              {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                           </Button>
                           <div className="flex items-center gap-1">
                              {/* Show simpler pagination for mobile/limited space */}
                              <span className="text-xs font-medium text-gray-700 bg-white px-3 py-1.5 border rounded-md shadow-sm">
                                {page} / {totalPages}
                              </span>
                           </div>
                           <Button
                              variant="outline" size="sm"
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className="h-8 w-8 p-0"
                           >
                              {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                           </Button>
                        </div>
                    </div>
                    </>
                 )}
              </CardContent>
           </Card>

           {/* 📈 Chart Widget */}
           <Card className="border border-gray-200 shadow-sm bg-white rounded-xl h-fit">
              <CardHeader className="p-4 border-b border-gray-100">
                 <CardTitle className="text-base font-semibold">{t("expensesBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                 {chartData.length > 0 ? (
                    <div className="h-64 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                             >
                                {chartData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                             </Pie>
                             <Tooltip formatter={(value) => formatAmount(value)} />
                             <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                          </PieChart>
                       </ResponsiveContainer>
                    </div>
                 ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400 text-sm italic">
                       {t("noData")}
                    </div>
                 )}
              </CardContent>
           </Card>
        </div>

        {/* ➕ Add Expense Drawer */}
        {canAdd && (
          <AddExpenseDrawer
            open={drawerOpen}
            setOpen={setDrawerOpen}
            refresh={fetchExpenses}
          />
        )}
      </div>
    </DashboardLayout>
  );
}