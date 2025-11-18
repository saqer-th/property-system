import pool from "../db/pool.js";

/* =========================================================
   📌 1) PROPERTY REPORT
========================================================= */
export async function getPropertyReport(propertyId) {
  const client = await pool.connect();

  try {
    /* ============================================================
       1️⃣ جلب بيانات العقار الأساسية
    ============================================================ */
    const propertyRes = await client.query(
      `
      SELECT 
        p.id,
        p.property_type,
        p.property_usage,
        p.title_deed_no,
        p.city,
        p.national_address,
        p.num_units,
        p.office_id,

        o.name AS office_name
      FROM properties p
      LEFT JOIN offices o ON o.id = p.office_id
      WHERE p.id = $1
      `,
      [propertyId]
    );

    if (!propertyRes.rowCount) throw new Error("Property not found");

    const property = propertyRes.rows[0];

    /* ============================================================
       2️⃣ الوحدات المرتبطة بالعقار
    ============================================================ */
    const unitsRes = await client.query(
      `
      SELECT 
        id,
        unit_no,
        unit_type,
        unit_area,
        electric_meter_no,
        water_meter_no
      FROM units
      WHERE property_id = $1
      ORDER BY unit_no::int
      `,
      [propertyId]
    );

    const units = unitsRes.rows;

    /* ============================================================
       3️⃣ العقود الخاصة بالعقار (مع المستأجر)
    ============================================================ */
    const contractsRes = await client.query(
      `
      SELECT DISTINCT ON (c.id)
        c.id,
        c.contract_no,
        to_char(c.tenancy_start,'YYYY-MM-DD') AS tenancy_start,
        to_char(c.tenancy_end,'YYYY-MM-DD') AS tenancy_end,
        c.total_contract_value,
        c.annual_rent,

        CASE 
          WHEN c.tenancy_end >= NOW() THEN 'نشط'
          ELSE 'منتهي'
        END AS status,

        (
          SELECT pt.name 
          FROM contract_parties cp2
          JOIN parties pt ON pt.id = cp2.party_id
          WHERE cp2.contract_id = c.id 
            AND LOWER(cp2.role) IN ('tenant','مستأجر','مستاجر')
          LIMIT 1
        ) AS tenant_name

      FROM contracts c
      WHERE c.property_id = $1
      ORDER BY c.id, c.tenancy_start DESC
      `,
      [propertyId]
    );

    const contracts = contractsRes.rows;

    /* ============================================================
       4️⃣ المصروفات الخاصة بالعقار أو عقوده أو وحداته
    ============================================================ */
    const expensesRes = await client.query(
      `
      SELECT 
        id,
        amount,
        expense_type,
        notes,
        to_char(date,'YYYY-MM-DD') AS date
      FROM expenses
      WHERE property_id = $1
         OR contract_id IN (SELECT id FROM contracts WHERE property_id = $1)
         OR unit_id IN (SELECT id FROM units WHERE property_id = $1)
      ORDER BY date DESC
      `,
      [propertyId]
    );

    const expenses = expensesRes.rows;

    /* ============================================================
       5️⃣ السندات الخاصة بالعقار
    ============================================================ */
    const receiptsRes = await client.query(
      `
      SELECT
        id,
        receipt_type,
        amount,
        to_char(date,'YYYY-MM-DD') AS date
      FROM receipts
      WHERE property_id = $1
         OR contract_id IN (SELECT id FROM contracts WHERE property_id = $1)
         OR unit_id IN (SELECT id FROM units WHERE property_id = $1)
      ORDER BY date DESC
      `,
      [propertyId]
    );

    const receipts = receiptsRes.rows;

    /* ============================================================
       6️⃣ Summary Section (تجميعي)
    ============================================================ */
    const summary = {
      units_count: units.length,
      contracts_count: contracts.length,
      expenses_count: expenses.length,
      receipts_count: receipts.length,

      total_expenses: expenses.reduce(
        (s, e) => s + Number(e.amount || 0),
        0
      ),

      total_receipts_income: receipts
        .filter((r) => r.receipt_type === "قبض")
        .reduce((s, r) => s + Number(r.amount || 0), 0),

      total_receipts_expense: receipts
        .filter((r) => r.receipt_type === "صرف")
        .reduce((s, r) => s + Number(r.amount || 0), 0),
    };

    /* ============================================================
       7️⃣ RETURN FINAL
    ============================================================ */
    return {
      type: "property",
      generated_at: new Date().toISOString(),

      property,
      units,
      contracts,
      expenses,
      receipts,

      summary,
    };

  } finally {
    client.release();
  }
}


