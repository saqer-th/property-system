import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { checkPermission } from "../helpers/permissions.js";
import { logAudit } from "../middleware/audit.js";
const router = express.Router();


/* =========================================================
 🧩 إحضار العقود الخاصة بالمستخدم الحالي (تفاصيل كاملة + صلاحيات)
========================================================= */
router.get("/my", verifyToken, async (req, res) => {
  const { phone, activeRole, id: userId } = req.user;
  const pool = req.pool;

  try {
    const canView = await checkPermission(activeRole, "contracts", "can_view");
    if (!canView)
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية عرض العقود.",
      });

    let whereClause = "";
    let params = [];

    // 🧭 تحديد الفلترة حسب الدور
    switch (activeRole) {
      case "admin":
        whereClause = "1=1"; // يشوف الكل
        break;

      case "office":
      case "office_admin":
        whereClause = `
    (
      c.office_id IN (
        SELECT office_id FROM office_users WHERE user_id = $1
      )
      OR c.office_id IN (
        SELECT id FROM offices WHERE owner_id = $1
      )
    )
  `;
        params = [userId];
        break;

      case "owner":
      case "مالك":
        whereClause = `
          c.id IN (
            SELECT cp.contract_id
            FROM contract_parties cp
            JOIN parties p ON p.id = cp.party_id
            WHERE LOWER(TRIM(cp.role)) IN ('lessor','مالك')
              AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
          )`;
        params = [phone];
        break;

      case "tenant":
      case "مستأجر":
        whereClause = `
          c.id IN (
            SELECT cp.contract_id
            FROM contract_parties cp
            JOIN parties p ON p.id = cp.party_id
            WHERE LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
              AND REPLACE(REPLACE(p.phone,'+966','0'),' ','') = REPLACE(REPLACE($1,'+966','0'),' ','')
          )`;
        params = [phone];
        break;

      default:
        return res.status(403).json({
          success: false,
          message: "❌ لا تملك صلاحية الوصول للعقود.",
        });
    }

    /* =========================================================
       📊 الاستعلام الموحد (لكل الأدوار)
    ========================================================= */
    const query = `
        SELECT DISTINCT ON (c.id)
          c.id, c.contract_no, c.annual_rent, c.tenancy_start, c.tenancy_end,
          p.id AS property_id, p.property_type, p.property_usage,p.city,
          u.id AS unit_id, u.unit_no, u.unit_type,
          o.name AS office_name,

          -- المستأجر
          (SELECT name FROM parties pt 
            JOIN contract_parties cp ON cp.party_id = pt.id
            WHERE cp.contract_id = c.id 
              AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
            LIMIT 1) AS tenant_name,

          (SELECT phone FROM parties pt 
            JOIN contract_parties cp ON cp.party_id = pt.id
            WHERE cp.contract_id = c.id 
              AND LOWER(TRIM(cp.role)) IN ('tenant','مستأجر')
            LIMIT 1) AS tenant_phone,

          -- المؤجر
          (SELECT name FROM parties pl 
            JOIN contract_parties cp ON cp.party_id = pl.id
            WHERE cp.contract_id = c.id 
              AND LOWER(TRIM(cp.role)) IN ('lessor','مالك')
            LIMIT 1) AS lessor_name,

          -- إجمالي العقد
          (
            COALESCE((SELECT SUM(p2.amount) FROM payments p2 WHERE p2.contract_id = c.id), 0)
            + COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.contract_id = c.id AND e.on_whom = 'مستأجر'), 0)
          ) AS total_value_calculated,

          -- المدفوع
          COALESCE((SELECT SUM(r.amount) FROM receipts r WHERE r.contract_id = c.id AND r.receipt_type = 'قبض'), 0)
          AS total_paid,

          -- المتبقي
          GREATEST(
            (
              (
                COALESCE((SELECT SUM(p4.amount) FROM payments p4 WHERE p4.contract_id = c.id), 0)
                + COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.contract_id = c.id AND e.on_whom = 'مستأجر'), 0)
              )
              - COALESCE((SELECT SUM(r.amount) FROM receipts r WHERE r.contract_id = c.id AND r.receipt_type = 'قبض'), 0)
            ),
            0
          ) AS total_remaining,

          -- الرصيد المتقدم
          GREATEST(
            (
              COALESCE((SELECT SUM(r.amount) FROM receipts r WHERE r.contract_id = c.id AND r.receipt_type = 'قبض'), 0)
              - (
                COALESCE((SELECT SUM(p4.amount) FROM payments p4 WHERE p4.contract_id = c.id), 0)
                + COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.contract_id = c.id AND e.on_whom = 'مستأجر'), 0)
              )
            ),
            0
          ) AS advance_balance,

          -- الدفعة القادمة
          (SELECT due_date FROM payments 
            WHERE contract_id = c.id AND (status IS NULL OR status NOT IN ('مدفوعة','Cancelled','paid'))
            ORDER BY due_date ASC LIMIT 1) AS next_payment_date,

          (SELECT amount FROM payments 
            WHERE contract_id = c.id AND (status IS NULL OR status NOT IN ('مدفوعة','Cancelled','paid'))
            ORDER BY due_date ASC LIMIT 1) AS next_payment_amount,

          -- حالة العقد
          CASE
            WHEN c.tenancy_end IS NULL THEN 'نشط'
            WHEN c.tenancy_end >= CURRENT_DATE THEN 'نشط'
            ELSE 'منتهي'
          END AS contract_status

        FROM contracts c
        LEFT JOIN properties p ON p.id = c.property_id
        LEFT JOIN contract_units cu ON cu.contract_id = c.id
        LEFT JOIN units u ON u.id = cu.unit_id
        LEFT JOIN offices o ON o.id = c.office_id
        WHERE ${whereClause}
        ORDER BY c.id DESC;
    `;


    const { rows } = await pool.query(query, params);

    // 🗓️ حساب الأيام المتبقية
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dataWithDays = rows.map((c) => {
      let days_to_end = null;
      if (c.tenancy_end) {
        const end = new Date(c.tenancy_end);
        end.setHours(0, 0, 0, 0);
        days_to_end = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      }
      return { ...c, days_to_end };
    });

    res.json({
      success: true,
      total: dataWithDays.length,
      data: dataWithDays,
    });
  } catch (err) {
    console.error("❌ Error fetching contracts:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب العقود.",
      details: err.message,
    });
  }
});



