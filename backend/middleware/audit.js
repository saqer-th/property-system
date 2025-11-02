export async function logAudit(pool, entry) {
  try {
    await pool.query(
      `
      INSERT INTO audit_log (
        user_id, action, table_name, record_id,
        old_data, new_data, description,
        ip_address, endpoint, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      `,
      [
        entry.user_id || null,
        entry.action || null,
        entry.table_name || null,
        entry.record_id || null,
        entry.old_data ? JSON.stringify(entry.old_data) : null,
        entry.new_data ? JSON.stringify(entry.new_data) : null,
        entry.description || "",
        entry.ip_address || null,
        entry.endpoint || null,
      ]
    );
  } catch (err) {
    console.error("❌ Audit log error:", err.message);
  }
}
