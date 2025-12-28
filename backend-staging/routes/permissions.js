import express from "express";
import pool from "../db/pool.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   ✅ جلب صلاحيات المستخدم حسب دوره الحالي
   ========================================================= */
router.get("/user/permissions", verifyToken, async (req, res) => {
  const { activeRole } = req.user;

  try {
    const { rows } = await pool.query(
      `
      SELECT p.page, p.can_view, p.can_edit, p.can_delete
      FROM permissions p
      JOIN roles r ON r.id = p.role_id
      WHERE r.role_name = $1
      ORDER BY p.page
      `,
      [activeRole]
    );

    res.json({ success: true, permissions: rows });
  } catch (err) {
    console.error("❌ Error fetching permissions:", err.message);
    res.status(500).json({
      success: false,
      message: "Error fetching permissions",
      details: err.message,
    });
  }
});

export default router;
