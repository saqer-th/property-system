import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  FileText,
  User,
  Building2,
  Wrench,
  DollarSign,
  Receipt,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Wallet2,
  ArrowRight,
  Printer,
  Calendar,
  MapPin
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import EditDrawer from "@/components/common/EditDrawer";

export default function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [error, setError] = useState(null);

  // 🔒 Permissions
  const canEdit = ["office_admin", "admin", "office", "self_office_admin"].includes(user?.activeRole);
  const activeRole = user?.activeRole;
  const isRtl = i18n.language === "ar";

  // 📦 Fetch Data
  async function fetchContract() {
    try {
      const res = await fetch(`${API_URL}/contracts/${id}`, {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
          "x-active-role": activeRole,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch contract");
      const json = await res.json();
      setContract(json?.data || json);
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContract();
  }, [id, user]);

  const handleEdit = (section) => {
    setEditSection(section);
    setDrawerOpen(true);
  };

  // 💰 Calculations
  const totalPayments = contract?.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
  const totalPaid = contract?.payments?.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0) || 0;
  const tenantExpenses = contract?.expenses?.reduce((sum, e) => e.on_whom === "مستأجر" ? sum + Number(e.amount || 0) : sum, 0) || 0;
  const totalDueWithExpenses = totalPayments + tenantExpenses;
  const totalReceiptsIncome = contract?.receipts?.reduce((sum, r) => sum + (r.receipt_type === "قبض" ? Number(r.amount) : 0), 0) || 0;
  const totalExpenses = contract?.expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
  const rent = Number(contract?.annual_rent || 0) > 0 ? Number(contract.annual_rent) : totalPayments;
  const remaining = totalDueWithExpenses - totalReceiptsIncome;
  const advanceBalance = remaining < 0 ? Math.abs(remaining) : contract?.advance_balance || 0;
  const netBalance = totalReceiptsIncome - totalExpenses;
  // Add this line where you defined other calculations (around line 90)
const totalReceiptsExpense = contract?.receipts?.reduce((sum, r) => sum + (r.receipt_type === "صرف" ? Number(r.amount) : 0), 0) || 0;
  // Progress Calculation
  const progressPercentage = totalDueWithExpenses > 0 ? Math.min((totalReceiptsIncome / totalDueWithExpenses) * 100, 100) : 0;

  const status = remaining <= 0 ? "paid" : remaining > 0 && totalReceiptsIncome > 0 ? "partial" : "unpaid";

  const formatCurrency = (val) => Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

  if (loading) return <LoadingSkeleton />;
  if (!contract) return <ErrorState t={t} />;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* 🔝 Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-500 hover:text-gray-900 cursor-pointer transition-colors" onClick={() => navigate(-1)}>
              <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
              <span className="text-sm font-medium">{t("backToContracts")}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t("contractDetails")}</h1>
              <StatusBadge status={status} t={t} />
            </div>
            <p className="text-gray-500 flex items-center gap-2 text-sm">
              <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">#{contract.contract_no}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Building2 size={12}/> {contract.property?.property_name}</span>
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none">
              <Printer size={16} className="mx-2" /> {t("print")}
            </Button>
            {canEdit && (
              <Button onClick={() => handleEdit("contract")} className="bg-emerald-600 hover:bg-emerald-700 flex-1 md:flex-none">
                <Pencil size={16} className="mx-2" /> {t("editContract")}
              </Button>
            )}
          </div>
        </div>

        {/* 📊 High-Level Stats Widget */}
        <Card className="bg-gradient-to-br from-white to-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="space-y-1">
                <span className="text-sm text-gray-500">{t("totalContractValue")}</span>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDueWithExpenses)} <span className="text-xs text-gray-400">SAR</span></p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">{t("annualRent")}</span>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(rent)} <span className="text-xs text-gray-400">SAR</span></p>
                <p className="text-[11px] text-red-500">
                  { "القيمة كما هي مسجلة منذ بداية العقد يمكنك تعديلها"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">{t("totalPaid")}</span>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceiptsIncome)} <span className="text-xs text-gray-400">SAR</span></p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">{t("remainingAmount")}</span>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(remaining > 0 ? remaining : 0)} <span className="text-xs text-gray-400">SAR</span></p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">{t("netIncome")}</span>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(netBalance)} <span className="text-xs text-gray-400">SAR</span></p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t("paymentProgress")}</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 📑 TABS: The Core Layout Improvement */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mb-4">
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="financials">{t("financials")}</TabsTrigger>
            <TabsTrigger value="units">{t("unitsAndProperty")}</TabsTrigger>
          </TabsList>

          {/* 1. OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Contract Info */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="flex items-center gap-2"><FileText className="text-emerald-500 w-5"/> {t("contractInfo")}</CardTitle>
                    {canEdit && <EditBtn onClick={() => handleEdit("contract")} />}
                  </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-y-4 gap-x-8 pt-4">
                   <DetailItem label={t("contractNo")} value={contract.contract_no} />
                   <DetailItem label={t("titleDeed")} value={contract.property?.title_deed_no} />
                   <DetailItem label={t("startDate")} value={formatDate(contract.tenancy_start)} icon={<Calendar size={14}/>} />
                   <DetailItem label={t("endDate")} value={formatDate(contract.tenancy_end)} icon={<Calendar size={14}/>} />
                   <DetailItem label={t("contractDuration")} value="1 Year" /> {/* Example calculation */}
                   <DetailItem label={t("renewalStatus")} value="Active" />
                </CardContent>
              </Card>

              {/* Quick Actions / Broker */}
              <Card className="h-fit">
                <CardHeader className="pb-2">
                   <div className="flex justify-between">
                    <CardTitle className="flex items-center gap-2 text-base"><Building2 className="text-indigo-500 w-4"/> {t("brokerageInfo")}</CardTitle>
                    {canEdit && <EditBtn onClick={() => handleEdit("broker")} size="sm" />}
                   </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-gray-800">{contract.broker?.name || "N/A"}</p>
                    <p className="text-gray-500 text-xs mt-1">{t("license")}: {contract.broker?.license_no}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500 text-xs">{t("phone")}</p>
                    <p className="font-medium">{contract.broker?.phone || "—"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <PartyCard 
                icon={<User className="text-emerald-600" />} 
                title={t("tenants")} 
                items={contract.tenants} 
                onEdit={() => handleEdit("tenants")} 
                canEdit={canEdit} t={t} 
              />
              <PartyCard 
                icon={<User className="text-blue-600" />} 
                title={t("lessors")} 
                items={contract.lessors} 
                onEdit={() => handleEdit("lessors")} 
                canEdit={canEdit} t={t} 
              />
            </div>
          </TabsContent>

          {/* 2. FINANCIALS TAB */}
          <TabsContent value="financials" className="space-y-6">
            
            <div className="grid md:grid-cols-3 gap-4">
               <MiniStat title={t("tenantExpenses")} value={tenantExpenses} icon={<Wrench className="text-orange-500"/>} />
               <MiniStat title={t("advanceBalance")} value={advanceBalance} icon={<Wallet2 className="text-emerald-500"/>} />
               <MiniStat title={t("totalReceiptsExpense")} value={totalReceiptsExpense} icon={<TrendingUp className="text-red-500"/>} />
            </div>

            <DataTable 
              title={t("paymentsSchedule")} 
              icon={<DollarSign className="text-emerald-500"/>}
              items={contract.payments}
              headers={[t("due_date"), t("amount"), t("paid_amount"), t("remaining"), t("status")]}
              renderRow={(item) => (
                <>
                  <td className="p-3 font-medium">{formatDate(item.due_date)}</td>
                  <td className="p-3">{formatCurrency(item.amount)}</td>
                  <td className="p-3 text-emerald-600">{formatCurrency(item.paid_amount)}</td>
                  <td className="p-3 text-red-600">{formatCurrency(item.remaining_amount)}</td>
                  <td className="p-3"><StatusBadge status={Number(item.remaining_amount) <= 0 ? "paid" : "unpaid"} small t={t} /></td>
                </>
              )}
              onEdit={() => handleEdit("payments")}
              canEdit={canEdit}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <DataTable 
                title={t("receipts")} 
                icon={<Receipt className="text-blue-500"/>}
                items={contract.receipts}
                headers={[t("date"), t("type"), t("amount")]}
                renderRow={(item) => (
                  <>
                    <td className="p-3 text-sm">{formatDate(item.date)}</td>
                    <td className="p-3"><Badge variant="outline">{item.receipt_type}</Badge></td>
                    <td className="p-3 font-semibold">{formatCurrency(item.amount)}</td>
                  </>
                )}
                onEdit={() => handleEdit("receipts")}
                canEdit={canEdit}
              />

              <DataTable 
                title={t("expenses")} 
                icon={<Wrench className="text-orange-500"/>}
                items={contract.expenses}
                headers={[t("date"), t("type"), t("amount")]}
                renderRow={(item) => (
                  <>
                    <td className="p-3 text-sm">{formatDate(item.date)}</td>
                    <td className="p-3 text-sm text-gray-600">{item.expense_type}</td>
                    <td className="p-3 font-semibold">{formatCurrency(item.amount)}</td>
                  </>
                )}
                onEdit={() => handleEdit("expenses")}
                canEdit={canEdit}
              />
            </div>
          </TabsContent>

          {/* 3. UNITS TAB */}
          <TabsContent value="units" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                   <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2"><Building2 className="text-gray-500"/> {contract.property?.property_name}</CardTitle>
                      <CardDescription className="flex items-center gap-1"><MapPin size={12}/> {contract.property?.city} - {contract.property?.national_address}</CardDescription>
                   </div>
                   {canEdit && <EditBtn onClick={() => handleEdit("property")} />}
                </div>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border mb-6">
                    <DetailItem label={t("propertyUsage")} value={contract.property?.usage} />
                    <DetailItem label={t("numUnits")} value={contract.property?.num_units} />

                 </div>
              </CardContent>
            </Card>

            <DataTable 
              title={t("rentedUnits")} 
              icon={<Building2 className="text-emerald-500"/>}
              items={contract.units}
              headers={[t("unit_no"), t("unit_type"), t("electric_meter"), t("water_meter")]}
              renderRow={(item) => (
                <>
                  <td className="p-3 font-bold">{item.unit_no}</td>
                  <td className="p-3"><Badge variant="secondary">{item.unit_type}</Badge></td>
                  <td className="p-3 text-sm text-gray-500">{item.electric_meter_no || "-"}</td>
                  <td className="p-3 text-sm text-gray-500">{item.water_meter_no || "-"}</td>
                </>
              )}
              onEdit={() => handleEdit("units")}
              canEdit={canEdit}
            />
          </TabsContent>
        </Tabs>

        {/* ✏️ Edit Drawer */}
        <EditDrawer
          open={drawerOpen}
          setOpen={(val) => {
            setDrawerOpen(val);
            if (!val) fetchContract();
          }}
          section={editSection}
          contract={contract}
          setContract={setContract}
        />
      </div>
    </DashboardLayout>
  );
}

