import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   🧰 1️⃣ عرض طلبات الصيانة حسب صلاحية المستخدم
   ========================================================= */
router.get("/", verifyToken, async (req, res) => {
  const { phone, roles } = req.user;

  try {
    let query, params = [];

    if (roles.includes("admin") || roles.includes("office")) {
      // المكتب والمشرف يشوفون كل الطلبات
      query = `
        SELECT m.*, p.property_name, c.contract_no
        FROM maintenance m
        LEFT JOIN properties p ON p.id = m.property_id
        LEFT JOIN contracts c ON c.id = m.contract_id
        ORDER BY m.created_at DESC
      `;
    } else if (roles.includes("owner")) {
      // المالك يشوف الطلبات لعقاراته فقط
      query = `
        SELECT DISTINCT m.*, p.property_name, c.contract_no
        FROM maintenance m
        JOIN properties p ON p.id = m.property_id
        JOIN property_owners po ON po.property_id = p.id
        JOIN users u ON u.id = po.user_id
        WHERE u.phone = $1
        ORDER BY m.created_at DESC
      `;
      params = [phone];
    } else if (roles.includes("tenant")) {
      // المستأجر يشوف فقط الطلبات الخاصة بعقوده
      query = `
        SELECT DISTINCT m.*, p.property_name, c.contract_no
        FROM maintenance m
        JOIN contracts c ON c.id = m.contract_id
        JOIN contract_parties cp ON cp.contract_id = c.id
        JOIN parties t ON t.id = cp.party_id
        JOIN properties p ON p.id = c.property_id
        WHERE t.phone = $1 AND cp.role='tenant'
        ORDER BY m.created_at DESC
      `;
      params = [phone];
    } else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية الوصول إلى طلبات الصيانة",
      });
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("❌ Error fetching maintenance:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب طلبات الصيانة",
      details: err.message,
    });
  }
});

/* =========================================================
   ➕ 2️⃣ إنشاء طلب صيانة
   ========================================================= */
router.post("/", verifyToken, async (req, res) => {
  const { roles, phone } = req.user;
  const m = req.body;
  const client = await pool.connect();

  try {
    if (
      !roles.includes("tenant") &&
      !roles.includes("owner") &&
      !roles.includes("office") &&
      !roles.includes("admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "🚫 غير مصرح لك بإضافة طلب صيانة",
      });
    }

    await client.query("BEGIN");

    const ins = await client.query(
      `INSERT INTO maintenance (
        property_id, contract_id, issue_type, description,
        status, requested_by, request_date, assigned_to
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        m.property_id || null,
        m.contract_id || null,
        m.issue_type || "أخرى",
        m.description || null,
        "جديد",
        phone,
        m.request_date || new Date(),
        m.assigned_to || null,
      ]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "✅ تم تسجيل طلب الصيانة بنجاح",
      maintenance_id: ins.rows[0].id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating maintenance:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الطلب",
      details: err.message,
    });
  } finally {
    client.release();
  }
});

/* =========================================================
   ✏️ 3️⃣ تحديث حالة الطلب
   ========================================================= */
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { roles } = req.user;
  const m = req.body;

  try {
    if (!roles.includes("admin") && !roles.includes("office") && !roles.includes("owner")) {
      return res.status(403).json({
        success: false,
        message: "🚫 غير مصرح لك بتحديث حالة الطلب",
      });
    }

    await pool.query(
      `UPDATE maintenance
       SET status=$1, assigned_to=$2, notes=$3, completed_date=$4
       WHERE id=$5`,
      [m.status, m.assigned_to, m.notes, m.completed_date, id]
    );

    res.json({ success: true, message: "✅ تم تحديث حالة الطلب بنجاح" });
  } catch (err) {
    console.error("❌ Error updating maintenance:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث الطلب",
      details: err.message,
    });
  }
});

/* =========================================================
   🗑️ 4️⃣ حذف طلب صيانة
   ========================================================= */
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { roles } = req.user;

  try {
    if (!roles.includes("admin") && !roles.includes("office")) {
      return res.status(403).json({
        success: false,
        message: "🚫 غير مصرح لك بحذف الطلب",
      });
    }

    await pool.query("DELETE FROM maintenance WHERE id=$1", [id]);
    res.json({ success: true, message: "🗑️ تم حذف الطلب بنجاح" });
  } catch (err) {
    console.error("❌ Error deleting maintenance:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الطلب",
      details: err.message,
    });
  }
});

export default router;
