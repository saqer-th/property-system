const SCORE_WEIGHTS = {
  dashboard_view: 5,
  contract_open: 10,
  contract_create: 20,
  report_pdf_download: 30,
  payment_paid: 40,
};

function buildScoreCase(alias = "se") {
  return `
    SUM(
      CASE ${alias}.event_type
        WHEN 'dashboard_view' THEN ${SCORE_WEIGHTS.dashboard_view}
        WHEN 'contract_open' THEN ${SCORE_WEIGHTS.contract_open}
        WHEN 'contract_create' THEN ${SCORE_WEIGHTS.contract_create}
        WHEN 'report_pdf_download' THEN ${SCORE_WEIGHTS.report_pdf_download}
        WHEN 'payment_paid' THEN ${SCORE_WEIGHTS.payment_paid}
        ELSE 0
      END
    )`;
}

async function getOverview(pool) {
  const totalOfficesRes = await pool.query("SELECT COUNT(*)::int AS total FROM offices");

  const activeOfficesRes = await pool.query(`
    SELECT COUNT(DISTINCT office_id)::int AS total
    FROM system_events
    WHERE office_id IS NOT NULL
      AND created_at >= NOW() - INTERVAL '7 days'
  `);

  const dormantOfficesRes = await pool.query(`
    WITH last_events AS (
      SELECT office_id, MAX(created_at) AS last_activity
      FROM system_events
      WHERE office_id IS NOT NULL
      GROUP BY office_id
    )
    SELECT COUNT(*)::int AS total
    FROM offices o
    LEFT JOIN last_events le ON le.office_id = o.id
    WHERE le.last_activity IS NULL
       OR le.last_activity < NOW() - INTERVAL '14 days'
  `);

  const totalEventsRes = await pool.query(`
    SELECT COUNT(*)::int AS total
    FROM system_events
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  return {
    total_offices: totalOfficesRes.rows[0].total,
    active_offices_7d: activeOfficesRes.rows[0].total,
    dormant_offices_14d: dormantOfficesRes.rows[0].total,
    total_events_30d: totalEventsRes.rows[0].total,
  };
}

async function getOfficesActivity(pool) {
  const scoreCase = buildScoreCase("se");
  const { rows } = await pool.query(`
    WITH last_events AS (
      SELECT office_id, MAX(created_at) AS last_activity_date
      FROM system_events
      WHERE office_id IS NOT NULL
      GROUP BY office_id
    ),
    events_30d AS (
      SELECT
        office_id,
        COUNT(*)::int AS events_count_30d,
        COUNT(DISTINCT event_type)::int AS distinct_features_used,
        ${scoreCase}::int AS usage_score
      FROM system_events se
      WHERE se.office_id IS NOT NULL
        AND se.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY office_id
    )
    SELECT
      o.id AS office_id,
      o.name AS office_name,
      le.last_activity_date,
      COALESCE(e30.events_count_30d, 0) AS events_count_30d,
      COALESCE(e30.distinct_features_used, 0) AS distinct_features_used,
      COALESCE(e30.usage_score, 0) AS usage_score,
      CASE
        WHEN le.last_activity_date IS NULL
          OR le.last_activity_date < NOW() - INTERVAL '14 days'
          THEN 'Dormant'
        WHEN COALESCE(e30.distinct_features_used, 0) >= 3
          THEN 'Active'
        WHEN COALESCE(e30.distinct_features_used, 0) >= 1
          THEN 'Semi-active'
        ELSE 'Dormant'
      END AS office_status,
      CASE
        WHEN COALESCE(e30.usage_score, 0) >= 100 THEN 'Ready to Pay'
        WHEN COALESCE(e30.usage_score, 0) >= 40 THEN 'Active'
        ELSE 'Low Usage'
      END AS usage_label
    FROM offices o
    LEFT JOIN last_events le ON le.office_id = o.id
    LEFT JOIN events_30d e30 ON e30.office_id = o.id
    ORDER BY o.id ASC
  `);

  return rows;
}

async function getTopFeatures(pool) {
  const { rows } = await pool.query(`
    SELECT
      event_type,
      COUNT(*)::int AS usage_count
    FROM system_events
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY event_type
    ORDER BY usage_count DESC, event_type ASC
  `);

  return rows;
}

async function getOfficeDetails(pool, officeId) {
  const scoreCase = buildScoreCase("se");
  const officeRes = await pool.query(
    `
    WITH last_events AS (
      SELECT office_id, MAX(created_at) AS last_activity_date
      FROM system_events
      WHERE office_id = $1
      GROUP BY office_id
    ),
    events_30d AS (
      SELECT
        office_id,
        COUNT(*)::int AS events_count_30d,
        COUNT(DISTINCT event_type)::int AS distinct_features_used,
        ${scoreCase}::int AS usage_score
      FROM system_events se
      WHERE se.office_id = $1
        AND se.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY office_id
    )
    SELECT
      o.id AS office_id,
      o.name AS office_name,
      le.last_activity_date,
      COALESCE(e30.events_count_30d, 0) AS events_count_30d,
      COALESCE(e30.distinct_features_used, 0) AS distinct_features_used,
      COALESCE(e30.usage_score, 0) AS usage_score,
      CASE
        WHEN le.last_activity_date IS NULL
          OR le.last_activity_date < NOW() - INTERVAL '14 days'
          THEN 'Dormant'
        WHEN COALESCE(e30.distinct_features_used, 0) >= 3
          THEN 'Active'
        WHEN COALESCE(e30.distinct_features_used, 0) >= 1
          THEN 'Semi-active'
        ELSE 'Dormant'
      END AS office_status,
      CASE
        WHEN COALESCE(e30.usage_score, 0) >= 100 THEN 'Ready to Pay'
        WHEN COALESCE(e30.usage_score, 0) >= 40 THEN 'Active'
        ELSE 'Low Usage'
      END AS usage_label
    FROM offices o
    LEFT JOIN last_events le ON le.office_id = o.id
    LEFT JOIN events_30d e30 ON e30.office_id = o.id
    WHERE o.id = $1
    `,
    [officeId]
  );

  if (!officeRes.rows.length) return null;

  const timelineRes = await pool.query(
    `
    SELECT
      created_at,
      event_type,
      entity_type,
      entity_id
    FROM system_events
    WHERE office_id = $1
    ORDER BY created_at DESC
    LIMIT 100
    `,
    [officeId]
  );

  return {
    office: officeRes.rows[0],
    timeline: timelineRes.rows,
  };
}

export { getOverview, getOfficesActivity, getTopFeatures, getOfficeDetails };
