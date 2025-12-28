import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   👤 جلب بيانات المستخدم الحالي (من قاعدة البيانات + الدور من التوكن)
   ========================================================= */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { id, activeRole } = req.user;

    const { rows } = await pool.query(
      `
      SELECT 
        id,
        name,
        phone,
        email,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ success: false, message: "المستخدم غير موجود" });

    // إضافة الدور النشط من التوكن
    const userData = { ...rows[0], activeRole };

    res.json({ success: true, data: userData });
  } catch (err) {
    console.error("❌ Error fetching user:", err.message);
    res.status(500).json({
      success: false,
      message: "فشل تحميل بيانات المستخدم",
      details: err.message,
    });
  }
});

/* =========================================================
   ✏️ تحديث الملف الشخصي للمستخدم الحالي
   ========================================================= */
router.put("/update-profile", verifyToken, async (req, res) => {
  const { id } = req.user;
  const { name, email } = req.body;

  try {
    if (!name && !email)
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال البيانات المطلوبة للتحديث",
      });

    const { rowCount } = await pool.query(
      `
      UPDATE users
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        updated_at = NOW()
      WHERE id = $3
      `,
      [name, email, id]
    );

    if (rowCount === 0)
      return res
        .status(404)
        .json({ success: false, message: "لم يتم العثور على المستخدم" });

    res.json({ success: true, message: "✅ تم تحديث الملف الشخصي بنجاح" });
  } catch (err) {
    console.error("❌ Error updating user:", err.message);
    res.status(500).json({
      success: false,
      message: "فشل تحديث بيانات المستخدم",
      details: err.message,
    });
  }
});

export default router;