/* =========================================================
   📌 2) UNIT REPORT
========================================================= */
export async function getUnitReport(unitId) {
  const client = await pool.connect();

  try {
    /* ============================================================
       1️⃣ الوحدة + العقار + المكتب
    ============================================================ */
    const unitRes = await client.query(
      `
      SELECT 
        u.id AS unit_id,
        u.unit_no,
        u.unit_type,
        u.unit_area,
        u.electric_meter_no,
        u.water_meter_no,

        p.id AS property_id,
        p.property_type,
        p.property_usage,
        p.title_deed_no,
        p.city,
        p.national_address,
        p.num_units,

        o.id AS office_id,
        o.name AS office_name
      FROM units u
      LEFT JOIN properties p ON p.id = u.property_id
      LEFT JOIN offices o ON o.id = p.office_id
      WHERE u.id = $1
      `,
      [unitId]
    );

    if (!unitRes.rowCount) throw new Error("Unit not found");

    const unit = unitRes.rows[0];

    /* ============================================================
       2️⃣ كل العقود التي مرت على الوحدة
    ============================================================ */
    const contractsRes = await client.query(
      `
      SELECT 
        c.id,
        c.contract_no,
        to_char(c.tenancy_start,'YYYY-MM-DD') AS tenancy_start,
        to_char(c.tenancy_end,'YYYY-MM-DD') AS tenancy_end,
        c.annual_rent,
        c.total_contract_value,
        case
          when CURRENT_DATE BETWEEN c.tenancy_start AND c.tenancy_end then 'نشط'
          else 'منتهي'
        end AS contract_status
      

      FROM contract_units cu
      JOIN contracts c ON c.id = cu.contract_id
      WHERE cu.unit_id = $1
      ORDER BY c.tenancy_start DESC
      `,
      [unitId]
    );

    const contracts = contractsRes.rows;

    /* ============================================================
       3️⃣ العقد النشط
    ============================================================ */
    const activeContract = contracts.find((c) => {
      const today = new Date();
      return (
        today >= new Date(c.tenancy_start) &&
        today <= new Date(c.tenancy_end)
      );
    });

    const unitStatus = activeContract ? "occupied" : "vacant";

    /* ============================================================
       4️⃣ كل الدفعات (Payments) مع العقد والوحدة
    ============================================================ */
    const paymentsRes = await client.query(
      `
      SELECT 
        p.id,
        p.contract_id,
        c.contract_no,

        p.amount,
        COALESCE(p.paid_amount,0)  AS paid_amount,
        (p.amount - COALESCE(p.paid_amount,0)) AS remaining_amount,

        to_char(p.due_date,'YYYY-MM-DD') AS due_date,

        p.status,

        -- UNIT INFO
        u.unit_no,
        u.unit_type,

        -- PROPERTY INFO
        pr.property_type AS property_name

      FROM payments p
      JOIN contracts c ON c.id = p.contract_id
      LEFT JOIN contract_units cu ON cu.contract_id = p.contract_id
      LEFT JOIN units u ON u.id = cu.unit_id
      LEFT JOIN properties pr ON pr.id = c.property_id

      WHERE cu.unit_id = $1
      ORDER BY p.due_date ASC
      `,
      [unitId]
    );

    const payments = paymentsRes.rows;

    /* ============================================================
       5️⃣ السندات (Receipts) الخاصة بالوحدة
    ============================================================ */
    const receiptsRes = await client.query(
      `
      SELECT 
  r.id,
  r.receipt_type,
  r.reference_no,
  r.payer,
  r.receiver,
  r.amount,
  to_char(r.date,'YYYY-MM-DD') AS date,

  -- UNIT
  u.unit_no,
  u.unit_type,

  -- PROPERTY
  pr.property_type AS property_name

FROM receipts r
LEFT JOIN contract_units cu ON cu.contract_id = r.contract_id
LEFT JOIN units u ON u.id = cu.unit_id
LEFT JOIN properties pr ON pr.id = r.property_id

WHERE r.contract_id IN (
    SELECT contract_id 
    FROM contract_units 
    WHERE unit_id = $1
)

ORDER BY r.date DESC;
      `,
      [unitId]
    );

    const receipts = receiptsRes.rows;

    /* ============================================================
       6️⃣ مصروفات الوحدة (Expenses)
    ============================================================ */
    const expensesRes = await client.query(
      `
      SELECT 
        e.id,
        e.expense_type,
        e.amount,
        e.on_whom,
        e.paid_by,
        e.notes,
        to_char(e.date,'YYYY-MM-DD') AS date
      FROM expenses e
      WHERE e.unit_id = $1
      ORDER BY e.date DESC
      `,
      [unitId]
    );

    const expenses = expensesRes.rows;

    /* ============================================================
       7️⃣ Summary (الإحصائيات)
    ============================================================ */

    const totalExpectedPayments = payments.reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );

    const totalPaidPayments = payments.reduce(
      (s, p) => s + Number(p.paid_amount || 0),
      0
    );

    const totalRemainingPayments =
      totalExpectedPayments - totalPaidPayments;

    const totalReceiptsCollected = receipts
      .filter((r) => r.receipt_type === "قبض")
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const totalReceiptsExpenses = receipts
      .filter((r) => r.receipt_type === "صرف")
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const totalExpenses = expenses.reduce(
      (s, e) => s + Number(e.amount || 0),
      0
    );

    const summary = {
      contracts_count: contracts.length,
      payments_count: payments.length,
      expenses_count: expenses.length,
      receipts_count: receipts.length,

      expected_payments: totalExpectedPayments,
      paid_payments: totalPaidPayments,
      remaining_payments: totalRemainingPayments,

      receipts_income: totalReceiptsCollected,
      receipts_expenses: totalReceiptsExpenses,

      total_expenses: totalExpenses,
    };

    /* ============================================================
       8️⃣ RETURN FINAL RESULT
    ============================================================ */
    return {
      type: "unit",
      generated_at: new Date().toISOString(),

      unit: {
        ...unit,
        status: unitStatus,
        active_contract: activeContract || null,
      },

      summary,
      contracts,
      payments,
      receipts,
      expenses
    };
  } finally {
    client.release();
  }
}






