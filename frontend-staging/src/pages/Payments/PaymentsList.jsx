import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  RefreshCcw,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  MoreVertical,
  Building2,
  User,
  CalendarDays,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

// =========================
// 🎨 UI Sub-Components
// =========================

function StatCard({ title, value, subtext, icon, colorClass, bgClass }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
      </div>
    </div>
  );
}

function PaymentProgressBar({ paid, total }) {
  const percentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  
  let barColor = "bg-blue-500";
  if (percentage === 100) barColor = "bg-emerald-500";
  else if (percentage === 0) barColor = "bg-gray-300";

  return (
    <div className="w-full min-w-[100px]">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-700">{percentage.toFixed(0)}%</span>
        <span className="text-gray-400">{paid} / {total}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function StatusBadge({ status, isOverdue, isUpcoming, t }) {
  if (status === "مدفوعة" || status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={12} /> {t("paid")}
      </span>
    );
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        <AlertTriangle size={12} /> {t("overdue")}
      </span>
    );
  }
  if (isUpcoming) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        <Clock size={12} /> {t("upcoming")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      <Wallet size={12} /> {t("unpaid")}
    </span>
  );
}

// =========================
// Main Component
// =========================

export default function PaymentsList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState("");
  
  // 🆕 NEW: Range filter for upcoming
  const [upcomingRange, setUpcomingRange] = useState("all"); // 'all', '30', '45', '60'

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage] = useState(20); // 🆕 Set to 20 rows per page

  const activeRole = user?.activeRole;

  // 1. Fetch Data
  async function fetchPayments() {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": activeRole,
        },
      });
      const json = await res.json();
      setPayments(json.data || []);
      setFiltered(json.data || []);
    } catch (err) {
      toast.error(t("failedToLoadPayments"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, [user]);

  // 2. 🔥 REFINED FILTER LOGIC
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let results = payments.filter((p) => {
      // 1. Search Logic
      const q = searchTerm.toLowerCase();
      const matchSearch = [p.contract_no, p.tenant_name, p.property_name, p.unit_no]
        .filter(Boolean)
        .some((x) => x.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Status/Date Logic
      const dueDate = p.due_date ? new Date(p.due_date) : null;
      if (dueDate) dueDate.setHours(0,0,0,0);
      
      const isPaid = p.status === "مدفوعة" || p.status === "paid";
      const isOverdue = !isPaid && dueDate && dueDate < today;
      // 🔥 Upcoming = Not Paid AND Date is Today OR Future
      const isUpcoming = !isPaid && dueDate && dueDate >= today;

      // 3. Tab Filtering
      if (activeTab === "paid" && !isPaid) return false;
      if (activeTab === "overdue" && !isOverdue) return false;
      
      // 4. Upcoming Range Logic
      if (activeTab === "upcoming") {
        if (!isUpcoming) return false; // Base check

        // Sub-filter check (30/45/60 days)
        if (upcomingRange !== "all" && dueDate) {
          const diffTime = Math.abs(dueDate - today);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (upcomingRange === "30" && diffDays > 30) return false;
          if (upcomingRange === "45" && diffDays > 45) return false;
          if (upcomingRange === "60" && diffDays > 60) return false;
        }
      }

      // 5. Advanced Filters
      if (propertyFilter && p.property_name !== propertyFilter) return false;

      return true;
    });

    setFiltered(results);
    setPage(1); // 🆕 Reset to page 1 on filter change
  }, [searchTerm, activeTab, upcomingRange, propertyFilter, payments]);

  // 3. Stats Calculation
  const stats = useMemo(() => {
    const totalAmount = filtered.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalCollected = filtered.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0);
    const totalPending = totalAmount - totalCollected;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const overdueCount = filtered.filter(p => {
       const d = new Date(p.due_date);
       d.setHours(0,0,0,0);
       return (p.status !== "مدفوعة" && p.status !== "paid") && d < today;
    }).length;

    return { totalAmount, totalCollected, totalPending, overdueCount };
  }, [filtered]);

  // 4. Pagination & Helpers
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginatedPayments = filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

  const formatCurrency = (val) => new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", minimumFractionDigits: 0 }).format(val || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(isRtl ? "en-CA" : "en-GB") : "—";
  const properties = [...new Set(payments.map(p => p.property_name).filter(Boolean))];

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

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
               {t("menu_payments")}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">{t("paymentsDesc") || "Track all incoming and outgoing payments."}</p>
          </div>

        </div>

        {/* Stats HUD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard 
             title={t("totalExpected")} 
             value={formatCurrency(stats.totalAmount)} 
             icon={<Wallet />} 
             colorClass="text-blue-600" 
             bgClass="bg-blue-50" 
           />
           <StatCard 
             title={t("totalCollected")} 
             value={formatCurrency(stats.totalCollected)} 
             subtext={`${((stats.totalCollected/stats.totalAmount)*100 || 0).toFixed(1)}% collected`}
             icon={<CheckCircle2 />} 
             colorClass="text-emerald-600" 
             bgClass="bg-emerald-50" 
           />
           <StatCard 
             title={t("pendingAmount")} 
             value={formatCurrency(stats.totalPending)} 
             icon={<Clock />} 
             colorClass="text-amber-600" 
             bgClass="bg-amber-50" 
           />
           <StatCard 
             title={t("overdueCount")} 
             value={stats.overdueCount} 
             subtext={t("paymentsRequireAction")}
             icon={<AlertTriangle />} 
             colorClass="text-red-600" 
             bgClass="bg-red-50" 
           />
        </div>

        {/* Main Content */}
        <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <CardHeader className="p-4 border-b border-gray-100 space-y-4">
             
             {/* Row 1: Main Tabs & Search */}
             <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div className="flex p-1 bg-gray-100 rounded-lg w-fit overflow-x-auto">
                   {[
                      {id: "all", label: t("all")},
                      {id: "paid", label: t("paid")},
                      {id: "overdue", label: t("overdue")},
                      {id: "upcoming", label: t("upcoming")},
                   ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setUpcomingRange("all"); }} // Reset range when tab changes
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                           activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                          {tab.label}
                      </button>
                   ))}
                </div>

                <div className="flex gap-2">
                   <div className="relative">
                      <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 ${isRtl ? "right-3" : "left-3"}`} />
                      <input 
                         type="text"
                         placeholder={t("searchPayments")}
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className={`pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-64 ${isRtl ? "pr-9 pl-4" : ""}`}
                      />
                   </div>
                   <Button variant={isFilterOpen ? "secondary" : "outline"} size="icon" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                      <Filter size={16} className={isFilterOpen ? "text-emerald-600" : "text-gray-500"} />
                   </Button>
                   {(searchTerm || propertyFilter) && (
                      <Button variant="ghost" size="icon" onClick={() => {setSearchTerm(""); setPropertyFilter(""); setActiveTab("all");}} className="text-red-500">
                          <RefreshCcw size={16} />
                      </Button>
                   )}
                </div>
             </div>

             {/* 🔥 Row 2: Range Filters (Only for Upcoming) */}
             {activeTab === "upcoming" && (
                <div className="flex items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
                   <span className="text-sm text-gray-500 font-medium flex items-center gap-1">
                      <CalendarDays size={14}/> {t("filterByDays") || "Time Range:"}
                   </span>
                   {[
                      { id: "all", label: t("allUpcoming") || "All Future" },
                      { id: "30", label: t("days 30") || "30 Days" },
                      { id: "45", label: t("days 45") || "45 Days" },
                      { id: "60", label: t("days 60") || "60 Days" },
                   ].map((range) => (
                      <button
                        key={range.id}
                        onClick={() => setUpcomingRange(range.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                           upcomingRange === range.id 
                           ? "bg-blue-50 text-blue-700 border-blue-200" 
                           : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                          {range.label}
                      </button>
                   ))}
                </div>
             )}

             {/* Advanced Filters */}
             {isFilterOpen && (
                <div className="mt-4 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-2">
                   <select 
                      value={propertyFilter} 
                      onChange={(e) => setPropertyFilter(e.target.value)}
                      className="w-full md:w-64 border-gray-200 rounded-lg text-sm p-2"
                   >
                      <option value="">{t("allProperties")}</option>
                      {properties.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                </div>
             )}
          </CardHeader>

          <CardContent className="p-0">
             {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <Wallet className="text-gray-300" size={32} />
                   </div>
                   <h3 className="text-gray-900 font-medium">{t("noPaymentsFound")}</h3>
                   <p className="text-gray-500 text-sm mt-1">{t("tryAdjustingFilters")}</p>
                </div>
             ) : (
                <>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 font-medium">
                         <tr>
                            <th className={`px-6 py-4 ${isRtl ? "text-right" : "text-left"}`}>{t("tenant")}</th>
                            <th className="px-6 py-4">{t("property")}</th>
                            <th className="px-6 py-4">{t("progress")}</th>
                            <th className="px-6 py-4 text-center">{t("amount")}</th>
                            <th className="px-6 py-4 text-center">{t("dueDate")}</th>
                            <th className="px-6 py-4 text-center">{t("status")}</th>
                            <th className="px-6 py-4 w-10"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {paginatedPayments.map((p, i) => {
                            const dueDate = p.due_date ? new Date(p.due_date) : null;
                            if (dueDate) dueDate.setHours(0,0,0,0);
                            
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            
                            const isPaid = p.status === "مدفوعة" || p.status === "paid";
                            const isOverdue = !isPaid && dueDate && dueDate < today;
                            const isUpcoming = !isPaid && dueDate && dueDate >= today;

                            return (
                               <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                  {/* Tenant Info */}
                                  <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? "text-right" : "text-left"}`}>
                                     <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                           <User size={16} />
                                        </div>
                                        <div>
                                           <p className="font-medium text-gray-900">{activeRole === "tenant" ? p.lessor_name : p.tenant_name}</p>
                                           <p className="text-xs text-gray-500 font-mono">#{p.contract_no}</p>
                                        </div>
                                     </div>
                                  </td>

                                  {/* Property Info */}
                                  <td className="px-6 py-4 whitespace-nowrap">
                                     <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 flex items-center gap-1.5">
                                           <Building2 size={14} className="text-gray-400" /> {p.property_name || "—"}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-0.5">{t("unit")}: {p.unit_no || "—"}</span>
                                     </div>
                                  </td>

                                  {/* Progress */}
                                  <td className="px-6 py-4 w-48">
                                     <PaymentProgressBar paid={p.paid_amount} total={p.amount} />
                                  </td>

                                  {/* Financials */}
                                  <td className="px-6 py-4 text-center whitespace-nowrap">
                                     <p className="font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                                     {(p.amount - (p.paid_amount || 0)) > 0 && (
                                        <p className="text-[10px] text-red-500 font-medium mt-0.5">{t("remaining")}: {formatCurrency(p.amount - (p.paid_amount || 0))}</p>
                                     )}
                                  </td>

                                  {/* Due Date */}
                                  <td className="px-6 py-4 text-center whitespace-nowrap">
                                     <div className="flex flex-col items-center">
                                        <span className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-700"}`}>
                                           {formatDate(p.due_date)}
                                        </span>
                                        {isOverdue && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 rounded mt-0.5">{t("late")}</span>}
                                     </div>
                                  </td>

                                  {/* Status */}
                                  <td className="px-6 py-4 text-center">
                                     <StatusBadge status={p.status} isOverdue={isOverdue} isUpcoming={isUpcoming} t={t} />
                                  </td>

                                  {/* Action */}
                                  <td className="px-6 py-4 text-center">
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-900">
                                        <MoreVertical size={16} />
                                     </Button>
                                  </td>
                               </tr>
                            );
                         })}
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
      </div>
    </DashboardLayout>
  );
}