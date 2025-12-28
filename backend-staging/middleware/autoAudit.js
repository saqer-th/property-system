import { logAudit } from "./audit.js";

export function autoAudit(pool) {
  return async (req, res, next) => {
    const method = req.method.toUpperCase();

    // ⛔️ تجاهل الطلبات التي لا تغير البيانات
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next();

    const table = detectTable(req.originalUrl);
    const recordId = detectRecordId(req.originalUrl);
    let oldData = null;

    if (["PUT", "PATCH", "DELETE"].includes(method) && recordId && table !== "unknown") {
      try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [recordId]);
        if (result.rows.length) oldData = result.rows[0];
      } catch (err) {
        console.warn(`⚠️ [autoAudit] فشل في جلب old_data من ${table}:`, err.message);
      }
    }

    const start = Date.now();

    res.on("finish", async () => {
      if (res.statusCode >= 400) return;

      try {
        // ✅ نوع العملية بصيغة متوافقة مع CHECK constraint
        let action = "UPDATE";
        if (method === "POST") action = "INSERT";
        else if (method === "PUT" || method === "PATCH") action = "UPDATE";
        else if (method === "DELETE") action = "DELETE";

        // تجاهل أي شيء غير هذه الثلاثة
        if (!["INSERT", "UPDATE", "DELETE"].includes(action)) return;

        let newData = null;
        if (["PUT", "PATCH"].includes(method) && recordId && table !== "unknown") {
          try {
            const result = await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [recordId]);
            if (result.rows.length) newData = result.rows[0];
          } catch (err) {
            console.warn(`⚠️ [autoAudit] فشل في جلب new_data من ${table}:`, err.message);
          }
        } else {
          newData = req.body || null;
        }

        await logAudit(pool, {
          user_id: req.user?.id || null,
          action, // ✅ الآن بالإنجليزية الكبيرة فقط
          table_name: table,
          record_id: recordId,
          old_data: oldData,
          new_data: newData,
          description: `${action} على جدول ${table} (ID: ${recordId || "-"})`,
          ip_address: req.ip,
          endpoint: req.originalUrl,
          duration_ms: Date.now() - start,
        });
      } catch (err) {
        console.error("❌ Audit log error:", err.message);
      }
    });

    next();
  };
}


// =======================================
// 🔍 دوال مساعدة
// =======================================
function detectTable(url) {
  // إزالة الاستعلامات والمعلمات
  const cleanUrl = url.split("?")[0];
  const parts = cleanUrl.split("/").filter(Boolean);

  // إذا بدأ المسار بـ /admin/، تجاوز كلمة admin وخذ الجدول بعدها
  if (parts[0] === "admin" && parts.length > 1) {
    return parts[1];
  }

  // القائمة المسموح بها للجدوال
  const tables = [
    "contracts",
    "properties",
    "payments",
    "expenses",
    "maintenance",
    "units",
    "offices",
    "users",
    "receipts",
    "roles",
    "permissions",
    "user_roles",
  ];

  // ارجع أول كلمة من القائمة تنطبق مع المسار
  return parts.find((p) => tables.includes(p)) || "unknown";
}


function detectRecordId(url) {
  const parts = url.split("/");
  const id = parts.find((p) => /^\d+$/.test(p));
  return id ? Number(id) : null;
}
