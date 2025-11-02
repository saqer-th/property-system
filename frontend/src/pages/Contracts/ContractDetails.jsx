import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import EditDrawer from "@/components/common/EditDrawer";

export default function ContractDetails() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);

  // 🔒 صلاحيات
  const canEdit = user?.activeRole === "office_admin" ||user?.activeRole === "admin" ;
  const activeRole = user?.activeRole;


  // 📦 تحميل بيانات العقد
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setContract(json?.data || json);
    } catch (err) {
      console.error("❌ Error loading contract:", err);
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

  // 💰 التحليل المالي
  const totalPayments =
    contract?.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

  const totalPaid =
    contract?.payments?.reduce(
      (sum, p) => sum + Number(p.paid_amount || 0),
      0
    ) || 0;

  const tenantExpenses =
    contract?.expenses?.reduce(
      (sum, e) =>
        e.on_whom === "مستأجر" ? sum + Number(e.amount || 0) : sum,
      0
    ) || 0;

  const totalDueWithExpenses = totalPayments + tenantExpenses;

  const totalReceiptsIncome =
    contract?.receipts?.reduce(
      (sum, r) => sum + (r.receipt_type === "قبض" ? Number(r.amount) : 0),
      0
    ) || 0;

  const totalReceiptsExpense =
    contract?.receipts?.reduce(
      (sum, r) => sum + (r.receipt_type === "صرف" ? Number(r.amount) : 0),
      0
    ) || 0;

  const totalExpenses =
    contract?.expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

  const rent =
    Number(contract?.annual_rent || 0) > 0
      ? Number(contract.annual_rent)
      : totalPayments;

  // ✅ الحسابات المحدثة
  const remaining = totalDueWithExpenses - totalReceiptsIncome;
  const advanceBalance =
    remaining < 0 ? Math.abs(remaining) : contract?.advance_balance || 0;
  const netBalance = totalReceiptsIncome - totalExpenses;

  const status =
    remaining <= 0
      ? t("fullyPaid")
      : remaining > 0 && totalReceiptsIncome > 0
      ? t("partiallyPaid")
      : t("unpaid");

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  if (loading)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
      </DashboardLayout>
    );

  if (!contract)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("noContractFound")}</p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        {/* 🧾 العنوان */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-emerald-700 flex items-center gap-2">
            <FileText className="text-emerald-600" /> {t("contractDetails")}
          </h1>
          {canEdit && (
            <Button
              onClick={() => handleEdit("contract")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Pencil size={16} className="mr-1" /> {t("editContract")}
            </Button>
          )}
        </div>

        {/* 💰 التحليل المالي */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <SummaryCard
            icon={<FileText className="text-emerald-600" />}
            title={t("rentAmount")}
            value={`${formatCurrency(rent)} SAR`}
          />
          <SummaryCard
            icon={<Wrench className="text-orange-600" />}
            title={t("tenantExpenses")}
            value={`${formatCurrency(tenantExpenses)} SAR`}
          />
          <SummaryCard
            icon={<Wallet2 className="text-indigo-600" />}
            title={t("totalDueWithExpenses")}
            value={`${formatCurrency(totalDueWithExpenses)} SAR`}
          />
          <SummaryCard
            icon={<CheckCircle2 className="text-green-600" />}
            title={t("totalPaid")}
            value={`${formatCurrency(totalReceiptsIncome)} SAR`}
          />
          <SummaryCard
            icon={<AlertTriangle className="text-red-600" />}
            title={t("remainingAmount")}
            value={`${formatCurrency(remaining > 0 ? remaining : 0)} SAR`}
          />
          <SummaryCard
            icon={<TrendingUp className="text-emerald-600" />}
            title={t("advanceBalance")}
            value={`${formatCurrency(advanceBalance)} SAR`}
            color="text-emerald-600"
          />
          <SummaryCard
            icon={<DollarSign className="text-gray-600" />}
            title={t("netIncome")}
            value={`${formatCurrency(netBalance)} SAR`}
          />
        </div>

        {/* 📑 بيانات العقد */}
        <InfoCard
          icon={<FileText className="text-emerald-600" />}
          title={t("contractInfo")}
          data={[
            { label: t("contractNo"), value: contract.contract_no },
            { label: t("titleDeed"), value: contract.property?.title_deed_no },
            { label: t("startDate"), value: formatDate(contract.start_date) },
            { label: t("endDate"), value: formatDate(contract.end_date) },
            { label: t("annualRent"), value: `${formatCurrency(rent)} SAR` },
            { label: t("status"), value: status },
          ]}
          onEdit={() => handleEdit("contract")}
          canEdit={canEdit}
        />

        {/* 👥 المستأجر والمؤجر */}
        <div className="grid md:grid-cols-2 gap-6">
          <PartyCard
            icon={<User className="text-emerald-600" />}
            title={t("tenants")}
            items={contract.tenants}
            onEdit={() => handleEdit("tenants")}
            t={t}
            canEdit={canEdit}
          />
          <PartyCard
            icon={<User className="text-blue-600" />}
            title={t("lessors")}
            items={contract.lessors}
            onEdit={() => handleEdit("lessors")}
            t={t}
            canEdit={canEdit}
          />
        </div>

        {/* 💼 الوسيط */}
        <InfoCard
          icon={<Building2 className="text-indigo-600" />}
          title={t("brokerageInfo")}
          data={[
            { label: t("brokerageName"), value: contract.brokerage_entity?.name },
            { label: t("brokerageCR"), value: contract.brokerage_entity?.cr_no },
            { label: t("brokeragePhone"), value: contract.brokerage_entity?.phone },
            { label: t("brokerageAddress"), value: contract.brokerage_entity?.address },
          ]}
          onEdit={() => handleEdit("broker")}
          canEdit={canEdit}
        />

        {/* 🏢 العقار */}
        <InfoCard
          icon={<Building2 className="text-gray-600" />}
          title={t("propertyInfo")}
          data={[
            { label: t("propertyType"), value: contract.property?.type },
            { label: t("propertyUsage"), value: contract.property?.usage },
            { label: t("numUnits"), value: contract.property?.num_units },
            { label: t("nationalAddress"), value: contract.property?.national_address },
          ]}
          onEdit={() => handleEdit("property")}
          canEdit={canEdit}
        />

        {/* 🏘️ الوحدات */}
        <ItemsCard
          icon={<Building2 />}
          title={t("units")}
          items={contract.units}
          fields={["unit_no", "unit_type", "unit_area", "electric_meter_no", "water_meter_no"]}
          onEdit={() => handleEdit("units")}
          t={t}
          canEdit={canEdit}
        />

        {/* 💰 الدفعات */}
        <ItemsCard
          icon={<DollarSign />}
          title={t("payments")}
          items={contract.payments}
          fields={["due_date", "amount", "paid_amount", "remaining_amount", "status"]}
          onEdit={() => handleEdit("payments")}
          t={t}
          canEdit={canEdit}
        />

        {/* 🧾 المصروفات */}
        <ItemsCard
          icon={<Wrench />}
          title={t("expenses")}
          items={contract.expenses}
          fields={["date", "amount", "expense_type", "on_whom", "notes"]}
          onEdit={() => handleEdit("expenses")}
          t={t}
          canEdit={canEdit}
        />

        {/* 📜 السندات */}
        <ItemsCard
          icon={<Receipt />}
          title={t("receipts")}
          items={contract.receipts}
          fields={["date", "reference_no", "receipt_type", "amount", "payer", "receiver"]}
          onEdit={() => handleEdit("receipts")}
          t={t}
          canEdit={canEdit}
        />
      </div>

      {/* ✏️ Drawer للتعديل */}
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
    </DashboardLayout>
  );
}

/* 🧩 المكونات الفرعية */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "—";
  }
}