/* =========================================================
   📌 3) CONTRACT REPORT
========================================================= */
export async function getContractReport(contractId) {
  const client = await pool.connect();
  try {
    /* ============================================================
        1) CONTRACT BASE DATA
    ============================================================ */
    const contractRes = await client.query(
      `
      SELECT 
        c.*,
        p.property_type,
        p.property_usage,
        p.title_deed_no,
        p.national_address,
        p.city,
        p.num_units,
        o.name AS office_name,
        o.id AS office_id
      FROM contracts c
      LEFT JOIN properties p ON p.id = c.property_id
      LEFT JOIN offices o ON o.id = c.office_id
      WHERE c.id = $1
    `,
      [contractId]
    );

    if (!contractRes.rowCount) throw new Error("Contract not found");

    const contract = contractRes.rows[0];

    /* ============================================================
        2) TENANTS
    ============================================================ */
    const tenants = await client.query(
      `
      SELECT pt.name, pt.national_id, pt.phone
      FROM parties pt
      JOIN contract_parties cp ON cp.party_id = pt.id
      WHERE cp.contract_id = $1
        AND LOWER(cp.role) IN ('tenant','مستأجر','مستاجر')
    `,
      [contractId]
    );

    /* ============================================================
        3) LESSORS
    ============================================================ */
    const lessors = await client.query(
      `
      SELECT pt.name, pt.national_id, pt.phone
      FROM parties pt
      JOIN contract_parties cp ON cp.party_id = pt.id
      WHERE cp.contract_id = $1
        AND LOWER(cp.role) IN ('lessor','مالك','مؤجر')
    `,
      [contractId]
    );

    /* ============================================================
        4) CONTRACT UNITS
    ============================================================ */
    const units = await client.query(
      `
      SELECT 
        u.id,
        u.unit_no,
        u.unit_type,
        u.unit_area,
        u.electric_meter_no,
        u.water_meter_no
      FROM contract_units cu
      JOIN units u ON u.id = cu.unit_id
      WHERE cu.contract_id = $1
    `,
      [contractId]
    );

    /* ============================================================
        5) PAYMENTS (WITH UNIT + PROPERTY)
    ============================================================ */
    const payments = await client.query(
      `
SELECT 
  p.id,
  p.due_date,
  p.amount,
  COALESCE(p.paid_amount,0) AS paid_amount,
  (p.amount - COALESCE(p.paid_amount,0)) AS remaining_amount,
  p.status,

  -- UNIT
  u.unit_no,
  u.unit_type,

  -- PROPERTY
  pr.property_type AS property_name

FROM payments p
LEFT JOIN contracts c ON c.id = p.contract_id         -- ← الربط الصحيح
LEFT JOIN contract_units cu ON cu.contract_id = p.contract_id
LEFT JOIN units u ON u.id = cu.unit_id
LEFT JOIN properties pr ON pr.id = c.property_id       -- ← property من العقود

WHERE p.contract_id = $1
ORDER BY p.due_date ASC
    `,
      [contractId]
    );

    /* ============================================================
        6) RECEIPTS (WITH UNIT + PROPERTY)
    ============================================================ */
    const receipts = await client.query(
      `
      SELECT 
        r.id,
        r.receipt_type,
        r.reference_no,
        r.payer,
        r.receiver,
        r.amount,
        r.date,

        -- UNIT
        u.unit_no,
        u.unit_type,

        -- PROPERTY
        pr.property_type AS property_name

      FROM receipts r
      LEFT JOIN contract_units cu ON cu.contract_id = r.contract_id
      LEFT JOIN units u ON u.id = cu.unit_id
      LEFT JOIN properties pr ON pr.id = r.property_id

      WHERE r.contract_id = $1
      ORDER BY r.date DESC
    `,
      [contractId]
    );

    /* ============================================================
        7) TOTALS (READY FOR FRONTEND)
    ============================================================ */
    const totalExpected = payments.rows.reduce(
      (s, r) => s + Number(r.amount || 0),
      0
    );

    const totalCollected = receipts.rows
      .filter((r) => r.receipt_type === "قبض")
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const totalRemaining = totalExpected - totalCollected;

    const totalExpenses = receipts.rows
      .filter((r) => r.receipt_type === "صرف")
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    return {
      contract,
      tenants: tenants.rows,
      lessors: lessors.rows,
      units: units.rows,
      payments: payments.rows,
      receipts: receipts.rows,

      totals: {
        expected: totalExpected,
        collected: totalCollected,
        remaining: totalRemaining,
        expenses: totalExpenses,
      },
    };
  } finally {
    client.release();
  }
}


