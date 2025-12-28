import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  BarChart3, 
  Building2, 
  FileText, 
  Users, 
  Download, 
  TrendingUp,
  Briefcase
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from "recharts";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

// --- Sub-Components ---

const StatCard = ({ title, value, icon, colorClass, bgClass, trend }) => (
  <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <CardContent className="p-6 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
        {trend && (
          <p className="text-xs text-emerald-600 flex items-center mt-2 font-medium">
            <TrendingUp size={12} className="mr-1" /> {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
        {icon}
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs p-2 rounded shadow-lg border border-gray-800">
        <p className="font-bold mb-1">{label}</p>
        <p>{`العدد: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function ReportsTab() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/reports`, {
        headers: { 
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });
      const data = await res.json();
      setStats(data.stats);
      setChartData(data.chart || []);
    } catch (err) {
      toast.error("فشل في تحميل التقارير");
    } finally {
      setLoading(false);
    }
  }

  // 🎨 Color mapping for chart statuses
  const getBarColor = (status) => {
    const map = {
      active: "#10B981", // Emerald
      approved: "#10B981",
      expired: "#EF4444", // Red
      rejected: "#EF4444",
      pending: "#F59E0B", // Amber
      suspended: "#6B7280", // Gray
    };
    return map[status?.toLowerCase()] || "#3B82F6"; // Default Blue
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400 gap-2">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p>جاري تحليل البيانات...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <BarChart3 size={48} className="mb-4 opacity-20" />
        <p>لا توجد بيانات لعرضها حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* 🟢 Header Actions */}
      <div className="flex justify-end">
        <Button variant="outline" className="text-gray-600" onClick={() => toast.success("جاري تحميل التقرير PDF...")}>
          <Download size={16} className="mr-2" /> تصدير التقرير
        </Button>
      </div>

      {/* 📊 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="إجمالي العقود" 
          value={stats.contracts} 
          icon={<FileText size={22} />} 
          colorClass="text-blue-600" 
          bgClass="bg-blue-50"
          trend="+4.5% هذا الشهر"
        />
        <StatCard 
          title="المكاتب المسجلة" 
          value={stats.offices} 
          icon={<Briefcase size={22} />} 
          colorClass="text-purple-600" 
          bgClass="bg-purple-50"
        />
        <StatCard 
          title="الملاك" 
          value={stats.owners} 
          icon={<Building2 size={22} />} 
          colorClass="text-emerald-600" 
          bgClass="bg-emerald-50"
        />
        <StatCard 
          title="المستأجرين" 
          value={stats.tenants} 
          icon={<Users size={22} />} 
          colorClass="text-amber-600" 
          bgClass="bg-amber-50"
        />
      </div>

      {/* 📈 Chart Section */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-gray-500" size={20}/> تحليل حالة العقود
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {chartData.length > 0 ? (
            <div className="h-[350px] w-full">
              
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="status" 
                    tick={{ fill: '#6B7280', fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280', fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">
              لا توجد بيانات كافية للرسم البياني
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}