import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Search,
  RefreshCcw,
  Wrench,
  CheckCircle2,
  Clock3,
  XCircle,
  Hammer,
} from "lucide-react";
import { API_URL, API_KEY } from "@/config";

// ===============================
// 🧰 Maintenance Dashboard Page
// ===============================
export default function MaintenanceList() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ===============================
  // 🔹 Fetch Maintenance Data
  // ===============================
  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/maintenance`, {
        headers: { "x-api-key": API_KEY },
      });
      const data = await res.json();
      setRequests(data || []);
      setFiltered(data || []);
    } catch (err) {
      console.error("❌ Error loading maintenance requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  // ===============================
  // 🔍 Search + Filter
  // ===============================
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const results = requests.filter((r) => {
      const matchSearch = [r.unit_name, r.type, r.tenant_name, r.assigned_to]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(lower));

      const matchStatus =
        statusFilter === "all" || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
    setFiltered(results);
  }, [searchTerm, statusFilter, requests]);

  // ===============================
  // 🎨 Status Styles & Icons
  // ===============================
  const STATUS_MAP = {
    completed: {
      label: t("completed"),
      color: "text-emerald-600 bg-emerald-50",
      icon: <CheckCircle2 size={14} />,
    },
    in_progress: {
      label: t("inProgress"),
      color: "text-blue-600 bg-blue-50",
      icon: <Clock3 size={14} />,
    },
    pending: {
      label: t("pending"),
      color: "text-yellow-600 bg-yellow-50",
      icon: <Hammer size={14} />,
    },
    rejected: {
      label: t("rejected"),
      color: "text-red-600 bg-red-50",
      icon: <XCircle size={14} />,
    },
  };

  // ===============================
  // 📊 Chart Data (by status)
  // ===============================
  const grouped = {};
  requests.forEach((r) => {
    const key = r.status || t("unknown");
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const chartData = Object.entries(grouped).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

  // ===============================
  // 🌀 Loading State
  // ===============================
  if (loading)
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 mt-10">{t("loadingData")}</p>
      </DashboardLayout>
    );

  // ===============================
  // 🧭 UI Layout
  // ===============================
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 🔍 Header + Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench size={22} className="text-emerald-600" />
            {t("menu_maintenance")}
          </h1>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t("searchMaintenance")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("allStatuses")}</option>
              <option value="pending">{t("pending")}</option>
              <option value="in_progress">{t("inProgress")}</option>
              <option value="completed">{t("completed")}</option>
              <option value="rejected">{t("rejected")}</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchMaintenance}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg"
            >
              <RefreshCcw size={16} className="animate-spin-slow" />
              {t("refresh")}
            </button>
          </div>
        </div>

        {/* 📈 Chart Summary */}
        <Card className="bg-card shadow-md rounded-2xl border border-border">
          <CardHeader>
            <CardTitle>{t("maintenanceSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noMaintenanceData")}</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📋 Maintenance Table */}
        <Card className="bg-card shadow-md rounded-2xl border border-border">
          <CardHeader>
            <CardTitle>{t("maintenanceList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("noMaintenanceFound")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-start">{t("unitName")}</th>
                      <th className="p-2 text-start">{t("type")}</th>
                      <th className="p-2 text-start">{t("tenantName")}</th>
                      <th className="p-2 text-start">{t("assignedTo")}</th>
                      <th className="p-2 text-start">{t("date")}</th>
                      <th className="p-2 text-start">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => {
                      const s = STATUS_MAP[r.status] || {
                        label: t("unknown"),
                        color: "text-gray-500 bg-gray-100",
                        icon: null,
                      };
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50 transition">
                          <td className="p-2">{r.unit_name || "—"}</td>
                          <td className="p-2">{r.type || "—"}</td>
                          <td className="p-2">{r.tenant_name || "—"}</td>
                          <td className="p-2">{r.assigned_to || "—"}</td>
                          <td className="p-2">
                            {r.date ? r.date.split("T")[0] : "—"}
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.color}`}
                            >
                              {s.icon}
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
