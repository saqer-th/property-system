import pool from "../db/pool.js";
import { isEventAllowed, normalizeRole } from "../config/eventPolicy.js";

async function logEvent({
  req,
  event_type,
  entity_type = null,
  entity_id = null,
  metadata = {},
}) {
  try {
    const user = req?.user || {};
    const user_id = user.id || null;
    const rawRole = user.activeRole || user.user_role || null;
    const user_role = normalizeRole(rawRole);
    let office_id = user.office_id ?? user.officeId ?? null;
    const source = "web";

    if (!user_id || !user_role) return;
    const policyEventType =
      event_type === "contract_open" || event_type === "contracts_list_view"
        ? "contract_view"
        : event_type === "payments_page_view"
          ? "payment_view"
          : event_type;

    if (!isEventAllowed(user_role, policyEventType)) return;

    const db = req?.pool || pool;

    if (
      !office_id &&
      (user_role === "office" || rawRole === "self_office_admin")
    ) {
      const officeRes = await db.query(
        `
        SELECT office_id FROM (
          SELECT id AS office_id, 1 AS priority
          FROM offices
          WHERE owner_id = $1 AND is_owner_office = true
          UNION ALL
          SELECT office_id, 2 AS priority
          FROM office_users
          WHERE user_id = $1
          UNION ALL
          SELECT id AS office_id, 3 AS priority
          FROM offices
          WHERE owner_id = $1 AND is_owner_office = false
        ) x
        ORDER BY priority
        LIMIT 1
        `,
        [user_id]
      );

      office_id = officeRes.rows[0]?.office_id || null;
    }

    const payload =
      metadata && typeof metadata === "object" ? metadata : { value: metadata };

    const defaultMeta = {
      route: req?.originalUrl || req?.url || null,
      method: req?.method || null,
      ip: req?.ip || req?.connection?.remoteAddress || null,
      user_agent: req?.headers?.["user-agent"] || null,
    };

    const mergedMeta = { ...defaultMeta, ...payload };

    await db.query(
      `
      INSERT INTO system_events
        (office_id, user_id, user_role, event_type, entity_type, entity_id, source, metadata, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        office_id,
        user_id,
        user_role,
        event_type,
        entity_type,
        entity_id,
        source,
        mergedMeta,
      ]
    );
  } catch (err) {
    // Fail silently per requirements.
  }
}

export { logEvent };
