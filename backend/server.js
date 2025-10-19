import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";
import extractRouter from "./routes/extract.js";
import { spawn } from "child_process";

dotenv.config();
const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/", extractRouter);

// ===============================
// ⚙️ قاعدة البيانات (PostgreSQL / Neon)
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===============================
// 🔐 تحقق من المفتاح السري
// ===============================
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: "🚫 Unauthorized: Invalid API Key",
    });
  }
  next();
});
// ===============================
// 🔍 تفاصيل عقد (يدعم id أو contract_no)
// ===============================
// استبدل محتوى /contracts/:id بالكامل بهذا
app.get("/contracts/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // ==========================
    // 1️⃣ جلب بيانات العقد الأساسية + العقار + الوسيط
    // ==========================
    const { rows } = await client.query(
      `SELECT 
        c.*,
        p.property_type, p.property_usage, p.num_units, p.national_address, p.title_deed_no AS property_title_deed_no,
        b.name AS brokerage_name, b.cr_no AS brokerage_cr_no, b.landline AS brokerage_phone, b.address AS brokerage_address
       FROM contracts c
       LEFT JOIN properties p ON p.id = c.property_id
       LEFT JOIN brokerage_entities b ON b.id = c.broker_id
       WHERE c.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message_ar: "❌ لم يتم العثور على العقد.",
        message_en: "❌ Contract not found.",
      });
    }

    const base = rows[0];

    // ==========================
    // 2️⃣ تحميل القوائم المرتبطة
    // ==========================
    const [tenants, lessors, payments, units, expenses, receipts] = await Promise.all([
      // المستأجرين
      client.query(
        `SELECT name, national_id AS id, phone, email 
         FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id=$1 AND cp.role='tenant'`,
        [id]
      ),
      // المؤجرين
      client.query(
        `SELECT name, national_id AS id, phone, email 
         FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id=$1 AND cp.role='lessor'`,
        [id]
      ),
      // الدفعات
      client.query(
        `SELECT id, due_date, amount, status, notes, receipt_id
         FROM payments
         WHERE contract_id=$1
         ORDER BY 
           CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
           due_date ASC, id ASC`,
        [id]
      ),
      // الوحدات (بإضافة العدادات الجديدة)
      client.query(
        `SELECT 
           id, unit_no, unit_type, unit_area,
           electric_meter_no, water_meter_no
         FROM units 
         WHERE contract_id=$1
         ORDER BY unit_no`,
        [id]
      ),
      // المصروفات
      client.query(
        `SELECT id, expense_type, on_whom, amount, notes, date
         FROM expenses 
         WHERE contract_id=$1 
         ORDER BY date DESC, id DESC`,
        [id]
      ),
      // السندات
      client.query(
        `SELECT 
           id, receipt_type, reference_no, amount, payer, receiver, 
           payment_method, description, reason, date
         FROM receipts 
         WHERE contract_id=$1 
         ORDER BY date DESC, id DESC`,
        [id]
      ),
    ]);

    // ==========================
    // 3️⃣ تحديد حالة العقد
    // ==========================
    const contract_status =
      !base.tenancy_end
        ? "نشط"
        : new Date(base.tenancy_end) >= new Date()
        ? "نشط"
        : "منتهي";

    // ==========================
    // 4️⃣ بناء استجابة منظمة
    // ==========================
    const contract = {
      id: base.id,
      contract_no: base.contract_no,
      annual_rent: base.annual_rent ?? base.rent_amount ?? 0,
      total_contract_value: base.total_contract_value ?? null,
      title_deed_no: base.title_deed_no ?? null,
      start_date: base.tenancy_start ?? base.start_date ?? null,
      end_date: base.tenancy_end ?? base.end_date ?? null,
      contract_status,

      // العقار
      property: {
        property_type: base.property_type ?? null,
        property_usage: base.property_usage ?? null,
        num_units: base.num_units ?? null,
        national_address: base.national_address ?? null,
        title_deed_no: base.property_title_deed_no ?? base.title_deed_no ?? null,
      },

      // الوسيط
      brokerage_entity: {
        name: base.brokerage_name ?? null,
        cr_no: base.brokerage_cr_no ?? null,
        phone: base.brokerage_phone ?? null,
        address: base.brokerage_address ?? null,
      },

      tenants: tenants.rows,
      lessors: lessors.rows,
      payments: payments.rows,
      units: units.rows.map((u) => ({
        id: u.id,
        unit_no: u.unit_no,
        unit_type: u.unit_type,
        unit_area: u.unit_area,
        electric_meter_no: u.electric_meter_no,
        water_meter_no: u.water_meter_no,
      })),
      expenses: expenses.rows,

      // السندات (تطبيع الأسماء)
      receipts: receipts.rows.map((r) => ({
        id: r.id,
        receipt_type: r.receipt_type, // قبض أو صرف
        receipt_no: r.reference_no,
        amount: r.amount,
        payer: r.payer,
        receiver: r.receiver,
        payment_method: r.payment_method,
        description: r.description,
        reason: r.reason,
        date: r.date,
      })),
    };

    // ==========================
    // 5️⃣ إرجاع النتيجة
    // ==========================
    res.json({
      success: true,
      message_ar: "✅ تم جلب تفاصيل العقد بنجاح.",
      message_en: "✅ Contract details retrieved successfully.",
      data: contract,
    });
  } catch (err) {
    console.error("❌ Error fetching contract details:", err);
    res.status(500).json({
      success: false,
      message_ar: "حدث خطأ أثناء تحميل تفاصيل العقد.",
      message_en: "An error occurred while fetching contract details.",
      details: err.message,
    });
  } finally {
    client.release();
  }
});



// ===============================
// ✅ اختبار الاتصال
// ===============================
app.get("/", (_, res) =>
  res.send("🏠 Property Management API is running...")
);

// ===============================
// 📄 تحليل ملف عقد PDF عبر Python (تشغيل سكربت Python محليًا)
const upload = multer({ dest: "uploads/" });
app.post("/api/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع أي ملف" });
    const filePath = req.file.path;

    // 🐍 Run Python script directly
    const py = spawn("python", ["extract/extract_ejar.py", filePath], { windowsHide: true });
    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => (output += data.toString()));
    py.stderr.on("data", (data) => (errorOutput += data.toString()));

    py.on("close", (code) => {
      // cleanup uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}

      if (code !== 0) {
        console.error("Python error:", errorOutput || output);
        return res.status(500).json({ error: "Extraction failed", details: errorOutput || output });
      }

      try {
        // إذا السكربت طبع مسار JSON مثل: "JSON saved -> /tmp/result.json"
        const match = output.match(/JSON saved -> (.+\.json)/);
        if (match) {
          const jsonPath = match[1].trim();
          const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
          try {
            fs.unlinkSync(jsonPath);
          } catch (e) {}
          return res.json(data);
        }

        // محاول قراءة JSON مطبوع مباشرةً إلى stdout
        const parsed = output ? JSON.parse(output) : {};
        return res.json(parsed);
      } catch (err) {
        console.error("Parse error:", err, "output:", output);
        return res.status(500).json({ error: "Failed to parse extraction result", details: err.message });
      }
    });
  } catch (err) {
    console.error("🔥 خطأ أثناء تشغيل Python:", err);
    try {
      if (req.file?.path) fs.unlinkSync(req.file.path);
    } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 🧩 إدخال عقد جديد (PDF أو يدوي)
// ===============================
app.post("/contracts/full", async (req, res) => {
  const c = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // =============================================
    // 🧩 0️⃣ تحقق من تكرار رقم العقد
    // =============================================
    if (c.contract_no) {
      const existingContract = await client.query(
        "SELECT id FROM contracts WHERE contract_no = $1 LIMIT 1",
        [c.contract_no]
      );
      if (existingContract.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `❌ العقد برقم (${c.contract_no}) موجود مسبقًا.`,
          message_en: `Contract number (${c.contract_no}) already exists.`,
        });
      }
    }

    // =============================================
    // 1️⃣ التحقق من مجموع الدفعات
    // =============================================
    const totalValue = parseFloat(c.total_contract_value || c.annual_rent || 0);
    const paymentsTotal = (c.payments || [])
      .map((p) => parseFloat(p.amount || 0))
      .reduce((a, b) => a + b, 0);

    if (totalValue > 0 && paymentsTotal > 0 && paymentsTotal !== totalValue) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `❌ مجموع الدفعات (${paymentsTotal}) لا يطابق قيمة العقد (${totalValue}).`,
        message_en: `Total payments (${paymentsTotal}) do not match contract value (${totalValue}).`,
      });
    }

    // =============================================
    // 2️⃣ إنشاء العقد
    // =============================================
    const contractRes = await client.query(
      `INSERT INTO contracts (
        contract_no, title_deed_no, annual_rent,
        total_contract_value, tenancy_start, tenancy_end
      ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        c.contract_no || null,
        c.title_deed_no || null,
        c.annual_rent || null,
        c.total_contract_value || null,
        c.tenancy_start || null,
        c.tenancy_end || null,
      ]
    );
    const contractId = contractRes.rows[0].id;
    console.log("✅ تم إنشاء العقد:", contractId);

    // =============================================
    // 3️⃣ إنشاء أو ربط العقار
    // =============================================
    let propertyId = null;
    if (c.title_deed_no) {
      const existProp = await client.query(
        "SELECT id, contract_id FROM properties WHERE title_deed_no=$1 LIMIT 1",
        [c.title_deed_no]
      );

      if (existProp.rows.length > 0) {
        propertyId = existProp.rows[0].id;
        console.log("🏠 العقار موجود مسبقًا:", c.title_deed_no);

        if (!existProp.rows[0].contract_id) {
          await client.query(
            `UPDATE properties SET contract_id=$1 WHERE id=$2`,
            [contractId, propertyId]
          );
          console.log("🔗 تم ربط العقار بالعقد:", contractId);
        }
      } else {
        const p = c.property || {};
        const propRes = await client.query(
          `INSERT INTO properties (
             title_deed_no, property_type, property_usage,
             num_units, national_address, property_name, contract_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [
            c.title_deed_no,
            p.property_type || null,
            p.property_usage || null,
            p.num_units || (c.units?.length || 1),
            p.national_address || null,
            p.property_name || null,
            contractId,
          ]
        );
        propertyId = propRes.rows[0].id;
        console.log("🏗️ تم إنشاء عقار جديد:", propertyId);
      }

      await client.query(
        `UPDATE contracts SET property_id=$1 WHERE id=$2`,
        [propertyId, contractId]
      );
    }

    // =============================================
    // 4️⃣ إنشاء أو ربط الأطراف
    // =============================================
    const createOrGetParty = async (party, type) => {
      if (!party.id && !party.name) return null;
      const existing = await client.query(
        "SELECT id FROM parties WHERE national_id=$1 OR name=$2 LIMIT 1",
        [party.id || null, party.name]
      );
      if (existing.rows.length > 0) return existing.rows[0].id;

      const ins = await client.query(
        `INSERT INTO parties (type, name, national_id, phone, email)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [type, party.name, party.id || null, party.phone || null, party.email || null]
      );
      return ins.rows[0].id;
    };

    const tenantIds = [];
    for (const t of c.tenants || [])
      tenantIds.push(await createOrGetParty(t, "tenant"));

    const lessorIds = [];
    for (const l of c.lessors || [])
      lessorIds.push(await createOrGetParty(l, "lessor"));

    for (const tid of tenantIds)
      if (tid)
        await client.query(
          `INSERT INTO contract_parties (contract_id, party_id, role)
           VALUES ($1,$2,'tenant')`,
          [contractId, tid]
        );

    for (const lid of lessorIds)
      if (lid)
        await client.query(
          `INSERT INTO contract_parties (contract_id, party_id, role)
           VALUES ($1,$2,'lessor')`,
          [contractId, lid]
        );

    // =============================================
    // 5️⃣ الوسيط العقاري
    // =============================================
    let brokerId = null;
    if (c.brokerage_entity?.cr_no) {
      const existing = await client.query(
        "SELECT id FROM brokerage_entities WHERE cr_no=$1 LIMIT 1",
        [c.brokerage_entity.cr_no]
      );
      if (existing.rows.length > 0) {
        brokerId = existing.rows[0].id;
      } else {
        const b = c.brokerage_entity;
        const ins = await client.query(
          `INSERT INTO brokerage_entities (name, cr_no, address, landline, contract_id)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [b.name, b.cr_no, b.address || null, b.phone || b.landline || null, contractId]
        );
        brokerId = ins.rows[0].id;
      }

      await client.query(
        `UPDATE contracts SET broker_id=$1 WHERE id=$2`,
        [brokerId, contractId]
      );
    }

    // =============================================
    // 6️⃣ الوحدات (تحقق uniqueness)
    // =============================================
    if (Array.isArray(c.units)) {
      for (const u of c.units) {
        if (!u.unit_no) continue;

        const existUnit = await client.query(
          "SELECT id FROM units WHERE property_id=$1 AND unit_no=$2 LIMIT 1",
          [propertyId, u.unit_no]
        );

        if (existUnit.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `❌ الوحدة رقم (${u.unit_no}) موجودة مسبقًا في نفس العقار.`,
            message_en: `Unit number (${u.unit_no}) already exists for this property.`,
          });
        }

        await client.query(
          `INSERT INTO units (
            property_id, contract_id, unit_no, unit_type, unit_area,
            electric_meter_no, water_meter_no
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            propertyId,
            contractId,
            u.unit_no || null,
            u.unit_type || null,
            u.unit_area || null,
            u.electric_meter_no || null,
            u.water_meter_no || null,
          ]
        );
      }
    }

    // =============================================
    // 7️⃣ الدفعات
    // =============================================
    for (const p of c.payments || []) {
      await client.query(
        `INSERT INTO payments (contract_id, due_date, amount, status)
         VALUES ($1,$2,$3,$4)`,
        [contractId, p.due_date, p.amount, p.status || "غير مدفوعة"]
      );
    }

    // =============================================
    // 8️⃣ إنهاء العملية
    // =============================================
    await client.query("COMMIT");
    res.json({
      success: true,
      message: "✅ تم حفظ العقد والوحدات بنجاح (مع تحقق القيمة وموانع التكرار)",
      data: { contract_id: contractId, property_id: propertyId },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ خطأ أثناء حفظ العقد:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ===============================
// 🧰 الصيانة (Maintenance Requests)
// ===============================
app.get("/maintenance", async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        m.id,
        m.property_id,
        m.unit_id,
        m.type,
        m.description,
        m.assigned_to,
        m.status,
        m.date,
        u.unit_no AS unit_name,
        (SELECT name FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id = m.contract_id AND cp.role='tenant' LIMIT 1) AS tenant_name
      FROM maintenance m
      LEFT JOIN units u ON u.id = m.unit_id
      ORDER BY m.date DESC, m.id DESC;
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ خطأ في جلب بيانات الصيانة:", err);
    res.status(500).json({ error: err.message });
  }
});

// ➕ إضافة طلب صيانة جديد
app.post("/maintenance", async (req, res) => {
  const { property_id, unit_id, contract_id, type, description, assigned_to, status, date } = req.body;
  try {
    const { rows } = await pool.query(
      `
      INSERT INTO maintenance (
        property_id, unit_id, contract_id, type, description,
        assigned_to, status, date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
      `,
      [
        property_id || null,
        unit_id || null,
        contract_id || null,
        type || null,
        description || null,
        assigned_to || null,
        status || "pending",
        date || new Date(),
      ]
    );
    res.json({ success: true, maintenance_id: rows[0].id });
  } catch (err) {
    console.error("❌ خطأ في إضافة طلب الصيانة:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===============================
// 💵 الدفعات (Payments)
// ===============================
app.get("/payments", async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        p.id, p.contract_id, p.due_date, p.amount, p.status, p.notes,
        p.receipt_id, c.contract_no,
        (SELECT name FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id = c.id AND cp.role='tenant' LIMIT 1) AS tenant_name
      FROM payments p
      LEFT JOIN contracts c ON c.id = p.contract_id
      ORDER BY p.due_date ASC;
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ خطأ في جلب الدفعات:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ➕ إضافة دفعة جديدة
app.post("/payments", async (req, res) => {
  const { contract_id, due_date, amount, status, notes } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentRes = await client.query(
      `INSERT INTO payments (contract_id, due_date, amount, status, notes)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, contract_id, amount, status`,
      [contract_id, due_date, amount, status || "غير مدفوعة", notes || null]
    );

    const payment = paymentRes.rows[0];
    let receiptId = null;

    // 💰 إنشاء سند تلقائي في حال تم الدفع مباشرة
    if (payment.status === "مدفوعة") {
      const ref = `R-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      const receiptRes = await client.query(
        `INSERT INTO receipts (
           receipt_type, reference_no, contract_id, amount,
           payer, receiver, payment_method, reason, date
         ) VALUES ('قبض',$1,$2,$3,'المستأجر','المالك','تحويل','دفعة إيجار',NOW())
         RETURNING id`,
        [ref, payment.contract_id, payment.amount]
      );
      receiptId = receiptRes.rows[0].id;
      await client.query(`UPDATE payments SET receipt_id=$1 WHERE id=$2`, [
        receiptId,
        payment.id,
      ]);
    }

    await client.query("COMMIT");
    res.json({ success: true, payment_id: payment.id, receipt_id: receiptId });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ===============================
// 🧾 السندات Receipts
// ===============================
app.get("/receipts", async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.id, r.receipt_type, r.reference_no, r.reason, r.description, r.amount,
        r.payer, r.receiver, r.payment_method, r.date,
        r.property_id, r.unit_id, r.contract_id,
        p.national_address AS property_name, u.unit_no AS unit_no, c.contract_no AS contract_no
      FROM receipts r
      LEFT JOIN properties p ON p.id = r.property_id
      LEFT JOIN units u ON u.id = r.unit_id
      LEFT JOIN contracts c ON c.id = r.contract_id
      ORDER BY r.date DESC, r.id DESC;
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ خطأ في جلب السندات:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ➕ إضافة سند جديد (قبض / صرف / تسوية)
app.post("/receipts", async (req, res) => {
  const {
    receipt_type,
    property_id,
    unit_id,
    contract_id,
    description,
    amount,
    payer,
    receiver,
    payment_method,
    date,
    reason,
  } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ref = `R-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const receiptRes = await client.query(
      `
      INSERT INTO receipts (
        receipt_type, reference_no, property_id, unit_id, contract_id,
        description, amount, payer, receiver, payment_method, date, reason
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, contract_id, amount
      `,
      [
        receipt_type || "قبض",
        ref,
        property_id || null,
        unit_id || null,
        contract_id || null,
        description || "",
        amount || 0,
        payer || "غير محدد",
        receiver || "غير محدد",
        payment_method || "تحويل",
        date || new Date(),
        reason || "أخرى",
      ]
    );

    // 🧮 تحديث حالة الدفعات المرتبطة بالعقد
    const { contract_id: cid, amount: totalPaid } = receiptRes.rows[0];
    if (cid && totalPaid > 0) {
      let remaining = Number(totalPaid);
      const { rows: dues } = await client.query(
        `SELECT id, amount, status FROM payments WHERE contract_id=$1 AND status!='مدفوعة' ORDER BY due_date ASC`,
        [cid]
      );

      for (const p of dues) {
        if (remaining <= 0) break;
        const payAmount = Number(p.amount);

        if (remaining >= payAmount) {
          await client.query(
            `UPDATE payments SET status='مدفوعة', receipt_id=$1 WHERE id=$2`,
            [receiptRes.rows[0].id, p.id]
          );
          remaining -= payAmount;
        } else {
          await client.query(
            `UPDATE payments SET amount=$1, status='جزئية', receipt_id=$2 WHERE id=$3`,
            [payAmount - remaining, receiptRes.rows[0].id, p.id]
          );
          remaining = 0;
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, receipt_id: receiptRes.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ===============================
// 💸 المصروفات Expenses
// ===============================
app.get("/expenses", async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        e.id, e.expense_scope, e.description, e.amount, e.expense_type,
        e.paid_by, e.on_whom, e.settlement_type, e.settlement_timing, e.date,
        e.property_id, e.unit_id, e.contract_id,
        p.national_address AS property_name, u.unit_no AS unit_no, c.contract_no AS contract_no
      FROM expenses e
      LEFT JOIN properties p ON p.id = e.property_id
      LEFT JOIN units u ON u.id = e.unit_id
      LEFT JOIN contracts c ON c.id = e.contract_id
      ORDER BY e.date DESC, e.id DESC;
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ خطأ في جلب المصروفات:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ➕ إضافة مصروف جديد
app.post("/expenses", async (req, res) => {
  const {
    expense_scope,
    property_id,
    unit_id,
    contract_id,
    description,
    amount,
    expense_type,
    paid_by,
    on_whom,
    settlement_type,
    settlement_timing,
    date,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `
      INSERT INTO expenses (
        expense_scope, property_id, unit_id, contract_id,
        description, amount, expense_type, paid_by, on_whom,
        settlement_type, settlement_timing, date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id
      `,
      [
        expense_scope || "عقار",
        property_id || null,
        unit_id || null,
        contract_id || null,
        description,
        amount,
        expense_type || null,
        paid_by || null,
        on_whom || null,
        settlement_type || null,
        settlement_timing || null,
        date || new Date(),
      ]
    );
    res.json({ success: true, expense_id: rows[0].id });
  } catch (err) {
    console.error("❌ خطأ في إضافة المصروف:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===============================
// 📋 جلب العقارات والوحدات والعقود
// ===============================
app.get("/properties", async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, title_deed_no, property_type, property_usage, num_units, national_address, property_name
      FROM properties ORDER BY id DESC;
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// 📄 تفاصيل عقار محدد (مع الوحدات)
app.get("/properties/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const propertyRes = await pool.query(
      `SELECT id, title_deed_no, property_type, property_usage, num_units, national_address, property_name
       FROM properties WHERE id = $1`,
      [id]
    );

    if (propertyRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "Property not found" });

    const unitsRes = await pool.query(
      `SELECT id, unit_no, unit_type, unit_area,electric_meter_no, water_meter_no , status
       FROM units WHERE property_id = $1 ORDER BY unit_no`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...propertyRes.rows[0],
        units: unitsRes.rows,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching property:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/units", async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, property_id, unit_no, unit_type, unit_area, ac_type
      FROM units ORDER BY id DESC;
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// 🏘️ جلب تفاصيل وحدة معينة
app.get("/units/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // 🔹 نحصل على بيانات الوحدة الأساسية
    const unitRes = await client.query(
      `SELECT 
         u.id, u.unit_no, u.unit_type, u.unit_area, 
         u.electric_meter_no, u.water_meter_no, u.status,
         p.title_deed_no, p.property_type, p.property_usage, p.national_address
       FROM units u
       LEFT JOIN properties p ON p.id = u.property_id
       WHERE u.id = $1`,
      [id]
    );

    if (unitRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "Unit not found" });

    const unit = unitRes.rows[0];

    // 🔹 جلب العقود المرتبطة
    const contractsRes = await client.query(
      `SELECT 
         c.id, c.contract_no, c.tenancy_start AS start_date, c.tenancy_end AS end_date,
         c.annual_rent, 
         CASE 
           WHEN c.tenancy_end IS NULL THEN 'active'
           WHEN c.tenancy_end >= CURRENT_DATE THEN 'active'
           ELSE 'expired'
         END AS status,
         t.name AS tenant_name
       FROM contracts c
       LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND cp.role = 'tenant'
       LEFT JOIN parties t ON t.id = cp.party_id
       WHERE c.id IN (SELECT contract_id FROM units WHERE id = $1)`,
      [id]
    );

    // 🔹 جلب المصروفات الخاصة بالوحدة
    const expensesRes = await client.query(
      `SELECT id, expense_type, on_whom, amount, notes, date
       FROM expenses
       WHERE unit_id = $1
       ORDER BY date DESC, id DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...unit,
        contracts: contractsRes.rows,
        expenses: expensesRes.rows,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching unit details:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

app.get("/contracts", async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (c.id)
        c.id,
        c.contract_no,
        c.annual_rent,
        c.tenancy_start,
        c.tenancy_end,
        p.property_type,
        u.id AS unit_id,
        u.unit_no,
        u.unit_type,
        p.id AS property_id,
        CASE 
          WHEN c.tenancy_end >= CURRENT_DATE THEN 'نشط'
          ELSE 'منتهي'
        END AS contract_status,
        (SELECT name FROM parties pt
         JOIN contract_parties cp ON cp.party_id = pt.id
         WHERE cp.contract_id = c.id AND cp.role='tenant' LIMIT 1) AS tenant_name,
        (SELECT name FROM parties pl
         JOIN contract_parties cp ON cp.party_id = pl.id
         WHERE cp.contract_id = c.id AND cp.role='lessor' LIMIT 1) AS lessor_name
      FROM contracts c
      LEFT JOIN properties p ON p.contract_id = c.id
      LEFT JOIN units u ON u.contract_id = c.id
      ORDER BY c.id DESC;
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===============================
// 🚀 تشغيل السيرفر
// ===============================
const port = process.env.PORT || 8085;
app.listen(port, () => {
  console.log(`🚀 Property Management API running on port ${port}`);
});
