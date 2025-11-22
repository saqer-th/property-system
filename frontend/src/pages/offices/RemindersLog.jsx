import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Bell,
  RefreshCcw,
  Search,
  Send,
  Eye,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

// Modal
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function RemindersPage() {
  const { user } = useAuth();

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Search contracts
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [contractSearch, setContractSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);

  // Preview
  const [preview, setPreview] = useState("");
  const [previewData, setPreviewData] = useState(null);

  // Logs
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [logSearch, setLogSearch] = useState("");

  // Loading
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sending, setSending] = useState(false);

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  /* =============================
     Fetch Templates
  ============================== */
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
      setTemplates(data.templates || []);
    } catch {
      toast.error("فشل تحميل القوالب");
    }
    setLoadingTemplates(false);
  }

  /* =============================
     Fetch Contracts
  ============================== */
  async function fetchContracts() {
    setLoadingContracts(true);
    try {
      const res = await fetch(`${API_URL}/contracts/my`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "x-active-role": user.activeRole,
        },
      });

      const data = await res.json();
      setContracts(data.data || []);
      setFilteredContracts(data.data || []);
    } catch {
      toast.error("فشل تحميل العقود");
    }
    setLoadingContracts(false);
  }

  /* =============================
     Fetch Logs
  ============================== */
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
      setLogs(data.data || []);
      setFilteredLogs(data.data || []);
    } catch {
      toast.error("فشل تحميل السجل");
    }
    setLoadingLogs(false);
  }

  /* =============================
     Init
  ============================== */
  useEffect(() => {
    fetchTemplates();
    fetchContracts();
    fetchLogs();
  }, []);

  /* =============================
     Search contracts
  ============================== */
  useEffect(() => {
    if (!contractSearch.trim()) {
      setFilteredContracts(contracts);
    } else {
      const q = contractSearch.toLowerCase();
      setFilteredContracts(
        contracts.filter(
          (c) =>
            c.contract_no?.toLowerCase().includes(q) ||
            c.tenant_name?.toLowerCase().includes(q) ||
            c.property_name?.toLowerCase().includes(q)
        )
      );
    }
  }, [contractSearch, contracts]);

  /* =============================
     Search logs
  ============================== */
  useEffect(() => {
    if (!logSearch.trim()) {
      setFilteredLogs(logs);
    } else {
      const q = logSearch.toLowerCase();
      setFilteredLogs(
        logs.filter(
          (l) =>
            l.target_phone?.includes(q) ||
            l.reminder_name?.toLowerCase().includes(q) ||
            l.message_sent?.toLowerCase().includes(q)
        )
      );
    }
  }, [logSearch, logs]);

  /* =============================
     Preview
  ============================== */
  async function handlePreview() {
    if (!selectedTemplate || !selectedContract)
      return toast.error("يرجى اختيار القالب والعقد");

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
          contract_id: selectedContract.id,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // FIX MESSAGE — remove escaped characters
      let clean = data.preview || "";

      // يحول \n إلى سطر جديد
      clean = clean.replace(/\\n/g, "\n");

      // يحذف علامات التنصيص الزائدة
      clean = clean.replace(/^"|"$/g, "");

      // يحول \" إلى "
      clean = clean.replace(/\\"/g, '"');

      setPreview(clean);
      setPreviewData(data.contract);
      toast.success("تم إنشاء المعاينة");
    } catch {
      toast.error("فشل إنشاء المعاينة");
    }
  }

  /* =============================
     Send reminder
  ============================== */
  async function handleSend() {
    if (!selectedTemplate || !selectedContract)
      return toast.error("يرجى اختيار القالب والعقد");

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
          contract_id: selectedContract.id,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success("تم إرسال التذكير");
      setPreview("");
      setPreviewData(null);
      setSelectedContract(null);
      setContractSearch("");

      fetchLogs();
    } catch {
      toast.error("فشل إرسال التذكير");
    }

    setSending(false);
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            التذكيرات والإشعارات
          </h1>

          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            onClick={() => {
              fetchTemplates();
              fetchContracts();
              fetchLogs();
            }}
          >
            <RefreshCcw size={16} />
            تحديث البيانات
          </Button>
        </div>

        {/* CREATE REMINDER */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-emerald-700">
              إنشاء وإرسال تذكير
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* TEMPLATE SELECT */}
              <div>
                <label className="text-sm text-gray-600">القالب</label>
                <select
                  className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-emerald-400"
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

              {/* CONTRACT SEARCH */}
              <div className="relative">
                <label className="text-sm text-gray-600">العقد</label>

                <Input
                  placeholder="اكتب للبحث… مثال: رقم العقد أو اسم المستأجر"
                  value={contractSearch}
                  onChange={(e) => {
                    setContractSearch(e.target.value);
                    setSelectedContract(null);
                  }}
                  className="focus:ring-2 focus:ring-emerald-400"
                />

                {contractSearch && filteredContracts.length > 0 && (
                  <div className="absolute bg-white border shadow-lg rounded-md w-full mt-1 max-h-60 overflow-y-auto z-20">
                    {filteredContracts.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedContract(c);
                          setContractSearch(`#${c.contract_no} — ${c.tenant_name}`);
                        }}
                        className="p-2 text-sm cursor-pointer hover:bg-emerald-50"
                      >
                        عقد #{c.contract_no} — {c.tenant_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BUTTONS */}
              <div className="flex gap-2 items-end">
                <Button
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  onClick={handlePreview}
                >
                  <Eye size={16} className="mr-1" /> معاينة
                </Button>

                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={16} className="mr-1" />
                  )}
                  إرسال
                </Button>
              </div>
            </div>

            {/* PREVIEW BLOCK */}
            {preview && (
              <Card className="p-4 bg-emerald-50 border rounded-lg">
                <CardTitle className="text-emerald-700 mb-2 flex items-center gap-2">
                  <MessageSquare size={18} />
                  معاينة الرسالة
                </CardTitle>

                <p className="whitespace-pre-line text-gray-800 text-md leading-7">
                  {preview}
                </p>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* LOGS */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between">
              <CardTitle className="text-emerald-700">
                سجل الإشعارات ({filteredLogs.length})
              </CardTitle>

              <div className="relative mt-2 md:mt-0">
                <Search className="absolute right-3 top-3 text-gray-400" size={16} />
                <Input
                  placeholder="بحث..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pr-10 max-w-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loadingLogs ? (
              <div className="text-center py-10">
                <Loader2 className="animate-spin mx-auto text-gray-600" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">لا توجد إشعارات</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 sticky top-0">
                    <tr>
                      <th className="p-3 text-start">القالب</th>
                      <th className="p-3 text-start">رقم الجوال</th>
                      <th className="p-3 text-start w-1/2">الرسالة</th>
                      <th className="p-3 text-start">التاريخ</th>
                      <th className="p-3 text-start">الحالة</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b hover:bg-emerald-50 cursor-pointer"
                        onClick={() => {
                          setSelectedLog(log);
                          setOpenModal(true);
                        }}
                      >
                        <td className="p-3">{log.reminder_name}</td>
                        <td className="p-3">{log.target_phone}</td>
                        <td className="p-3 truncate max-w-sm">
                          {log.message_sent}
                        </td>
                        <td className="p-3 text-gray-600">
                          {new Date(log.created_at).toLocaleString("en-GB")}
                        </td>
                        <td className="p-3">
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

        {/* MODAL — Message Details */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-emerald-700 text-lg">
                تفاصيل الرسالة
              </DialogTitle>
              <DialogDescription>
                عرض كامل لمحتوى الرسالة كما تم إرسالها
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-3 text-sm">
                <p>
                  <strong>القالب:</strong> {selectedLog.reminder_name}
                </p>
                <p>
                  <strong>رقم الجوال:</strong> {selectedLog.target_phone}
                </p>
                <p>
                  <strong>التاريخ:</strong>{" "}
                  {new Date(selectedLog.created_at).toLocaleString("en-GB")}
                </p>

                <p>
                  <strong>الحالة:</strong>{" "}
                  {selectedLog.status === "sent" ? (
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs">
                      تم الإرسال
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs">
                      فشل
                    </span>
                  )}
                </p>

                <div>
                  <strong>نص الرسالة:</strong>
                  <div className="bg-gray-100 p-3 rounded-md whitespace-pre-line mt-1 leading-7">
                    {selectedLog.message_sent}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