/* =========================================================
   🧩 2️⃣ إنشاء عقد جديد مع إنشاء المستخدمين تلقائيًا + ربط المكتب + ربط الوحدات بطريقة احترافية
   ========================================================= */
router.post("/full", verifyToken, async (req, res) => {
  const c = req.body;
  const { id: userId, activeRole } = req.user;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================================================
       🧭 1️⃣ تحديد الـ OFFICE_ID
    ========================================================= */
    let officeId = null;

    const ownOffice = await client.query(
      "SELECT id FROM offices WHERE owner_id = $1 LIMIT 1",
      [userId]
    );
    if (ownOffice.rowCount > 0) {
      officeId = ownOffice.rows[0].id;
    }

    if (!officeId) {
      const empOffice = await client.query(
        "SELECT office_id FROM office_users WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      if (empOffice.rowCount > 0) {
        officeId = empOffice.rows[0].office_id;
      }
    }

    /* =========================================================
       🧩 0️⃣ تحقق تكرار رقم العقد داخل نفس المكتب
    ========================================================= */
    if (c.contract_no) {
      const check = await client.query(
        `
        SELECT id FROM contracts
        WHERE contract_no = $1
          AND (office_id = $2)
        LIMIT 1
        `,
        [c.contract_no, officeId]
      );

      if (check.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `❌ العقد برقم (${c.contract_no}) موجود مسبقًا.`,
        });
      }
    }

    /* =========================================================
       2️⃣ التحقق من مجموع الدفعات
    ========================================================= */
    const totalValue = Number(c.total_contract_value || c.annual_rent || 0);
    const paymentsTotal = (c.payments || [])
      .map((p) => Number(p.amount || 0))
      .reduce((a, b) => a + b, 0);

    if (totalValue > 0 && paymentsTotal > 0 && totalValue !== paymentsTotal) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `❌ مجموع الدفعات (${paymentsTotal}) لا يساوي قيمة العقد (${totalValue}).`,
      });
    }

    /* =========================================================
       3️⃣ إنشاء العقد
    ========================================================= */
    const contractRes = await client.query(
      `
      INSERT INTO contracts (
        contract_no, title_deed_no, annual_rent,
        total_contract_value, tenancy_start, tenancy_end,
        office_id, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
      `,
      [
        c.contract_no || null,
        c.title_deed_no || null,
        c.annual_rent || null,
        c.total_contract_value || null,
        c.tenancy_start,
        c.tenancy_end,
        officeId,
        userId,
      ]
    );

    const contractId = contractRes.rows[0].id;

    /* =========================================================
       4️⃣ إنشاء أو إحضار العقار (property)
    ========================================================= */
    let propertyId = null;

    if (c.title_deed_no) {
      const existProp = await client.query(
        "SELECT id FROM properties WHERE title_deed_no=$1 AND office_id=$2 LIMIT 1",
        [c.title_deed_no, officeId]
      );

      if (existProp.rowCount > 0) {
        propertyId = existProp.rows[0].id;
      } else {
        const p = c.property || {};
        const inserted = await client.query(
          `
          INSERT INTO properties (
            title_deed_no, property_type, property_usage,
            num_units, national_address, city,office_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING id
          `,
          [
            c.title_deed_no,
            p.property_type || null,
            p.property_usage || null,
            p.num_units || (c.units?.length || 1),
            p.national_address || null,
            p.city || null,
            officeId,
          ]
        );
        propertyId = inserted.rows[0].id;
      }
    } else {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "❌ لا يمكن إنشاء عقد بدون رقم صك (title_deed_no).",
      });
    }

    await client.query(
      "UPDATE contracts SET property_id=$1 WHERE id=$2",
      [propertyId, contractId]
    );

    /* =========================================================
       5️⃣ الأطراف (مستأجر / مالك)
    ========================================================= */
    const createOrGetParty = async (party, role) => {
      if (!party?.name) return null;

      const existing = await client.query(
        `
        SELECT id FROM parties
        WHERE phone=$1 OR national_id=$2
        LIMIT 1
        `,
        [party.phone, party.id]
      );

      if (existing.rowCount > 0) return existing.rows[0].id;

      const inserted = await client.query(
        `
        INSERT INTO parties (type, name, phone, national_id)
        VALUES ($1,$2,$3,$4)
        RETURNING id
        `,
        [role, party.name, party.phone, party.id]
      );

      return inserted.rows[0].id;
    };

    const tenantIds = await Promise.all(
      (c.tenants || []).map((t) => createOrGetParty(t, "tenant"))
    );

    const lessorIds = await Promise.all(
      (c.lessors || []).map((l) => createOrGetParty(l, "lessor"))
    );

    for (const tid of tenantIds)
      if (tid)
        await client.query(
          "INSERT INTO contract_parties (contract_id, party_id, role) VALUES ($1,$2,'tenant')",
          [contractId, tid]
        );

    for (const lid of lessorIds)
      if (lid)
        await client.query(
          "INSERT INTO contract_parties (contract_id, party_id, role) VALUES ($1,$2,'lessor')",
          [contractId, lid]
        );

    /* =========================================================
       6️⃣ إنشاء المستخدمين للأطراف (تلقائي)
    ========================================================= */
    const linkUserRole = async (party, role) => {
      if (!party?.phone) return;

      const existing = await client.query(
        "SELECT id FROM users WHERE phone=$1 LIMIT 1",
        [party.phone]
      );

      let pid;

      if (existing.rowCount === 0) {
        const newUser = await client.query(
          "INSERT INTO users (name, phone) VALUES ($1,$2) RETURNING id",
          [party.name, party.phone]
        );
        pid = newUser.rows[0].id;
      } else {
        pid = existing.rows[0].id;
      }

      const roleRec = await client.query(
        "SELECT id FROM roles WHERE role_name=$1",
        [role]
      );

      const roleId = roleRec.rows[0].id;

      const existsUserRole = await client.query(
        "SELECT id FROM user_roles WHERE user_id=$1 AND role_id=$2",
        [pid, roleId]
      );

      if (existsUserRole.rowCount === 0)
        await client.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)",
          [pid, roleId]
        );
    };

    for (const t of c.tenants || []) await linkUserRole(t, "tenant");
    for (const l of c.lessors || []) await linkUserRole(l, "owner");

    /* =========================================================
       7️⃣ الوسيط العقاري
    ========================================================= */
    if (c.brokerage_entity?.cr_no) {
      const b = c.brokerage_entity;

      const existing = await client.query(
        "SELECT id FROM brokerage_entities WHERE cr_no=$1 LIMIT 1",
        [b.cr_no]
      );

      let brokerId;

      if (existing.rowCount > 0) {
        brokerId = existing.rows[0].id;
      } else {
        const inserted = await client.query(
          `
          INSERT INTO brokerage_entities (name, cr_no, address, landline, contract_id)
          VALUES ($1,$2,$3,$4,$5)
          RETURNING id
          `,
          [b.name, b.cr_no, b.address, b.phone || b.landline, contractId]
        );

        brokerId = inserted.rows[0].id;
      }

      await client.query(
        "UPDATE contracts SET broker_id=$1 WHERE id=$2",
        [brokerId, contractId]
      );
    }

    /* =========================================================
       8️⃣ الوحدات — الربط الاحترافي عبر contract_units
    ========================================================= */
    async function findOrCreateUnit(unit) {
      const unitNo = unit.unit_no;

      if (!/^\d+$/.test(unitNo)) {
        throw new Error(`رقم الوحدة (${unitNo}) يجب أن يكون أرقام فقط`);
      }

      const existing = await client.query(
        "SELECT id FROM units WHERE property_id=$1 AND unit_no=$2 LIMIT 1",
        [propertyId, unitNo]
      );

      if (existing.rowCount > 0) return existing.rows[0].id;

      const inserted = await client.query(
        `
        INSERT INTO units (
          property_id, unit_no, unit_type, unit_area,
          electric_meter_no, water_meter_no
        ) VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id
        `,
        [
          propertyId,
          unitNo,
          unit.unit_type || null,
          unit.unit_area || null,
          unit.electric_meter_no || null,
          unit.water_meter_no || null,
        ]
      );

      return inserted.rows[0].id;
    }

    if (Array.isArray(c.units)) {
      for (const u of c.units) {
        const unitId = await findOrCreateUnit(u);

        const conflict = await client.query(
          `
          SELECT 1
          FROM contract_units cu
          WHERE cu.unit_id = $1
            AND daterange(cu.start_date, cu.end_date) 
                && daterange($2, $3)
          `,
          [unitId, c.tenancy_start, c.tenancy_end]
        );

        if (conflict.rowCount > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `❌ لا يمكن ربط الوحدة (${u.unit_no}) لأنها مربوطة بعقد آخر في نفس الفترة.`,
          });
        }

        await client.query(
          `
          INSERT INTO contract_units (contract_id, unit_id, start_date, end_date)
          VALUES ($1,$2,$3,$4)
          `,
          [contractId, unitId, c.tenancy_start, c.tenancy_end]
        );
      }
    }

    /* =========================================================
       9️⃣ الدفعات
    ========================================================= */
    for (const p of c.payments || []) {
      await client.query(
        `
        INSERT INTO payments (contract_id, due_date, amount, status)
        VALUES ($1,$2,$3,$4)
        `,
        [contractId, p.due_date, p.amount, p.status || "غير مدفوعة"]
      );
    }

    /* =========================================================
       🔟 الأوديت
    ========================================================= */
    await logAudit(pool, {
      user_id: userId,
      action: "INSERT",
      table_name: "contracts",
      record_id: contractId,
      new_data: c,
      description: `إنشاء عقد جديد بواسطة ${activeRole}`,
      endpoint: "/contracts/full",
    });

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "✅ تم إنشاء العقد وربط الوحدات بنجاح",
      data: {
        contract_id: contractId,
        property_id: propertyId,
        office_id: officeId,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving contract:", err);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حفظ العقد",
      details: err.message,
    });
  } finally {
    client.release();
  }
});



