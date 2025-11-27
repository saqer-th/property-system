import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Loader2, Save, RefreshCw, Search, 
  Eye, Edit3, Trash2, Shield, Lock, CheckCircle2 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function RolesTab() {
  const { user } = useAuth();
  const activeRole = user?.activeRole;
  const canManage = activeRole === "admin";

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 1. Fetch Data
  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/roles`, {
        headers: { "x-api-key": API_KEY, Authorization: `Bearer ${user?.token}`, "x-active-role": activeRole },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setHasChanges(false); // Reset change tracker
    } catch (err) {
      toast.error("فشل تحميل الصلاحيات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRoles();
  }, []);

  // 2. Filter Logic
  const filteredPermissions = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return permissions;
    return permissions.filter((p) => p.page?.toLowerCase().includes(term));
  }, [search, permissions]);

  const pages = useMemo(() => [...new Set(filteredPermissions.map((p) => p.page))], [filteredPermissions]);

  // 3. Toggle Logic
  const togglePermission = useCallback((roleId, page, field) => {
    if (!canManage) return;
    setPermissions((prev) =>
      prev.map((p) =>
        p.role_id === roleId && p.page === page ? { ...p, [field]: !p[field] } : p
      )
    );
    setHasChanges(true);
  }, [canManage]);

  // 4. Save Logic
  const saveChanges = useCallback(async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/roles/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY, Authorization: `Bearer ${user?.token}`, "x-active-role": activeRole },
        body: JSON.stringify({ permissions }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم حفظ الصلاحيات بنجاح");
        setHasChanges(false);
      } else throw new Error();
    } catch (err) {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }, [canManage, permissions, user?.token, activeRole]);

  // 5. Helpers
  const roleConfig = {
    admin: { label: "أدمن", color: "bg-purple-100 text-purple-700 border-purple-200" },
    office: { label: "مكتب", color: "bg-blue-100 text-blue-700 border-blue-200" },
    owner: { label: "مالك", color: "bg-green-100 text-green-700 border-green-200" },
    tenant: { label: "مستأجر", color: "bg-amber-100 text-amber-700 border-amber-200" },
    office_admin: { label: "أدمن مكتب", color: "bg-blue-100 text-blue-700 border-blue-200" },
    self_office_admin: { label: "مكتب خاص", color: "bg-blue-100 text-blue-700 border-blue-200" },
  };

  // --- Sub-Component: Permission Icon ---
  const PermToggle = ({ active, type, onClick }) => {
    const config = {
      can_view: { icon: Eye, activeColor: "text-emerald-600 bg-emerald-50 border-emerald-200", hover: "hover:text-emerald-700" },
      can_edit: { icon: Edit3, activeColor: "text-blue-600 bg-blue-50 border-blue-200", hover: "hover:text-blue-700" },
      can_delete: { icon: Trash2, activeColor: "text-red-600 bg-red-50 border-red-200", hover: "hover:text-red-700" },
    };
    
    const { icon: Icon, activeColor, hover } = config[type];

    return (
      <button
        onClick={onClick}
        disabled={!canManage}
        className={`p-1.5 rounded-md border transition-all duration-200 ${
          active 
            ? activeColor 
            : "text-gray-300 border-transparent hover:bg-gray-100 hover:text-gray-500"
        } ${!canManage ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      </button>
    );
  };

  return (
    <Card className="border shadow-sm bg-white h-full flex flex-col">
      <Toaster position="top-center" />
      
      {/* Header */}
      <CardHeader className="border-b pb-4 bg-white sticky top-0 z-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="text-emerald-600" size={20} /> مصفوفة الصلاحيات
            </CardTitle>
            <CardDescription className="mt-1">
              تحكم في صلاحيات الوصول (عرض، تعديل، حذف) لكل دور في النظام.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
              <Input
                placeholder="بحث عن صفحة..."
                className="pr-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button variant="outline" size="icon" onClick={fetchRoles} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </Button>

            {canManage && (
              <Button 
                onClick={saveChanges} 
                disabled={saving || !hasChanges}
                className={`${hasChanges ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400"} text-white transition-colors`}
              >
                {saving ? <Loader2 size={16} className="animate-spin ml-2"/> : <Save size={16} className="ml-2"/>}
                {hasChanges ? "حفظ التغييرات" : "محفوظ"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
            <p>جاري تحميل مصفوفة الصلاحيات...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-right border-collapse">
              {/* Sticky Table Header */}
              <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 font-medium text-start w-48 bg-gray-50">اسم الصفحة / الوحدة</th>
                  {roles.map((r) => {
                    const conf = roleConfig[r.role_name] || { label: r.role_name, color: "bg-gray-100" };
                    return (
                      <th key={r.id} className="p-4 text-center min-w-[140px]">
                        <Badge variant="outline" className={`${conf.color} px-3 py-1 text-xs font-bold`}>
                          {conf.label}
                        </Badge>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {pages.map((page) => (
                  <tr key={page} className="hover:bg-gray-50/50 transition-colors group">
                    {/* Page Name */}
                    <td className="p-4 font-medium text-gray-800 bg-white group-hover:bg-gray-50/50 sticky right-0 z-0">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-8 bg-gray-200 rounded-full group-hover:bg-emerald-500 transition-colors"></div>
                        {page}
                      </div>
                    </td>

                    {/* Role Columns */}
                    {roles.map((r) => {
                      const perm = permissions.find((p) => p.role_id === r.id && p.page === page) || {};
                      const hasAny = perm.can_view || perm.can_edit || perm.can_delete;

                      return (
                        <td key={r.id} className={`p-3 text-center border-l border-dashed border-gray-100 ${hasAny ? "bg-emerald-50/10" : ""}`}>
                          <div className="flex justify-center items-center gap-1 bg-white border border-gray-100 rounded-lg p-1.5 w-fit mx-auto shadow-sm">
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <PermToggle active={perm.can_view} type="can_view" onClick={() => togglePermission(r.id, page, "can_view")} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p>مشاهدة</p></TooltipContent>
                              </Tooltip>

                              <div className="w-px h-4 bg-gray-200 mx-1"></div>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <PermToggle active={perm.can_edit} type="can_edit" onClick={() => togglePermission(r.id, page, "can_edit")} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p>تعديل</p></TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <PermToggle active={perm.can_delete} type="can_delete" onClick={() => togglePermission(r.id, page, "can_delete")} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p>حذف</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend Footer */}
        <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-center gap-6">
          <span className="flex items-center gap-1"><Eye size={14} className="text-emerald-600"/> عرض البيانات</span>
          <span className="flex items-center gap-1"><Edit3 size={14} className="text-blue-600"/> التعديل والإضافة</span>
          <span className="flex items-center gap-1"><Trash2 size={14} className="text-red-600"/> الحذف النهائي</span>
          <span className="flex items-center gap-1 ml-4 text-gray-400"><Lock size={12}/> الرمادي يعني لا توجد صلاحية</span>
        </div>
      </CardContent>
    </Card>
  );
}