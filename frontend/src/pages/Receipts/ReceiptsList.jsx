import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, Receipt } from "lucide-react";
import AddReceiptDrawer from "@/components/receipts/AddReceiptDrawer";
import { API_URL, API_KEY } from "@/config";

export default function ReceiptsList() {
  const { t } = useTranslation();
  const [receipts, setReceipts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 📦 تحميل السندات
  async function fetchReceipts() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/receipts`, {
        headers: { "x-api-key": API_KEY },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.warn("❌ receipts: invalid JSON, falling back to empty array", text);
        data = {};
      }

      // ✅ تأكد أن البيانات مصفوفة
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : [];

      setReceipts(list);
      setFiltered(list);
    } catch (err) {
      console.error("❌ Error loading receipts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReceipts();
  }, []);

  // 🔍 البحث في السندات
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const results = receipts.filter(
      (r) =>
        r.receipt_no?.toLowerCase().includes(lower) ||
        r.reason?.toLowerCase().includes(lower) ||
        r.payer?.toLowerCase().includes(lower) ||
        r.receiver?.toLowerCase().includes(lower)
    );
    setFiltered(results);
  }, [searchTerm, receipts]);

  // 🎨 ألوان النوع
  const typeColor = (type) => {
    switch (type?.toLowerCase()) {
      case "قبض":
      case "receive":
      case "income":
        return "text-emerald-600 bg-emerald-50";
      case "صرف":
      case "payment":
      case "expense":
        return "text-red-600 bg-red-50";
      case "adjustment":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // 💰 تنسيق العملة
  const formatAmount = (num) =>
    Number(num || 0).toLocaleString("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
    });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 📌 العنوان + البحث */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt size={22} className="text-emerald-600" />
            {t("receipts")}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t("searchReceipt")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <Button
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setDrawerOpen(true)}
            >
              <PlusCircle size={16} />
              {t("addReceipt")}
            </Button>
          </div>
        </div>

        {/* 📋 جدول السندات */}
        <Card className="bg-card border border-border shadow-md">
          <CardHeader>
            <CardTitle>{t("receiptsList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500 text-center py-8">
                {t("loadingData")}...
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t("noReceiptsFound")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("receiptNo")}</th>
                      <th className="p-2 text-start">{t("receiptType")}</th>
                      <th className="p-2 text-start">{t("amount")}</th>
                      <th className="p-2 text-start">{t("date")}</th>
                      <th className="p-2 text-start">{t("payer")}</th>
                      <th className="p-2 text-start">{t("receiver")}</th>
                      <th className="p-2 text-start">{t("reason")}</th>
                      <th className="p-2 text-start">{t("linkedTo")}</th>
                      <th className="p-2 text-start">{t("notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="p-2">{r.receipt_no || "—"}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${typeColor(
                              r.receipt_type || r.type
                            )}`}
                          >
                            {r.receipt_type || r.type || t("unknown")}
                          </span>
                        </td>
                        <td className="p-2">{formatAmount(r.amount)}</td>
                        <td className="p-2">
                          {r.date ? r.date.split("T")[0] : "—"}
                        </td>
                        <td className="p-2">{r.payer || r.payer_name || "—"}</td>
                        <td className="p-2">
                          {r.receiver || r.receiver_name || "—"}
                        </td>
                        <td className="p-2">{r.reason || "—"}</td>
                        <td className="p-2">
                          {r.contract_id
                            ? `${t("contract")} #${r.contract_id}`
                            : r.unit_id
                            ? `${t("unit")} #${r.unit_id}`
                            : r.property_id
                            ? `${t("property")} #${r.property_id}`
                            : t("noLink")}
                        </td>
                        <td className="p-2">{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🧾 Drawer الإضافة */}
        <AddReceiptDrawer
          open={drawerOpen}
          setOpen={setDrawerOpen}
          refresh={fetchReceipts}
        />
      </div>
    </DashboardLayout>
  );
}
