import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, RefreshCcw, Search, Send, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function RemindersPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [contractId, setContractId] = useState("");
  const [preview, setPreview] = useState("");
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // 🧩 جلب القوالب
  async function fetchTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${API_URL}/reminders/templates`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTemplates(data.data || []);
    } catch (err) {
      console.error("❌ fetch templates error:", err);
      toast.error("فشل تحميل القوالب");
    } finally {
      setLoadingTemplates(false);
    }
  }

  // 🧾 جلب سجل التذكيرات
  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${API_URL}/reminders/logs`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setLogs(data.data || []);
      setFiltered(data.data || []);
    } catch (err) {
      console.error("❌ fetch logs error:", err);
      toast.error("فشل تحميل السجل");
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, [user]);

  // 🔍 البحث داخل السجل
  useEffect(() => {
    if (!search.trim()) return setFiltered(logs);
    const lower = search.toLowerCase();
    setFiltered(
      logs.filter(
        (l) =>
          l.target_phone?.includes(lower) ||
          l.reminder_name?.toLowerCase().includes(lower) ||
          l.message_sent?.toLowerCase().includes(lower)
      )
    );
  }, [search, logs]);

  // 👁️ معاينة القالب باستخدام بيانات العقد
  async function handlePreview() {
    if (!selectedTemplate || !contractId)
      return toast.error("⚠️ يرجى اختيار القالب وكتابة رقم العقد أولاً");

    try {
      const res = await fetch(`${API_URL}/reminders/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          contract_id: contractId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPreview(data.preview);
      setPreviewData(data.contract);
      toast.success("✅ تمت المعاينة بنجاح");
    } catch (err) {
      console.error("❌ preview error:", err);
      toast.error("فشل إنشاء المعاينة");
    }
  }

  // 📤 إرسال التذكير
  async function handleSend() {
    if (!selectedTemplate || !contractId)
      return toast.error("⚠️ يرجى اختيار القالب وكتابة رقم العقد أولاً");

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/reminders/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-api-key": API_KEY,
          "x-active-role": user.activeRole,
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          contract_id: contractId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("✅ تم إرسال التذكير بنجاح");
      setPreview("");
      setPreviewData(null);
      setContractId("");
      setSelectedTemplate("");
      fetchLogs();
    } catch (err) {
      console.error("❌ send error:", err);
      toast.error("فشل إرسال التذكير");
    } finally {
      setSending(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* ====== رأس الصفحة ====== */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <Bell className="w-6 h-6" /> التذكيرات والإشعارات
          </h1>
          <Button
            onClick={() => {
              fetchTemplates();
              fetchLogs();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <RefreshCcw size={16} /> تحديث البيانات
          </Button>
        </div>

        {/* ====== إنشاء التذكير ====== */}
        <Card className="shadow border rounded-xl">
          <CardHeader>
            <CardTitle className="text-emerald-700 text-lg font-semibold">
              إنشاء وإرسال تذكير
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {loadingTemplates ? (
              <div className="flex justify-center py-8 text-gray-500">
                <Loader2 className="animate-spin mr-2" /> جاري تحميل القوالب...
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">القالب</label>
                  <select
                    className="border rounded-md w-full p-2 text-sm"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    <option value="">— اختر القالب —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">رقم العقد</label>
                  <Input
                    placeholder="أدخل رقم العقد"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 md:col-span-1">
                  <Button
                    onClick={handlePreview}
                    className="bg-gray-500 hover:bg-gray-600 text-white w-full sm:w-auto flex-1 flex gap-2 justify-center"
                  >
                    <Eye size={16} /> معاينة
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto flex-1 flex gap-2 justify-center"
                  >
                    {sending ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                    إرسال
                  </Button>
                </div>
              </div>
            )}

            {preview && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg text-gray-700 whitespace-pre-line mt-4">
                <p className="font-semibold mb-1 text-emerald-700">
                  📄 المعاينة:
                </p>

                {/* عرض بيانات العقد */}
                {previewData && (
                  <div className="mb-3 text-sm text-gray-600 border-b pb-2">
                    <p>
                      <strong>المستأجر:</strong> {previewData.tenant_name}{" "}
                      <span className="text-gray-500">
                        ({previewData.tenant_phone})
                      </span>
                    </p>
                    <p>
                      <strong>العقار:</strong> {previewData.property_name}
                    </p>
                    <p>
                      <strong>الفترة:</strong>{" "}
                      {new Date(previewData.start_date).toLocaleDateString("ar-SA")}{" "}
                      -{" "}
                      {new Date(previewData.end_date).toLocaleDateString("ar-SA")}
                    </p>
                    <p>
                      <strong>المبلغ:</strong>{" "}
                      {Number(previewData.amount).toLocaleString()} ريال
                    </p>
                  </div>
                )}

                <p>{preview}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ====== سجل الإشعارات ====== */}
        <Card className="shadow border rounded-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <CardTitle className="text-emerald-700 text-lg font-semibold">
                سجل الإشعارات ({filtered.length})
              </CardTitle>
              <div className="flex gap-2 items-center">
                <Search size={16} className="text-gray-400" />
                <Input
                  placeholder="بحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Loader2 className="animate-spin mb-2" />
                جاري تحميل السجل...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                لا توجد رسائل أو تذكيرات حالياً
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50 border-b text-gray-600">
                    <tr>
                      <th className="p-2 text-start">القالب</th>
                      <th className="p-2 text-start">رقم الجوال</th>
                      <th className="p-2 text-start">الرسالة</th>
                      <th className="p-2 text-start">التاريخ</th>
                      <th className="p-2 text-start">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b hover:bg-emerald-50 transition-all"
                      >
                        <td className="p-2">{log.reminder_name}</td>
                        <td className="p-2 text-gray-700 font-medium">
                          {log.target_phone}
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-xs">
                          {log.message_sent}
                        </td>
                        <td className="p-2 text-gray-500">
                          {new Date(log.created_at).toLocaleString("ar-SA")}
                        </td>
                        <td className="p-2">
                          {log.status === "sent" ? (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs">
                              تم الإرسال
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs">
                              فشل
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
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
