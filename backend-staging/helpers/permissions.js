import pool from "../db/pool.js";

/**
 * ✅ التحقق من صلاحية معينة لدور محدد
 * @param {string|number} roleInput - إما role_id (رقم) أو role_name (نص مثل "admin")
 * @param {string} page - اسم الصفحة (مثلاً "contracts")
 * @param {string} field - نوع الصلاحية (can_view / can_edit / can_delete)
 * @returns {Promise<boolean>}
 */
export async function checkPermission(roleInput, page, field = "can_view") {
  try {
    let result;

    // 📌 إذا الدور رقم (id)
    if (!isNaN(roleInput)) {
      result = await pool.query(
        `SELECT ${field} 
         FROM permissions 
         WHERE role_id = $1 
         AND LOWER(page) = LOWER($2) 
         LIMIT 1`,
        [roleInput, page]
      );
    }
    // 📌 إذا الدور نص (اسم role_name)
    else {
      result = await pool.query(
        `
        SELECT p.${field}
        FROM permissions p
        JOIN roles r ON r.id = p.role_id
        WHERE LOWER(r.role_name) = LOWER($1)
          AND LOWER(p.page) = LOWER($2)
        LIMIT 1
        `,
        [roleInput, page]
      );
    }

    // ✅ يرجع true فقط إذا القيمة موجودة ومفعّلة
    return result.rows.length > 0 && result.rows[0][field] === true;
  } catch (err) {
    console.error("❌ Error checking permission:", err.message);
    return false;
  }
}