/* =========================================================
   📌 4) PAYMENTS REPORT (للتحصيل)
========================================================= */
export async function getContractPaymentsReport(contractId) {
  const client = await pool.connect();
  try {
    /* ───────────────────────────────────────────
       1) جلب بيانات العقد + العقار + المكتب
    ─────────────────────────────────────────── */
    const contractRes = await client.query(
      `
      SELECT 
        c.id,
        c.contract_no,
        c.tenancy_start,
        c.tenancy_end,
        c.total_contract_value,

        o.name AS office_name,

        p.property_type,
        p.property_usage,
        p.title_deed_no,
        p.city,
        p.national_address

      FROM contracts c
      LEFT JOIN offices o ON o.id = c.office_id
      LEFT JOIN properties p ON p.id = c.property_id
      WHERE c.id = $1
      `,
      [contractId]
    );

    if (!contractRes.rowCount) {
      return null;
    }

    const contract = contractRes.rows[0];

    /* ───────────────────────────────────────────
       2) المستأجرين (Tenant)
    ─────────────────────────────────────────── */
    const tenantsRes = await client.query(
      `
        SELECT pt.name as tenant_name, pt.phone, pt.national_id
        FROM parties pt
        JOIN contract_parties cp ON cp.party_id = pt.id
        WHERE cp.contract_id = $1
        AND LOWER(cp.role) IN ('tenant','مستأجر','مستاجر')
      `,
      [contractId]
    );

    const tenant = tenantsRes.rows[0] || null;

    /* ───────────────────────────────────────────
       3) الملاك (Lessor)
    ─────────────────────────────────────────── */
    const lessorsRes = await client.query(
      `
        SELECT pt.name, pt.phone, pt.national_id
        FROM parties pt
        JOIN contract_parties cp ON cp.party_id = pt.id
        WHERE cp.contract_id = $1
        AND LOWER(cp.role) IN ('lessor','مالك','مؤجر')
      `,
      [contractId]
    );

    const lessor = lessorsRes.rows[0] || null;

    /* ───────────────────────────────────────────
       4) الوحدة المرتبطة بالعقد
    ─────────────────────────────────────────── */
    const unitsRes = await client.query(
      `
        SELECT 
          u.unit_no,
          u.unit_type,
          u.unit_area,
          u.electric_meter_no,
          u.water_meter_no
        FROM contract_units cu
        JOIN units u ON u.id = cu.unit_id
        WHERE cu.contract_id = $1
      `,
      [contractId]
    );

    const unit = unitsRes.rows[0] || null;

    /* ───────────────────────────────────────────
       5) الدفعات + بيانات المستأجر
    ─────────────────────────────────────────── */
    const paymentsRes = await client.query(
      `
        SELECT 
          p.id,
          TO_CHAR(p.due_date, 'YYYY-MM-DD') AS due_date,
          p.amount,
          COALESCE(p.paid_amount, 0) AS paid_amount,
          (p.amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
          p.status,
          c.contract_no,
          t.name AS tenant_name
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        LEFT JOIN contract_parties cp 
          ON cp.contract_id = c.id 
          AND LOWER(cp.role) IN ('tenant','مستأجر','مستاجر')
        LEFT JOIN parties t ON t.id = cp.party_id
        WHERE p.contract_id = $1
        ORDER BY p.due_date ASC
      `,
      [contractId]
    );

    const payments = paymentsRes.rows;

    /* ───────────────────────────────────────────
       6) الحسابات المالية
    ─────────────────────────────────────────── */
    const totalAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
    const totalRemaining = totalAmount - totalPaid;

    /* ───────────────────────────────────────────
       7) إخراج التقرير النهائي
    ─────────────────────────────────────────── */
    return {
      /* عقد */
      contract: {
        contract_no: contract.contract_no,
        tenancy_start: contract.tenancy_start,
        tenancy_end: contract.tenancy_end,
        total_contract_value: contract.total_contract_value,
        office_name: contract.office_name,
      },

      /* مستأجر */
      tenant,

      /* مالك */
      lessor,

      /* وحدة */
      unit,

      /* عقار */
      property: {
        property_type: contract.property_type,
        property_usage: contract.property_usage,
        title_deed_no: contract.title_deed_no,
        city: contract.city,
        national_address: contract.national_address,
      },

      /* دفعات */
      payments,

      /* أرقام */
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_remaining: totalRemaining,
    };
  } finally {
    client.release();
  }
}



/* =========================================================
   📌 5) EXPENSES REPORT
========================================================= */
export async function getContractExpensesReport(contractId) {
  const client = await pool.connect();

  try {
    /* ─────────────────────────────────────
       1) بيانات العقد + العقار + المكتب
    ───────────────────────────────────── */
    const contractRes = await client.query(
      `
      SELECT 
        c.contract_no,
        c.tenancy_start,
        c.tenancy_end,
        c.total_contract_value,

        o.name AS office_name,

        p.property_type,
        p.property_usage,
        p.title_deed_no,
        p.city,
        p.national_address

      FROM contracts c
      LEFT JOIN offices o ON o.id = c.office_id
      LEFT JOIN properties p ON p.id = c.property_id
      WHERE c.id = $1
      `,
      [contractId]
    );

    if (!contractRes.rowCount) return null;
    const contract = contractRes.rows[0];

    /* ─────────────────────────────────────
       2) المستأجر
    ───────────────────────────────────── */
    const tenantRes = await client.query(
      `
      SELECT pt.name, pt.phone
      FROM parties pt
      JOIN contract_parties cp ON cp.party_id = pt.id
      WHERE cp.contract_id = $1
        AND LOWER(cp.role) IN ('tenant','مستأجر','مستاجر')
      `,
      [contractId]
    );
    const tenant = tenantRes.rows[0] || null;

    /* ─────────────────────────────────────
       3) المالك
    ───────────────────────────────────── */
    const lessorRes = await client.query(
      `
      SELECT pt.name, pt.phone
      FROM parties pt
      JOIN contract_parties cp ON cp.party_id = pt.id
      WHERE cp.contract_id = $1
        AND LOWER(cp.role) IN ('lessor','مالك','مؤجر')
      `,
      [contractId]
    );
    const lessor = lessorRes.rows[0] || null;

    /* ─────────────────────────────────────
       4) الوحدة
    ───────────────────────────────────── */
    const unitRes = await client.query(
      `
      SELECT 
        u.unit_no,
        u.unit_type,
        u.unit_area,
        u.electric_meter_no,
        u.water_meter_no
      FROM contract_units cu
      JOIN units u ON u.id = cu.unit_id
      WHERE cu.contract_id = $1
      `,
      [contractId]
    );
    const unit = unitRes.rows[0] || null;

    /* ─────────────────────────────────────
       5) المصروفات
    ───────────────────────────────────── */
    const expensesRes = await client.query(
      `
      SELECT 
        e.id,
        e.amount,
        e.expense_type,
        e.on_whom,
        e.paid_by,
        e.notes,
        TO_CHAR(e.date, 'YYYY-MM-DD') AS date
      FROM expenses e
      WHERE e.contract_id = $1
      ORDER BY e.date DESC
      `,
      [contractId]
    );

    const expenses = expensesRes.rows;

    /* ─────────────────────────────────────
       6) الحسابات
    ───────────────────────────────────── */
    const totalAmount = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const highestExpense = expenses.length
      ? Math.max(...expenses.map((e) => Number(e.amount)))
      : 0;
    const averageExpense = expenses.length
      ? Number(totalAmount / expenses.length).toFixed(2)
      : 0;

    /* ─────────────────────────────────────
       7) مصاريف آخر 6 أشهر
    ───────────────────────────────────── */
    const monthlyStats = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      const sum = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + Number(e.amount), 0);

      monthlyStats.push({
        month: key,
        total: sum,
      });
    }
    monthlyStats.reverse();

    /* ─────────────────────────────────────
       8) الإرجاع النهائي
    ───────────────────────────────────── */
    return {
      contract,
      tenant,
      lessor,
      unit,
      property: {
        property_type: contract.property_type,
        property_usage: contract.property_usage,
        title_deed_no: contract.title_deed_no,
        city: contract.city,
        national_address: contract.national_address,
      },

      expenses,
      total_expenses: totalAmount,
      highest_expense: highestExpense,
      average_expense: averageExpense,
      monthly_stats: monthlyStats,
    };
  } finally {
    client.release();
  }
}


