import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/config";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart2,
  Home,
  Building2,
  FileText,
  Loader2,
  PieChart,
  Coins
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PortfolioSummaryReport() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);

  /* ================================
     LOAD PORTFOLIO PREVIEW
  ================================= */
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/reports/summary/portfolio?auth=${user.token}&lang=${i18n.language}`
        );
        const data = await res.json();
        setPortfolio(data);
      } catch (err) {
        console.error("Error loading portfolio:", err);
      }
      setLoading(false);
    }
    loadSummary();
  }, []);

  /* ================================
     PDF EXPORT
  ================================= */
  const generatePDF = () => {
    const url = `${API_URL}/reports?type=portfolio&auth=${user.token}&lang=${i18n.language}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-emerald-700 flex gap-3 items-center">
            <BarChart2 size={30} /> {t("portfolioSummary")}
          </h1>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 size={40} className="animate-spin text-emerald-700 mx-auto" />
            <p className="mt-3 text-gray-500">{t("loading")}</p>
          </div>
        )}

        {/* PREVIEW */}
        {!loading && portfolio && (
          <div className="space-y-8">

            {/* OVERVIEW BLOCK */}
            <Card className="p-6 rounded-2xl shadow bg-gradient-to-br from-emerald-50 to-white">
              <h2 className="text-xl font-semibold text-gray-700 mb-5">
                {t("overallPortfolio")}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">

                <InfoBox
                  color="orange"
                  value={portfolio.totalProperties}
                  label={t("totalProperties")}
                  icon={<Home size={22} />}
                />

                <InfoBox
                  color="blue"
                  value={portfolio.totalUnits}
                  label={t("totalUnits")}
                  icon={<Building2 size={22} />}
                />

                <InfoBox
                  color="purple"
                  value={portfolio.totalContracts}
                  label={t("totalContracts")}
                  icon={<FileText size={22} />}
                />

                <InfoBox
                  color="green"
                  value={portfolio.activeContracts}
                  label={t("activeContracts")}
                  icon={<FileText size={22} />}
                />

                <InfoBox
                  color="red"
                  value={portfolio.expiredContracts}
                  label={t("expiredContracts")}
                  icon={<FileText size={22} />}
                />
              </div>
            </Card>

            {/* FINANCIAL SUMMARY */}
            <Card className="p-6 rounded-2xl shadow bg-gradient-to-br from-gray-50 to-white">
              <h2 className="text-xl font-semibold text-gray-700 mb-5">
                {t("financialSummary")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                <InfoBox
                  color="green"
                  value={Number(portfolio.totalValue).toLocaleString()}
                  label={t("totalContractValue")}
                  icon={<Coins size={22} />}
                />

                <InfoBox
                  color="blue"
                  value={Number(portfolio.totalPaid).toLocaleString()}
                  label={t("totalPaid")}
                  icon={<Coins size={22} />}
                />

                <InfoBox
                  color="red"
                  value={Number(portfolio.totalExpenses).toLocaleString()}
                  label={t("totalExpenses")}
                  icon={<Coins size={22} />}
                />

                <InfoBox
                  color="yellow"
                  value={Number(portfolio.remaining).toLocaleString()}
                  label={t("remainingBalance")}
                  icon={<Coins size={22} />}
                />
              </div>
            </Card>


          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

/* ======================================
     BEAUTIFUL STATISTIC BOX COMPONENT
====================================== */
function InfoBox({ color, value, label, icon }) {
  const colorMap = {
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  };

  return (
    <div className={`p-5 rounded-xl border shadow-sm text-center ${colorMap[color]}`}>
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-600 text-sm">{label}</div>
    </div>
  );
}
