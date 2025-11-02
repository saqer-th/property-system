import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Save, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function RolesTab() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  const canManage = activeRole === "admin";

  // 🔹 تحميل الأدوار والصلاحيات
  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/roles`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to load roles");

      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
    } catch (err) {
      toast.error("❌ فشل تحميل الصلاحيات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 🔍 البحث في الصفحات
  const filteredPermissions = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return permissions;
    return permissions.filter((p) => p.page?.toLowerCase().includes(term));
  }, [search, permissions]);

  // 🧱 قائمة الصفحات (حسب البحث)
  const pages = useMemo(
    () => [...new Set(filteredPermissions.map((p) => p.page))],
    [filteredPermissions]
  );

  // ✅ تبديل صلاحية محددة
  const togglePermission = useCallback(
    (roleId, page, field) => {
      if (!canManage) return;
      setPermissions((prev) =>
        prev.map((p) =>
          p.role_id === roleId && p.page === page ? { ...p, [field]: !p[field] } : p
        )
      );
    },
    [canManage]
  );

  // 💾 حفظ التعديلات
  const saveChanges = useCallback(async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/roles/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
        body: JSON.stringify({ permissions }),
      });

      const json = await res.json();
      if (json.success) toast.success("✅ تم حفظ التعديلات بنجاح");
      else toast.error("⚠️ فشل في حفظ التعديلات");
    } catch (err) {
      toast.error("❌ خطأ في الاتصال بالسيرفر");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [canManage, permissions, user?.token, activeRole]);

  // 🧭 أسماء الأدوار بالعربية
  const roleNames = {
    admin: "أدمن",
    office: "مكتب",
    office_admin: "مشرف مكتب",
    owner: "مالك",
    tenant: "مستأجر",
  };

  // 🎨 ألوان الأعمدة
  const permColors = {
    can_view: "text-green-600",
    can_edit: "text-blue-600",
    can_delete: "text-red-600",
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>إدارة الصلاحيات</span>
          <div className="flex items-center gap-2">
            {/* 🔍 البحث */}
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
              <Input
                placeholder="بحث عن صفحة..."
                className="pl-7 w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* 🔄 تحديث */}
            <Button variant="outline" onClick={fetchRoles} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-1" /> جاري التحديث...
                </>
              ) : (
                <>
                  <RefreshCw size={16} className="mr-1" /> تحديث
                </>
              )}
            </Button>

            {/* 💾 حفظ */}
            {canManage && (
              <Button onClick={saveChanges} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-1" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-1" />
                    حفظ
                  </>
                )}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500">
            <Loader2 className="animate-spin mr-2" /> جاري التحميل...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 border w-40">الصفحة</th>
                  {roles.map((r) => (
                    <th key={r.id} className="p-2 border">
                      {roleNames[r.role_name] || r.role_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page} className="border-b hover:bg-gray-50 transition">
                    <td className="p-2 border font-medium">{page}</td>
                    {roles.map((r) => {
                      const perm =
                        permissions.find(
                          (p) => p.role_id === r.id && p.page === page
                        ) || {};
                      return (
                        <td key={r.id} className="p-2 border">
                          <div className="flex justify-center gap-3">
                            <label
                              className={`flex items-center gap-1 ${permColors.can_view}`}
                            >
                              <Checkbox
                                checked={perm.can_view || false}
                                disabled={!canManage}
                                onCheckedChange={() =>
                                  togglePermission(r.id, page, "can_view")
                                }
                              />
                              عرض
                            </label>
                            <label
                              className={`flex items-center gap-1 ${permColors.can_edit}`}
                            >
                              <Checkbox
                                checked={perm.can_edit || false}
                                disabled={!canManage}
                                onCheckedChange={() =>
                                  togglePermission(r.id, page, "can_edit")
                                }
                              />
                              تعديل
                            </label>
                            <label
                              className={`flex items-center gap-1 ${permColors.can_delete}`}
                            >
                              <Checkbox
                                checked={perm.can_delete || false}
                                disabled={!canManage}
                                onCheckedChange={() =>
                                  togglePermission(r.id, page, "can_delete")
                                }
                              />
                              حذف
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-xs text-gray-500 mt-3 text-right">
              ✅ عرض = can_view ، ✏️ تعديل = can_edit ، 🗑️ حذف = can_delete
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
