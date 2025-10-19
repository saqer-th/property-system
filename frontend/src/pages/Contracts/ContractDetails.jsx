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
  ArrowLeft,
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";
import EditDrawer from "@/components/common/EditDrawer";

export default function ContractDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);

  // 📦 تحميل بيانات العقد
  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(`${API_URL}/contracts/${id}`, {
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token || ""}`,
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // إذا فيه data داخله
        if (json?.data) {
          setContract(json.data);
        } else {
          setContract(json);
        }
      } catch (err) {
        console.error("❌ Error loading contract:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [id, user]);

  const handleEdit = (section) => {
    setEditSection(section);
    setDrawerOpen(true);
  };

  // 💰 حساب الملخص المالي
  const rent = Number(contract?.annual_rent || 0);
  const paidPayments =
    contract?.payments?.reduce(
      (sum, p) =>
        sum + (p.status === "مدفوعة" || p.status === "paid"
          ? Number(p.amount)
          : 0),
      0
    ) || 0;

  const paidReceipts =
    contract?.receipts?.reduce(
      (sum, r) =>
        sum + (r.receipt_type === "قبض" || r.type === "income"
          ? Number(r.amount)
          : 0),
      0
    ) || 0;

  const expenses =
    contract?.expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

  const totalPaid = paidPayments + paidReceipts;
  const remaining = rent - totalPaid;
  const nextPayment =
    contract?.payments?.find((p) => p.status !== "مدفوعة")?.due_date || null;

  const status =
    remaining <= 0
      ? t("fullyPaid")
      : remaining > 0 && totalPaid > 0
      ? t("partiallyPaid")
      : t("unpaid");

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
      <div className="p-6 space-y-8">
        {/* 🧾 العنوان */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-emerald-700 flex items-center gap-2">
            <FileText className="text-emerald-600" /> {t("contractDetails")}
          </h1>
          <Button
            onClick={() => handleEdit("contract")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Pencil size={16} className="mr-1" /> {t("editContract")}
          </Button>
        </div>

        {/* 💰 ملخص مالي سريع */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<DollarSign className="text-emerald-600" />}
            title={t("annualRent")}
            value={`${rent.toLocaleString()} SAR`}
          />
          <SummaryCard
            icon={<TrendingUp className="text-blue-600" />}
            title={t("paidAmount")}
            value={`${totalPaid.toLocaleString()} SAR`}
          />
          <SummaryCard
            icon={<Wrench className="text-red-600" />}
            title={t("remainingAmount")}
            value={`${remaining.toLocaleString()} SAR`}
          />
          <SummaryCard
            icon={<Receipt className="text-gray-700" />}
            title={t("paymentStatus")}
            value={status}
            color={
              status === t("fullyPaid")
                ? "text-emerald-600"
                : status === t("partiallyPaid")
                ? "text-blue-600"
                : "text-red-600"
            }
          />
        </div>

        {/* 📑 بيانات العقد */}
        <InfoCard
          icon={<FileText className="text-emerald-600" />}
          title={t("contractInfo")}
          data={[
            { label: t("contractNo"), value: contract.contract_no },
            { label: t("titleDeed"), value: contract.title_deed_no },
            { label: t("startDate"), value: contract.start_date?.split("T")[0] },
            { label: t("endDate"), value: contract.end_date?.split("T")[0] },
            { label: t("annualRent"), value: `${rent.toLocaleString()} SAR` },
            {
              label: t("status"),
              value:
                contract.contract_status === "نشط"
                  ? "🟢 " + t("active")
                  : "🔴 " + t("expired"),
            },
          ]}
          onEdit={() => handleEdit("contract")}
        />

        {/* 👥 المستأجر والمؤجر */}
        <div className="grid md:grid-cols-2 gap-6">
          <PartyCard
            icon={<User className="text-emerald-600" />}
            title={t("tenants")}
            items={contract.tenants}
            onEdit={() => handleEdit("tenants")}
            t={t}
          />
          <PartyCard
            icon={<User className="text-blue-600" />}
            title={t("lessors")}
            items={contract.lessors}
            onEdit={() => handleEdit("lessors")}
            t={t}
          />
        </div>

        {/* 💼 الوسيط العقاري */}
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
        />

        {/* 🏢 العقار */}
        <InfoCard
          icon={<Building2 className="text-gray-600" />}
          title={t("propertyInfo")}
          data={[
            { label: t("propertyType"), value: contract.property?.property_type },
            { label: t("propertyUsage"), value: contract.property?.property_usage },
            { label: t("numUnits"), value: contract.property?.num_units },
            { label: t("nationalAddress"), value: contract.property?.national_address },
          ]}
          onEdit={() => handleEdit("property")}
        />

        {/* 🏘️ الوحدات */}
        <ItemsCard
          icon={<Building2 />}
          title={t("units")}
          items={contract.units}
          fields={["unit_no", "unit_type", "unit_area", "electric_meter_no", "water_meter_no"]}
          onEdit={() => handleEdit("units")}
          t={t}
        />

        {/* 💰 الدفعات */}
        <ItemsCard
          icon={<DollarSign />}
          title={t("payments")}
          items={contract.payments}
          fields={["amount", "due_date", "status"]}
          onEdit={() => handleEdit("payments")}
          t={t}
        />

        {/* 🧾 المصروفات */}
        <ItemsCard
          icon={<Wrench />}
          title={t("expenses")}
          items={contract.expenses}
          fields={["amount", "expense_type", "on_whom", "notes"]}
          onEdit={() => handleEdit("expenses")}
          t={t}
        />

        {/* 📜 السندات */}
        <ItemsCard
          icon={<Receipt />}
          title={t("receipts")}
          items={contract.receipts}
          fields={["receipt_no", "receipt_type", "amount", "payer", "receiver"]}
          onEdit={() => handleEdit("receipts")}
          t={t}
        />
      </div>

      {/* ✏️ نافذة التعديل */}
      <EditDrawer
        open={drawerOpen}
        setOpen={setDrawerOpen}
        section={editSection}
        contract={contract}
        setContract={setContract}
      />
    </DashboardLayout>
  );
}

/* 🎨 بطاقة ملخص سريع */
function SummaryCard({ icon, title, value, color }) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          {icon} {title}
        </div>
        <p className={`text-xl font-bold ${color || "text-gray-800"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* 🔹 صف بيانات */
function DataRow({ label, value }) {
  return (
    <p>
      <b className="text-gray-700">{label}:</b>{" "}
      <span className="text-gray-800">{value || "—"}</span>
    </p>
  );
}

/* 🔹 بطاقة معلومات */
function InfoCard({ icon, title, data, onEdit }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
          {icon} {title}
        </CardTitle>
        <Button variant="outline" onClick={onEdit}>
          <Pencil size={14} className="mr-1" /> تعديل
        </Button>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
        {data.map((item, i) => (
          <DataRow key={i} label={item.label} value={item.value} />
        ))}
      </CardContent>
    </Card>
  );
}

/* 🔹 بطاقة أطراف */
function PartyCard({ icon, title, items, onEdit, t }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon} {title}
        </CardTitle>
        <Button variant="outline" onClick={onEdit}>
          <Pencil size={14} className="mr-1" /> {t("edit")}
        </Button>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {items?.length ? (
          items.map((p, i) => (
            <div key={i} className="border-b pb-2">
              <DataRow label={t("name")} value={p.name} />
              <DataRow label={t("id")} value={p.id} />
              <DataRow label={t("phone")} value={p.phone} />
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-3">{t("noData")}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* 🔹 جدول عام */
function ItemsCard({ icon, title, items, fields, onEdit, t }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon} {title}
        </CardTitle>
        <Button variant="outline" onClick={onEdit}>
          <Pencil size={14} className="mr-1" /> {t("edit")}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {items?.length ? (
          <table className="w-full text-sm border-t">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {fields.map((key) => (
                  <th key={key} className="p-2 text-start">
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  {fields.map((key) => (
                    <td key={key} className="p-2">
                      {row[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            {t("noData")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