/* 🧩 UI Components */

function DetailItem({ label, value, icon }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2 text-gray-900 font-medium text-sm">
        {icon && <span className="text-gray-400">{icon}</span>}
        {value || "—"}
      </div>
    </div>
  );
}

function MiniStat({ title, value, icon }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
         <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-lg font-bold">{Number(value).toLocaleString()} SAR</p>
         </div>
         <div className="bg-gray-50 p-2 rounded-full border">
            {icon}
         </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status, small, t }) {
  const styles = {
    paid: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200",
    partial: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200",
    unpaid: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200",
  };
  
  const labels = {
    paid: t("fullyPaid"),
    partial: t("partiallyPaid"),
    unpaid: t("unpaid"),
  };

  return <Badge variant="outline" className={`${styles[status] || styles.unpaid} ${small ? "text-xs px-2" : "px-3 py-1 text-sm"}`}>{labels[status]}</Badge>;
}

function EditBtn({ onClick, size = "default" }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900" onClick={onClick}>
      <Pencil size={14} />
    </Button>
  );
}

function PartyCard({ icon, title, items, onEdit, canEdit, t }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b bg-gray-50/50">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
            {icon} {title}
          </CardTitle>
          {canEdit && <EditBtn onClick={onEdit} />}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {items?.length ? items.map((p, i) => (
          <div key={i} className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                {p.name?.charAt(0)}
             </div>
             <div>
                <p className="font-medium text-sm text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">{p.phone} • {p.id}</p>
             </div>
          </div>
        )) : <p className="text-gray-400 text-sm italic">{t("noData")}</p>}
      </CardContent>
    </Card>
  );
}

function DataTable({ title, icon, items, headers, renderRow, onEdit, canEdit }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
         <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
         {canEdit && <EditBtn onClick={onEdit} />}
      </CardHeader>
      <div className="overflow-x-auto">
        {items?.length ? (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                {headers.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((row, i) => <tr key={i} className="hover:bg-gray-50/50 transition-colors">{renderRow(row)}</tr>)}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-400 text-sm">{title} - No Data</div>
        )}
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
         <div className="flex justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
         </div>
         <Skeleton className="h-40 w-full rounded-xl" />
         <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64" />
         </div>
      </div>
    </DashboardLayout>
  )
}

function ErrorState({ t }) {
  return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
           <AlertTriangle size={48} className="text-red-400 opacity-50" />
           <h2 className="text-xl font-semibold text-gray-900">{t("noContractFound")}</h2>
           <p className="text-gray-500 max-w-md">{t("errorContractMsg")}</p>
           <Button variant="outline" onClick={() => window.location.reload()}>{t("retry")}</Button>
        </div>
      </DashboardLayout>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-CA"); // YYYY-MM-DD
  } catch { return "—"; }
}