import pool from "../db/pool.js";

/* =========================================================
   🧩 إنشاء أو جلب مستخدم حسب رقم الجوال
   ========================================================= */
export async function createOrGetUser(client, name, phone) {
  if (!phone) return null;
  const existing = await client.query("SELECT id FROM users WHERE phone=$1", [phone]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const insert = await client.query(
    "INSERT INTO users (name, phone, created_at) VALUES ($1,$2,NOW()) RETURNING id",
    [name || "مستخدم جديد", phone]
  );
  return insert.rows[0].id;
}

/* =========================================================
   🧩 إضافة دور للمستخدم إذا لم يكن مرتبط مسبقًا
   ========================================================= */
export async function linkRole(client, userId, roleName) {
  if (!userId || !roleName) return;
  const roleRes = await client.query("SELECT id FROM roles WHERE role_name=$1", [roleName]);
  if (roleRes.rows.length === 0) return;
  const roleId = roleRes.rows[0].id;

  const check = await client.query(
    "SELECT id FROM user_roles WHERE user_id=$1 AND role_id=$2",
    [userId, roleId]
  );
  if (check.rows.length === 0) {
    await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)", [userId, roleId]);
    console.log(`✅ ربط المستخدم ${userId} بدور ${roleName}`);
  }
}

/* =========================================================
   🧩 إنشاء أو جلب طرف (party) وربطه بالعقد
   ========================================================= */
export async function createOrGetParty(client, party, type) {
  if (!party?.name) return null;
  const existing = await client.query(
    "SELECT id FROM parties WHERE phone=$1 OR national_id=$2 LIMIT 1",
    [party.phone || null, party.id || null]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const ins = await client.query(
    "INSERT INTO parties (type, name, phone, national_id) VALUES ($1,$2,$3,$4) RETURNING id",
    [type, party.name, party.phone || null, party.id || null]
  );
  return ins.rows[0].id;
}

/* =========================================================
   🧩 تحديث المستخدم أو الطرف عند تعديل العقد
   ========================================================= */
export async function updatePartyUser(client, party, roleName) {
  if (!party?.phone) return;
  // تحديث اسم المستخدم أو الطرف في النظام
  await client.query(
    "UPDATE users SET name=$1 WHERE phone=$2",
    [party.name || "مستخدم", party.phone]
  );
  const userId = await createOrGetUser(client, party.name, party.phone);
  await linkRole(client, userId, roleName);
}

/* =========================================================
   🧩 التحقق من ملكية المستخدم للعقد (للصلاحيات)
   ========================================================= */
export async function checkContractOwnership(client, userPhone, contractId, roles) {
  if (roles.includes("admin") || roles.includes("office")) return true;

  if (roles.includes("owner")) {
    const res = await client.query(
      `SELECT 1 FROM contracts c
       JOIN properties p ON p.id = c.property_id
       JOIN property_owners po ON po.property_id = p.id
       JOIN users u ON u.id = po.user_id
       WHERE c.id=$1 AND u.phone=$2 LIMIT 1`,
      [contractId, userPhone]
    );
    return res.rows.length > 0;
  }

  if (roles.includes("tenant")) {
    const res = await client.query(
      `SELECT 1 FROM contracts c
       JOIN contract_parties cp ON cp.contract_id = c.id
       JOIN parties t ON t.id = cp.party_id
       WHERE cp.role='tenant' AND c.id=$1 AND t.phone=$2 LIMIT 1`,
      [contractId, userPhone]
    );
    return res.rows.length > 0;
  }

  return false;
}