/* =========================================================
   📌 6) RECEIPTS REPORT
========================================================= */
export async function getReceiptsReport(officeId) {
  const receipts = await pool.query(
    `
      SELECT 
        r.*, 
        c.contract_no,
        t.name AS tenant_name
      FROM receipts r
      LEFT JOIN contracts c ON c.id = r.contract_id
      LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND cp.role='tenant'
      LEFT JOIN parties t ON t.id = cp.party_id
      WHERE c.office_id = $1
      ORDER BY r.date DESC
    `,
    [officeId]
  );

  return { receipts: receipts.rows };
}

/* =========================================================
   📌 7) MAINTENANCE REPORT
========================================================= */
export async function getMaintenanceReport(officeId) {
  const records = await pool.query(
    `
      SELECT 
        m.*,
        u.unit_no,
        p.title_deed_no
      FROM maintenance m
      LEFT JOIN units u ON u.id = m.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      WHERE m.office_id = $1
      ORDER BY m.date DESC
    `,
    [officeId]
  );

  return { maintenance: records.rows };
}

/* =========================================================
   📌 8) OCCUPANCY REPORT (نسبة الإشغال)
========================================================= */
export async function getOccupancyReport(userId) {
  // 1️⃣ حدد المكتب الخاص بالمستخدم (owner or employee)
  const officeQuery = `
    SELECT id FROM offices WHERE owner_id = $1
    UNION
    SELECT office_id FROM office_users WHERE user_id = $1
  `;

  const officeResult = await pool.query(officeQuery, [userId]);
  if (officeResult.rowCount === 0) {
    return {
      total_units: 0,
      occupied_units: 0,
      empty_units: 0,
      occupancy_rate: 0,
      units: [],
    };
  }

  const officeId = officeResult.rows[0].id;

  // 2️⃣ جلب الوحدات وحالة الإشغال
  const units = await pool.query(
    `
      SELECT 
        u.id,
        u.unit_no,
        u.unit_type,
        p.title_deed_no AS property_name,
        p.property_type,
        p.city,
        (
          SELECT COUNT(*)
          FROM contract_units cu
          JOIN contracts c ON c.id = cu.contract_id
          WHERE cu.unit_id = u.id
          AND c.tenancy_start <= NOW()
          AND c.tenancy_end >= NOW()
        ) AS occupied
      FROM units u
      JOIN properties p ON p.id = u.property_id
      WHERE p.office_id = $1
      ORDER BY p.id, u.unit_no::int
    `,
    [officeId]
  );

  const total = units.rowCount;
  const occupied = units.rows.filter((u) => u.occupied > 0).length;
  const empty = total - occupied;

  return {
    total_units: total,
    occupied_units: occupied,
    empty_units: empty,
    occupancy_rate: total ? ((occupied / total) * 100).toFixed(2) : 0,
    units: units.rows.map((u) => ({
      ...u,
      occupied: u.occupied > 0 ? 1 : 0,
    })),
  };
}

