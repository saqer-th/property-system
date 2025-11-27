import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCcw,
  FileText,
  Plus,
  Calendar,
  Wallet2,
  TrendingUp,
  AlertCircle,
  MoreVertical,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  Building2,
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Banknote // أيقونة جديدة للمبلغ
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

// =================================================================
// 🎨 UI SUB-COMPONENTS
// =================================================================

function StatWidget({ title, value, icon, trend, colorClass, bgClass }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
          {React.cloneElement(icon, { size: 22 })}
        </div>
        {trend && (
          <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <ArrowUpRight size={12} className="mr-1" /> {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h4 className="text-gray-500 text-sm font-medium">{title}</h4>
        <h2 className="text-2xl font-bold text-gray-900 mt-1">{value}</h2>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const styles = {
    "نشط": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "منتهي": "bg-gray-100 text-gray-600 border-gray-200",
    "active": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "expired": "bg-gray-100 text-gray-600 border-gray-200",
  };
  const currentStyle = styles[status] || styles["active"]; 

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle} flex items-center w-fit gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'نشط' || status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
      {status}
    </span>
  );
}

function PaymentProgress({ paid, total }) {
  const percent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  return (
    <div className="w-full min-w-[100px]">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 font-medium">{percent.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-4 animate-pulse">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  );
}

// =================================================================
// MAIN LOGIC
// =================================================================

export default function ContractsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [contracts, setContracts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const activeRole = user?.activeRole;
  const canAdd = ["admin", "office_admin", "office", "self_office_admin"].includes(activeRole);

  useEffect(() => {
    async function fetchContracts() {
      if (!user?.token) return setLoading(false);
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/contracts/my`, {
          headers: {
            "x-api-key": API_KEY,
            "Authorization": `Bearer ${user.token}`,
            "x-active-role": activeRole,
          },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const enriched = (data.data || []).map((c) => ({
          ...c,
          total_value_calculated: Number(c.total_value_calculated || 0),
          total_paid: Number(c.total_paid || 0),
          total_remaining: Number(c.total_remaining || 0),
          advance_balance: Number(c.advance_balance || 0),
          // ✅ إضافة مبلغ الدفعة القادمة هنا (تأكد أن الباك اند يرسلها بهذا الاسم أو عدله)
          next_payment_amount: Number(c.next_payment_amount || 0), 
        }));

        setContracts(enriched);
        setFiltered(enriched);
      } catch (err) {
        toast.error(err.message || "Error loading data");
        setContracts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchContracts();
  }, [user, activeRole]);

  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const propertyOptions = useMemo(() => [...new Set(contracts.map((c) => c.property_type).filter(Boolean))], [contracts]);
  const cityOptions = useMemo(() => [...new Set(contracts.map((c) => c.city).filter(Boolean))], [contracts]);
  const yearOptions = useMemo(() => {
    const years = contracts.map((c) => c.tenancy_start ? new Date(c.tenancy_start).getFullYear() : null).filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [contracts]);

  // show office list (used only for admin)
  const officeOptions = useMemo(
    () => [...new Set(contracts.map((c) => c.office_name).filter(Boolean))],
    [contracts]
  );

  useEffect(() => {
    let results = [...contracts];
    const term = (searchTerm || "").toLowerCase();

    if (term) {
      results = results.filter((c) =>
        [c.contract_no, c.tenant_name, c.lessor_name, c.property_type, c.city]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(term))
      );
    }

    const today = new Date();
    if (activeTab === "active") results = results.filter(c => c.contract_status === "نشط");
    if (activeTab === "expired") results = results.filter(c => c.contract_status === "منتهي");
    if (activeTab === "due_soon") {
      const limit = new Date();
      limit.setDate(today.getDate() + 30);
      results = results.filter((c) => {
        if (c.total_remaining <= 0) return false;
        const d = c.next_payment_date ? new Date(c.next_payment_date) : null;
        return d && d >= today && d <= limit;
      });
    }

    if (selectedProperty) results = results.filter((c) => c.property_type === selectedProperty);
    if (selectedCity) results = results.filter((c) => c.city === selectedCity);
    if (selectedYear) results = results.filter((c) => new Date(c.tenancy_start).getFullYear().toString() === selectedYear);
    // apply office filter only when the current user is admin
    if (activeRole === "admin" && selectedOffice) results = results.filter((c) => c.office_name === selectedOffice);
    if (selectedPaymentStatus === "paid") results = results.filter((c) => c.total_remaining === 0);
    if (selectedPaymentStatus === "remaining") results = results.filter((c) => c.total_remaining > 0);

    setFiltered(results);
    setPage(1);
  }, [searchTerm, activeTab, selectedProperty, selectedCity, selectedYear, selectedOffice, selectedPaymentStatus, contracts]);

  const stats = useMemo(() => {
    return {
      totalContracts: filtered.length,
      totalValue: filtered.reduce((sum, c) => sum + (c.total_value_calculated || 0), 0),
      totalPaid: filtered.reduce((sum, c) => sum + (c.total_paid || 0), 0),
      totalRemaining: filtered.reduce((sum, c) => sum + (c.total_remaining || 0), 0),
    };
  }, [filtered]);

  const formatCurrency = (num) => Number(num || 0).toLocaleString("en-US", { style: "currency", currency: "SAR", minimumFractionDigits: 0 });
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(isRtl ? "en-CA" : "en-GB");
  };
  
  const resetFilters = () => {
    setSearchInput("");
    setActiveTab("all");
    setSelectedProperty("");
    setSelectedCity("");
    setSelectedYear("");
    setSelectedOffice("");
    setSelectedPaymentStatus("");
    toast.success(t("filtersResetSuccess"));
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t("menu_contracts")}</h1>
            <p className="text-gray-500 mt-1 text-sm">{t("manageContractsDesc") || "إدارة عقود الإيجار والتحصيلات"}</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             {canAdd && (
              <Button onClick={() => navigate("/contracts/add")} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]">
                <Plus size={18} className={`${isRtl ? "ml-1" : "mr-1"}`} /> {t("addContract")}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget 
            title={t("totalContracts")} 
            value={stats.totalContracts} 
            icon={<FileText />} 
            colorClass="text-emerald-600" 
            bgClass="bg-emerald-50" 
          />
          <StatWidget 
            title={t("totalValue")} 
            value={formatCurrency(stats.totalValue)} 
            icon={<TrendingUp />} 
            colorClass="text-blue-600" 
            bgClass="bg-blue-50" 
          />
          <StatWidget 
            title={t("totalPaid")} 
            value={formatCurrency(stats.totalPaid)} 
            icon={<CheckCircle2 />} 
            colorClass="text-green-600" 
            bgClass="bg-green-50" 
          />
           <StatWidget 
            title={t("totalRemaining")} 
            value={formatCurrency(stats.totalRemaining)} 
            icon={<AlertCircle />} 
            colorClass="text-red-500" 
            bgClass="bg-red-50" 
          />
        </div>

        {/* Main Data Card */}
        <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <CardHeader className="p-4 border-b border-gray-100 bg-white">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                {[
                  { id: "all", label: t("allContracts") },
                  { id: "active", label: t("active") },
                  { id: "due_soon", label: t("dueSoon") },
                  { id: "expired", label: t("expired") },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeTab === tab.id 
                      ? "bg-white text-emerald-700 shadow-sm" 
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input 
                    type="text" 
                    placeholder={t("searchPlaceholder") || "بحث..."}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className={`pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none w-full md:w-64 ${isRtl ? 'pr-9 pl-4' : ''}`}
                  />
                </div>
                
                <Button 
                  variant={isFilterOpen ? "secondary" : "outline"}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="border-gray-200 text-gray-600"
                >
                  <Filter size={16} className={`${isFilterOpen ? "text-emerald-600" : ""}`} />
                </Button>
                
                {(searchTerm || selectedProperty || selectedPaymentStatus) && (
                   <Button variant="ghost" onClick={resetFilters} size="icon" className="text-red-500 hover:bg-red-50">
                     <RefreshCcw size={16} />
                   </Button>
                )}
              </div>
            </div>

            {isFilterOpen && (
              <div className="mt-4 pt-4 border-t border-dashed grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2">
                <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="input-filter">
                  <option value="">{t("allProperties")}</option>
                  {propertyOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="input-filter">
                   <option value="">{t("allCities")}</option>
                   {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input-filter">
                   <option value="">{t("allYears")}</option>
                   {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {/* office filter visible only to admin */}
                {activeRole === "admin" && (
                  <select value={selectedOffice} onChange={(e) => setSelectedOffice(e.target.value)} className="input-filter">
                    <option value="">{t("allOffices")}</option>
                    {officeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                <select value={selectedPaymentStatus} onChange={(e) => setSelectedPaymentStatus(e.target.value)} className="input-filter">
                   <option value="">{t("allPaymentStatus")}</option>
                   <option value="paid">{t("fullyPaid")}</option>
                   <option value="remaining">{t("remainingOnly")}</option>
                </select>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-gray-50 p-4 rounded-full mb-3">
                    <FileText size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-medium">{t("noContractsFound")}</h3>
                  <p className="text-gray-500 text-sm mt-1">{t("tryAdjustingFilters")}</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100 font-medium tracking-wider">
                    <tr>
                      <th className={`px-6 py-4 ${isRtl ? "text-right" : "text-left"}`}>{t("tenant")}</th>
                      <th className="px-6 py-4 text-center">{t("property")}</th>
                      {/* ✅ تحديث رأس الجدول ليشمل المبلغ والتاريخ */}
                      <th className="px-6 py-4 text-center text-emerald-800 font-bold bg-emerald-50/30 w-44">{t("nextPayment")}</th>
                      <th className="px-6 py-4 text-center w-32">{t("paymentStatus")}</th>
                      <th className="px-6 py-4 text-center">{t("amount")}</th>
                      <th className="px-6 py-4 text-center">{t("status")}</th>
                      <th className="px-6 py-4 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.map((row) => {
                      // Logic for Next Payment Alert
                      const today = new Date();
                      const dueDate = row.next_payment_date ? new Date(row.next_payment_date) : null;
                      const hasRemaining = row.total_remaining > 0;
                      // Due within 30 days
                      const isDueSoon = hasRemaining && dueDate && (dueDate - today <= 30 * 24 * 60 * 60 * 1000) && (dueDate >= today);
                      // Overdue (Date passed and money remaining)
                      const isOverdue = hasRemaining && dueDate && (dueDate < today);

                      return (
                      <tr 
                        key={row.id} 
                        onClick={() => navigate(`/contracts/${row.id}`)}
                        className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        {/* Tenant */}
                        <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? "text-right" : "text-left"}`}>
                           <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                                {row.tenant_name ? row.tenant_name.slice(0,2) : "UN"}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{row.tenant_name || "Unknown"}</p>
                                <p className="text-xs text-gray-500 font-mono">#{row.contract_no}</p>
                              </div>
                           </div>
                        </td>

                        {/* Property */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                             <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                                <Building2 size={14} className="text-gray-400" />
                                {row.property_type}
                             </div>
                             <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <MapPin size={10} />
                                {row.city} • {row.unit_no}
                             </div>
                          </div>
                        </td>

                        {/* ✅ Next Payment Cell - Amount + Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-center bg-emerald-50/20 border-l border-r border-emerald-100/50">
                          {hasRemaining ? (
                             <div className="flex flex-col items-center justify-center">
                                {/* 💰 Amount Display */}
                                <div className="text-base font-extrabold text-emerald-900 mb-1 flex items-center gap-1">
                                   {formatCurrency(row.next_payment_amount)}
                                </div>
                                
                                {/* 📅 Date Display */}
                                <div className={`flex items-center gap-1.5 text-xs font-semibold
                                  ${isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : "text-gray-500"}`}>
                                   {(isOverdue || isDueSoon) ? <AlertTriangle size={12} /> : <Clock size={12} className="text-gray-400"/>}
                                   {formatDate(row.next_payment_date)}
                                </div>
                                
                                {/* ⚠️ Alerts */}
                                {isOverdue && <span className="text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded-full mt-1.5 shadow-sm">{t("overdue")}</span>}
                                {isDueSoon && <span className="text-[10px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full mt-1.5 shadow-sm">{t("dueSoon")}</span>}
                             </div>
                          ) : (
                             <div className="flex flex-col items-center justify-center gap-1 opacity-60">
                               <CheckCircle2 size={20} className="text-emerald-500" />
                               <span className="text-xs font-medium text-emerald-600">{t("fullyPaid")}</span>
                             </div>
                          )}
                        </td>

                        {/* Payment Progress */}
                        <td className="px-6 py-4 text-center">
                           <PaymentProgress paid={row.total_paid} total={row.total_value_calculated} />
                        </td>

                        {/* Financials */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                           <p className="font-bold text-gray-900">{formatCurrency(row.total_value_calculated)}</p>
                           {row.total_remaining > 0 ? (
                             <p className="text-xs text-red-500 font-medium mt-0.5">{t("remaining")}: {formatCurrency(row.total_remaining)}</p>
                           ) : null}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                           <div className="flex justify-center">
                             <StatusBadge status={row.contract_status} t={t} />
                           </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                <MoreVertical size={16} />
                              </Button>
                           </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="bg-white border-t border-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="text-xs text-gray-500">
                 {t("showing")} <span className="font-medium text-gray-900">{(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)}</span> {t("of")} <span className="font-medium text-gray-900">{filtered.length}</span>
               </div>
               
               <div className="flex items-center gap-2">
                 <Button 
                   variant="outline" size="sm" 
                   onClick={() => setPage(p => Math.max(1, p-1))} 
                   disabled={page === 1}
                   className="h-8 w-8 p-0"
                 >
                   {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                 </Button>
                 
                 <div className="flex items-center gap-1">
                   {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pNum = i + 1;
                      return (
                        <button 
                          key={pNum} 
                          onClick={() => setPage(pNum)}
                          className={`w-8 h-8 flex items-center justify-center text-xs rounded-md transition-colors ${page === pNum ? "bg-emerald-600 text-white font-medium shadow-sm" : "hover:bg-gray-50 text-gray-600"}`}
                        >
                          {pNum}
                        </button>
                      )
                   })}
                 </div>

                 <Button 
                   variant="outline" size="sm" 
                   onClick={() => setPage(p => Math.min(totalPages, p+1))} 
                   disabled={page === totalPages}
                   className="h-8 w-8 p-0"
                 >
                   {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <style>{`
        .input-filter {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          background-color: white;
          color: #374151;
          outline: none;
          transition: all 0.2s;
        }
        .input-filter:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
        }
      `}</style>
    </DashboardLayout>
  );
}