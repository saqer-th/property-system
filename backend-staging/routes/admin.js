import express from "express";
import pool from "../db/pool.js";
import { verifyToken,verifyAdmin } from "../middleware/authMiddleware.js";
import { checkPermission } from "../helpers/permissions.js"; // ✅ المساعد الجديد
import { logAudit } from "../middleware/audit.js";

const router = express.Router();

/* =========================================================
   🏢 المكاتب (Offices)
   ========================================================= */

// 📄 عرض جميع المكاتب
router.get("/offices", verifyToken, async (req, res) => {
  const { activeRole } = req.user;

  const canView = await checkPermission(activeRole, "offices", "can_view");
  if (!canView)
    return res.status(403).json({ success: false, message: "🚫 لا تملك صلاحية عرض المكاتب." });

  try {
    const { rows } = await pool.query(`
      SELECT 
        o.id,
        o.name,
        o.owner_name,
        o.phone,
        o.email,
        o.commercial_reg,
        o.license_no,
        o.status,
        o.created_at,
        s.plan_name,
        s.start_date,
        s.end_date,
        s.is_active AS subscription_active,
        u.name AS approved_by_name
      FROM offices o
      LEFT JOIN subscriptions s ON s.office_id = o.id
      LEFT JOIN users u ON u.id = o.approved_by
      ORDER BY o.created_at DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching offices:", err);
    res.status(500).json({ success: false, message: "Error fetching offices" });
  }
});

// ✏️ تحديث حالة المكتب
router.put("/offices/:id/status", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.user?.id;
  const { activeRole } = req.user;

  const canEdit = await checkPermission(activeRole, "offices", "can_edit");
  if (!canEdit)
    return res.status(403).json({
      success: false,
      message: "🚫 لا تملك صلاحية تعديل المكاتب.",
    });

  try {
    // 1️⃣ جلب بيانات المكتب
    const { rows: officeRows } = await pool.query(
      "SELECT * FROM offices WHERE id=$1",
      [id]
    );
    if (!officeRows.length)
      return res.status(404).json({
        success: false,
        message: "❌ المكتب غير موجود",
      });

    const office = officeRows[0];
    const owner_id = office.owner_id;

    // 2️⃣ تحديث حالة المكتب
    if (status === "approved") {
      await pool.query(
        `
        UPDATE offices 
        SET status=$1, approved_by=$2, approved_at=NOW()
        WHERE id=$3
        `,
        [status, adminId, id]
      );
    } else {
      await pool.query(
        "UPDATE offices SET status=$1 WHERE id=$2",
        [status, id]
      );
    }

    // 3️⃣ إعطاء المستخدم دور office_admin عند الموافقة فقط
    if (status === "approved") {
      const roleRes = await pool.query(
        "SELECT id FROM roles WHERE role_name='office_admin' LIMIT 1"
      );

      const adminRoleId = roleRes.rows[0]?.id;

      if (adminRoleId) {
        await pool.query(
          `
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [owner_id, adminRoleId]
        );
      }
    }

    // 4️⃣ إنشاء/تحديث الاشتراك
    if (status === "approved") {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      await pool.query(
        `
        INSERT INTO subscriptions (office_id, plan_name, start_date, end_date, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (office_id)
        DO UPDATE SET 
          plan_name = EXCLUDED.plan_name,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          is_active = EXCLUDED.is_active
        `,
        [id, "basic", startDate, endDate]
      );
    }

    // 5️⃣ سجل أوديت
    await logAudit(pool, {
      user_id: adminId,
      action: "UPDATE",
      table_name: "offices",
      record_id: id,
      old_data: office,
      new_data: { ...office, status },
      description: `تحديث حالة المكتب (${office.name}) إلى "${status}"`,
      endpoint: `/admin/offices/${id}/status`,
    });

    res.json({
      success: true,
      message: "✅ تم تحديث حالة المكتب",
      office_id: id,
      new_status: status,
    });
  } catch (err) {
    console.error("❌ Error updating office status:", err);
    res.status(500).json({
      success: false,
      message: "Error updating office status",
    });
  }
});

/* =========================================================
   🧩 تفعيل أو إيقاف المستخدم
   ========================================================= */
router.put("/users/:id/active", verifyToken, verifyAdmin, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active === "undefined") {
    return res
      .status(400)
      .json({ success: false, message: "يجب إرسال القيمة is_active" });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, name, phone, is_active",
      [is_active, id]
    );

    if (!result.rowCount)
      return res
        .status(404)
        .json({ success: false, message: "❌ المستخدم غير موجود" });

    res.json({
      success: true,
      message: is_active
        ? "✅ تم تفعيل المستخدم بنجاح"
        : "🚫 تم إيقاف المستخدم بنجاح",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating user active status:", err);
    res
      .status(500)
      .json({ success: false, message: "حدث خطأ أثناء تحديث حالة المستخدم" });
  }
});

/* =========================================================
   👥 المستخدمين (Users)
   ========================================================= */

