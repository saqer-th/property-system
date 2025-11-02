// =======================================
// 🌱 سكربت تهيئة الصلاحيات الافتراضية
// يستخدم نفس pool الموجود في server.js
// =======================================

import { pool } from "../server.js"; // 👈 نستخدم الاتصال الجاهز

async function seedPermissions() {
  const pages = [
    "Dashboard",
    "Contracts",
    "Properties",
    "Units",
    "Payments",
    "Receipts",
    "Expenses",
    "Maintenance",
    "Reports",
    "Audit",
    "AdminPanel",
  ];

  const roles = [
    { name: "admin", view: true, edit: true, del: true },
    { name: "office_manager", view: true, edit: true, del: false },
    { name: "office", view: true, edit: true, del: false },
    { name: "owner", view: true, edit: false, del: false },
    { name: "tenant", view: true, edit: false, del: false },
  ];

  try {
    console.log("🚀 Seeding permissions...");
    for (const role of roles) {
      const { rows } = await pool.query(
        "SELECT id FROM roles WHERE role_name=$1",
        [role.name]
      );
      if (rows.length === 0) {
        console.log(`⚠️ الدور ${role.name} غير موجود، سيتم تخطيه.`);
        continue;
      }

      const roleId = rows[0].id;

      for (const page of pages) {
        await pool.query(
          `
          INSERT INTO permissions (role_id, page, can_view, can_edit, can_delete)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (role_id, page)
          DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete
          `,
          [roleId, page, role.view, role.edit, role.del]
        );
      }

      console.log(`✅ تمت إضافة صلاحيات الدور: ${role.name}`);
    }

    console.log("🎯 تمت تهيئة جميع الصلاحيات بنجاح!");
  } catch (err) {
    console.error("❌ خطأ أثناء إدخال الصلاحيات:", err.message);
  } finally {
    process.exit(0);
  }
}

seedPermissions();