/* =========================================================
   📌 9) PROFIT REPORT (صافي الربح)
========================================================= */
export async function fetchProfitReport(userId, query) {
  let { property_id, unit_id, from, to, rate = 0, rate_type = "income" } = query;

  if (unit_id) unit_id = parseInt(unit_id);
  if (property_id) property_id = parseInt(property_id);

  const UNIT_MODE = !!unit_id;
  if (UNIT_MODE) property_id = null;

  /* ============================================================
        OFFICE FILTERS
  ============================================================ */
  const officeFilterC = `
    (
      c.office_id IN (SELECT id FROM offices WHERE owner_id = $1)
      OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $1)
    )
  `;
  const officeFilterE = `
    (
      e.office_id IN (SELECT id FROM offices WHERE owner_id = $1)
      OR e.office_id IN (SELECT office_id FROM office_users WHERE user_id = $1)
    )
  `;
  const officeFilterR = `
    (
      r.office_id IN (SELECT id FROM offices WHERE owner_id = $1)
      OR r.office_id IN (SELECT office_id FROM office_users WHERE user_id = $1)
    )
  `;

  const addDates = (params, filters, alias, col = "date") => {
    if (from && to) {
      params.push(from, to);
      filters.push(`${alias}.${col} BETWEEN $${params.length - 1} AND $${params.length}`);
    }
  };

  /* ============================================================
       1) PAYMENTS (EXPECTED INCOME)
  ============================================================ */
  let payParams = [userId];
  let payFilters = [officeFilterC];

  if (UNIT_MODE) {
    payParams.push(unit_id);
    payFilters.push(`
      c.id IN (SELECT contract_id FROM contract_units WHERE unit_id = $${payParams.length})
    `);
  } else if (property_id) {
    payParams.push(property_id);
    payFilters.push(`c.property_id = $${payParams.length}`);
  }

  addDates(payParams, payFilters, "p", "due_date");

  const paymentsQuery = `
    SELECT 
      p.*,
      c.contract_no,
      pr.property_type AS property_name,
      u.unit_no,
      t.name AS tenant_name
    FROM payments p
    JOIN contracts c ON c.id = p.contract_id
    LEFT JOIN properties pr ON pr.id = c.property_id
    LEFT JOIN contract_units cu ON cu.contract_id = c.id
    LEFT JOIN units u ON u.id = cu.unit_id
    LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND LOWER(cp.role)='tenant'
    LEFT JOIN parties t ON t.id = cp.party_id
    WHERE ${payFilters.join(" AND ")}
    ORDER BY p.due_date DESC
  `;

  const paymentsRes = await pool.query(paymentsQuery, payParams);

  const expectedIncome = paymentsRes.rows.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  /* ============================================================
       2) EXPENSES
  ============================================================ */
  let expParams = [userId];
  let expFilters = [officeFilterE];

  addDates(expParams, expFilters, "e");

  if (UNIT_MODE) {
    expParams.push(unit_id);
    const idx = expParams.length;
    expFilters.push(`
      (e.unit_id = $${idx} OR e.contract_id IN (SELECT contract_id FROM contract_units WHERE unit_id = $${idx}))
    `);
  } else if (property_id) {
    expParams.push(property_id);
    const idx = expParams.length;
    expFilters.push(`
      (
        e.property_id = $${idx}
        OR e.unit_id IN (SELECT id FROM units WHERE property_id = $${idx})
        OR e.contract_id IN (SELECT id FROM contracts WHERE property_id = $${idx})
        OR e.contract_id IN (
          SELECT cu.contract_id
          FROM contract_units cu JOIN contracts c ON c.id = cu.contract_id
          WHERE c.property_id = $${idx}
        )
      )
    `);
  }

  const expensesQuery = `
    SELECT 
      e.*,
      c.contract_no,
      COALESCE(u1.unit_no, u2.unit_no, '-') AS unit_no,
      pr.property_type AS property_name
    FROM expenses e
    LEFT JOIN contracts c ON c.id = e.contract_id
    LEFT JOIN properties pr ON pr.id = e.property_id
    LEFT JOIN units u1 ON u1.id = e.unit_id
    LEFT JOIN contract_units cu ON cu.contract_id = e.contract_id
    LEFT JOIN units u2 ON u2.id = cu.unit_id
    WHERE ${expFilters.join(" AND ")}
    ORDER BY e.date DESC
  `;

  const expensesRes = await pool.query(expensesQuery, expParams);
  let totalExpenses = expensesRes.rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  /* ============================================================
       3) RECEIPTS – ONLY قبض
  ============================================================ */
  let incParams = [userId];
  let incFilters = [officeFilterR];

  addDates(incParams, incFilters, "r");

  if (UNIT_MODE) {
    incParams.push(unit_id);
    const idx = incParams.length;
    incFilters.push(`
      (r.unit_id = $${idx} OR r.contract_id IN (SELECT contract_id FROM contract_units WHERE unit_id = $${idx}))
    `);
  } else if (property_id) {
    incParams.push(property_id);
    const idx = incParams.length;
    incFilters.push(`
      (
        r.property_id = $${idx}
        OR r.unit_id IN (SELECT id FROM units WHERE property_id = $${idx})
        OR r.contract_id IN (SELECT id FROM contracts WHERE property_id = $${idx})
        OR r.contract_id IN (
          SELECT cu.contract_id
          FROM contract_units cu JOIN contracts c ON c.id = cu.contract_id
          WHERE c.property_id = $${idx}
        )
      )
    `);
  }

  const incomeQuery = `
    SELECT 
      r.amount,
      r.date AS due_date,
      c.contract_no,
      t.name AS tenant_name
    FROM receipts r
    LEFT JOIN contracts c ON c.id = r.contract_id
    LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND LOWER(cp.role)='tenant'
    LEFT JOIN parties t ON t.id = cp.party_id
    WHERE r.receipt_type='قبض' AND ${incFilters.join(" AND ")}
    ORDER BY r.date DESC
  `;

  const incomeRes = await pool.query(incomeQuery, incParams);
  const totalCollected = incomeRes.rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  /* ============================================================
       4) ALL RECEIPTS (قبض + صرف + تسوية)
  ============================================================ */
  let recParams = [userId];
  let recFilters = [officeFilterR];

  addDates(recParams, recFilters, "r");

  if (UNIT_MODE) {
    recParams.push(unit_id);
    const idx = recParams.length;
    recFilters.push(`
      (r.unit_id = $${idx} OR r.contract_id IN (SELECT contract_id FROM contract_units WHERE unit_id = $${idx}))
    `);
  } else if (property_id) {
    recParams.push(property_id);
    const idx = recParams.length;
    recFilters.push(`
      (
        r.property_id = $${idx}
        OR r.unit_id IN (SELECT id FROM units WHERE property_id = $${idx})
        OR r.contract_id IN (SELECT id FROM contracts WHERE property_id = $${idx})
        OR r.contract_id IN (
          SELECT cu.contract_id
          FROM contract_units cu JOIN contracts c ON c.id = cu.contract_id
          WHERE c.property_id = $${idx}
        )
      )
    `);
  }

  const receiptsQuery = `
    SELECT 
    r.receipt_type,
    r.reference_no,
    r.amount,
    r.date,
    r.reason,
    COALESCE(p.property_type, '-') AS property_name,
    COALESCE(u1.unit_no, u2.unit_no, '-') AS unit_no,
    c.contract_no,
    t.name AS tenant_name,
    r.payer,
    r.receiver
  FROM receipts r
  LEFT JOIN contracts c ON c.id = r.contract_id
  LEFT JOIN units u1 ON u1.id = r.unit_id
  LEFT JOIN contract_units cu ON cu.contract_id = r.contract_id
  LEFT JOIN units u2 ON u2.id = cu.unit_id
  LEFT JOIN properties p 
    ON p.id = r.property_id 
    OR p.id = c.property_id
    OR p.id = u2.property_id
  LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND LOWER(cp.role)='tenant'
  LEFT JOIN parties t ON t.id = cp.party_id
  WHERE ${recFilters.join(" AND ")}
  ORDER BY r.date DESC
  `;

  const receiptsRes = await pool.query(receiptsQuery, recParams);

  /* ============================================================
      Add (صرف) to Expenses
  ============================================================ */
  const receiptsExpenses = receiptsRes.rows
    .filter(r => r.receipt_type === "صرف")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  totalExpenses += receiptsExpenses;

  /* ============================================================
       SUMMARY
  ============================================================ */
  const netProfit = totalCollected - totalExpenses;

  let officeFee = 0;
  if (rate > 0) {
    if (rate_type === "income") officeFee = (totalCollected * rate) / 100;
    if (rate_type === "profit") officeFee = (netProfit * rate) / 100;
  }

  /* ============================================================
       PROPERTY + UNIT NAMES
  ============================================================ */
  const propertyName = paymentsRes.rows[0]?.property_name || null;
  const unitName = UNIT_MODE ? paymentsRes.rows[0]?.unit_no : "All Units";

  /* ============================================================
       RETURN
  ============================================================ */
  return {
    period_from: from,
    period_to: to,

    property_name: propertyName,
    unit_name: unitName,

    expected_income: expectedIncome,
    total_expenses: totalExpenses,
    total_collected: totalCollected,
    net_profit: netProfit,

    office_fee: officeFee,
    rate: Number(rate),
    rate_type,

    payments: paymentsRes.rows,
    income_rows: incomeRes.rows,
    expense_rows: expensesRes.rows,
    receipt_rows: receiptsRes.rows,
  };
}

