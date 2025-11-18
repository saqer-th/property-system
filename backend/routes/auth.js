import express from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendWhatsAppMessage } from "../utils/whatsappClient.js";

const router = express.Router();

/* =========================================================
   🧩 Helper: normalize Saudi phone to +966 format
   ========================================================= */
function normalizePhone(phone) {
  if (!phone) return null;
  let p = phone.toString().trim();
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("966")) p = "+966" + p.slice(3);
  if (p.startsWith("0")) p = "+966" + p.slice(1);
  if (!p.startsWith("+966")) p = "+966" + p;
  return p;
}

/* =========================================================
   📱 1️⃣ Send OTP
   ========================================================= */
router.post("/login-phone", async (req, res) => {
  const pool = req.pool;
  let { phone } = req.body;

  if (!phone)
    return res.status(400).json({ success: false, message: "رقم الجوال مطلوب" });

  phone = normalizePhone(phone);

  try {
    // ✅ تحقق من وجود المستخدم
    let { rows } = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
    let user = rows[0];

    // 🧩 إنشاء مستخدم جديد إذا غير موجود
    if (!user) {
      const result = await pool.query(
        `INSERT INTO users (name, phone, created_at, is_active)
         VALUES ($1, $2, NOW(), true)
         RETURNING *`,
        ["مستخدم جديد", phone]
      );
      user = result.rows[0];

      // تعيين دور tenant افتراضيًا
      const roleRes = await pool.query("SELECT id FROM roles WHERE role_name='tenant'");
      if (roleRes.rows.length) {
        await pool.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)",
          [user.id, roleRes.rows[0].id]
        );
      }
    }

    // إنشاء كود OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await pool.query("DELETE FROM user_otp WHERE phone=$1", [phone]);
    await pool.query(
      `INSERT INTO user_otp (phone, otp_code, expires_at)
       VALUES ($1,$2,NOW()+INTERVAL '5 minutes')`,
      [phone, otp]
    );
    await sendWhatsAppMessage(
  phone,
  `مرحبًا 👋

نرحب بك في نظام إدارة الأملاك، ويسعدنا تسجيل دخولك معنا.
لأمان حسابك، نرسل لك رمز التحقق الخاص بك.

رمز التحقق هو: *${otp}* 🔐  
صالح لمدة 5 دقائق فقط.

إذا لم تقم بطلب هذا الرمز، يمكنك تجاهل الرسالة بأمان.

شكراً لثقتك في منصتنا 🌟`
      );
    res.json({
      success: true,
      message: "تم إرسال كود التحقق",
      otp_demo: otp, // ⚠️ مؤقتًا أثناء التطوير
      data: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch (err) {
    console.error("❌ login-phone error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   🔐 2️⃣ Verify OTP and Login
   ========================================================= */
router.post("/verify-otp", async (req, res) => {
  const pool = req.pool;
  let { phone, otp_code } = req.body;

  if (!phone || !otp_code)
    return res.status(400).json({ success: false, message: "رقم الجوال والكود مطلوبان" });

  phone = normalizePhone(phone);

  try {
    // ✅ تحقق من الكود
    const otpRes = await pool.query(
      `SELECT * FROM user_otp
       WHERE phone=$1 AND otp_code=$2 AND expires_at>NOW()
       ORDER BY id DESC LIMIT 1`,
      [phone, otp_code]
    );

    if (!otpRes.rows.length)
      return res.status(400).json({ success: false, message: "❌ كود التحقق غير صحيح أو منتهي" });

    await pool.query("DELETE FROM user_otp WHERE phone=$1", [phone]);

    // ✅ جلب المستخدم
    const userRes = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);
    const user = userRes.rows[0];

    if (!user)
      return res.status(404).json({ success: false, message: "المستخدم غير موجود" });

    // 🚫 منع الدخول إذا الحساب العام موقوف
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: "🚫 الحساب غير مفعل، تواصل مع الإدارة لتفعيله.",
      });
    }

    // ✅ جلب أدوار المستخدم
    const rolesRes = await pool.query(
      `SELECT r.id AS role_id, r.role_name
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    if (!rolesRes.rows.length)
      return res.status(403).json({ success: false, message: "❌ لا يوجد أدوار للمستخدم" });

    const roles = rolesRes.rows.map((r) => r.role_name);
    const activeRole = roles[0];
    const activeRoleId = rolesRes.rows[0].role_id;

    /* =========================================================
       🚫 تحقق من حالة المكتب أو علاقة الموظف بالمكتب
       ========================================================= */
    if (["office_admin", "office_user", "office"].includes(activeRole)) {
      const officeRes = await pool.query(
        `
        SELECT 
          o.id AS office_id,
          o.name AS office_name,
          o.status AS office_status,
          ou.is_active AS user_active
        FROM offices o
        LEFT JOIN office_users ou ON ou.office_id = o.id
        WHERE o.owner_id = $1 OR ou.user_id = $1
        LIMIT 1
        `,
        [user.id]
      );

      if (officeRes.rows.length) {
        const office = officeRes.rows[0];

        // 🔸 تحقق من حالة المكتب
        if (office.office_status === "suspended" || office.office_status === "موقوف") {
          return res.status(403).json({
            success: false,
            message: `🚫 المكتب "${office.office_name}" موقوف مؤقتًا، لا يمكنك تسجيل الدخول.`,
          });
        }

        // 🔸 تحقق من حالة الموظف داخل المكتب
        if (office.user_active === false) {
          return res.status(403).json({
            success: false,
            message: `🚫 تم إيقاف حسابك من قبل إدارة المكتب "${office.office_name}"، لا يمكنك تسجيل الدخول.`,
          });
        }
      }
    }

    // ✅ جلب الصلاحيات
    const permsRes = await pool.query(
      `SELECT page, can_view, can_edit, can_delete
       FROM permissions
       WHERE role_id = $1`,
      [activeRoleId]
    );

    // ✅ إنشاء التوكن
    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone,
        roles,
        activeRole,
        role_id: activeRoleId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ إرسال الكوكي
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "None",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "✅ تم تسجيل الدخول بنجاح",
      token,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        roles,
        activeRole,
        role_id: activeRoleId,
        is_active: user.is_active,
        permissions: permsRes.rows,
      },
    });
  } catch (err) {
    console.error("❌ verify-otp error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   🔄 3️⃣ Switch active role
   ========================================================= */
router.post("/switch-role", verifyToken, async (req, res) => {
  const pool = req.pool;
  const { activeRole } = req.body;
  const currentUser = req.user;

  if (!activeRole)
    return res.status(400).json({ success: false, message: "يجب تحديد الدور الجديد" });

  try {
    // 1️⃣ تحقق أن المستخدم يملك هذا الدور فعلاً
    const roleRes = await pool.query(
      `SELECT r.id, r.role_name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND r.role_name = $2
       LIMIT 1`,
      [currentUser.id, activeRole]
    );

    if (!roleRes.rows.length) {
      return res.status(403).json({ success: false, message: "❌ لا تملك هذا الدور" });
    }

    const role_id = roleRes.rows[0].id;

    // 2️⃣ تحقق من حالة الحساب العام
    const uRes = await pool.query(`SELECT is_active FROM users WHERE id=$1`, [currentUser.id]);
    if (uRes.rows.length && uRes.rows[0].is_active === false) {
      return res.status(403).json({ success: false, message: "🚫 الحساب غير مفعل" });
    }

    // 3️⃣ لو الدور المراد التبديل إليه مكتب، تحقق من حالة المكتب وحالة المستخدم فيه
    if (["office_admin", "office_user", "office"].includes(activeRole)) {
      const officeRes = await pool.query(
        `
        SELECT 
          o.id AS office_id,
          o.name AS office_name,
          o.status AS office_status,
          ou.is_active AS user_active
        FROM offices o
        LEFT JOIN office_users ou ON ou.office_id = o.id
        WHERE o.owner_id = $1 OR ou.user_id = $1
        LIMIT 1`,
        [currentUser.id]
      );

      // 🔹 لو مو مرتبط بأي مكتب
      if (!officeRes.rows.length) {
        return res.status(403).json({
          success: false,
          message: "❌ أنت غير مرتبط بأي مكتب حاليًا",
        });
      }

      const office = officeRes.rows[0];

      // 🔹 لو المكتب موقوف
      if (office.office_status === "suspended" || office.office_status === "موقوف") {
        return res.status(403).json({
          success: false,
          message: `🚫 المكتب "${office.office_name}" موقوف مؤقتًا، لا يمكنك التبديل.`,
        });
      }

      // 🔹 لو المستخدم موقوف في المكتب
      if (office.user_active === false) {
        return res.status(403).json({
          success: false,
          message: `🚫 تم إيقاف حسابك من قبل إدارة المكتب "${office.office_name}"، لا يمكنك الدخول كمكتب.`,
        });
      }
    }

    // 4️⃣ جلب صلاحيات الدور الجديد
    const permsRes = await pool.query(
      `SELECT page, can_view, can_edit, can_delete FROM permissions WHERE role_id=$1`,
      [role_id]
    );

    // 5️⃣ إنشاء توكن جديد
    const token = jwt.sign(
      {
        id: currentUser.id,
        phone: currentUser.phone,
        roles: currentUser.roles,
        activeRole,
        role_id,
      },
      process.env.JWT_SECRET || "secret-key",
      { expiresIn: "7d" }
    );

    // 6️⃣ حفظ الكوكي
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "None",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 7️⃣ إرجاع النتيجة
    res.json({
      success: true,
      message: "✅ تم تبديل الدور بنجاح",
      activeRole,
      role_id,
      permissions: permsRes.rows,
      token,
    });
  } catch (err) {
    console.error("❌ switch-role error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


/* =========================================================
   👤 4️⃣ Get current user session
   ========================================================= */
router.get("/me", async (req, res) => {
  const pool = req.pool;
  const token = req.cookies?.token;
  if (!token) return res.json({ success: false, message: "لا يوجد جلسة حالية" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret-key");
    const permsRes = await pool.query(
      `SELECT page, can_view, can_edit, can_delete FROM permissions WHERE role_id=$1`,
      [decoded.role_id]
    );

    const userData = {
      id: decoded.id,
      phone: decoded.phone,
      roles: decoded.roles,
      activeRole: decoded.activeRole,
      role_id: decoded.role_id,
      permissions: permsRes.rows,
    };

    res.json({ success: true, user: userData });
  } catch (err) {
    res.json({ success: false, message: "invalid token", details: err.message });
  }
});

/* =========================================================
   🚪 5️⃣ Logout
   ========================================================= */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "None",
    path: "/",
  });
  res.json({ success: true, message: "✅ تم تسجيل الخروج بنجاح" });
});

export default router;
