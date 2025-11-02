import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_URL, API_KEY } from "@/config";
import { useAuth } from "@/context/AuthContext";

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const { user } = useAuth();
  const activeRole = user?.activeRole;
  const canManage = ["admin", "office"].includes(activeRole);

  // ==============================
  // 🔹 Load users & roles
  // ==============================
  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  async function fetchRoles() {
    try {
      const res = await fetch(`${API_URL}/admin/roles`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });

      const data = await res.json();
      if (!data.success) {
        console.warn("⚠️ فشل تحميل الأدوار:", data.message);
        setRolesList([]);
        return;
      }

      setRolesList(Array.isArray(data.roles) ? data.roles : []);
    } catch (err) {
      console.error("❌ فشل في تحميل الأدوار:", err);
      setRolesList([]);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: {
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "🚫 فشل تحميل المستخدمين");
        setUsers([]);
        setFiltered([]);
        return;
      }

      const result = Array.isArray(data.data) ? data.data : [];
      setUsers(result);
      setFiltered(result);
    } catch (err) {
      toast.error("❌ فشل الاتصال بالسيرفر");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // 🔍 Search & filter
  // ==============================
  useEffect(() => {
    const term = search.toLowerCase();
    let results = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(term) ||
        u.phone?.includes(term)
    );

    if (roleFilter)
      results = results.filter((u) => u.roles?.includes(roleFilter));

    setFiltered(results);
  }, [search, roleFilter, users]);

  // ==============================
  // ✏️ Update roles (multi)
  // ==============================
  async function updateUserRoles(userId, selectedRoles) {
    if (!canManage) return;
    setSavingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
        body: JSON.stringify({ role_ids: selectedRoles }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("✅ تم تحديث الأدوار بنجاح");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, roles: mapIdsToNames(selectedRoles) }
              : u
          )
        );
      } else {
        toast.error(json.message || "⚠️ فشل في التحديث");
      }
    } catch (err) {
      console.error("❌ Error updating roles:", err);
      toast.error("❌ خطأ في الاتصال بالسيرفر");
    } finally {
      setSavingId(null);
    }
  }

  // Helper: convert role IDs → role names
  const mapIdsToNames = (ids) =>
    ids
      .map((id) => rolesList.find((r) => String(r.id) === String(id))?.role_name)
      .filter(Boolean);

  // ==============================
  // 🔄 Toggle active
  // ==============================
  async function toggleActive(userId, isActive) {
    if (!canManage) return;
    setSavingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/active`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          Authorization: `Bearer ${user?.token}`,
          "x-active-role": activeRole,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("✅ تم تحديث الحالة");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, is_active: !isActive } : u
          )
        );
      } else toast.error(json.message || "⚠️ فشل في التحديث");
    } catch (err) {
      console.error("❌ Error toggling active:", err);
      toast.error("❌ خطأ في الاتصال بالسيرفر");
    } finally {
      setSavingId(null);
    }
  }

  const roleColors = {
    admin: "bg-purple-500",
    office: "bg-blue-500",
    owner: "bg-green-500",
    tenant: "bg-yellow-500",
  };

  // ==============================
  // 🧱 UI
  // ==============================
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-lg font-semibold">👥 إدارة المستخدمين</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
              <Input
                placeholder="بحث بالاسم أو الجوال"
                className="pl-8 w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm"
            >
              <option value="">كل الأدوار</option>
              {rolesList.map((r) => (
                <option key={r.id} value={r.role_name}>
                  {r.role_name === "admin"
                    ? "أدمن"
                    : r.role_name === "office"
                    ? "مكتب"
                    : r.role_name === "owner"
                    ? "مالك"
                    : "مستأجر"}
                </option>
              ))}
            </select>

            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw size={16} className="mr-1" /> تحديث
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500">
            <Loader2 className="animate-spin mr-2" /> جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-6 text-gray-500">لا يوجد مستخدمين</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center border border-gray-200">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">الاسم</th>
                  <th className="p-2 border">رقم الجوال</th>
                  <th className="p-2 border">الأدوار</th>
                  <th className="p-2 border">الحالة</th>
                  <th className="p-2 border">تاريخ التسجيل</th>
                  {canManage && <th className="p-2 border">إجراء</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-2 border">{i + 1}</td>
                    <td className="p-2 border font-medium">{u.name}</td>
                    <td className="p-2 border">{u.phone}</td>

                    {/* الأدوار */}
                    <td className="p-2 border">
                      <div className="flex justify-center flex-wrap gap-1 mb-2">
                        {u.roles?.length ? (
                          u.roles.map((r) => (
                            <Badge
                              key={r}
                              className={`${roleColors[r] || "bg-gray-400"} text-white`}
                            >
                              {r === "admin"
                                ? "أدمن"
                                : r === "office"
                                ? "مكتب"
                                : r === "owner"
                                ? "مالك"
                                : "مستأجر"}
                            </Badge>
                          ))
                        ) : (
                          <Badge className="bg-gray-300">بدون دور</Badge>
                        )}
                      </div>

                      {canManage && (
                        <select
                          multiple
                          className="w-full border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary"
                          defaultValue={u.role_ids || []}
                          onChange={(e) => {
                            const selected = Array.from(
                              e.target.selectedOptions
                            ).map((opt) => opt.value);
                            updateUserRoles(u.id, selected);
                          }}
                        >
                          {rolesList.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.role_name === "admin"
                                ? "أدمن"
                                : r.role_name === "office"
                                ? "مكتب"
                                : r.role_name === "owner"
                                ? "مالك"
                                : "مستأجر"}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* الحالة */}
                    <td className="p-2 border">
                      {u.is_active ? (
                        <span className="flex justify-center items-center gap-1 text-green-600">
                          <CheckCircle size={14} /> نشط
                        </span>
                      ) : (
                        <span className="flex justify-center items-center gap-1 text-red-500">
                          <XCircle size={14} /> موقوف
                        </span>
                      )}
                    </td>

                    <td className="p-2 border">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("ar-SA")
                        : "-"}
                    </td>

                    {canManage && (
                      <td className="p-2 border">
                        {savingId === u.id ? (
                          <Loader2
                            className="animate-spin mx-auto text-gray-500"
                            size={18}
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant={u.is_active ? "destructive" : "default"}
                            onClick={() => toggleActive(u.id, u.is_active)}
                            className="flex items-center gap-1"
                          >
                            <ShieldCheck size={16} />
                            {u.is_active ? "تعطيل" : "تفعيل"}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