export async function fetchPaymentReport(userId, { from, to }) {
  const officeQuery = `
    SELECT id FROM offices WHERE owner_id = $1
    UNION
    SELECT office_id FROM office_users WHERE user_id = $1
  `;
  const offices = await pool.query(officeQuery, [userId]);

  if (offices.rowCount === 0) {
    return {
      payments: [],
      payments_count: 0,
      contracts_count: 0,
      total_amount: 0,
    };
  }

  const officeId = offices.rows[0].id;

  const paymentsQuery = `
    SELECT 
      p.*,
      to_char(p.due_date, 'YYYY-MM-DD') AS due_date,
      c.contract_no,
      pr.property_type AS property_name,
      u.unit_no,
      t.name AS tenant_name,
      t.phone AS tenant_phone
    FROM payments p
    JOIN contracts c ON c.id = p.contract_id
    LEFT JOIN properties pr ON pr.id = c.property_id
    LEFT JOIN contract_units cu ON cu.contract_id = c.id
    LEFT JOIN units u ON u.id = cu.unit_id
    LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND LOWER(cp.role)='tenant'
    LEFT JOIN parties t ON t.id = cp.party_id
    WHERE c.office_id = $1
      AND p.due_date BETWEEN $2 AND $3
    ORDER BY p.due_date DESC
  `;

  const payments = await pool.query(paymentsQuery, [officeId, from, to]);

  const total_amount = payments.rows.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const uniqueContracts = new Set(payments.rows.map((p) => p.contract_id));

  return {
    from,
    to,
    payments: payments.rows,
    payments_count: payments.rowCount,
    contracts_count: uniqueContracts.size,
    total_amount,
  };
}

export async function fetchExpenseReport(userId, { from, to }) {
  const officeQuery = `
    SELECT id FROM offices WHERE owner_id = $1
    UNION
    SELECT office_id FROM office_users WHERE user_id = $1
  `;
  const offices = await pool.query(officeQuery, [userId]);

  if (offices.rowCount === 0) {
    return {
      expenses: [],
      expenses_count: 0,
      total_amount: 0,
      properties_count: 0,
      units_count: 0,
      contracts_count: 0,
    };
  }

  const expensesQuery = `
    SELECT 
      e.id, e.expense_scope, e.description, e.amount, e.expense_type,
      e.paid_by, e.on_whom, e.settlement_type, e.settlement_timing, to_char(e.date, 'YYYY-MM-DD') AS date,
      e.property_id, e.unit_id, e.contract_id, 
      COALESCE(c.office_id, p.office_id, e.office_id) AS office_id,
      p.property_type AS property_name, 
      u.unit_no, 
      c.contract_no,
      (
        SELECT name 
        FROM offices 
        WHERE id = COALESCE(c.office_id, p.office_id, e.office_id)
      ) AS office_name
    FROM expenses e
    LEFT JOIN contracts c ON c.id = e.contract_id
    LEFT JOIN properties p ON p.id = e.property_id
    LEFT JOIN units u ON u.id = e.unit_id
    WHERE 
      COALESCE(c.office_id, p.office_id, e.office_id) IN (
        SELECT id FROM offices WHERE owner_id = $1
        UNION
        SELECT office_id FROM office_users WHERE user_id = $1
      )
      AND e.date BETWEEN $2 AND $3
    ORDER BY e.date DESC, e.id DESC;
  `;

  const expensesRes = await pool.query(expensesQuery, [userId, from, to]);
  const expenses = expensesRes.rows;

  const total_amount = expenses.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    from,
    to,
    expenses,
    expenses_count: expenses.length,
    total_amount,
    properties_count: new Set(expenses.map((e) => e.property_id).filter(Boolean)).size,
    units_count: new Set(expenses.map((e) => e.unit_id).filter(Boolean)).size,
    contracts_count: new Set(expenses.map((e) => e.contract_id).filter(Boolean)).size,
  };
}

