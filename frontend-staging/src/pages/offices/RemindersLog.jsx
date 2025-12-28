import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Bell,
  RefreshCcw,
  Search,
  Send,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  FileText,
  Smartphone,
  Calendar,
  User
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
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

  // State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [contractSearch, setContractSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  
  // UI State
  const [preview, setPreview] = useState("");
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [logSearch, setLogSearch] = useState("");
  
  // Loading States
  const [loadingData, setLoadingData] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // 🚀 Initial Fetch
  async function refreshAll() {
    setLoadingData(true);
    await Promise.all([fetchTemplates(), fetchContracts(), fetchLogs()]);
    setLoadingData(false);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  // --- Fetchers ---
  async function fetchTemplates() {
    try {
      const res = await fetch(`${API_URL}/reminders/templates`, {
        headers: { Authorization: `Bearer ${user.token}`, "x-api-key": API_KEY, "x-active-role": user.activeRole },
      });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch { toast.error("فشل تحميل القوالب"); }
  }

  async function fetchContracts() {
    try {
      const res = await fetch(`${API_URL}/contracts/my`, {
        headers: { Authorization: `Bearer ${user.token}`, "x-api-key": API_KEY, "x-active-role": user.activeRole },
      });
      const data = await res.json();
      setContracts(data.data || []);
      setFilteredContracts(data.data || []);
    } catch { toast.error("فشل تحميل العقود"); }
  }

  async function fetchLogs() {
    try {
      const res = await fetch(`${API_URL}/reminders/logs`, {
        headers: { Authorization: `Bearer ${user.token}`, "x-api-key": API_KEY, "x-active-role": user.activeRole },
      });
      const data = await res.json();
      setLogs(data.data || []);
      setFilteredLogs(data.data || []);
    } catch { toast.error("فشل تحميل السجل"); }
  }

  // --- Search Logic ---
  useEffect(() => {
    if (!contractSearch.trim()) setFilteredContracts(contracts);
    else {
      const q = contractSearch.toLowerCase();
      setFilteredContracts(contracts.filter(c => 
        c.contract_no?.toLowerCase().includes(q) || 
        c.tenant_name?.toLowerCase().includes(q) || 
        c.property_name?.toLowerCase().includes(q)
      ));
    }
  }, [contractSearch, contracts]);

  useEffect(() => {
    if (!logSearch.trim()) setFilteredLogs(logs);
    else {
      const q = logSearch.toLowerCase();
      setFilteredLogs(logs.filter(l => 
        l.target_phone?.includes(q) || 
        l.reminder_name?.toLowerCase().includes(q) ||
        l.message_sent?.toLowerCase().includes(q)
      ));
    }
  }, [logSearch, logs]);

  // --- Actions ---
  async function handlePreview() {
    if (!selectedTemplate || !selectedContract) return toast.error("يرجى اختيار القالب والعقد");
    
    setGeneratingPreview(true);
    try {
      const res = await fetch(`${API_URL}/reminders/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}`, "x-api-key": API_KEY, "x-active-role": user.activeRole },
        body: JSON.stringify({ template_id: selectedTemplate, contract_id: selectedContract.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      let clean = data.preview || "";
      clean = clean.replace(/\\n/g, "\n").replace(/^"|"$/g, "").replace(/\\"/g, '"');
      setPreview(clean);
    } catch { toast.error("فشل المعاينة"); }
    setGeneratingPreview(false);
  }

  async function handleSend() {
    if (!selectedTemplate || !selectedContract) return toast.error("يرجى اختيار القالب والعقد");
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/reminders/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}`, "x-api-key": API_KEY, "x-active-role": user.activeRole },
        body: JSON.stringify({ template_id: selectedTemplate, contract_id: selectedContract.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      toast.success("تم إرسال التذكير بنجاح");
      setPreview("");
      setSelectedContract(null);
      setContractSearch("");
      fetchLogs();
    } catch { toast.error("فشل الإرسال"); }
    setSending(false);
  }

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen" dir="rtl">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="text-emerald-600" /> مركز التذكيرات
            </h1>
            <p className="text-gray-500 text-sm mt-1">إرسال تذكيرات يدوية للمستأجرين ومراجعة السجل.</p>
          </div>
          <Button variant="outline" onClick={refreshAll} disabled={loadingData}>
            {loadingData ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16} />}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 🟢 Left: Composer (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-0 shadow-sm bg-white h-full">
              <CardHeader className="bg-gray-50/50 border-b pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Send size={18} className="text-blue-600"/> إنشاء رسالة جديدة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Step 1: Template */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">1. اختر القالب</label>
                  <select 
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={selectedTemplate}
                    onChange={(e) => { setSelectedTemplate(e.target.value); setPreview(""); }}
                  >
                    <option value="">-- اختر قالب الرسالة --</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {/* Step 2: Contract Search */}
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-gray-700">2. اختر العقد (المستلم)</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-3 text-gray-400" size={16} />
                    <Input 
                      placeholder="ابحث برقم العقد أو اسم المستأجر..." 
                      className="pr-10"
                      value={contractSearch}
                      onChange={(e) => { setContractSearch(e.target.value); setSelectedContract(null); setPreview(""); }}
                    />
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {contractSearch && !selectedContract && filteredContracts.length > 0 && (
                    <div className="absolute w-full bg-white border shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto z-20">
                      {filteredContracts.map(c => (
                        <div 
                          key={c.id} 
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors"
                          onClick={() => { setSelectedContract(c); setContractSearch(`${c.tenant_name} - #${c.contract_no}`); }}
                        >
                          <p className="font-medium text-gray-900 text-sm">{c.tenant_name}</p>
                          <p className="text-xs text-gray-500">عقد #{c.contract_no} • {c.property_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 3: Preview Box */}
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">3. معاينة الرسالة</label>
                      {!preview && selectedContract && selectedTemplate && (
                        <Button size="sm" variant="ghost" onClick={handlePreview} disabled={generatingPreview} className="text-blue-600 h-auto p-0 hover:bg-transparent">
                           {generatingPreview ? <Loader2 className="animate-spin ml-1" size={12}/> : <Eye size={14} className="ml-1"/>} 
                           توليد المعاينة
                        </Button>
                      )}
                   </div>
                   
                   <div className={`min-h-[120px] p-4 rounded-xl border text-sm leading-relaxed transition-all ${preview ? "bg-blue-50 border-blue-100 text-gray-800" : "bg-gray-50 border-dashed border-gray-200 text-gray-400 flex items-center justify-center"}`}>
                      {preview ? preview : "ستظهر معاينة الرسالة هنا بعد اختيار القالب والعقد..."}
                   </div>
                </div>

                <Button onClick={handleSend} disabled={sending || !preview} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-md shadow-lg shadow-emerald-100 transition-all">
                   {sending ? <Loader2 className="animate-spin ml-2"/> : <Send className="ml-2" size={18} />}
                   إرسال التذكير الآن
                </Button>

              </CardContent>
            </Card>
          </div>

          {/* 🟠 Right: Logs (7 Columns) */}
          <div className="lg:col-span-7">
            <Card className="border-0 shadow-sm bg-white h-full flex flex-col">
              <CardHeader className="bg-gray-50/50 border-b pb-4">
                <div className="flex justify-between items-center">
                   <CardTitle className="text-base font-semibold flex items-center gap-2">
                     <MessageSquare size={18} className="text-purple-600"/> سجل الرسائل المرسلة
                   </CardTitle>
                   <div className="relative w-48 sm:w-64">
                      <Search className="absolute right-3 top-2.5 text-gray-400" size={14} />
                      <Input 
                        placeholder="بحث في السجل..." 
                        className="pr-9 h-9 text-sm bg-white"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                      />
                   </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[600px]">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                       <MessageSquare size={40} className="mb-2 opacity-20" />
                       <p>لا توجد سجلات مطابقة</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="p-4 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                          onClick={() => { setSelectedLog(log); setOpenModal(true); }}
                        >
                          <div className="flex justify-between items-start mb-1">
                             <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-white font-normal text-gray-600 border-gray-200">
                                   {log.reminder_name}
                                </Badge>
                                <span className="text-xs text-gray-400 flex items-center dir-ltr">
                                   <Smartphone size={10} className="mr-1"/> {log.target_phone}
                                </span>
                             </div>
                             <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString("en-GB")}</span>
                          </div>
                          
                          <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed mb-2 group-hover:text-gray-900">
                             {log.message_sent}
                          </p>

                          <div className="flex justify-between items-center">
                             {log.status === "sent" ? (
                                <span className="text-xs flex items-center text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                   <CheckCircle2 size={10} className="ml-1"/> تم الإرسال
                                </span>
                             ) : (
                                <span className="text-xs flex items-center text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                                   <XCircle size={10} className="ml-1"/> فشل
                                </span>
                             )}
                             <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-400 hover:text-blue-600 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                عرض التفاصيل <Eye size={12} className="mr-1"/>
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* 🔎 Message Details Modal */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-800">
                 <FileText size={18} className="text-blue-600" /> تفاصيل الرسالة
              </DialogTitle>
              <DialogDescription>
                 نسخة من الرسالة التي تم إرسالها للنظام.
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
               <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     <div className="space-y-1">
                        <label className="text-xs text-gray-500">المستلم</label>
                        <div className="font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded border w-fit">{selectedLog.target_phone}</div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-500">التاريخ</label>
                        <div className="text-gray-800">{new Date(selectedLog.created_at).toLocaleDateString("en-GB")}</div>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-xs text-gray-500">نوع القالب</label>
                     <div className="font-medium text-gray-800">{selectedLog.reminder_name}</div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-xs text-gray-500">نص الرسالة</label>
                     <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-sm text-gray-700 leading-7 whitespace-pre-line">
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