function SummaryCard({ icon, title, value, color }) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          {icon} {title}
        </div>
        <p className={`text-lg font-bold ${color || "text-gray-800"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoCard({ icon, title, data, onEdit, canEdit }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
          {icon} {title}
        </CardTitle>
        {canEdit && (
          <Button variant="outline" onClick={onEdit}>
            <Pencil size={14} className="mr-1" /> تعديل
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
        {data.map((item, i) => (
          <p key={i}>
            <b className="text-gray-700">{item.label}:</b>{" "}
            <span className="text-gray-800">{item.value || "—"}</span>
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function PartyCard({ icon, title, items, onEdit, t, canEdit }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon} {title}
        </CardTitle>
        {canEdit && (
          <Button variant="outline" onClick={onEdit}>
            <Pencil size={14} className="mr-1" /> {t("edit")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {items?.length ? (
          items.map((p, i) => (
            <div key={i} className="border-b pb-2">
              <p>
                <b>{t("name")}:</b> {p.name || "—"}
              </p>
              <p>
                <b>{t("id")}:</b> {p.id || "—"}
              </p>
              <p>
                <b>{t("phone")}:</b> {p.phone || "—"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-3">{t("noData")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ItemsCard({ icon, title, items, fields, onEdit, t, canEdit }) {
  const formatDateValue = (v) => formatDate(v);
  const formatAmount = (v) =>
    Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 }) + " SAR";

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon} {title}
        </CardTitle>
        {canEdit && (
          <Button variant="outline" onClick={onEdit}>
            <Pencil size={14} className="mr-1" /> {t("edit")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {items?.length ? (
          <table className="w-full text-sm border-t">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {fields.map((key) => (
                  <th key={key} className="p-2 text-start whitespace-nowrap">
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50 transition">
                  {fields.map((key) => (
                    <td key={key} className="p-2 whitespace-nowrap">
                      {key.includes("date")
                        ? formatDateValue(row[key])
                        : key.includes("amount")
                        ? formatAmount(row[key])
                        : row[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">{t("noData")}</p>
        )}
      </CardContent>
    </Card>
  );
}