// 📄 عرض جميع المستخدمين
router.get("/users", verifyToken, async (req, res) => {
  const { activeRole } = req.user;
  const canView = await checkPermission(activeRole, "users", "can_view");
  if (!canView)
    return res.status(403).json({ success: false, message: "🚫 لا تملك صلاحية عرض المستخدمين." });

  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.is_active,
        u.created_at,
        COALESCE(json_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '[]') AS roles,
        COALESCE(array_agg(r.id) FILTER (WHERE r.id IS NOT NULL), '{}') AS role_ids
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

// ✏️ تحديث الأدوار المتعددة
router.put("/users/:id/roles", verifyToken, async (req, res) => {
  const { activeRole } = req.user;
  const canEdit = await checkPermission(activeRole, "users", "can_edit");
  if (!canEdit)
    return res.status(403).json({ success: false, message: "🚫 لا تملك صلاحية تعديل المستخدمين." });

  const { id } = req.params;
  let { role_ids } = req.body;

  try {
    if (!Array.isArray(role_ids))
      return res.status(400).json({ success: false, message: "تنسيق غير صحيح" });

    role_ids = role_ids.map((r) => Number(r)).filter((r) => !isNaN(r));
    if (role_ids.length === 0)
      return res.json({ success: false, message: "⚠️ لم يتم تحديد أي دور." });

    await pool.query("DELETE FROM user_roles WHERE user_id=$1", [id]);
    for (const rid of role_ids) {
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [id, rid]);
    }

    res.json({ success: true, message: "✅ تم تحديث الأدوار بنجاح" });
  } catch (err) {
    console.error("❌ Error updating user roles:", err);
    res.status(500).json({ success: false, message: "Error updating user roles" });
  }
});

/* =========================================================
   🛡️ الصلاحيات (Roles & Permissions)
   ========================================================= */

// 📄 تحميل الأدوار والصلاحيات
router.get("/roles", verifyToken, async (req, res) => {
  const { activeRole } = req.user;
  const canView = await checkPermission(activeRole, "roles", "can_view");
  if (!canView)
    return res.status(403).json({ success: false, message: "🚫 لا تملك صلاحية عرض الصلاحيات." });

  try {
    const roles = (await pool.query("SELECT id, role_name FROM roles ORDER BY id")).rows;
    const permissions = (
      await pool.query(`
        SELECT p.id, p.role_id, r.role_name, p.page, p.can_view, p.can_edit, p.can_delete
        FROM permissions p
        JOIN roles r ON r.id = p.role_id
        ORDER BY r.id
      `)
    ).rows;

    res.json({ success: true, roles, permissions });
  } catch (err) {
    console.error("❌ Error fetching roles & permissions:", err);
    res.status(500).json({ success: false, message: "Error fetching roles & permissions" });
  }
});

// ✏️ تحديث الصلاحيات
router.put("/roles/update", verifyToken, async (req, res) => {
  const { activeRole } = req.user;
  const canEdit = await checkPermission(activeRole, "roles", "can_edit");
  if (!canEdit)
    return res.status(403).json({ success: false, message: "🚫 لا تملك صلاحية تعديل الصلاحيات." });

  const { permissions } = req.body;

  try {
    if (!Array.isArray(permissions))
      return res.status(400).json({ success: false, message: "❌ تنسيق غير صحيح" });

    for (const p of permissions) {
      const existing = await pool.query(
        `SELECT id FROM permissions WHERE role_id=$1 AND page=$2`,
        [p.role_id, p.page]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE permissions
           SET can_view=$1, can_edit=$2, can_delete=$3
           WHERE role_id=$4 AND page=$5`,
          [p.can_view, p.can_edit, p.can_delete, p.role_id, p.page]
        );
      } else {
        await pool.query(
          `INSERT INTO permissions (role_id, page, can_view, can_edit, can_delete)
           VALUES ($1, $2, $3, $4, $5)`,
          [p.role_id, p.page, p.can_view, p.can_edit, p.can_delete]
        );
      }
    }

    res.json({ success: true, message: "✅ تم تحديث الصلاحيات بنجاح" });
  } catch (err) {
    console.error("❌ Error updating permissions:", err);
    res.status(500).json({ success: false, message: "Error updating permissions" });
  }
});
/* =========================================================
   📊 التقارير (Reports)
   ========================================================= */
router.get("/reports", verifyToken, async (req, res) => {
  try {
    const contracts = await pool.query("SELECT COUNT(*) FROM contracts");
    const owners = await pool.query(`
      SELECT COUNT(DISTINCT u.id)
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.role_name = 'owner'
    `);
    const tenants = await pool.query(`
      SELECT COUNT(DISTINCT u.id)
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.role_name = 'tenant'
    `);
    const offices = await pool.query("SELECT COUNT(*) FROM offices");

    const chart = (
      await pool.query(`
        SELECT
          CASE
            WHEN tenancy_end < NOW() THEN 'منتهية'
            WHEN tenancy_end BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN 'قريبة الانتهاء'
            ELSE 'نشطة'
          END AS status,
          COUNT(*) AS count
        FROM contracts
        GROUP BY status
        ORDER BY status
      `)
    ).rows;

    res.json({
      success: true,
      stats: {
        contracts: Number(contracts.rows[0].count),
        owners: Number(owners.rows[0].count),
        tenants: Number(tenants.rows[0].count),
        offices: Number(offices.rows[0].count),
      },
      chart,
    });
  } catch (err) {
    console.error("❌ Error fetching reports:", err);
    res.status(500).json({ success: false, message: "Error fetching reports" });
  }
});

/* =========================================================
   📜 سجل العمليات (Audit Log)
   ========================================================= */
router.get("/audit", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        u.name AS user_name,
        a.action,
        a.table_name,
        a.record_id,
        a.old_data,
        a.new_data,
        a.description,
        a.ip_address,
        a.endpoint,
        a.created_at
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 500
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching audit log:", err);
    res.status(500).json({ success: false, message: "Error fetching audit log" });
  }
});

/* =========================================================
   💳 الاشتراكات (Subscriptions)
   ========================================================= */
router.get("/subscriptions", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.id,
        o.name AS office_name,
        o.phone AS office_phone,
        s.plan_name,
        s.start_date,
        s.end_date,
        s.is_active,
        s.created_at
      FROM subscriptions s
      LEFT JOIN offices o ON o.id = s.office_id
      ORDER BY s.created_at DESC
    `);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("❌ Error fetching subscriptions:", err);
    res.status(500).json({ success: false, message: "Error fetching subscriptions" });
  }
});

export default router;
