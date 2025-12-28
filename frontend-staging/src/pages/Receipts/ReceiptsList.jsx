import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  PlusCircle,
  Receipt,
  RefreshCcw,
  Building2,
  Home,
  FileText,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Filter,
  MoreVertical,
  Printer,
  FileQuestion,
  User,
  ArrowRight,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import AddReceiptDrawer from "@/components/receipts/AddReceiptDrawer";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

// =========================
// 🎨 Sub-Components
// =========================

function StatCard({ title, value, icon, type }) {
  const styles = {
    receipt: "bg-emerald-50 text-emerald-700 border-emerald-100",
    payment: "bg-red-50 text-red-700 border-red-100",
    balance: "bg-blue-50 text-blue-700 border-blue-100",
    total: "bg-white text-gray-700 border-gray-200",
  };

  return (
    <div className={`p-5 rounded-xl border shadow-sm ${styles[type] || styles.total}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="opacity-80 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className="p-2 rounded-lg bg-white/50">
          {icon}
        </div>
      </div>
    </div>
  );
}

function LinkBadge({ r, t }) {
  if (r.contract_no) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal flex gap-1 items-center w-fit whitespace-nowrap">
        <FileText size={12} /> {t("contract")} #{r.contract_no}
      </Badge>
    );
  }
  if (r.unit_no) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal flex gap-1 items-center w-fit whitespace-nowrap">
        <Home size={12} /> {t("unit")} {r.unit_no}
      </Badge>
    );
  }
  if (r.property_name) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-normal flex gap-1 items-center w-fit whitespace-nowrap">
        <Building2 size={12} /> {r.property_name}
      </Badge>
    );
  }
  return <span className="text-gray-400 text-xs">{t("general")}</span>;
}

// =========================
// Main Component
// =========================

export default function ReceiptsList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [receipts, setReceipts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null); // For details dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [linkFilter, setLinkFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage] = useState(20); // 🆕 Set to 20 rows per page

  const activeRole = user?.activeRole;
  const canAdd = ["admin", "office_admin", "office", "self_office_admin"].includes(activeRole);

  // 1. Fetch Data
  async function fetchReceipts() {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/receipts/my`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      if (res.status === 401) throw new Error(t("noPermission"));
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const list = Array.isArray(data.data) ? data.data : [];
      setReceipts(list);
      setFiltered(list);
    } catch (err) {
      setError(err.message);
      toast.error(t("failedToLoadReceipts"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReceipts();
  }, [user]); // Re-fetch when user changes

  // 2. Filter Logic
  useEffect(() => {
    let results = [...receipts];
    const q = searchTerm.toLowerCase();

    if (searchTerm) {
      results = results.filter((r) =>
        [r.reference_no, r.payer, r.receiver, r.reason, r.description, r.contract_no, r.property_name]
          .filter(Boolean)
          .some((x) => x.toLowerCase().includes(q))
      );
    }

    if (activeTab === "receipt") {
      results = results.filter(r => r.receipt_type === "قبض" || r.receipt_type === "receive");
    } else if (activeTab === "payment") {
      results = results.filter(r => r.receipt_type === "صرف" || r.receipt_type === "payment");
    }

    if (linkFilter) {
      results = results.filter((r) => {
        if (linkFilter === "contract") return r.contract_id || r.contract_no;
        if (linkFilter === "unit") return r.unit_id || r.unit_no;
        if (linkFilter === "property") return r.property_id || r.property_name;
        if (linkFilter === "general") return !r.contract_no && !r.unit_no && !r.property_name;
        return true;
      });
    }

    if (dateFrom) results = results.filter((r) => new Date(r.date || r.receipt_date) >= new Date(dateFrom));
    if (dateTo) results = results.filter((r) => new Date(r.date || r.receipt_date) <= new Date(dateTo));

    setFiltered(results);
    setPage(1); // 🆕 Reset to page 1 on filter change
  }, [searchTerm, activeTab, linkFilter, dateFrom, dateTo, receipts]);

  // 3. Stats
  const stats = useMemo(() => {
    const totalReceiptsAmount = filtered
      .filter((r) => r.receipt_type === "قبض" || r.receipt_type === "receive")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalPaymentsAmount = filtered
      .filter((r) => r.receipt_type === "صرف" || r.receipt_type === "payment")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return { totalCount: filtered.length, totalReceiptsAmount, totalPaymentsAmount, netCashFlow: totalReceiptsAmount - totalPaymentsAmount };
  }, [filtered]);

  // 4. Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginatedReceipts = filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

  const formatCurrency = (num) => new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", minimumFractionDigits: 2 }).format(num || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(isRtl ? "en-CA" : "en-GB") : "—";

  // 👁️ Open Details Dialog
  const handleViewDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setDetailsOpen(true);
  };

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
               {t("receiptsVouchers") || "سندات القبض والصرف"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">{t("receiptsDesc") || "إدارة التدفقات النقدية والسندات المالية"}</p>
          </div>
          <div className="flex gap-2">
             {canAdd && (
                <Button onClick={() => setDrawerOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                   <PlusCircle size={16} className={`${isRtl ? "ml-2" : "mr-2"}`} /> {t("newVoucher") || "سند جديد"}
                </Button>
             )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard title={t("totalVouchers") || "عدد السندات"} value={stats.totalCount} icon={<Receipt size={20}/>} type="total" />
           <StatCard title={t("totalReceipts") || "إجمالي المقبوضات"} value={formatCurrency(stats.totalReceiptsAmount)} icon={<ArrowDownLeft size={20}/>} type="receipt" />
           <StatCard title={t("totalPayments") || "إجمالي المدفوعات"} value={formatCurrency(stats.totalPaymentsAmount)} icon={<ArrowUpRight size={20}/>} type="payment" />
           <StatCard title={t("netCashFlow") || "صافي السيولة"} value={formatCurrency(stats.netCashFlow)} icon={<Wallet size={20}/>} type="balance" />
        </div>

        {/* Main Content */}
        <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <CardHeader className="p-4 border-b border-gray-100">
             
             <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div className="flex p-1 bg-gray-100 rounded-lg w-fit overflow-x-auto">
                   {[
                      {id: "all", label: t("all")},
                      {id: "receipt", label: t("receiptsOnly") || "قبض"}, 
                      {id: "payment", label: t("paymentsOnly") || "صرف"}, 
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

                <div className="flex gap-2 flex-1 justify-end">
                   <div className="relative w-full max-w-xs">
                      <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 ${isRtl ? "right-3" : "left-3"}`} />
                      <input 
                         type="text"
                         placeholder={t("searchReceipt") || "بحث برقم السند، الاسم، السبب..."}
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className={`pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full ${isRtl ? "pr-9 pl-4" : ""}`}
                      />
                   </div>
                   <Button variant={isFilterOpen ? "secondary" : "outline"} size="icon" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                      <Filter size={16} className={isFilterOpen ? "text-emerald-600" : "text-gray-500"} />
                   </Button>
                   {(searchTerm || linkFilter || dateFrom) && (
                      <Button variant="ghost" size="icon" onClick={() => {setSearchTerm(""); setLinkFilter(""); setDateFrom(""); setDateTo(""); setActiveTab("all");}} className="text-red-500">
                         <RefreshCcw size={16} />
                      </Button>
                   )}
                </div>
             </div>

             {isFilterOpen && (
                <div className="mt-4 pt-4 border-t border-dashed grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                   <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">{t("linkedTo")}</label>
                      <select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-gray-50">
                         <option value="">{t("allLinks")}</option>
                         <option value="contract">{t("contract")}</option>
                         <option value="unit">{t("unit")}</option>
                         <option value="property">{t("property")}</option>
                         <option value="general">{t("general")}</option>
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
                   <h3 className="text-gray-900 font-medium">{t("noReceiptsFound")}</h3>
                   <p className="text-gray-500 text-sm mt-1">{t("tryAdjustingFilters")}</p>
                </div>
             ) : (
                <>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 font-medium">
                         <tr>
                            <th className={`px-6 py-4 ${isRtl ? "text-right" : "text-left"}`}>{t("receiptNo")}</th>
                            <th className="px-6 py-4 text-center">{t("type")}</th>
                            <th className="px-6 py-4 text-center">{t("amount")}</th>
                            <th className="px-6 py-4 w-64">{t("parties")}</th> 
                            <th className="px-6 py-4">{t("reason")}</th> 
                            <th className="px-6 py-4 text-center">{t("date")}</th>
                            <th className="px-6 py-4 w-10"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {paginatedReceipts.map((r, i) => {
                            const isReceipt = r.receipt_type === "قبض" || r.receipt_type === "receive";
                            return (
                               <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                  {/* Receipt No */}
                                  <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? "text-right" : "text-left"}`}>
                                     <span className="font-mono font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                        #{r.reference_no || r.receipt_no || "—"}
                                     </span>
                                     <div className="mt-1">
                                        <LinkBadge r={r} t={t} />
                                     </div>
                                  </td>

                                  {/* Type Badge */}
                                  <td className="px-6 py-4 text-center">
                                     <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isReceipt ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                        {isReceipt ? t("receipt") || "قبض" : t("payment") || "صرف"}
                                     </span>
                                  </td>

                                  {/* Amount */}
                                  <td className={`px-6 py-4 text-center font-bold text-base ${isReceipt ? "text-emerald-600" : "text-red-600"}`}>
                                     {isReceipt ? "+" : "-"} {formatCurrency(r.amount)}
                                  </td>

                                  {/* ✅ Parties (From -> To) */}
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <span className="font-medium truncate max-w-[100px] text-gray-900" title={r.payer_name}>{r.payer_name || t("Unknown")}</span>
                                        <ArrowRight size={14} className={`text-gray-400 ${isRtl ? "rotate-180" : ""}`} />
                                        <span className="font-medium truncate max-w-[100px] text-gray-900" title={r.receiver_name}>{r.receiver_name || t("Unknown")}</span>
                                     </div>
                                  </td>

                                  {/* ✅ Reason */}
                                  <td className="px-6 py-4">
                                     <span className="text-gray-600 text-sm truncate block max-w-[200px]" title={r.reason || r.description}>
                                        {r.reason || r.description || t("noReason")}
                                     </span>
                                  </td>

                                  {/* Date */}
                                  <td className="px-6 py-4 text-center text-gray-500 text-sm">
                                     {formatDate(r.receipt_date || r.date)}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-6 py-4 text-center">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                              <MoreVertical size={16} />
                                           </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                           <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                                           <DropdownMenuSeparator />
                                           {/* ✅ زر عرض التفاصيل */}
                                           <DropdownMenuItem onClick={() => handleViewDetails(r)} className="cursor-pointer">
                                              <Eye size={14} className="mr-2" /> {t("viewDetails") || "عرض التفاصيل"}
                                           </DropdownMenuItem>
                                           <DropdownMenuItem className="cursor-pointer">
                                              <Printer size={14} className="mr-2" /> {t("print") || "طباعة"}
                                           </DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
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

        {/* ➕ Add Receipt Drawer */}
        {canAdd && (
          <AddReceiptDrawer
            open={drawerOpen}
            setOpen={setDrawerOpen}
            refresh={fetchReceipts}
          />
        )}

        {/* 👁️ Receipt Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
           <DialogContent className="sm:max-w-md" dir={isRtl ? "rtl" : "ltr"}>
              <DialogHeader>
                 <DialogTitle className="flex items-center gap-2 text-xl">
                    <Receipt className="text-emerald-600" /> {t("receiptDetails") || "تفاصيل السند"}
                 </DialogTitle>
                 <DialogDescription className="text-sm text-gray-500">
                    {t("refNo") || "رقم المرجع"}: <span className="font-mono text-gray-900">{selectedReceipt?.reference_no || selectedReceipt?.receipt_no}</span>
                 </DialogDescription>
              </DialogHeader>

              {selectedReceipt && (
                 <div className="space-y-4 py-2">
                    {/* المبلغ والنوع */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                       <div>
                          <p className="text-xs text-gray-500 mb-1">{t("amount")}</p>
                          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedReceipt.amount)}</p>
                       </div>
                       <Badge className={selectedReceipt.receipt_type === "قبض" || selectedReceipt.receipt_type === "receive" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                          {selectedReceipt.receipt_type}
                       </Badge>
                    </div>

                    {/* الدافع والمستلم بوضوح */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><User size={12}/> {t("payer") || "الدافع"}</p>
                          <p className="font-medium text-gray-900">{selectedReceipt.payer_name}</p>
                       </div>
                       <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                          <p className="text-xs font-bold text-purple-600 uppercase mb-1 flex items-center gap-1"><User size={12}/> {t("receiver") || "المستلم"}</p>
                          <p className="font-medium text-gray-900">{selectedReceipt.receiver_name}</p>
                       </div>
                    </div>

                    {/* السبب */}
                    <div>
                       <p className="text-sm font-medium text-gray-700 mb-1">{t("reason") || "السبب / البيان"}</p>
                       <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border min-h-[60px]">
                          {selectedReceipt.reason || selectedReceipt.description || t("noDescription")}
                       </p>
                    </div>

                    {/* التاريخ */}
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
                       <span>{t("date")}: {formatDate(selectedReceipt.receipt_date || selectedReceipt.date)}</span>
                       {selectedReceipt.payment_method && <span>{t("method")}: {selectedReceipt.payment_method}</span>}
                    </div>
                 </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                 <Button variant="outline" onClick={() => setDetailsOpen(false)}>{t("close")}</Button>
                 <Button onClick={() => { window.print() }} className="bg-emerald-600 hover:bg-emerald-700">
                    <Printer size={16} className="mr-2" /> {t("print")}
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}