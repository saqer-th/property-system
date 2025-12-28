import express from "express";
import { pool } from "../server.js";
import { logAudit } from "../middleware/audit.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  verifyOfficeAdminOrOwner,
  verifyOfficeAdminOnly,
} from "../middleware/officeMiddleware.js";

const router = express.Router();

/* =========================================================
   📱 دالة مساعدة لتوحيد رقم الجوال لصيغة +966
   ========================================================= */
function normalizePhone(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("05")) digits = "+966" + digits.slice(1);
  else if (digits.startsWith("966")) digits = "+" + digits;
  else if (!digits.startsWith("+966")) digits = "+966" + digits;
  return digits;
}
/* =========================================================
   🏢 إرجاع المكتب الخاص بالمستخدم الحالي (مالك أو مشرف)
   ========================================================= */
router.get("/my", verifyToken, async (req, res) => {
  const pool = req.pool;
  const user = req.user;

  try {
    // 🔥 1) Admin → يرجّع كل المكاتب
    if (user.activeRole === "admin") {
      const { rows } = await pool.query(`
        SELECT id, name, owner_name, phone, email, status, created_at,commercial_reg,license_no,address
        FROM offices
        ORDER BY created_at DESC
      `);
      return res.json({ success: true, data: rows });
    }

    // 🔥 2) المكتب الرئيسي (is_owner_office = false)
    const mainOffice = await pool.query(
      `
      SELECT id, name, owner_name, phone, email, status, created_at, commercial_reg, license_no, address
      FROM offices
      WHERE owner_id = $1 AND is_owner_office = false
      LIMIT 1
      `,
      [user.id]
    );

    if (mainOffice.rows.length) {
      return res.json({ success: true, data: mainOffice.rows[0] });
    }

    // 🔥 3) إذا المستخدم موظف → نرجع أول مكتب يعمل فيه
    const staffOffice = await pool.query(
      `
      SELECT o.id, o.name, o.owner_name, o.phone, o.email, o.status, o.created_at, o.commercial_reg, o.license_no, o.address
      FROM office_users ou
      JOIN offices o ON o.id = ou.office_id
      WHERE ou.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT 1
      `,
      [user.id]
    );

    if (staffOffice.rows.length) {
      return res.json({ success: true, data: staffOffice.rows[0] });
    }

    // 🔥 4) إذا لا مكتب رئيسي ولا موظف → نرجّع المكتب الشخصي (is_owner_office = true)
    const privateOffice = await pool.query(
      `
      SELECT id, name, owner_name, phone, email, status, created_at, commercial_reg, license_no, address
      FROM offices
      WHERE owner_id = $1 AND is_owner_office = true
      LIMIT 1
      `,
      [user.id]
    );

    if (privateOffice.rows.length) {
      return res.json({ success: true, data: privateOffice.rows[0] });
    }

    // ❌ بدون مكاتب نهائياً
    return res.status(404).json({
      success: false,
      message: "❌ لا يوجد مكتب مرتبط بهذا الحساب",
    });

  } catch (err) {
    console.error("❌ Error fetching my office:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب بيانات المكتب",
      details: err.message,
    });
  }
});

/* =========================================================
   🏢 تسجيل مكتب جديد (حتى لو المستخدم موجود)
   ========================================================= */
router.post("/register", async (req, res) => {
  const {
    name,
    owner_name,
    phone,
    email,
    commercial_reg,
    license_no,
    address,
  } = req.body;

  try {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone)
      return res.status(400).json({
        success: false,
        message: "📱 رقم الجوال غير صالح",
      });

    // ============================================================
    // 1️⃣ التحقق من وجود مستخدم سابق أو إنشاء مستخدم جديد
    // ============================================================
    const userRes = await pool.query(
      "SELECT id FROM users WHERE phone=$1 LIMIT 1",
      [normalizedPhone]
    );

    let owner_id = userRes.rows[0]?.id;

    if (!owner_id) {
      const newUser = await pool.query(
        `INSERT INTO users (name, phone, is_active, created_at)
         VALUES ($1, $2, true, NOW()) RETURNING id`,
        [owner_name || name, normalizedPhone]
      );
      owner_id = newUser.rows[0].id;
    }

    // ============================================================
    // 2️⃣ توقف تسجيل مكتب جديد إذا عنده مكتب سابق
    // ============================================================
    const officeCheck = await pool.query(
      "SELECT id, status FROM offices WHERE owner_id=$1",
      [owner_id]
    );

    if (officeCheck.rows.length) {
      return res.status(400).json({
        success: false,
        message:
          "⚠️ لديك مكتب مسجل مسبقًا. لا يمكن تسجيل أكثر من مكتب لنفس المستخدم.",
      });
    }

    // ============================================================
    // 3️⃣ إنشاء المكتب (status = pending)
    // ============================================================
    const officeInsert = await pool.query(
      `INSERT INTO offices
       (owner_id, name, owner_name, phone, email, commercial_reg, license_no, address, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',NOW())
       RETURNING *`,
      [
        owner_id,
        name,
        owner_name,
        normalizedPhone,
        email,
        commercial_reg,
        license_no,
        address,
      ]
    );

    const office = officeInsert.rows[0];

    // ============================================================
    // 4️⃣ بدون إضافة دور office هنا ❌
    // سيتم منح الدور عند الموافقة (approve)
    // ============================================================

    // ============================================================
    // 5️⃣ سجل العملية
    // ============================================================
    await logAudit(pool, {
      user_id: owner_id,
      action: "INSERT",
      table_name: "offices",
      record_id: office.id,
      new_data: office,
      description: `تسجيل مكتب جديد (${office.name}) برقم ${normalizedPhone}`,
      endpoint: "/offices/register",
    });

    // ============================================================
    // 6️⃣ إرسال الرد
    // ============================================================
    res.json({
      success: true,
      message: "✅ تم تسجيل المكتب بنجاح! بانتظار الموافقة من الإدارة.",
      office_id: office.id,
      owner_id,
      status: "pending",
    });
  } catch (err) {
    console.error("❌ register office error:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل المكتب.",
      details: err.message,
    });
  }
});


