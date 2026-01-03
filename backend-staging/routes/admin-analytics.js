import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import {
  getOverview,
  getOfficesActivity,
  getTopFeatures,
  getOfficeDetails,
} from "../services/adminAnalyticsService.js";

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const data = await getOverview(req.pool);
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Admin analytics overview error:", err);
    res.status(500).json({ success: false, message: "Error loading overview" });
  }
});

router.get("/offices", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const data = await getOfficesActivity(req.pool);
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Admin analytics offices error:", err);
    res.status(500).json({ success: false, message: "Error loading offices" });
  }
});

router.get("/offices/:officeId", verifyToken, verifyAdmin, async (req, res) => {
  const officeId = Number(req.params.officeId);
  if (Number.isNaN(officeId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid office id" });
  }

  try {
    const data = await getOfficeDetails(req.pool, officeId);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Office not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Admin analytics office details error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error loading office details" });
  }
});

router.get("/features", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const data = await getTopFeatures(req.pool);
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Admin analytics features error:", err);
    res.status(500).json({ success: false, message: "Error loading features" });
  }
});

export default router;
