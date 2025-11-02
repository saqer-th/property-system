// =======================================
// 🧩 Auth Middleware - Verify JWT Token & Role (Secure)
// =======================================

import jwt from "jsonwebtoken";

/**
 * ✅ التحقق من التوكن وصلاحية المستخدم والدور النشط
 */
export async function verifyToken(req, res, next) {
  const pool = req.pool;

  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "❌ لم يتم إرسال رمز الدخول (Authorization header أو cookie مفقود)",
      });
    }

    // ✅ فك تشفير التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret-key");

    // ✅ الدور النشط من التوكن أو الهيدر
    const headerRole = req.headers["x-active-role"];
    const activeRole =
      headerRole || decoded.activeRole || (decoded.roles?.[0] ?? "tenant");

    // ✅ تحقق من وجود المستخدم في قاعدة البيانات
    const userRes = await pool.query(
      "SELECT id, is_active FROM users WHERE id=$1",
      [decoded.id]
    );
    const user = userRes.rows[0];

    if (!user)
      return res.status(404).json({
        success: false,
        message: "❌ المستخدم غير موجود في النظام",
      });

    if (user.is_active === false)
      return res.status(403).json({
        success: false,
        message: "🚫 الحساب غير مفعل، تواصل مع الإدارة لتفعيله",
      });

    // ✅ تحقق من أن الدور المرسل فعلاً ضمن أدوار المستخدم في DB
    const roleCheck = await pool.query(
      `SELECT r.role_name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [decoded.id]
    );
    const userRoles = roleCheck.rows.map((r) => r.role_name);

    if (!userRoles.includes(activeRole)) {
      return res.status(403).json({
        success: false,
        message: `🚫 الدور "${activeRole}" غير مصرح به لهذا المستخدم`,
      });
    }

    // ✅ تحقق من حالة المكتب إذا الدور مكتب
    if (["office", "office_admin", "office_user"].includes(activeRole)) {
      const officeRes = await pool.query(
        `SELECT o.status
         FROM offices o
         LEFT JOIN office_users ou ON ou.office_id = o.id
         WHERE o.owner_id = $1 OR ou.user_id = $1
         LIMIT 1`,
        [decoded.id]
      );

      const office = officeRes.rows[0];
      if (
        office &&
        (office.status === "suspended" || office.status === "موقوف")
      ) {
        return res.status(403).json({
          success: false,
          message:
            "🚫 المكتب موقوف مؤقتاً، لا يمكنك تسجيل الدخول بهذا الدور حالياً",
        });
      }
    }

    // ✅ تمرير البيانات للطلب
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      roles: userRoles,
      activeRole,
      role_id: decoded.role_id,
      token,
    };

    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);

    res.clearCookie("token", {
      domain:
        process.env.NODE_ENV === "production"
          ? ".property-system.com"
          : "localhost",
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(403).json({
      success: false,
      message: "❌ رمز الدخول غير صالح أو منتهي",
      details: err.message,
    });
  }
}

/**
 * 🔒 التحقق من أن المستخدم أدمن
 */
export function verifyAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "⚠️ لم يتم التحقق من المستخدم، استخدم verifyToken أولاً",
      });
    }

    if (
      req.user.activeRole !== "admin" &&
      !req.user.roles.includes("admin") &&
      !req.user.roles.includes("super_admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "🚫 الوصول مرفوض — هذه العملية تتطلب صلاحيات أدمن",
      });
    }

    next();
  } catch (err) {
    console.error("❌ verifyAdmin error:", err.message);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من صلاحيات الأدمن",
    });
  }
}


/**
 * 🔒 تحقق مخصص حسب الدور (Dynamic)
 */
export function verifyRole(allowedRoles = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "⚠️ لم يتم التحقق من المستخدم",
        });
      }

      const userRoles = req.user.roles || [];
      const active = req.user.activeRole;

      if (
        !allowedRoles.includes(active) &&
        !userRoles.some((r) => allowedRoles.includes(r))
      ) {
        return res.status(403).json({
          success: false,
          message: `🚫 الوصول مرفوض — يتطلب أحد الأدوار التالية: ${allowedRoles.join(
            ", "
          )}`,
        });
      }

      next();
    } catch (err) {
      console.error("❌ verifyRole error:", err.message);
      return res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء التحقق من الدور",
      });
    }
  };
}
export async function verifyOfficeAccess(req, res, next) {
  try {
    const userId = req.user?.id;
    const activeRole = req.user?.activeRole;

    // نسمح للإدمن العام بدون تحقق إضافي
    if (activeRole === "office_admin") return next();

    // إذا مو مكتب، نكمل عادي
    if (activeRole !== "office") return next();

    // نحاول تحديد المكتب الحالي (من الرابط أو من قاعدة البيانات)
    const officeId = Number(req.params.officeId || req.params.id || req.user?.office_id);
    if (!officeId) {
      return res.status(400).json({
        success: false,
        message: "⚠️ لا يمكن تحديد المكتب الحالي",
      });
    }

    // ✅ تحقق أن المستخدم موجود ونشط في هذا المكتب
    const { rows } = await pool.query(
      `SELECT is_active 
       FROM office_users 
       WHERE office_id=$1 AND user_id=$2 
       LIMIT 1`,
      [officeId, userId]
    );

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية للوصول إلى هذا المكتب",
      });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: "🚫 تم إيقاف حسابك من قبل إدارة المكتب، لا يمكنك الدخول.",
      });
    }

    // ✅ كل شيء تمام
    next();
  } catch (err) {
    console.error("❌ verifyOfficeAccess error:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من صلاحية الدخول إلى المكتب",
    });
  }
}