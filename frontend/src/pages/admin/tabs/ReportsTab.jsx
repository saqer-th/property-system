import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3, Building2, FileText, Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";
export default function ReportsTab() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
const activeRole = user.activeRole; // من السياق أو الحالة
  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/reports`, {
        headers: { "x-api-key": API_KEY,
            Authorization: `Bearer ${user?.token}`,
            "x-active-role": activeRole,

         },
      });
      const data = await res.json();
      setStats(data.stats);
      setChartData(data.chart);
    } catch (err) {
      toast.error("❌ فشل في تحميل التقارير");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> جاري التحميل...
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center py-6 text-gray-500">لا توجد بيانات</p>;
  }

  return (
    <div className="grid gap-6">
      {/* 🎯 البطاقات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-800 flex items-center gap-2 text-sm font-semibold">
              <FileText size={18} /> العقود
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-900">{stats.contracts}</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-800 flex items-center gap-2 text-sm font-semibold">
              <Building2 size={18} /> الملاك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-900">{stats.owners}</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-800 flex items-center gap-2 text-sm font-semibold">
              <Users size={18} /> المستأجرين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-900">{stats.tenants}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-800 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 size={18} /> المكاتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-900">{stats.offices}</p>
          </CardContent>
        </Card>
      </div>

      {/* 📊 الرسم البياني */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>📈 العقود حسب الحالة</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-10 text-gray-500">
              لا توجد بيانات للرسم البياني
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