// =========================================================
// ✏️ تحديث بيانات العقد الأساسي (Contract)
// =========================================================

router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    contract_no,
    start_date,
    end_date,
    annual_rent,
    total_contract_value
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================================================
       1️⃣ تحقق أن العقد موجود
    ========================================================= */
    const contractRes = await client.query(
      "SELECT * FROM contracts WHERE id = $1",
      [id]
    );

    if (contractRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ العقد غير موجود",
      });
    }

    const oldContract = contractRes.rows[0];

    /* =========================================================
       2️⃣ فاليديشن التواريخ
    ========================================================= */
    if (start_date && end_date) {
      if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({
          success: false,
          message: "❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
        });
      }
    }

    /* =========================================================
       3️⃣ تحديث العقد
    ========================================================= */
    const updated = await client.query(
      `
      UPDATE contracts
      SET
        contract_no = COALESCE($1, contract_no),
        tenancy_start = COALESCE($2, tenancy_start),
        tenancy_end = COALESCE($3, tenancy_end),
        annual_rent = COALESCE($4, annual_rent),
        total_contract_value = COALESCE($5, total_contract_value, $4),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [
        contract_no || null,
        start_date || null,
        end_date || null,
        annual_rent || null,
        total_contract_value || null,
        id,
      ]
    );

    const newContract = updated.rows[0];

    /* =========================================================
       4️⃣ تعديل فترات الوحدات المرتبطة بالعقد
    ========================================================= */
    const contractUnits = await client.query(
      "SELECT cu.*, u.unit_no FROM contract_units cu JOIN units u ON u.id = cu.unit_id WHERE cu.contract_id = $1",
      [id]
    );

    for (const cu of contractUnits.rows) {
      // ⚠️ تحقق من التداخل مع العقود الأخرى
      const conflict = await client.query(
        `
        SELECT 1
        FROM contract_units cu2
        WHERE cu2.unit_id = $1
          AND cu2.contract_id <> $2
          AND daterange(cu2.start_date, cu2.end_date, '[)') && daterange($3, $4, '[)')
        LIMIT 1
        `,
        [cu.unit_id, id, newContract.tenancy_start, newContract.tenancy_end]
      );

      if (conflict.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: ` لا يمكن تعديل العقد. توجد فترة متداخلة مع وحدة رقم ${cu.unit_no}`,
        });
      }

      // ✔ تحديث الفترة بعد التأكد من عدم وجود تضارب
      await client.query(
        `
        UPDATE contract_units
        SET start_date = $1,
            end_date = $2
        WHERE id = $3
        `,
        [
          newContract.tenancy_start,
          newContract.tenancy_end,
          cu.id
        ]
      );
    }

    /* =========================================================
       5️⃣ تسجيل في الأوديت
    ========================================================= */
    await logAudit(pool, {
      user_id: req.user.id,
      action: "UPDATE",
      table_name: "contracts",
      record_id: id,
      old_data: oldContract,
      new_data: newContract,
      description: `تعديل بيانات عقد (${id})`,
      endpoint: `/contracts/${id}`,
    });

    /* =========================================================
       6️⃣ COMMIT & RETURN
    ========================================================= */
    await client.query("COMMIT");

    res.json({
      success: true,
      message: "✅ تم تحديث بيانات العقد بنجاح",
      data: newContract,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("❌ Error updating contract:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث العقد",
      details: err.message,
    });
  } finally {
    client.release();
  }
});





/* =========================================================
   🏢 تحديث بيانات العقار (Property)
   ========================================================= */
router.put("/:id/property", verifyToken, async (req, res) => {
  const { id } = req.params;
  const p = req.body;

  try {
    // ✅ أولاً نجيب رقم العقار المرتبط بالعقد
    const { rows: contractRows } = await pool.query(
      "SELECT property_id FROM contracts WHERE id = $1",
      [id]
    );

    if (!contractRows.length || !contractRows[0].property_id) {
      return res
        .status(404)
        .json({ success: false, message: "⚠️ لا يوجد عقار مرتبط بهذا العقد" });
    }

    const propertyId = contractRows[0].property_id;

    // ✅ ثانياً نحدث العقار فعليًا
    await pool.query(
      `
      UPDATE properties
      SET 
        property_type = COALESCE($1, property_type),
        property_usage = COALESCE($2, property_usage),
        national_address = COALESCE($3, national_address),
        title_deed_no = COALESCE($4, title_deed_no),
        num_units = COALESCE($5, num_units),
        city = COALESCE($6, city),
        updated_at = NOW()
      WHERE id = $7
      `,
      [
        p.property_type || p.type || p.property_name,
        p.property_usage || p.usage,
        p.national_address,
        p.title_deed_no,
        p.num_units,
        p.city,
        propertyId,
      ]
    );

    res.json({ success: true, message: "✅ تم تحديث بيانات العقار بنجاح" });
  } catch (err) {
    console.error("❌ Error updating property:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


/* =========================================================
   👥 تحديث بيانات المستأجرين (Tenants)
   ========================================================= */
router.put("/:id/tenants", verifyToken, async (req, res) => {
  const { id } = req.params;
  const tenants = req.body || [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🧹 حذف المستأجرين القدامى
    await client.query("DELETE FROM contract_parties WHERE contract_id=$1 AND role='tenant'", [id]);

    // 🔁 إدخال المستأجرين الجدد
    for (const t of tenants) {
      const party = await client.query(
        `
        INSERT INTO parties (name, national_id, phone)
        VALUES ($1, $2, $3)
        ON CONFLICT (national_id)
        DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
        RETURNING id
        `,
        [t.name, t.national_id || t.id || "", t.phone]
      );

      await client.query(
        `INSERT INTO contract_parties (contract_id, party_id, role) VALUES ($1, $2, 'tenant')`,
        [id, party.rows[0].id]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "✅ تم تحديث بيانات المستأجرين بنجاح" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating tenants:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});
/* =========================================================
   👥 تحديث بيانات المؤجرين (Lessors)
   ========================================================= */
router.put("/:id/lessors", verifyToken, async (req, res) => {
  const { id } = req.params;
  const lessors = req.body || [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🧹 حذف المؤجرين القدامى
    await client.query("DELETE FROM contract_parties WHERE contract_id=$1 AND role='lessor'", [id]);

    // 🔁 إدخال المؤجرين الجدد
    for (const l of lessors) {
      const party = await client.query(
        `
        INSERT INTO parties (name, national_id, phone)
        VALUES ($1, $2, $3)
        ON CONFLICT (national_id)
        DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
        RETURNING id
        `,
        [l.name, l.national_id || l.id || "", l.phone]
      );

      await client.query(
        `INSERT INTO contract_parties (contract_id, party_id, role) VALUES ($1, $2, 'lessor')`,
        [id, party.rows[0].id]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "✅ تم تحديث بيانات المؤجرين بنجاح" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating lessors:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

/* =========================================================
   🏘️ تحديث بيانات الوحدات (Units)
   ========================================================= */
router.put("/:id/units", verifyToken, async (req, res) => {
  const { id: contractId } = req.params;
  const { units } = req.body;
  const client = await pool.connect();

  try {
    if (!Array.isArray(units)) {
      return res.status(400).json({
        success: false,
        message: "❌ يجب إرسال مصفوفة الوحدات units[]",
      });
    }

    await client.query("BEGIN");

    // 1️⃣ احضار معلومات العقد
    const contractRes = await client.query(
      `SELECT tenancy_start, tenancy_end, property_id 
       FROM contracts WHERE id = $1`,
      [contractId]
    );

    if (contractRes.rowCount === 0) {
      throw new Error("العقد غير موجود");
    }

    const { tenancy_start, tenancy_end, property_id } = contractRes.rows[0];

    // 2️⃣ احضار الروابط الحالية
    const existing = await client.query(
      `SELECT unit_id FROM contract_units WHERE contract_id = $1`,
      [contractId]
    );

    const existingIds = existing.rows.map(r => r.unit_id);

    const requestedIds = [];

    for (const u of units) {
      let unitId = u.unit_id;

      if (unitId) {
        // ✨ تحديث بيانات الوحدة لأنها قديمة
        await client.query(
          `
          UPDATE units
          SET 
            unit_no = $1,
            unit_type = $2,
            unit_area = $3,
            electric_meter_no = $4,
            water_meter_no = $5,
            updated_at = NOW()
          WHERE id = $6
        `,
          [
            u.unit_no,
            u.unit_type,
            u.unit_area,
            u.electric_meter_no,
            u.water_meter_no,
            unitId,
          ]
        );
      } else {
        // ✨ إضافة وحدة جديدة
        const insert = await client.query(
          `
          INSERT INTO units (
            property_id, unit_no, unit_type, unit_area,
            electric_meter_no, water_meter_no
          ) VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING id
        `,
          [
            property_id,
            u.unit_no,
            u.unit_type,
            u.unit_area,
            u.electric_meter_no,
            u.water_meter_no,
          ]
        );

        unitId = insert.rows[0].id;
      }

      requestedIds.push(unitId);

      // 🔗 إذا الرابط غير موجود → ضيفه
      if (!existingIds.includes(unitId)) {
        await client.query(
          `
          INSERT INTO contract_units (contract_id, unit_id, start_date, end_date)
          VALUES ($1,$2,$3,$4)
        `,
          [contractId, unitId, tenancy_start, tenancy_end]
        );
      }
    }

    // 3️⃣ حذف أي روابط لم تعد موجودة
    for (const old of existingIds) {
      if (!requestedIds.includes(old)) {
        await client.query(
          `DELETE FROM contract_units WHERE contract_id=$1 AND unit_id=$2`,
          [contractId, old]
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "✅ تم تحديث بيانات الوحدات وربطها بالعقد بنجاح",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating units:", err);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث وحدات العقد",
      details: err.message,
    });
  } finally {
    client.release();
  }
});



/* =========================================================
   💰 تحديث الدفعات (Payments) + موازنة مالية ذكية
   ========================================================= */
router.put("/:id/payments", verifyToken, async (req, res) => {
  const { id } = req.params;
  const payments = req.body || [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🧹 حذف الدفعات القديمة
    await client.query("DELETE FROM payments WHERE contract_id=$1", [id]);

    // 🔁 إدخال الدفعات الجديدة
    for (const p of payments) {
      await client.query(
        `
        INSERT INTO payments (
          contract_id, due_date, amount, status, notes, paid_amount
        )
        VALUES (
          $1, TO_DATE($2, 'YYYY-MM-DD'), $3, $4, $5, 0
        )
        `,
        [id, p.due_date || null, p.amount || 0, p.status || "غير مدفوعة", p.notes || ""]
      );
    }

    // 🧠 موازنة الدفعات مع السندات تلقائيًا
    await reconcilePaymentsSmartV3(client, id);

    await client.query("COMMIT");
    res.json({ success: true, message: "✅ تم تحديث الدفعات وإعادة الموازنة بنجاح" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating payments:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});


/* =========================================================
   🏢 تحديث بيانات مكتب الوسيط العقاري (Broker)
   ========================================================= */
router.put("/:id/broker", verifyToken, async (req, res) => {
  const { id } = req.params; // عقد
  const brokerData = req.body;

  try {
    // ✅ التحقق من وجود العقد
    const { rows: contractRows } = await pool.query(
      "SELECT broker_id FROM contracts WHERE id = $1",
      [id]
    );

    if (!contractRows.length)
      return res.status(404).json({ success: false, message: "❌ العقد غير موجود" });

    const brokerId = contractRows[0].broker_id;

    // ⚠️ إذا ما فيه broker_id مرتبط، نوقف وننبه المستخدم
    if (!brokerId)
      return res.status(400).json({
        success: false,
        message: "⚠️ لا يوجد مكتب وساطة مرتبط بهذا العقد. يرجى ربط مكتب أولاً.",
      });

    // ✅ تحديث الوسيط الأصلي بناءً على broker_id
    await pool.query(
      `
      UPDATE brokerage_entities
      SET
        name = COALESCE($1, name),
        cr_no = COALESCE($2, cr_no),
        landline = COALESCE($3, landline),
        address = COALESCE($4, address),
        updated_at = NOW()
      WHERE id = $5
      `,
      [
        brokerData.name || null,
        brokerData.cr_no || brokerData.cr || brokerData.crNumber || null,
        brokerData.phone || brokerData.landline || null,
        brokerData.address || null,
        brokerId,
      ]
    );

    res.json({
      success: true,
      message: "✅ تم تحديث بيانات الوسيط العقاري بنجاح",
    });
  } catch (err) {
    console.error("❌ Broker update error:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث بيانات الوسيط",
      details: err.message,
    });
  }
});


/* =========================================================
   💸 تحديث المصروفات لعقد معين (Expenses)
   ========================================================= */
router.put("/:id/expenses", verifyToken, async (req, res) => {
  const { id } = req.params;
  const expenses = req.body || [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // حذف المصروفات القديمة
    await client.query(`DELETE FROM expenses WHERE contract_id=$1`, [id]);

    // إدراج المصروفات الجديدة
    for (const e of expenses) {
      await client.query(
        `
        INSERT INTO expenses (
          contract_id, property_id, unit_id, description,
          amount, expense_type, paid_by, on_whom,
          settlement_type, settlement_timing, date, notes
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )
        `,
        [
          id,
          e.property_id || null,
          e.unit_id || null,
          e.description || "",
          e.amount || 0,
          e.expense_type || "",
          e.paid_by || "",
          e.on_whom || "",
          e.settlement_type || "",
          e.settlement_timing || "",
          e.date || new Date(),
          e.notes || "",
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "✅ تم تحديث المصروفات بنجاح" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating expenses:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

/* =========================================================
   🧾 تحديث السندات (Receipts) + موازنة تلقائية
   ========================================================= */
router.put("/:id/receipts", verifyToken, async (req, res) => {
  const { id } = req.params;
  const receipts = req.body || [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // حذف السندات القديمة
    await client.query("DELETE FROM receipts WHERE contract_id=$1", [id]);

    // إدراج السندات الجديدة
    for (const r of receipts) {
      await client.query(
        `
        INSERT INTO receipts (
          receipt_type, reference_no, property_id, unit_id, contract_id,
          description, amount, payer, receiver, payment_method,
          date, reason, notes, payer_name, receiver_name,
          created_at, updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          TO_DATE($11,'YYYY-MM-DD'),$12,$13,$14,$15,NOW(),NOW()
        )
        `,
        [
          r.receipt_type || "",
          r.reference_no || "",
          r.property_id || null,
          r.unit_id || null,
          id,
          r.description || "",
          Number(r.amount || 0),
          r.payer || "",
          r.receiver || "",
          r.payment_method || "",
          r.date ? r.date.split("T")[0] : new Date().toISOString().split("T")[0],
          r.reason || "",
          r.notes || "",
          r.payer_name || "",
          r.receiver_name || "",
        ]
      );
    }

    // تحديث الموازنة المالية بعد السندات
    await reconcilePaymentsSmartV3(client, id);

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "✅ تم تحديث السندات والموازنة بنجاح",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating receipts:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

/* =========================================================
   🧠 دالة الموازنة الذكية (Smart Reconciliation)
   ========================================================= */
async function reconcilePaymentsSmartV3(client, contractId) {
  // 1️⃣ إجمالي السندات المقبوضة
  const { rows: rRows } = await client.query(
    `SELECT COALESCE(SUM(amount),0) AS total_paid
     FROM receipts WHERE contract_id=$1 AND receipt_type='قبض'`,
    [contractId]
  );
  const totalPaid = Number(rRows[0].total_paid || 0);

  // 2️⃣ إجمالي الدفعات المستحقة
  const { rows: payRows } = await client.query(
    `SELECT id, amount FROM payments WHERE contract_id=$1 ORDER BY due_date ASC, id ASC`,
    [contractId]
  );

  // 3️⃣ المصروفات على المستأجر
  const { rows: expRows } = await client.query(
    `SELECT COALESCE(SUM(amount),0) AS tenant_expense
     FROM expenses WHERE contract_id=$1 AND on_whom='مستأجر'`,
    [contractId]
  );
  const tenantExpenses = Number(expRows[0].tenant_expense || 0);

  // 4️⃣ تصفير حالة الدفعات
  await client.query(
    `UPDATE payments SET paid_amount=0, status='غير مدفوعة' WHERE contract_id=$1`,
    [contractId]
  );

  // 5️⃣ توزيع المبالغ المقبوضة على الدفعات
  let remaining = totalPaid;
  for (const p of payRows) {
    if (remaining <= 0) break;
    let paid = 0, status = "غير مدفوعة";

    if (remaining >= p.amount) {
      paid = p.amount;
      remaining -= p.amount;
      status = "مدفوعة";
    } else {
      paid = remaining;
      remaining = 0;
      status = "جزئية";
    }

    await client.query(
      `UPDATE payments SET paid_amount=$1, status=$2 WHERE id=$3`,
      [paid, status, p.id]
    );
  }

  // 6️⃣ حساب الإجماليات النهائية
  const totalDue = payRows.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalWithExpenses = totalDue + tenantExpenses;
  const remainingBalance = totalWithExpenses - totalPaid;
  const advance = remainingBalance < 0 ? Math.abs(remainingBalance) : 0;

  // 7️⃣ تحديث بيانات العقد
  await client.query(
    `UPDATE contracts SET 
      advance_balance=$1,
      total_due_with_expenses=$2,
      total_paid=$3,
      total_remaining=$4,
      updated_at=NOW()
     WHERE id=$5`,
    [advance, totalWithExpenses, totalPaid, remainingBalance > 0 ? remainingBalance : 0, contractId]
  );


}
/* =========================================================
   🧩 عرض تفاصيل العقد حسب الدور (يدعم المكاتب + تعدد الأدوار)
   ========================================================= */
/* =========================================================
   📄 عرض تفاصيل عقد — يدعم جميع الصلاحيات
   ========================================================= */
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { id: userId, phone, activeRole } = req.user;
  const client = await pool.connect();

  try {
    const isNumeric = !isNaN(id);
    let filter = "";
    let params = [];

    /* =========================================================
       🛡️ 1️⃣ فلترة صلاحيات الوصول
    ========================================================= */
    if (activeRole === "admin") {
      filter = isNumeric ? "c.id = $1" : "c.contract_no = $1";
      params = [id];
    }

    // مكتب أو موظف مكتب
    else if (["office", "office_admin"].includes(activeRole)) {
      filter = `
        ${isNumeric ? "c.id = $1" : "c.contract_no = $1"}
        AND c.office_id IN (
          SELECT office_id FROM office_users WHERE user_id = $2
          UNION
          SELECT id FROM offices WHERE owner_id = $2
        )
      `;
      params = [id, userId];
    }

    // مالك العقار
    else if (["owner", "مالك"].includes(activeRole)) {
      filter = `
        ${isNumeric ? "c.id = $1" : "c.contract_no = $1"}
        AND c.id IN (
          SELECT cp.contract_id
          FROM contract_parties cp
          JOIN parties p ON p.id = cp.party_id
          WHERE LOWER(TRIM(cp.role)) IN ('lessor', 'مالك')
            AND REPLACE(REPLACE(REPLACE(p.phone,'+966','0'),' ','') ,'-','') = 
                REPLACE(REPLACE(REPLACE($2,'+966','0'),' ','') ,'-','')
        )
      `;
      params = [id, phone];
    }

    // مستأجر
    else if (["tenant", "مستأجر"].includes(activeRole)) {
      filter = `
        ${isNumeric ? "c.id = $1" : "c.contract_no = $1"}
        AND c.id IN (
          SELECT cp.contract_id
          FROM contract_parties cp
          JOIN parties p ON p.id = cp.party_id
          WHERE LOWER(TRIM(cp.role)) IN ('tenant','مستأجر','مستاجر')
            AND REPLACE(REPLACE(REPLACE(p.phone,'+966','0'),' ','') ,'-','') = 
                REPLACE(REPLACE(REPLACE($2,'+966','0'),' ','') ,'-','')
        )
      `;
      params = [id, phone];
    }

    else {
      return res.status(403).json({
        success: false,
        message: "🚫 لا تملك صلاحية للوصول لهذا العقد",
      });
    }

    /* =========================================================
       🧾 2️⃣ جلب بيانات العقد الأساسية
    ========================================================= */
    const baseRes = await client.query(
      `
      SELECT 
        c.*,
        o.name AS office_name,
        o.id AS office_id,
        p.property_type AS property_name,
        p.property_usage AS usage,
        p.num_units,
        p.national_address,
        p.city,
        p.title_deed_no
      FROM contracts c
      LEFT JOIN offices o ON o.id = c.office_id
      LEFT JOIN properties p ON p.id = c.property_id
      WHERE ${filter}
      `,
      params
    );

    if (baseRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ العقد غير موجود أو لا تملك صلاحية عرضه",
      });
    }

    const contract = baseRes.rows[0];

    /* =========================================================
       🔗 3️⃣ تحميل العلاقات المرتبطة (بشكل متوازي)
    ========================================================= */
    const [
      tenants,
      lessors,
      payments,
      units,
      expenses,
      receipts
    ] = await Promise.all([

      // مستأجرين
      client.query(
        `
        SELECT pt.name, pt.national_id AS id, pt.phone
        FROM parties pt
        JOIN contract_parties cp ON cp.party_id = pt.id
        WHERE cp.contract_id = $1 AND cp.role IN ('tenant','مستأجر','مستاجر')
        `,
        [contract.id]
      ),

      // ملاك
      client.query(
        `
        SELECT pt.name, pt.national_id AS id, pt.phone
        FROM parties pt
        JOIN contract_parties cp ON cp.party_id = pt.id
        WHERE cp.contract_id = $1 AND cp.role IN ('lessor','مالك')
        `,
        [contract.id]
      ),

      // دفعات
      client.query(
        `
        SELECT id, due_date, amount, COALESCE(paid_amount,0) AS paid_amount,
               (amount - COALESCE(paid_amount,0)) AS remaining_amount,
               status, notes
        FROM payments
        WHERE contract_id = $1
        ORDER BY due_date ASC
        `,
        [contract.id]
      ),

      // الوحدات من contract_units
      client.query(
        `
        SELECT 
          u.id,
          cu.unit_id,
          u.unit_no,
          u.unit_type,
          u.unit_area,
          u.electric_meter_no,
          u.water_meter_no
        FROM contract_units cu
        JOIN units u ON u.id = cu.unit_id
        WHERE cu.contract_id = $1
        ORDER BY u.unit_no


        `,
        [contract.id]
      ),

      // مصروفات
      client.query(
        `
        SELECT id, expense_type, amount, paid_by, on_whom, notes, date 
        FROM expenses
        WHERE contract_id = $1
        ORDER BY date DESC
        `,
        [contract.id]
      ),

      // سندات قبض/صرف
      client.query(
        `
        SELECT id, reference_no, receipt_type, payer, receiver, amount, date
        FROM receipts
        WHERE contract_id = $1
        ORDER BY date DESC
        `,
        [contract.id]
      ),
    ]);

    /* =========================================================
       🧱 4️⃣ بناء جسم العقد النهائي
    ========================================================= */
    const final = {
      id: contract.id,
      contract_no: contract.contract_no,
      office_id: contract.office_id,
      office_name: contract.office_name,

      tenancy_start: contract.tenancy_start,
      tenancy_end: contract.tenancy_end,

      annual_rent: Number(contract.annual_rent || 0),
      total_contract_value: Number(contract.total_contract_value || 0),

      property: {
        title_deed_no: contract.title_deed_no,
        property_name: contract.property_name,
        usage: contract.usage,
        city: contract.city,
        num_units: contract.num_units,
        national_address: contract.national_address,
      },

      tenants: tenants.rows,
      lessors: lessors.rows,
      units: units.rows,
      payments: payments.rows,
      expenses: expenses.rows,
      receipts: receipts.rows,
    };

    /* =========================================================
       📝 5️⃣ تسجيل في الـ Audit
    ========================================================= */
    await logAudit(pool, {
      user_id: userId,
      action: "VIEW",
      table_name: "contracts",
      record_id: contract.id,
      description: `عرض تفاصيل عقد (${contract.contract_no})`,
      endpoint: `/contracts/${id}`,
    });

    return res.json({
      success: true,
      message: "تم جلب بيانات العقد",
      data: final,
    });
  } catch (err) {
    console.error("❌ Contract Details Error:", err);
    res.status(500).json({
      success: false,
      message: "خطأ أثناء جلب تفاصيل العقد",
      details: err.message,
    });
  } finally {
    client.release();
  }
});






export default router;