/* =========================================================
   🏢 عرض بيانات مكتب واحد
   ========================================================= */
router.get("/:id", verifyToken, async (req, res) => {
  const paramId = req.params.id; // ممكن يكون رقم أو "my"
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let officeId = null;

    // 🧩 إذا المستخدم Admin، يستخدم الـ id كما هو
    if (userRole === "admin" && paramId !== "my") {
      officeId = paramId;
    } else {
      // 🧩 إذا المستخدم طلب "my" أو أرسل رقم غير صحيح، نجيب المكتب تلقائيًا
      if (paramId === "my" || !Number(paramId)) {
        // 1️⃣ المستخدم مالك مكتب
        const resOwner = await pool.query(
          `SELECT id AS office_id FROM offices WHERE owner_id = $1 LIMIT 1;`,
          [userId]
        );
        if (resOwner.rows.length > 0) {
          officeId = resOwner.rows[0].office_id;
        }

        // 2️⃣ المستخدم موظف في مكتب
        if (!officeId) {
          const resStaff = await pool.query(
            `SELECT office_id FROM office_users WHERE user_id = $1 LIMIT 1;`,
            [userId]
          );
          if (resStaff.rows.length > 0) {
            officeId = resStaff.rows[0].office_id;
          }
        }
      } else {
        officeId = paramId;
      }
    }

    // ⚠️ لم يتم العثور على مكتب
    if (!officeId) {
      return res
        .status(404)
        .json({ success: false, message: "❌ لم يتم العثور على مكتب مرتبط بهذا المستخدم" });
    }

    // 📦 جلب بيانات المكتب
    const { rows } = await pool.query(
      `SELECT id, name, owner_id, owner_name, phone, email, commercial_reg, license_no, status, created_at
       FROM offices
       WHERE id = $1`,
      [officeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "❌ المكتب غير موجود" });
    }

    const office = rows[0];

    // 🔒 تحقق من أن المستخدم لديه صلاحية للوصول للمكتب
    if (userRole !== "admin") {
      const { rows: checkAccess } = await pool.query(
        `
  SELECT 1
    FROM (
      SELECT office_id AS id 
      FROM office_users 
      WHERE user_id = $2
      
      UNION
      
      SELECT id 
      FROM offices 
      WHERE owner_id = $2 AND is_owner_office = false
    ) AS allowed
    WHERE allowed.id = $1
    LIMIT 1
        `,
        [officeId, userId]
      );
      if (checkAccess.length === 0) {
        return res
          .status(403)
          .json({ success: false, message: "🚫 غير مصرح لك بالوصول إلى هذا المكتب" });
      }
    }

    // 📊 جلب عدد العقارات والموظفين (اختياري)
    const stats = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM properties WHERE office_id = $1) AS property_count,
        (SELECT COUNT(*) FROM office_users WHERE office_id = $1) AS employee_count
      `,
      [officeId]
    );

    res.json({
      success: true,
      data: {
        ...office,
        stats: stats.rows[0],
      },
    });
  } catch (err) {
    console.error("❌ Error fetching office:", err);
    res
      .status(500)
      .json({ success: false, message: "حدث خطأ أثناء جلب بيانات المكتب" });
  }
});




/* =========================================================
   👨‍💼 عرض موظفي المكتب
   ========================================================= */
router.get("/:id/employees", verifyToken, verifyOfficeAdminOrOwner, async (req, res) => {
  try {
    const officeId = Number(req.params.id);

    const { rows } = await pool.query(
      `
      SELECT 
        u.id AS user_id,
        u.name,
        u.phone,
        ou.role_in_office AS role,
        ou.is_active,
        ou.created_at
      FROM office_users ou
      JOIN users u ON u.id = ou.user_id
      WHERE ou.office_id = $1
      ORDER BY ou.created_at DESC
      `,
      [officeId]
    );
    console.log("✅ دخل فعلاً على GET /offices/:id/employees");
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ fetch employees error:", err);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب الموظفين" });
  }
});



/* =========================================================
   ➕ إضافة موظف جديد للمكتب (بواسطة المشرف)
   ========================================================= */
router.post("/:id/employees", verifyToken, verifyOfficeAdminOnly, async (req, res) => {
  const { id: officeId } = req.params;
  const { phone, name, role_in_office = "employee" } = req.body;

  if (!phone)
    return res.status(400).json({ success: false, message: "📱 رقم الجوال مطلوب" });

  const normalized = normalizePhone(phone);

  try {
    await pool.query("BEGIN");

    // ✅ تحقق من المكتب
    const officeCheck = await pool.query("SELECT id FROM offices WHERE id=$1", [officeId]);
    if (!officeCheck.rows.length)
      return res.status(404).json({ success: false, message: "❌ المكتب غير موجود" });

    // ✅ تحقق من المستخدم أو أنشئه
    let userRes = await pool.query("SELECT * FROM users WHERE phone=$1", [normalized]);
    let user;
    if (!userRes.rows.length) {
      const insert = await pool.query(
        `INSERT INTO users (name, phone, is_active, created_at)
         VALUES ($1,$2,true,NOW()) RETURNING *`,
        [name || "موظف جديد", normalized]
      );
      user = insert.rows[0];
    } else {
      user = userRes.rows[0];
    }

    // ✅ أضف الدور office إذا ما عنده
    const roleRes = await pool.query("SELECT id FROM roles WHERE role_name='office' LIMIT 1");
    if (roleRes.rows.length) {
      const roleId = roleRes.rows[0].id;
      const check = await pool.query(
        "SELECT 1 FROM user_roles WHERE user_id=$1 AND role_id=$2",
        [user.id, roleId]
      );
      if (!check.rows.length) {
        await pool.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)",
          [user.id, roleId]
        );
      }
    }

    // ✅ أضفه إلى office_users
    const exists = await pool.query(
      "SELECT id FROM office_users WHERE office_id=$1 AND user_id=$2",
      [officeId, user.id]
    );
    if (!exists.rows.length) {
      await pool.query(
        `INSERT INTO office_users (office_id, user_id, role_in_office)
         VALUES ($1,$2,$3)`,
        [officeId, user.id, role_in_office]
      );
    } else {
      await pool.query(
        `UPDATE office_users SET role_in_office=$1 WHERE office_id=$2 AND user_id=$3`,
        [role_in_office, officeId, user.id]
      );
    }

    await pool.query("COMMIT");
    res.json({
      success: true,
      message: "✅ تم إضافة الموظف وربطه بالمكتب بنجاح",
      data: { user_id: user.id, phone: user.phone, name: user.name, role_in_office },
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ add employee error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   🔄 تفعيل / إيقاف موظف في مكتب
   ========================================================= */
router.put(
  "/:officeId/employees/:userId/active",
  verifyToken,
  verifyOfficeAdminOnly,
  async (req, res) => {
    const { officeId, userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "⚠️ قيمة is_active يجب أن تكون true أو false",
      });
    }

    try {
      // ✅ تحديث حالة الموظف في جدول office_users فقط
      const update = await pool.query(
        `UPDATE office_users
         SET is_active = $1
         WHERE office_id = $2 AND user_id = $3
         RETURNING id`,
        [is_active, officeId, userId]
      );

      if (!update.rowCount) {
        return res.status(404).json({
          success: false,
          message: "❌ الموظف غير موجود في هذا المكتب",
        });
      }

      res.json({
        success: true,
        message: is_active
          ? "✅ تم تفعيل الموظف بنجاح"
          : "🚫 تم إيقاف الموظف بنجاح",
      });
    } catch (err) {
      console.error("❌ toggle employee error:", err);
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحديث حالة الموظف",
        details: err.message,
      });
    }
  }
);


/* =========================================================
   ❌ حذف موظف من المكتب
   ========================================================= */
router.delete("/:officeId/employees/:userId", verifyToken, verifyOfficeAdminOnly, async (req, res) => {
  const { officeId, userId } = req.params;
  try {
    await pool.query("DELETE FROM office_users WHERE office_id=$1 AND user_id=$2", [officeId, userId]);
    res.json({ success: true, message: "✅ تم حذف الموظف من المكتب بنجاح" });
  } catch (err) {
    console.error("❌ delete employee error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
