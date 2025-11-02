import { pool } from "../server.js";

/**
 * ✅ السماح فقط لمشرف المكتب أو المالك أو صاحب الدور office_admin
 */
export async function verifyOfficeAdminOnly(req, res, next) {
  try {
    const officeId = Number(req.params.id || req.params.officeId);
    const userId = req.user?.id;
    const activeRole = req.user?.activeRole;

    // 🧩 السماح المباشر إذا الدور office_admin
    if (activeRole === "office_admin") {
      return next();
    }

    // 🧩 السماح إذا المالك
    const ownRes = await pool.query(
      `SELECT id FROM offices WHERE id=$1 AND owner_id=$2`,
      [officeId, userId]
    );
    if (ownRes.rows.length > 0) {
      return next();
    }

    // 🧩 السماح إذا موظف بدور إداري
    const ouRes = await pool.query(
      `SELECT role_in_office
       FROM office_users
       WHERE office_id=$1 AND user_id=$2`,
      [officeId, userId]
    );
    if (ouRes.rows.length && ["manager", "supervisor", "admin"].includes(ouRes.rows[0].role_in_office)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "🚫 هذه العملية متاحة فقط لمشرف المكتب أو المالك",
    });
  } catch (err) {
    console.error("❌ verifyOfficeAdminOnly error:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من صلاحيات المكتب",
      details: err.message,
    });
  }
}

/**
 * ✅ يتحقق أن المستخدم إما مشرف المكتب أو المالك أو له دور إداري بالمكتب
 */
export async function verifyOfficeAdminOrOwner(req, res, next) {

  try {
    const officeId = req.params.id ? Number(req.params.id) : Number(req.params.officeId);
    const userId = req.user?.id;
    const activeRole = req.user?.activeRole;


    if (!officeId || isNaN(officeId)) {
      console.warn("⚠️ Missing or invalid officeId in route params");
      return res.status(400).json({
        success: false,
        message: "رقم المكتب غير صالح أو غير موجود في الرابط",
      });
    }

    // 🟢 السماح إذا المستخدم أدمن عام
    if (activeRole === "office_admin") return next();

    // 🟢 السماح إذا المستخدم هو مالك المكتب
    const ownRes = await pool.query(
      `SELECT id FROM offices WHERE id=$1 AND owner_id=$2`,
      [officeId, userId]
    );
    if (ownRes.rows.length > 0) return next();

    // 🟢 السماح إذا المستخدم موظف بدور إداري
    const ouRes = await pool.query(
      `SELECT role_in_office
         FROM office_users
         WHERE office_id=$1 AND user_id=$2`,
      [officeId, userId]
    );

    if (ouRes.rows.length > 0) {
      const role = ouRes.rows[0].role_in_office;
      if (["manager", "supervisor", "admin"].includes(role)) return next();
    }

    // 🚫 رفض الوصول
    return res.status(403).json({
      success: false,
      message: "🚫 هذه العملية متاحة فقط لمشرف المكتب أو المالك",
    });
  } catch (err) {
    console.error("❌ verifyOfficeAdminOrOwner error:", err);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من صلاحيات المكتب",
      details: err.message,
    });
  }
}

