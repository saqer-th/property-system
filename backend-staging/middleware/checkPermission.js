import pool from "../db/pool.js";

/**
 * يتحقق من صلاحية الدور الحالي (عن طريق role_id) في صفحة معينة
 * action = can_view | can_edit | can_delete
 */
export async function checkPermission(roleId, page, action = "can_view") {
  try {
    const { rows } = await pool.query(
      `
      SELECT ${action}
      FROM permissions
      WHERE role_id = $1 AND page = $2
      LIMIT 1;
      `,
      [roleId, page]
    );

    return rows[0]?.[action] === true;
  } catch (err) {
    console.error("❌ Error checking permission:", err);
    return false;
  }
}