export async function fetchReceiptsReport(userId, { from, to }) {
  if (!from || !to) {
    return {
      receipts: [],
      receipts_count: 0,
      total_amount: 0,
    };
  }

  // نفس الـ WITH office_ids من الـ route
  const query = `
    WITH office_ids AS (
      SELECT id AS oid FROM offices WHERE owner_id = $1
      UNION
      SELECT office_id AS oid FROM office_users WHERE user_id = $1
    )

    SELECT 
      r.id,
      r.amount,
      r.receipt_type,
      r.payer,
      r.receiver,
      to_char(r.date, 'YYYY-MM-DD') AS date,

      c.contract_no,
      u.unit_no,
      p.property_type AS property_name,

      pt.name AS tenant_name,
      pt.phone AS tenant_phone

    FROM receipts r

    LEFT JOIN contracts c ON c.id = r.contract_id
    LEFT JOIN units u ON u.id = r.unit_id
    LEFT JOIN properties p ON p.id = r.property_id

    LEFT JOIN contract_parties cp 
      ON cp.contract_id = r.contract_id
     AND LOWER(cp.role) IN ('tenant','مستأجر','مستاجر')

    LEFT JOIN parties pt 
      ON pt.id = cp.party_id

    WHERE 
      (
        c.office_id IN (SELECT oid FROM office_ids)
        OR p.office_id IN (SELECT oid FROM office_ids)
        OR u.property_id IN (
            SELECT id FROM properties 
            WHERE office_id IN (SELECT oid FROM office_ids)
          )
        OR r.office_id IN (SELECT oid FROM office_ids)
      )
      AND r.date BETWEEN $2 AND $3

    ORDER BY r.date DESC
  `;

  const rowsRes = await pool.query(query, [userId, from, to]);
  const receipts = rowsRes.rows;

  const total_amount = receipts.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  return {
    from,
    to,
    receipts,
    receipts_count: receipts.length,
    total_amount,
  };
}



/* =========================================================
   📌 10) PORTFOLIO SUMMARY (ملخص المكتب)
========================================================= */
export async function getPortfolioSummary(userId, activeRole) {
  // استخراج مكاتب المستخدم
  const officeIdsQuery = `
    SELECT id FROM offices WHERE owner_id = $1
    UNION
    SELECT office_id FROM office_users WHERE user_id = $1
  `;

  const officeRows = await pool.query(officeIdsQuery, [userId]);
  if (!officeRows.rowCount) throw new Error("User has no offices");

  const officeIds = officeRows.rows.map((x) => x.id);

  // تحويل إلى placeholders آمنة
  const placeholders = officeIds.map((_, i) => `$${i + 1}`).join(",");

  // عقارات
  const properties = await pool.query(
    `SELECT * FROM properties WHERE office_id IN (${placeholders})`,
    officeIds
  );

  // وحدات
  const units = await pool.query(
    `
      SELECT * 
      FROM units 
      WHERE property_id IN (
        SELECT id FROM properties WHERE office_id IN (${placeholders})
      )
    `,
    officeIds
  );

  // عقود
  const contracts = await pool.query(
    `SELECT * FROM contracts WHERE office_id IN (${placeholders})`,
    officeIds
  );

  // دفعات
  const payments = await pool.query(
    `
      SELECT *
      FROM payments
      WHERE contract_id IN (
        SELECT id FROM contracts WHERE office_id IN (${placeholders})
      )
    `,
    officeIds
  );

  // مصروفات
  const expenses = await pool.query(
    `
      SELECT *
      FROM expenses
      WHERE office_id IN (${placeholders})
         OR property_id IN (
            SELECT id FROM properties WHERE office_id IN (${placeholders})
         )
    `,
    [...officeIds, ...officeIds]
  );

  // سندات
  const receipts = await pool.query(
    `
      SELECT r.*
      FROM receipts r
      JOIN contracts c ON c.id = r.contract_id
      WHERE c.office_id IN (${placeholders})
    `,
    officeIds
  );

  const totalValue = contracts.rows.reduce(
    (sum, c) => sum + Number(c.total_contract_value || 0),
    0
  );

  const totalPaid = receipts.rows.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  const totalExpenses = expenses.rows.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const remaining = totalValue - totalPaid;

  return {
    totalProperties: properties.rowCount,
    totalUnits: units.rowCount,
    totalContracts: contracts.rowCount,
    activeContracts: contracts.rows.filter(
      (c) => new Date(c.tenancy_end) >= new Date()
    ).length,
    expiredContracts: contracts.rows.filter(
      (c) => new Date(c.tenancy_end) < new Date()
    ).length,

    totalValue,
    totalPaid,
    totalExpenses,
    remaining,

    payments: payments.rows,
    expenses: expenses.rows,
    receipts: receipts.rows,
  };
}
