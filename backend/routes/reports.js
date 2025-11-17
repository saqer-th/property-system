import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  getPropertyReport,
  getUnitReport,
  getContractReport,
  getContractPaymentsReport,
  getContractExpensesReport,
  getReceiptsReport,
  getMaintenanceReport,
  getOccupancyReport,
  fetchProfitReport,
  fetchPaymentReport,
  fetchExpenseReport,
  fetchReceiptsReport
} from "../utils/reportService.js";
import pool from "../db/pool.js";

import { generatePDF } from "../utils/pdf.js";
import { systemLogo } from "../utils/systemLogo.js";

const router = express.Router();
/* =========================================================
   🔑 Inject Authorization header BEFORE any route
========================================================= */
router.use((req, res, next) => {
  if (req.query.auth) {
    req.headers.authorization = "Bearer " + req.query.auth;
  }
  next();
});

/* =========================================================
   📄 Unified Reports Route
   type=
     property | unit | contract | payments | expenses |
     receipts | maintenance | occupancy | profit
========================================================= */
router.get(
  "/",
  async (req, res, next) => {
    if (req.query.auth) {
      req.headers.authorization = "Bearer " + req.query.auth;
    }
    next();
  },
  verifyToken,
  async (req, res) => {
    const { type, id, lang = "ar" } = req.query;

    try {
      let data = null;

      /* =========================================================
         🟦 Fetching all report types
      ========================================================== */
      switch (type) {
        case "property":
          data = await getPropertyReport(id);
          break;
        case "unit":
          data = await getUnitReport(id);
          break;
        case "contract":
          data = await getContractReport(id);
          break;
        case "payments":
          data = await fetchPaymentReport(req.user.id, req.query);
          break;
        case "expenses":
          data = await fetchExpenseReport(req.user.id, req.query);
          break;
        case "contract-payments":
          data = await getContractPaymentsReport(id);
          break;
        case "contract-expenses":
          data = await getContractExpensesReport(id);
          break;
        case "receipts":
          data = await fetchReceiptsReport(req.user.id, req.query);
          break;
        case "maintenance":
          data = await getMaintenanceReport(id);
          break;
        case "occupancy/summary":
          data = await getOccupancyReport(req.user.id);
          break;
        case "profit":
          data = await fetchProfitReport(req.user.id, req.query);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid report type",
          });
      }

      /* =========================================================
         🖼️ Always use system systemLogo
      ========================================================== */
      

      /* =========================================================
         📘 Build template
      ========================================================== */
      const templateData = await buildTemplateData(type, data, lang, systemLogo);

      /* =========================================================
         📄 Generate PDF
      ========================================================== */
      const pdfBuffer = await generatePDF(templateData);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}_report_${id || "general"}.pdf`
      );

      return res.end(pdfBuffer);
    } catch (err) {
      console.error("❌ Report error:", err);
      res.status(500).json({ message: "Error generating PDF" });
    }
  }
);

/* =========================================================
   📘 Template Builder — Covers ALL REPORT TYPES
========================================================= */
function buildTemplateData(type, data, lang = "ar", systemLogo) {
  const direction = lang === "ar" ? "rtl" : "ltr";
  const t = (ar, en) => (lang === "ar" ? ar : en);

  /* ---------------------------------------------------------
     CONTRACT REPORT
  --------------------------------------------------------- */
  if (type === "contract") {
     return buildContractSummaryTemplate( data,t, lang, systemLogo, direction);
  }

  /* ---------------------------------------------------------
     PROPERTY REPORT
  --------------------------------------------------------- */
  if (type === "property") {
    return buildPropertyTemplate(data, t, lang, systemLogo, direction);
  }

  /* ---------------------------------------------------------
     UNIT REPORT
  --------------------------------------------------------- */
  if (type === "unit") {
    return buildUnitTemplate(data, t, lang, systemLogo, direction);
  }

  /* ---------------------------------------------------------
     FINANCIAL REPORTS
  --------------------------------------------------------- */
  if (type === "payments" ) {
    return buildPaymentsReportTemplate(data, t, lang, systemLogo, direction);
  }
  if (type === "expenses") {
    return buildExpensesReportTemplate(data, t, lang, systemLogo, direction);
  }
  if (type === "receipts") {
    return buildReceiptsReportTemplate(data, t, lang, systemLogo, direction);
  }
  if (type === "contract-payments") {
    return buildContractPaymentsTemplate(data, t, lang, systemLogo, direction);
  }
  if (type === "contract-expenses") {
    return buildContractExpensesTemplate(data, t, lang, systemLogo, direction);
  }
  if (type === "maintenance") {
    return buildMaintenanceTemplate(data, t, lang, systemLogo, direction);
  }

  if (type === "occupancy") {
    return buildOccupancyTemplate(data, t, lang, systemLogo, direction);
  }

  /* ---------------------------------------------------------
     PROFIT (FIXED)
  --------------------------------------------------------- */
  if (type === "profit") {
    return buildProfitTemplate(data, t, lang, systemLogo, direction);
  }
}


/* =========================================================
   🔧 Helper builders (kept clean and modular)
========================================================= */

function buildContractSecondaryTables(data, t) {
  return `
  <div class="section-title">${t("أطراف العقد", "Contract Parties")}</div>
  <table>
    <tr>
      <th>${t("الدور", "Role")}</th>
      <th>${t("الاسم", "Name")}</th>
      <th>${t("رقم الهوية", "National ID")}</th>
      <th>${t("الجوال", "Phone")}</th>
    </tr>

    ${data.tenants
      .map(
        (item) => `
      <tr>
        <td>${t("مستأجر", "Tenant")}</td>
        <td>${item.name}</td>
        <td>${item.id}</td>
        <td>${item.phone}</td>
      </tr>`
      )
      .join("")}

    ${data.lessors
      .map(
        (item) => `
      <tr>
        <td>${t("مؤجر", "Lessor")}</td>
        <td>${item.name}</td>
        <td>${item.id}</td>
        <td>${item.phone}</td>
      </tr>`
      )
      .join("")}
  </table>

  <div class="section-title">${t("الدفعات", "Payments")}</div>
  <table>
    <tr>
      <th>${t("تاريخ الاستحقاق", "Due Date")}</th>
      <th>${t("المبلغ", "Amount")}</th>
      <th>${t("المدفوع", "Paid")}</th>
      <th>${t("المتبقي", "Remaining")}</th>
      <th>${t("الحالة", "Status")}</th>
    </tr>

    ${data.payments
      .map(
        (p) => `
      <tr>
        <td>${p.due_date}</td>
        <td>${p.amount.toLocaleString()}</td>
        <td>${(p.paid_amount || 0).toLocaleString()}</td>
        <td>${(p.remaining_amount || 0).toLocaleString()}</td>
        <td>${p.status}</td>
      </tr>`
      )
      .join("")}
  </table>

  <div class="section-title">${t("السندات", "Receipts")}</div>
  <table>
    <tr>
      <th>${t("النوع", "Type")}</th>
      <th>${t("المبلغ", "Amount")}</th>
      <th>${t("التاريخ", "Date")}</th>
    </tr>

    ${data.receipts
      .map(
        (r) => `
      <tr>
        <td>${r.receipt_type}</td>
        <td>${r.amount.toLocaleString()}</td>
        <td>${r.date}</td>
      </tr>`
      )
      .join("")}
  </table>
`;
}

export function buildContractSummaryTemplate(data, t, lang, logo, direction) {
  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const date = (v) => {
    if (!v) return "-";
    if (typeof v === "string") return v.split("T")[0];
    if (v instanceof Date) return v.toISOString().split("T")[0];
    if (typeof v === "number") return new Date(v).toISOString().split("T")[0];
    return "-";
  };

  const contract = data.contract || {};
  const tenants = data.tenants || [];
  const lessors = data.lessors || [];
  const units = data.units || [];
  const payments = data.payments || [];
  const receipts = data.receipts || [];
  const expenses = data.expenses || [];

  /* ========================= SUMMARY ========================= */
  const summaryHTML = `
    <div class="summary-item"><strong>${t("رقم العقد", "Contract No")}:</strong> ${contract.contract_no}</div>
    <div class="summary-item"><strong>${t("اسم العمارة", "Building Name")}:</strong> ${contract.property_type}</div>
    <div class="summary-item"><strong>${t("اسم المكتب", "Office")}:</strong> ${contract.office_name}</div>
    <div class="summary-item"><strong>${t("البداية", "Start")}:</strong> ${date(contract.tenancy_start)}</div>
    <div class="summary-item"><strong>${t("النهاية", "End")}:</strong> ${date(contract.tenancy_end)}</div>
    <div class="summary-item"><strong>${t("القيمة", "Value")}:</strong> ${money(contract.total_contract_value)}</div>
  `;

  /* ========================= FULL TABLES ========================= */

  const unitsHTML = `
    <h3 class="section-title">${t("الوحدات", "Units")}</h3>
    <table>
      <thead>
        <tr>
          <th>${t("رقم الوحدة", "Unit")}</th>
          <th>${t("النوع", "Type")}</th>
          <th>${t("المساحة", "Area")}</th>
          <th>${t("عداد الكهرباء", "Electric")}</th>
          <th>${t("عداد الماء", "Water")}</th>
        </tr>
      </thead>
      <tbody>
        ${units.length
          ? units
              .map(
                (u) => `
          <tr>
            <td>${u.unit_no}</td>
            <td>${u.unit_type}</td>
            <td>${u.unit_area || "-"}</td>
            <td>${u.electric_meter_no || "-"}</td>
            <td>${u.water_meter_no || "-"}</td>
          </tr>`
              )
              .join("")
          : `<tr><td colspan="5">${t("لا يوجد بيانات", "No Data")}</td></tr>`}
      </tbody>
    </table>
  `;

  const paymentsHTML = `
    <h3 class="section-title">${t("الدفعات", "Payments")}</h3>
    <table>
      <thead>
        <tr>
          <th>${t("تاريخ الاستحقاق", "Due Date")}</th>
          <th>${t("المبلغ", "Amount")}</th>
          <th>${t("المدفوع", "Paid")}</th>
          <th>${t("المتبقي", "Remaining")}</th>
          <th>${t("الحالة", "Status")}</th>
        </tr>
      </thead>
      <tbody>
        ${payments.length
          ? payments
              .map(
                (p) => `
        <tr>
          <td>${date(p.due_date)}</td>
          <td>${money(p.amount)}</td>
          <td>${money(p.paid_amount)}</td>
          <td>${money(p.remaining_amount)}</td>
          <td>${p.status}</td>
        </tr>`
              )
              .join("")
          : `<tr><td colspan="5">${t("لا يوجد دفعات", "No Payments")}</td></tr>`}
      </tbody>
    </table>
  `;

  const receiptsHTML = `
    <h3 class="section-title">${t("السندات", "Receipts")}</h3>
    <table>
      <thead>
        <tr>
          <th>${t("النوع", "Type")}</th>
          <th>${t("الدافع", "Payer")}</th>
          <th>${t("المستلم", "Receiver")}</th>
          <th>${t("المبلغ", "Amount")}</th>
          <th>${t("التاريخ", "Date")}</th>
        </tr>
      </thead>
      <tbody>
        ${receipts.length
          ? receipts
              .map(
                (r) => `
        <tr>
          <td>${r.receipt_type}</td>
          <td>${r.payer}</td>
          <td>${r.receiver}</td>
          <td>${money(r.amount)}</td>
          <td>${date(r.date)}</td>
        </tr>`
              )
              .join("")
          : `<tr><td colspan="5">${t("لا يوجد سندات", "No Receipts")}</td></tr>`}
      </tbody>
    </table>
  `;

  const expensesHTML = `
    <h3 class="section-title">${t("المصروفات", "Expenses")}</h3>
    <table>
      <thead>
        <tr>
          <th>${t("النوع", "Type")}</th>
          <th>${t("المبلغ", "Amount")}</th>
          <th>${t("على من", "On Whom")}</th>
          <th>${t("بتحمل", "Paid By")}</th>
          <th>${t("التاريخ", "Date")}</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.length
          ? expenses
              .map(
                (e) => `
        <tr>
          <td>${e.expense_type}</td>
          <td>${money(e.amount)}</td>
          <td>${e.on_whom}</td>
          <td>${e.paid_by}</td>
          <td>${date(e.date)}</td>
        </tr>`
              )
              .join("")
          : `<tr><td colspan="5">${t("لا يوجد مصروفات", "No Expenses")}</td></tr>`}
      </tbody>
    </table>
  `;

  /* ========================= MERGE ALL INTO secondaryTablesHTML ========================= */

  const secondaryTablesHTML = `
    ${unitsHTML}
    <div class="page-break"></div>
    ${paymentsHTML}
    <div class="page-break"></div>
    ${receiptsHTML}
    <div class="page-break"></div>
    ${expensesHTML}
  `;

  return {
    title: t("ملخص العقد", "Contract Summary"),
    subtitle: t("نظام إدارة الأملاك SaqrON", "SaqrON Property Manager"),
    summaryTitle: t("الملخص", "Summary"),
    summaryHTML,
    detailsTableHTML: null,
    secondaryTablesHTML,
    direction,
    lang,
    logo,
    footerText: t(
      `تم إنشاء التقرير بواسطة SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}

export function buildContractPaymentsTemplate(data, t, lang, logo, direction) {
  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const toDate = (v) => {
    if (!v) return "-";
    if (typeof v === "string") return v.split("T")[0];
    return "-";
  };

  const daysDiff = (date) =>
    Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));

  /* ====================== AGING BUCKETS ====================== */
  const buckets = {
    "0-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };

  data.payments.forEach((p) => {
    const d = daysDiff(p.due_date);
    if (d <= 30) buckets["0-30"].push(p);
    else if (d <= 60) buckets["31-60"].push(p);
    else if (d <= 90) buckets["61-90"].push(p);
    else buckets["90+"].push(p);
  });

  const agingHTML = `
    <table dir="${direction}">
      <thead>
        <tr>
          <th>${t("الفئة", "Bucket")}</th>
          <th>${t("عدد الدفعات", "Count")}</th>
          <th>${t("إجمالي المبالغ", "Total Amount")}</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(buckets)
          .map(([label, arr]) => {
            const total = arr.reduce((s, x) => s + Number(x.amount || 0), 0);
            return `
              <tr>
                <td>${label}</td>
                <td>${arr.length}</td>
                <td>${money(total)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  /* ====================== PROPERTY & UNIT INFO ====================== */
  const propertyHTML = `
    <div class="summary-item"><strong>${t("نوع العقار","Property")}:</strong> ${data.property?.property_type || "-"}</div>
    <div class="summary-item"><strong>${t("الصك","Deed No")}:</strong> ${data.property?.title_deed_no || "-"}</div>
    <div class="summary-item"><strong>${t("المدينة","City")}:</strong> ${data.property?.city || "-"}</div>
  `;

  const unitHTML = `
    <div class="summary-item"><strong>${t("رقم الوحدة","Unit No")}:</strong> ${data.unit?.unit_no || "-"}</div>
    <div class="summary-item"><strong>${t("النوع","Type")}:</strong> ${data.unit?.unit_type || "-"}</div>
    <div class="summary-item"><strong>${t("المساحة","Area")}:</strong> ${data.unit?.unit_area || "-"}</div>
  `;

  /* ====================== SUMMARY ====================== */
  const summaryHTML = `
    <div class="summary-item"><strong>${t("رقم العقد","Contract No")}:</strong> ${data.contract.contract_no}</div>
    <div class="summary-item"><strong>${t("المستأجر","Tenant")}:</strong> ${data.tenant.tenant_name}</div>
    <hr/>
    ${propertyHTML}
    <hr/>
    ${unitHTML}

    <hr/>
    <div class="summary-item"><strong>${t("إجمالي الدفعات","Total Amount")}:</strong> ${money(data.total_amount)}</div>
    <div class="summary-item"><strong>${t("المدفوع","Paid")}:</strong> ${money(data.total_paid)}</div>
    <div class="summary-item"><strong>${t("المتبقي","Remaining")}:</strong> ${money(data.total_remaining)}</div>

    <div class="summary-item">
      <strong>${t("نسبة التحصيل","Collection Rate")}:</strong>
        ${(data.total_amount
          ? ((data.total_paid / data.total_amount) * 100).toFixed(1)
          : 0)}%
    </div>
  `;

  /* ====================== PAYMENTS TABLE ====================== */
  const paymentsTable = `
    <table dir="${direction}">
      <thead>
        <tr>
          <th>${t("تاريخ الاستحقاق","Due Date")}</th>
          <th>${t("المبلغ","Amount")}</th>
          <th>${t("المدفوع","Paid")}</th>
          <th>${t("المتبقي","Remaining")}</th>
          <th>${t("الحالة","Status")}</th>
        </tr>
      </thead>

      <tbody>
      ${
        data.payments.length
          ? data.payments
              .map(
                (p) => `
            <tr>
              <td>${toDate(p.due_date)}</td>
              <td>${money(p.amount)}</td>
              <td>${money(p.paid_amount)}</td>
              <td>${money(p.remaining_amount)}</td>
              <td>${p.status}</td>
            </tr>
          `
              )
              .join("")
          : `<tr><td colspan="5">${t("لا يوجد بيانات","No Data")}</td></tr>`
      }
      </tbody>
    </table>
  `;

  /* ====================== RETURN PDF TEMPLATE ====================== */

  return {
    title: t("تقرير دفعات العقد", "Contract Payments Report"),
    subtitle: "SaqrON Property Manager",

    summaryTitle: t("ملخص الدفعات", "Payments Summary"),
    summaryHTML ,

    detailsTableHTML: `
        <div class="page-break"></div>

        <h3 class="section-title">
          ${t("تحليل أعمار الديون (Aging)", "Payment Aging Analysis")}
        </h3>

        ${agingHTML}
    `,

    secondaryTablesHTML: `
      <div class="page-break"></div>
      <h3 class="section-title">${t("الدفعات","Payments")}</h3>
      ${paymentsTable}
    `,

    lang,
    direction,
    logo,
    inlineCSS: "",
    footerText: t(
      `تم إنشاء التقرير عبر SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}

export function buildContractExpensesTemplate(data, t, lang, logo, direction) {
  /* ---------------------- HELPERS ---------------------- */
  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const toDate = (v) => {
    if (!v) return "-";
    if (typeof v === "string") return v.split("T")[0];
    try {
      return new Date(v).toISOString().split("T")[0];
    } catch {
      return "-";
    }
  };

  /* ---------------------- SAFE DATA ---------------------- */
  const contract = data.contract || {};
  const tenant = data.tenant || {};
  const lessor = data.lessor || {};
  const unit = data.unit || {};
  const property = data.property || {};
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const monthlyStats = Array.isArray(data.monthly_stats) ? data.monthly_stats : [];

  const totalExpenses = Number(data.total_expenses || 0);
  const highestExpense = Number(data.highest_expense || 0);
  const averageExpense = Number(data.average_expense || 0);

  /* ---------------------- SUMMARY SECTION ---------------------- */

  const summaryHTML = `
    <div class="summary-item"><strong>${t("رقم العقد", "Contract No")}:</strong> ${contract.contract_no}</div>

    <div class="summary-item"><strong>${t("اسم المكتب", "Office")}:</strong> ${contract.office_name || "-"}</div>

    <div class="summary-item"><strong>${t("المستأجر", "Tenant")}:</strong> ${tenant.name || "-"}</div>

    <div class="summary-item"><strong>${t("تاريخ البداية", "Start Date")}:</strong> ${toDate(contract.tenancy_start)}</div>

    <div class="summary-item"><strong>${t("تاريخ النهاية", "End Date")}:</strong> ${toDate(contract.tenancy_end)}</div>

    <div class="summary-item"><strong>${t("إجمالي المصروفات", "Total Expenses")}:</strong> ${money(totalExpenses)}</div>

    <div class="summary-item"><strong>${t("أعلى مصروف", "Highest Expense")}:</strong> ${money(highestExpense)}</div>

    <div class="summary-item"><strong>${t("متوسط المصروف", "Average Expense")}:</strong> ${money(averageExpense)}</div>
  `;


  /* ---------------------- EXPENSES TABLE ---------------------- */

  const expensesTableHTML = `
    <table dir="${direction}">
      <thead>
        <tr>
          <th>${t("التاريخ", "Date")}</th>
          <th>${t("المبلغ", "Amount")}</th>
          <th>${t("النوع", "Category")}</th>
          <th>${t("على من", "On Whom")}</th>
          <th>${t("بتحمل", "Paid By")}</th>
          <th>${t("الوصف", "Description")}</th>
        </tr>
      </thead>

      <tbody>
        ${
          expenses.length
            ? expenses
                .map(
                  (e) => `
          <tr>
            <td>${toDate(e.date)}</td>
            <td>${money(e.amount)}</td>
            <td>${e.expense_type || "-"}</td>
            <td>${e.on_whom || "-"}</td>
            <td>${e.paid_by || "-"}</td>
            <td>${e.notes || "-"}</td>
          </tr>
        `
                )
                .join("")
            : `<tr><td colspan="6">${t("لا يوجد مصروفات", "No Expenses")}</td></tr>`
        }
      </tbody>
    </table>
  `;

  /* ---------------------- MONTHLY ANALYSIS ---------------------- */

  const monthlyHTML = `
    <h3 class="section-title">${t("تحليل المصروفات الشهرية", "Monthly Expense Analysis")}</h3>

    <table dir="${direction}">
      <thead>
        <tr>
          <th>${t("الشهر", "Month")}</th>
          <th>${t("الإجمالي", "Total")}</th>
        </tr>
      </thead>

      <tbody>
        ${
          monthlyStats
            .map(
              (m) => `
          <tr>
            <td>${m.month}</td>
            <td>${money(m.total)}</td>
          </tr>
          `
            )
            .join("")
        }
      </tbody>
    </table>
  `;

  /* ---------------------- FINAL RETURN ---------------------- */

  return {
    /* HEADER */
    title: t("تقرير مصروفات العقد", "Contract Expenses Report"),
    subtitle: t("SaqrON نظام إدارة الأملاك", "SaqrON Property Manager"),
    logo,
    lang,
    direction,

    /* SUMMARY BOX */
    summaryTitle: t("ملخص المصروفات", "Expenses Summary"),
    summaryHTML,

    /* DETAILS (Expenses Table) */
    detailsTableHTML: `
      <div class="page-break"></div>
      <h3 class="section-title">${t("تفاصيل المصروفات", "Expenses Details")}</h3>
      ${expensesTableHTML}
    `,

    /* SECONDARY TABLES (Monthly) */
    secondaryTablesHTML: `
      <div class="page-break"></div>
      <h3 class="section-title">${t("التحليل الشهري", "Monthly Analysis")}</h3>
      ${monthlyHTML}
    `,

    footerText:
      lang === "ar"
        ? `تم إنشاء التقرير بواسطة SaqrON © ${new Date().getFullYear()}`
        : `Generated by SaqrON © ${new Date().getFullYear()}`,
  };
}

export function buildPaymentsReportTemplate(data, t, lang, logo, direction) {
  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const toDate = (v) => {
    if (!v) return "-";
    if (typeof v === "string") return v.split("T")[0];
    return "-";
  };

  /* ====================== SUMMARY ====================== */
  const summaryHTML = `
    <div class="summary-item">
      <strong>${t("الفترة","Period")}:</strong> 
      ${data.from} — ${data.to}
    </div>

    <div class="summary-item">
      <strong>${t("عدد الدفعات","Payments Count")}:</strong> 
      ${data.payments_count}
    </div>

    <div class="summary-item">
      <strong>${t("عدد العقود","Contracts Count")}:</strong> 
      ${data.contracts_count}
    </div>

    <div class="summary-item">
      <strong>${t("إجمالي المبالغ","Total Amount")}:</strong> 
      ${money(data.total_amount)}
    </div>
  `;

  /* ====================== PAYMENTS TABLE ====================== */
  const paymentsTable = `
    <table dir="${direction}">
      <thead>
        <tr>
          <th>${t("تاريخ الاستحقاق","Due Date")}</th>
          <th>${t("العقد","Contract No")}</th>
          <th>${t("المستأجر","Tenant")}</th>
          <th>${t("الجوال","Phone")}</th>
          <th>${t("العقار","Property")}</th>
          <th>${t("الوحدة","Unit")}</th>
          <th>${t("المبلغ","Amount")}</th>
          <th>${t("الحالة","Status")}</th>
        </tr>
      </thead>

      <tbody>
      ${
        data.payments.length
          ? data.payments
              .map(
                (p) => `
            <tr>
              <td>${toDate(p.due_date)}</td>
              <td>${p.contract_no || "-"}</td>
              <td>${p.tenant_name || "-"}</td>
              <td>${p.tenant_phone || "-"}</td>
              <td>${p.property_name || "-"}</td>
              <td>${p.unit_no || "-"}</td>
              <td>${money(p.amount)}</td>
              <td>${p.status}</td>
            </tr>
          `
              )
              .join("")
          : `<tr><td colspan="8">${t("لا يوجد بيانات","No Data")}</td></tr>`
      }
      </tbody>
    </table>
  `;

  /* ====================== RETURN TEMPLATE ====================== */
  return {
    title: t("تقرير الدفعات", "Payments Report"),
    subtitle: "SaqrON Property Manager",

    summaryTitle: t("ملخص التقرير", "Report Summary"),
    summaryHTML,

    detailsTableHTML: `
      <div class="page-break"></div>
      <h3 class="section-title">${t("تفاصيل الدفعات","Payments Details")}</h3>
      ${paymentsTable}
    `,

    secondaryTablesHTML: "",

    lang,
    direction,
    logo,

    inlineCSS: `
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        font-size: 13px;
      }
      th {
        background: #f0f0f0;
        font-weight: bold;
      }
      .summary-item {
        font-size: 14px;
        margin-bottom: 6px;
      }
      .section-title {
        margin: 30px 0 10px;
        font-size: 18px;
        font-weight: bold;
      }
      .page-break {
        page-break-before: always;
      }
    `,

    footerText: t(
      `تم إنشاء التقرير عبر SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}




// ===============================================
// 🟥 Occupancy Report Template Builder
// ===============================================
function buildOccupancyTemplate(summary, lang) {
  return {
    title: lang === "ar" ? "تقرير نسبة الإشغال" : "Occupancy Report",
    subtitle: lang === "ar" ? "ملخص إشغال الوحدات" : "Units Occupancy Overview",

    summaryTitle: lang === "ar" ? "ملخص الإشغال" : "Occupancy Summary",

    summaryHTML: `
      <div>
        <p><strong>${lang === "ar" ? "إجمالي الوحدات:" : "Total Units:"}</strong> ${summary.total_units}</p>
        <p><strong>${lang === "ar" ? "الوحدات المشغولة:" : "Occupied Units:"}</strong> ${summary.occupied_units}</p>
        <p><strong>${lang === "ar" ? "الوحدات الشاغرة:" : "Empty Units:"}</strong> ${summary.empty_units}</p>
        <p><strong>${lang === "ar" ? "نسبة الإشغال:" : "Occupancy Rate:"}</strong> ${summary.occupancy_rate}%</p>
      </div>
    `,

    detailsTitle: lang === "ar" ? "تفاصيل الوحدات" : "Units Details",

    detailsTableHTML: `
      <table>
        <thead>
          <tr>
            <th>${lang === "ar" ? "رقم الوحدة" : "Unit No"}</th>
            <th>${lang === "ar" ? "نوع الوحدة" : "Unit Type"}</th>
            <th>${lang === "ar" ? "العقار" : "Property"}</th>
            <th>${lang === "ar" ? "الحالة" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          ${summary.units
            .map(
              (u) => `
            <tr>
              <td>${u.unit_no}</td>
              <td>${u.unit_type}</td>
              <td>${u.property_name}</td>
              <td>${u.occupied > 0 ? (lang === "ar" ? "مشغولة" : "Occupied") : (lang === "ar" ? "شاغرة" : "Empty")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `,

    footerText: lang === "ar"
      ? "هذا التقرير تم توليده تلقائياً من نظام إدارة الأملاك."
      : "This report was automatically generated by the Property Management System.",
  };
}
/* =========================================================
   🟧 Profit Report Template
========================================================= */
export function buildProfitTemplate(data, t, lang, systemLogo, direction) {
  /* ========================= SAFE ARRAYS ========================= */
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const incomeRows = Array.isArray(data.income_rows) ? data.income_rows : [];
  const expenseRows = Array.isArray(data.expense_rows) ? data.expense_rows : [];
  const receipts = Array.isArray(data.receipt_rows) ? data.receipt_rows : [];

  /* ========================= HELPERS ========================= */
  const toMoney = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const toDate = (v) => {
    if (!v) return "-";
    if (v instanceof Date) return v.toISOString().split("T")[0];
    if (typeof v === "number") return new Date(v).toISOString().split("T")[0];
    if (typeof v === "string") return v.includes("T") ? v.split("T")[0] : v;
    return "-";
  };

  /* ========================= PROPERTY + UNIT ========================= */

  const propertyName = data.property_name || payments?.[0]?.property_name || "-";

  const unitName =
    data.unit_name ||
    payments?.[0]?.unit_no ||
    (data.unit_no ? data.unit_no : "All Units");

  /* ========================= PERIOD + RATE ========================= */

  const periodHTML = `
    <div class="summary-item">
      <strong>${t("الفترة", "Period")}:</strong>
      ${data.period_from || "-"} → ${data.period_to || "-"}
    </div>

    <div class="summary-item">
      <strong>${t("نسبة المكتب", "Office Rate")}:</strong>
      ${data.rate || 0}% –
      ${t(
        data.rate_type === "income"
          ? "على الدخل"
          : data.rate_type === "profit"
          ? "على الربح"
          : "على المقبوض",
        data.rate_type
      )}
    </div>
  `;

  const propertyHTML = `
    <div class="summary-item">
      <strong>${t("العقار", "Property")}:</strong> ${propertyName}
    </div>
  `;

  const unitHTML = `
    <div class="summary-item">
      <strong>${t("الوحدة", "Unit")}:</strong> ${unitName}
    </div>
  `;

  /* ========================= SUMMARY SECTION ========================= */

  const summaryHTML = `
    ${periodHTML}
    ${propertyHTML}
    ${unitHTML}

    <div class="summary-item"><strong>${t(
      "الدخل المتوقع",
      "Expected Income"
    )}:</strong> ${toMoney(data.expected_income)}</div>

    <div class="summary-item"><strong>${t(
      "المقبوض فعلاً",
      "Total Collected"
    )}:</strong> ${toMoney(data.total_collected)}</div>

    <div class="summary-item"><strong>${t(
      "إجمالي المصروفات",
      "Total Expenses"
    )}:</strong> ${toMoney(data.total_expenses)}</div>

    <div class="summary-item"><strong>${t(
      "صافي الربح",
      "Net Profit"
    )}:</strong> ${toMoney(data.net_profit)}</div>

    <div class="summary-item"><strong>${t(
      "عمولة المكتب",
      "Office Fee"
    )}:</strong> ${toMoney(data.office_fee)}</div>
  `;

  /* ========================= TABLE BUILDER ========================= */

  const buildTable = (rows, columns) => {
    if (!rows.length)
      return `<table><tr><td>${t("لا يوجد بيانات", "No Data")}</td></tr></table>`;

    return `
      <table dir="${direction}">
        <thead>
          <tr>
            ${columns.map((c) => `<th>${c.label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              ${columns
                .map(
                  (c) =>
                    `<td>${
                      c.format ? c.format(r[c.key]) : r[c.key] || "-"
                    }</td>`
                )
                .join("")}
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  /* ========================= DETAILS TABLES ========================= */

  const detailsTableHTML = `
    <h3 class="section-title">${t(
      "الدفعات (الدخل المتوقع)",
      "Payments (Expected Income)"
    )}</h3>

    ${buildTable(payments, [
      { key: "amount", label: t("المبلغ", "Amount"), format: toMoney },
      { key: "due_date", label: t("تاريخ الإستحقاق", "Due Date"), format: toDate },
      { key: "contract_no", label: t("العقد", "Contract") },
      { key: "unit_no", label: t("الوحدة", "Unit") },
      { key: "tenant_name", label: t("المستأجر", "Tenant") },
    ])}

    <div class="page-break"></div>

    <h3 class="section-title">${t(
      "الإيرادات (قبض فقط)",
      "Income (Collected Only)"
    )}</h3>

    ${buildTable(incomeRows, [
      { key: "amount", label: t("المبلغ", "Amount"), format: toMoney },
      { key: "due_date", label: t("التاريخ", "Date"), format: toDate },
      { key: "contract_no", label: t("العقد", "Contract") },
      { key: "tenant_name", label: t("المستأجر", "Tenant") },
    ])}
  `;

  /* ========================= EXPENSES + RECEIPTS ========================= */

  const secondaryTablesHTML = `
    <div class="page-break"></div>

    <h3 class="section-title">${t("المصروفات", "Expenses")}</h3>

    ${buildTable(expenseRows, [
      { key: "amount", label: t("المبلغ", "Amount"), format: toMoney },
      { key: "date", label: t("التاريخ", "Date"), format: toDate },
      { key: "expense_type", label: t("النوع", "Type") },
      { key: "unit_no", label: t("الوحدة", "Unit") },
      { key: "contract_no", label: t("العقد", "Contract") },
    ])}

    <div class="page-break"></div>

    <h3 class="section-title">${t("السندات", "Receipts")}</h3>

    ${buildTable(receipts, [
      { key: "receipt_type", label: t("النوع", "Type") },
      { key: "reference_no", label: t("الرقم المرجعي", "Reference") },
      { key: "amount", label: t("المبلغ", "Amount"), format: toMoney },
      { key: "date", label: t("التاريخ", "Date"), format: toDate },
      { key: "unit_no", label: t("الوحدة", "Unit") },
      { key: "contract_no", label: t("العقد", "Contract") },
    ])}
  `;

  /* ========================= FINAL OUTPUT ========================= */

  return {
    lang,
    direction,
    logo: systemLogo,

    title: t("تقرير ملخص الأرباح", "Profit Summary Report"),
    subtitle: t("SaqrON نظام إدارة الأملاك", "SaqrON Property Manager"),

    summaryTitle: t("الملخص المالي", "Financial Summary"),
    summaryHTML,

    detailsTitle: t("تفاصيل العمليات المالية", "Financial Details"),
    detailsTableHTML,

    secondaryTablesHTML,

    inlineCSS: "",

    footerText: t(
      `تم إنشاء التقرير بواسطة نظام SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}

export function buildUnitTemplate(data, t, lang, systemLogo, direction) {
  /* ========================= SAFE ARRAYS ========================= */
  const contracts = Array.isArray(data.contracts) ? data.contracts : [];
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];

  /* ========================= HELPERS ========================= */
  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const toDate = (v) => (v ? v : "-");

  const unit = data.unit || {};
  const summary = data.summary || {};

  /* ========================= SUMMARY SECTION ========================= */
  const summaryHTML = `
    <div class="summary-item"><strong>${t("رقم الوحدة", "Unit No")}:</strong> ${unit.unit_no || "-"}</div>
    <div class="summary-item"><strong>${t("نوع الوحدة", "Unit Type")}:</strong> ${unit.unit_type || "-"}</div>
    <div class="summary-item"><strong>${t("المساحة", "Area")}:</strong> ${unit.unit_area || "-"}</div>
    <div class="summary-item"><strong>${t("المدينة", "City")}:</strong> ${unit.city || "-"}</div>
    <div class="summary-item"><strong>${t("رقم الصك", "Title Deed")}:</strong> ${unit.title_deed_no || "-"}</div>
    <div class="summary-item"><strong>${t("الحالة", "Status")}:</strong> ${
      unit.status === "occupied" ? t("مشغولة", "Occupied") : t("شاغرة", "Vacant")
    }</div>

    <div class="summary-item"><strong>${t("عدد العقود", "Contracts")}:</strong> ${summary.contracts_count || 0}</div>
    <div class="summary-item"><strong>${t("عدد الدفعات", "Payments")}:</strong> ${summary.payments_count || 0}</div>
    <div class="summary-item"><strong>${t("عدد المصروفات", "Expenses")}:</strong> ${summary.expenses_count || 0}</div>
    <div class="summary-item"><strong>${t("عدد السندات", "Receipts")}:</strong> ${summary.receipts_count || 0}</div>

    <div class="summary-item"><strong>${t("الإيجارات المتوقعة", "Expected Rent")}:</strong> ${money(summary.expected_payments)}</div>
    <div class="summary-item"><strong>${t("المدفوع", "Paid")}:</strong> ${money(summary.paid_payments)}</div>
    <div class="summary-item"><strong>${t("المتبقي", "Remaining")}:</strong> ${money(summary.remaining_payments)}</div>

    <div class="summary-item"><strong>${t("الإيرادات المقبوضة", "Received Income")}:</strong> ${money(summary.receipts_income)}</div>
    <div class="summary-item"><strong>${t("سندات الصرف", "Receipts Expenses")}:</strong> ${money(summary.receipts_expenses)}</div>
    <div class="summary-item"><strong>${t("إجمالي المصروفات", "Total Expenses")}:</strong> ${money(summary.total_expenses)}</div>
  `;

  /* ========================= TABLE BUILDER ========================= */
  const buildTable = (rows, columns) => {
    if (!rows.length)
      return `<table><tr><td>${t("لا يوجد بيانات", "No Data")}</td></tr></table>`;

    return `
      <table dir="${direction}">
        <thead>
          <tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
                <tr>
                  ${columns
                    .map(
                      (c) =>
                        `<td>${c.format ? c.format(r[c.key]) : (r[c.key] ?? "-")}</td>`
                    )
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  /* ========================= SECTION 1 — CONTRACTS ========================= */
  const contractsTableHTML = `
    <h3 class="section-title">${t("العقود", "Contracts")}</h3>
    ${buildTable(contracts, [
      { key: "contract_no", label: t("رقم العقد", "Contract No") },
      { key: "tenancy_start", label: t("البداية", "Start"), format: toDate },
      { key: "tenancy_end", label: t("النهاية", "End"), format: toDate },
      { key: "annual_rent", label: t("الإيجار السنوي", "Annual Rent"), format: money },
      { key: "contract_status", label: t("الحالة", "Status") },
    ])}
  `;

  /* ========================= SECTION 2 — PAYMENTS ========================= */
  const paymentsTableHTML = `
      <div class="page-break"></div>
    <h3 class="section-title">${t("الدفعات", "Payments")}</h3>
    ${buildTable(payments, [
      { key: "contract_no", label: t("رقم العقد", "Contract") },
      { key: "amount", label: t("قيمة الدفعة", "Amount"), format: money },
      { key: "paid_amount", label: t("المدفوع", "Paid"), format: money },
      { key: "remaining_amount", label: t("المتبقي", "Remaining"), format: money },
      { key: "due_date", label: t("تاريخ الاستحقاق", "Due Date"), format: toDate },
      { key: "status", label: t("الحالة", "Status") },
    ])}
  `;

  /* ========================= SECTION 3 — EXPENSES ========================= */
  const expensesTableHTML = `
    <div class="page-break"></div>
    <h3 class="section-title">${t("المصروفات", "Expenses")}</h3>
    ${buildTable(expenses, [
      { key: "expense_type", label: t("النوع", "Type") },
      { key: "amount", label: t("المبلغ", "Amount"), format: money },
      { key: "date", label: t("التاريخ", "Date"), format: toDate },
      { key: "on_whom", label: t("على من", "On Whom") },
      { key: "paid_by", label: t("مدفوع بواسطة", "Paid By") },
      { key: "notes", label: t("ملاحظات", "Notes") },
    ])}
  `;

  /* ========================= SECTION 4 — RECEIPTS ========================= */
  const receiptsTableHTML = `
    <div class="page-break"></div>
    <h3 class="section-title">${t("السندات", "Receipts")}</h3>
    ${buildTable(receipts, [
      { key: "receipt_type", label: t("النوع", "Type") },
      { key: "reference_no", label: t("الرقم المرجعي", "Reference") },
      { key: "amount", label: t("المبلغ", "Amount"), format: money },
      { key: "date", label: t("التاريخ", "Date"), format: toDate },
      { key: "unit_no", label: t("الوحدة", "Unit") },
      { key: "property_name", label: t("العقار", "Property") },
    ])}
  `;

  /* ========================= FINAL RESULT (PDF ENGINE) ========================= */
  return {
    lang,
    direction,
    logo: systemLogo,

    title: t("تقرير الوحدة", "Unit Report"),
    subtitle: t("SaqrON نظام إدارة الأملاك", "SaqrON Property Manager"),

    summaryTitle: t("ملخص الوحدة", "Unit Summary"),
    summaryHTML,

    detailsTitle: t("تفاصيل الوحدة", "Unit Details"),
    detailsTableHTML: contractsTableHTML,

    secondaryTablesHTML:
      paymentsTableHTML + expensesTableHTML + receiptsTableHTML,

    inlineCSS: "",
    footerText: t(
      `تم إنشاء التقرير بواسطة نظام SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}



export function buildPropertyTemplate(data, t, lang, systemLogo, direction) {
  /* ========================= SAFE ARRAYS ========================= */
  const units = Array.isArray(data.units) ? data.units : [];
  const contracts = Array.isArray(data.contracts) ? data.contracts : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];

  const summary = data.summary || {};
  const property = data.property || {};

  /* ========================= HELPERS ========================= */
  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "ar-SA" : "en-US");

  const toDate = (v) => (v ? v : "-");

  /* ========================= SUMMARY ========================= */
  const summaryHTML = `
    <div class="summary-item"><strong>${t("نوع العقار", "Property Type")}:</strong> ${property.property_type || "-"}</div>
    <div class="summary-item"><strong>${t("الاستخدام", "Usage")}:</strong> ${property.property_usage || "-"}</div>
    <div class="summary-item"><strong>${t("المدينة", "City")}:</strong> ${property.city || "-"}</div>
    <div class="summary-item"><strong>${t("العنوان الوطني", "National Address")}:</strong> ${property.national_address || "-"}</div>
    <div class="summary-item"><strong>${t("رقم الصك", "Title Deed")}:</strong> ${property.title_deed_no || "-"}</div>
    <div class="summary-item"><strong>${t("عدد الوحدات", "Units Count")}:</strong> ${summary.units_count || 0}</div>
    <div class="summary-item"><strong>${t("عدد العقود", "Contracts Count")}:</strong> ${summary.contracts_count || 0}</div>
    <div class="summary-item"><strong>${t("عدد المصروفات", "Expenses Count")}:</strong> ${summary.expenses_count || 0}</div>
    <div class="summary-item"><strong>${t("عدد السندات", "Receipts Count")}:</strong> ${summary.receipts_count || 0}</div>

    <div class="summary-item"><strong>${t("إجمالي المصروفات", "Total Expenses")}:</strong> ${money(summary.total_expenses)}</div>
    <div class="summary-item"><strong>${t("إجمالي المقبوض", "Total Income (Receipts)")}:</strong> ${money(summary.total_receipts_income)}</div>
    <div class="summary-item"><strong>${t("إجمالي الصرف", "Total Paid (Receipts)")}:</strong> ${money(summary.total_receipts_expense)}</div>
  `;

  /* ========================= TABLE BUILDER ========================= */
  const buildTable = (rows, columns) => {
    if (!rows.length)
      return `<table><tr><td>${t("لا يوجد بيانات", "No Data")}</td></tr></table>`;

    return `
      <table dir="${direction}">
        <thead>
          <tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
                <tr>
                  ${columns
                    .map(
                      (c) =>
                        `<td>${c.format ? c.format(r[c.key]) : (r[c.key] ?? "-")}</td>`
                    )
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  /* ========================= SECTION 1 — UNITS ========================= */
  const unitsTableHTML = `
    <h3 class="section-title">${t("الوحدات", "Units")}</h3>
    ${buildTable(units, [
      { key: "unit_no", label: t("رقم الوحدة", "Unit No") },
      { key: "unit_type", label: t("نوع الوحدة", "Type") },
      { key: "unit_area", label: t("المساحة", "Area") },
      { key: "electric_meter_no", label: t("عداد الكهرباء", "Electric Meter") },
      { key: "water_meter_no", label: t("عداد الماء", "Water Meter") },
    ])}
  `;

  /* ========================= SECTION 2 — CONTRACTS ========================= */
  const contractsTableHTML = `
    <div class="page-break"></div>
    <h3 class="section-title">${t("العقود", "Contracts")}</h3>
    ${buildTable(contracts, [
      { key: "contract_no", label: t("رقم العقد", "Contract No") },
      { key: "tenant_name", label: t("المستأجر", "Tenant") },
      { key: "tenancy_start", label: t("البداية", "Start"), format: toDate },
      { key: "tenancy_end", label: t("النهاية", "End"), format: toDate },
      { key: "annual_rent", label: t("الإيجار السنوي", "Annual Rent"), format: money },
      { key: "status", label: t("الحالة", "Status") },
    ])}
  `;

  /* ========================= SECTION 3 — EXPENSES ========================= */
  const expensesTableHTML = `
    <div class="page-break"></div>
    <h3 class="section-title">${t("المصروفات", "Expenses")}</h3>
    ${buildTable(expenses, [
      { key: "expense_type", label: t("النوع", "Type") },
      { key: "amount", label: t("المبلغ", "Amount"), format: money },
      { key: "date", label: t("التاريخ", "Date"), format: toDate },
      { key: "notes", label: t("ملاحظات", "Notes") },
    ])}
  `;

  /* ========================= SECTION 4 — RECEIPTS ========================= */
  const receiptsTableHTML = `
    <div class="page-break"></div>
    <h3 class="section-title">${t("السندات", "Receipts")}</h3>
    ${buildTable(receipts, [
      { key: "receipt_type", label: t("النوع", "Type") },
      { key: "amount", label: t("المبلغ", "Amount"), format: money },
      { key: "date", label: t("التاريخ", "Date"), format: toDate },
    ])}
  `;

  /* ========================= FINAL RESULT ========================= */
  return {
    lang,
    direction,
    logo: systemLogo,

    title: t("تقرير العقار", "Property Report"),
    subtitle: t("SaqrON نظام إدارة الأملاك", "SaqrON Property Manager"),

    summaryTitle: t("ملخص العقار", "Property Summary"),
    summaryHTML,

    detailsTitle: t("تفاصيل العقار", "Property Details"),
    detailsTableHTML: unitsTableHTML,

    secondaryTablesHTML:
      contractsTableHTML + expensesTableHTML + receiptsTableHTML,

    inlineCSS: "",
    footerText: t(
      `تم إنشاء التقرير بواسطة نظام SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}

export function buildExpensesReportTemplate(data, t, lang, logo, direction) {

  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const toDate = (v) => {
    if (!v) return "-";
    if (typeof v === "string") return v.split("T")[0];
    return "-";
  };

  /* ====================== SUMMARY ====================== */
  const summaryHTML = `
    <div class="summary-item">
      <strong>${t("الفترة","Period")}:</strong> 
      ${data.from} — ${data.to}
    </div>

    <div class="summary-item">
      <strong>${t("عدد المصروفات","Expenses Count")}:</strong> 
      ${data.expenses_count}
    </div>

    <div class="summary-item">
      <strong>${t("العقارات","Properties")}:</strong> 
      ${data.properties_count}
    </div>

    <div class="summary-item">
      <strong>${t("الوحدات","Units")}:</strong> 
      ${data.units_count}
    </div>

    <div class="summary-item">
      <strong>${t("العقود","Contracts")}:</strong> 
      ${data.contracts_count}
    </div>

    <div class="summary-item">
      <strong>${t("إجمالي المصروفات","Total Expenses")}:</strong> 
      ${money(data.total_amount)}
    </div>
  `;

  /* ====================== EXPENSES TABLE ====================== */
  const expensesTable = `
    <table dir="${direction}">
      <thead>
        <tr>
          <th>${t("التاريخ","Date")}</th>
          <th>${t("النوع","Type")}</th>
          <th>${t("القيمة","Amount")}</th>
          <th>${t("على من","On Whom")}</th>
          <th>${t("العقار","Property")}</th>
          <th>${t("الوحدة","Unit")}</th>
          <th>${t("العقد","Contract")}</th>
          <th>${t("الوصف","Description")}</th>
        </tr>
      </thead>

      <tbody>
      ${
        data.expenses.length
          ? data.expenses
              .map(
                (e) => `
            <tr>
              <td>${toDate(e.date)}</td>
              <td>${e.expense_type || "-"}</td>
              <td>${money(e.amount)}</td>
              <td>${e.on_whom || "-"}</td>
              <td>${e.property_name || "-"}</td>
              <td>${e.unit_no || "-"}</td>
              <td>${e.contract_no || "-"}</td>
              <td>${e.description || "-"}</td>
            </tr>
          `
              )
              .join("")
          : `<tr><td colspan="8">${t("لا يوجد بيانات","No Data")}</td></tr>`
      }
      </tbody>
    </table>
  `;

  /* ====================== RETURN TEMPLATE ====================== */
  return {
    title: t("تقرير المصروفات", "Expenses Report"),
    subtitle: "SaqrON Property Manager",

    summaryTitle: t("ملخص المصروفات", "Expenses Summary"),
    summaryHTML,

    detailsTableHTML: `
      <div class="page-break"></div>
      <h3 class="section-title">${t("تفاصيل المصروفات","Expenses Details")}</h3>
      ${expensesTable}
    `,

    secondaryTablesHTML: "",

    lang,
    direction,
    logo,

    inlineCSS: `
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        font-size: 14px;
      }

      th {
        background: #0f766e;
        color: #fff;
        padding: 10px;
        border: 1px solid #0d5f57;
        font-weight: 700;

        white-space: nowrap;
      }

      td {
        padding: 8px;
        border: 1px solid #ccc;
        text-align: center;
        background: #fff;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
      }

      tr:nth-child(even) td {
        background: #f9fafb;
      }

      .summary-item {
        font-size: 16px;
        margin: 8px 0;
        font-weight: 600;
      }

      .section-title {
        margin: 30px 0 10px;
        font-size: 20px;
        font-weight: 700;
        color: #0f766e;
        border-inline-start: 6px solid #0f766e;
        padding-inline-start: 12px;
      }

      .page-break {
        page-break-before: always;
      }
    `,

    footerText: t(
      `تم إنشاء التقرير عبر SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}

export function buildReceiptsReportTemplate(data, t, lang, logo, direction) {
  const money = (v) =>
    Number(v || 0).toLocaleString(lang === "ar" ? "en-US" : "en-US");

  const toDate = (v) => {
    if (!v) return "-";
    if (typeof v === "string") return v.split("T")[0];
    return "-";
  };

  /* ====================== SUMMARY ====================== */
  const summaryHTML = `
    <div class="summary-item">
      <strong>${t("الفترة","Period")}:</strong> 
      ${data.from} — ${data.to}
    </div>

    <div class="summary-item">
      <strong>${t("عدد السندات","Receipts Count")}:</strong> 
      ${data.receipts_count}
    </div>

    <div class="summary-item">
      <strong>${t("إجمالي المبالغ","Total Amount")}:</strong> 
      ${money(data.total_amount)}
    </div>
  `;

  /* ====================== RECEIPTS TABLE ====================== */
  const receiptsTable = `
    <table dir="${direction}">
      <thead>
        <tr>
          <th>${t("التاريخ","Date")}</th>
          <th>${t("القيمة","Amount")}</th>
          <th>${t("النوع","Type")}</th>
          <th>${t("الدافع","Payer")}</th>
          <th>${t("المستلم","Receiver")}</th>
          <th>${t("العقار","Property")}</th>
          <th>${t("الوحدة","Unit")}</th>
          <th>${t("العقد","Contract")}</th>
          <th>${t("المستأجر","Tenant")}</th>
        </tr>
      </thead>

      <tbody>
      ${
        data.receipts.length
          ? data.receipts
              .map(
                (r) => `
            <tr>
              <td>${toDate(r.date)}</td>
              <td>${money(r.amount)}</td>
              <td>${r.receipt_type || "-"}</td>
              <td>${r.payer || "-"}</td>
              <td>${r.receiver || "-"}</td>
              <td>${r.property_name || "-"}</td>
              <td>${r.unit_no || "-"}</td>
              <td>${r.contract_no || "-"}</td>
              <td>${r.tenant_name || "-"}</td>
            </tr>
          `
              )
              .join("")
          : `<tr><td colspan="9">${t("لا يوجد بيانات","No Data")}</td></tr>`
      }
      </tbody>
    </table>
  `;

  /* ====================== RETURN TEMPLATE ====================== */
  return {
    title: t("تقرير القبوضات", "Receipts Report"),
    subtitle: "SaqrON Property Manager",

    summaryTitle: t("ملخص القبوضات", "Receipts Summary"),
    summaryHTML,

    detailsTableHTML: `
      <div class="page-break"></div>
      <h3 class="section-title">${t("تفاصيل القبوضات","Receipts Details")}</h3>
      ${receiptsTable}
    `,

    secondaryTablesHTML: "",

    lang,
    direction,
    logo,

    inlineCSS: `
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        font-size: 14px;
      }

      th {
        background: #0f766e;
        color: #fff;
        padding: 10px;
        border: 1px solid #0d5f57;
        font-weight: 700;
        white-space: nowrap;
      }

      td {
        padding: 8px;
        border: 1px solid #ccc;
        text-align: center;
        background: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
      }

      tr:nth-child(even) td {
        background: #f9fafb;
      }

      .summary-item {
        font-size: 16px;
        margin: 8px 0;
        font-weight: 600;
      }

      .section-title {
        margin: 30px 0 10px;
        font-size: 20px;
        font-weight: 700;
        color: #0f766e;
        border-inline-start: 6px solid #0f766e;
        padding-inline-start: 12px;
      }

      .page-break {
        page-break-before: always;
      }
    `,

    footerText: t(
      `تم إنشاء التقرير عبر SaqrON © ${new Date().getFullYear()}`,
      `Generated by SaqrON © ${new Date().getFullYear()}`
    ),
  };
}



/* ============ Helper to Build Styled Tables ============ */
function buildTable(rows, columns, dir) {
  if (!rows.length)
    return `<p style="padding:10px; text-align:center; color:#777;">No data</p>`;

  const header = columns
    .map((c) => `<th>${c.label}</th>`)
    .join("");

  const body = rows
    .map((row) => {
      return (
        "<tr>" +
        columns
          .map((c) => {
            const raw = row[c.key];
            const val = c.format ? c.format(raw) : raw || "-";
            return `<td>${val}</td>`;
          })
          .join("") +
        "</tr>"
      );
    })
    .join("");

  return `
    <table dir="${dir}">
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}





/* ---------- Add property/unit/financial/etc helpers… ---------- */
/* =========================================================
   📊 API — Occupancy Summary (JSON Only)
========================================================= */
router.get("/occupancy/summary", verifyToken, async (req, res) => {
  try {
    const data = await getOccupancyReport(req.user.id); // JSON summary only
    return res.json(data);
  } catch (err) {
    console.error("❌ Occupancy summary error:", err);
    res.status(500).json({ success: false, message: "Error loading summary" });
  }
});
/* ============================================================
    💰 PROFIT SUMMARY (FINAL VERSION)
    - Payments (Income)
    - Expenses
    - Receipts (Collected)
    - Office Fee
    - Full Filtering (Property / Unit / Date)
    - Always restricted to user's offices only
============================================================ */

/* =========================================================
   📌 Preview Summary for Expenses
   GET /reports/summary/expenses
========================================================= */
router.get("/summary/profit", verifyToken, async (req, res) => {
  let { property_id, unit_id, from, to, rate = 0, rate_type = "income" } = req.query;

  try {
    const userId = req.user.id;

    if (unit_id) unit_id = parseInt(unit_id);
    if (property_id) property_id = parseInt(property_id);

    const UNIT_MODE = !!unit_id;
    if (UNIT_MODE) {
      property_id = null;
    }

    const officeFilterC = `(
      c.office_id IN (SELECT id FROM offices WHERE owner_id = $1)
      OR c.office_id IN (SELECT office_id FROM office_users WHERE user_id = $1)
    )`;

    const officeFilterE = `(
      e.office_id IN (SELECT id FROM offices WHERE owner_id = $1)
      OR e.office_id IN (SELECT office_id FROM office_users WHERE user_id = $1)
    )`;

    const officeFilterR = `(
      r.office_id IN (SELECT id FROM offices WHERE owner_id = $1)
      OR r.office_id IN (SELECT office_id FROM office_users WHERE user_id = $1)
    )`;

    const addDates = (params, filters, alias, col = "date") => {
      if (from && to) {
        params.push(from, to);
        filters.push(`${alias}.${col} BETWEEN $${params.length - 1} AND $${params.length}`);
      }
    };

    /* ============================================================
       1) PAYMENTS TABLE
    ============================================================ */
    let paymentParams = [userId];
    let paymentFilters = [officeFilterC];

    if (UNIT_MODE) {
      paymentParams.push(unit_id);
      paymentFilters.push(
        `c.id IN (SELECT contract_id FROM contract_units WHERE unit_id = $${paymentParams.length})`
      );
    } else if (property_id) {
      paymentParams.push(property_id);
      paymentFilters.push(`c.property_id = $${paymentParams.length}`);
    }

    addDates(paymentParams, paymentFilters, "p", "due_date");

    const paymentsQuery = `
      SELECT
        p.due_date,
        p.amount,
        p.paid_amount,
        (p.amount - COALESCE(p.paid_amount, 0)) AS remaining_amount,
        p.status,
        c.contract_no,
        t.name AS tenant_name,
        COALESCE(u.unit_no, '-') AS unit_no,
        COALESCE(pr.property_type, '-') AS property_name
      FROM payments p
      JOIN contracts c ON c.id = p.contract_id
      LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND LOWER(cp.role)='tenant'
      LEFT JOIN parties t ON t.id = cp.party_id
      LEFT JOIN contract_units cu ON cu.contract_id = c.id
      LEFT JOIN units u ON u.id = cu.unit_id
      LEFT JOIN properties pr ON pr.id = c.property_id
      WHERE ${paymentFilters.join(" AND ")}
      ORDER BY p.due_date DESC
    `;

    const paymentsRes = await pool.query(paymentsQuery, paymentParams);

    const expectedIncome = paymentsRes.rows.reduce(
      (s, r) => s + Number(r.amount || 0),
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

      expFilters.push(`(
        e.unit_id = $${idx}
        OR e.contract_id IN (SELECT contract_id FROM contract_units WHERE unit_id = $${idx})
      )`);

      expFilters.push(`(e.unit_id IS NOT NULL OR e.contract_id IS NOT NULL)`);

    } else if (property_id) {
      expParams.push(property_id);
      const idx = expParams.length;

      expFilters.push(`(
        e.property_id = $${idx}
        OR e.unit_id IN (SELECT id FROM units WHERE property_id = $${idx})
        OR e.contract_id IN (SELECT id FROM contracts WHERE property_id = $${idx})
        OR e.contract_id IN (
            SELECT cu.contract_id
            FROM contract_units cu JOIN contracts c ON c.id = cu.contract_id
            WHERE c.property_id = $${idx}
        )
      )`);
    }

    const expensesQuery = `
      SELECT 
        e.amount,
        e.date,
        e.expense_type,
        e.description,
        COALESCE(p.property_type, '-') AS property_name,
        COALESCE(u1.unit_no, u2.unit_no, '-') AS unit_no,
        c.contract_no
      FROM expenses e
      LEFT JOIN units u1 ON u1.id = e.unit_id
      LEFT JOIN contract_units cu ON cu.contract_id = e.contract_id
      LEFT JOIN units u2 ON u2.id = cu.unit_id
      LEFT JOIN contracts c ON c.id = e.contract_id
      LEFT JOIN properties p 
       ON p.id = e.property_id 
       OR p.id = c.property_id
       OR p.id = u2.property_id
      WHERE ${expFilters.join(" AND ")}
      ORDER BY e.date DESC
    `;

    const expensesRes = await pool.query(expensesQuery, expParams);
    let totalExpenses = expensesRes.rows.reduce((s, r) => s + Number(r.amount || 0), 0);

    /* ============================================================
       3) RECEIPTS = ONLY قبض
    ============================================================ */
    let incParams = [userId];
    let incFilters = [officeFilterR];

    addDates(incParams, incFilters, "r");

    if (UNIT_MODE) {
      incParams.push(unit_id);
      const idx = incParams.length;

      incFilters.push(`(
        r.unit_id = $${idx}
        OR r.contract_id IN (SELECT contract_id FROM contract_units WHERE unit_id = $${idx})
      )`);

      incFilters.push(`(r.unit_id IS NOT NULL OR r.contract_id IS NOT NULL)`);

    } else if (property_id) {
      incParams.push(property_id);
      const idx = incParams.length;

      incFilters.push(`(
        r.property_id = $${idx}
        OR r.unit_id IN (SELECT id FROM units WHERE property_id = $${idx})
        OR r.contract_id IN (SELECT id FROM contracts WHERE property_id = $${idx})
        OR r.contract_id IN (
            SELECT cu.contract_id
            FROM contract_units cu JOIN contracts c ON c.id = cu.contract_id
            WHERE c.property_id = $${idx}
        )
      )`);
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
      WHERE r.receipt_type = 'قبض' AND ${incFilters.join(" AND ")}
      ORDER BY r.date DESC
    `;

    const incomeRes = await pool.query(incomeQuery, incParams);
    const totalCollected = incomeRes.rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    /* ============================================================
      RECEIPTS FILTERS (DEFINE)
    ============================================================ */
    let recParams = [userId];
    let recFilters = [officeFilterR];

    addDates(recParams, recFilters, "r");

    if (UNIT_MODE) {
      recParams.push(unit_id);
      const idx = recParams.length;

      recFilters.push(`(
        r.unit_id = $${idx}
        OR r.contract_id IN (
          SELECT contract_id FROM contract_units WHERE unit_id = $${idx}
        )
      )`);

      recFilters.push(`(r.unit_id IS NOT NULL OR r.contract_id IS NOT NULL)`);

    } else if (property_id) {

      recParams.push(property_id);
      const idx = recParams.length;

      recFilters.push(`(
        r.property_id = $${idx}
        OR r.unit_id IN (SELECT id FROM units WHERE property_id = $${idx})
        OR r.contract_id IN (SELECT id FROM contracts WHERE property_id = $${idx})
        OR r.contract_id IN (
            SELECT cu.contract_id
            FROM contract_units cu
            JOIN contracts c ON c.id = cu.contract_id
            WHERE c.property_id = $${idx}
        )
      )`);
    }

    /* ============================================================
       4) ALL RECEIPTS (قبض + صرف + تسوية)
    ============================================================ */
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
       5) ADD صرف TO EXPENSES
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

    res.json({
      success: true,

      expected_income: expectedIncome,
      total_collected: totalCollected,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      office_fee: officeFee,

      payments: paymentsRes.rows,
      income_rows: incomeRes.rows,
      expense_rows: expensesRes.rows,
      receipt_rows: receiptsRes.rows,
    });

  } catch (err) {
    console.error("❌ Profit Summary Error:", err);
    res.status(500).json({ success: false, message: "Error calculating profit" });
  }
});

router.get("/summary/receipts", verifyToken, async (req, res) => {
  const { from, to } = req.query;

  // المستخدم يمكن يكون مالك أو موظف في عدة مكاتب
  const userId = req.user.id;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "from/to missing",
    });
  }

  try {
    const result = await pool.query(
      `
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
        r.date,
        
        c.contract_no,
        u.unit_no,
        p.property_type,

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
        (c.office_id IN (SELECT oid FROM office_ids)
          OR p.office_id IN (SELECT oid FROM office_ids)
          OR u.property_id IN (
              SELECT id FROM properties 
              WHERE office_id IN (SELECT oid FROM office_ids)
            )
          OR r.office_id IN (SELECT oid FROM office_ids)
        )

        AND r.date BETWEEN $2 AND $3

      ORDER BY r.date DESC
      `,
      [userId, from, to]
    );


    const total = result.rows.reduce(
      (sum, row) => sum + Number(row.amount),
      0
    );

    return res.json({
      success: true,
      count: result.rowCount,
      total_amount: total,
      items: result.rows,
    });

  } catch (err) {
    console.error("❌ Preview Receipts Error:", err);
    return res.status(500).json({
      success: false,
      message: "Error loading receipts summary",
    });
  }
});
/* =========================================================
   📊 Portfolio Summary (Preview)
   GET /reports/summary/portfolio
========================================================= */
router.get(
  "/summary/portfolio",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const activeRole = req.user.activeRole;

      console.log("📌 ActiveRole:", activeRole);
      console.log("📌 User:", req.user);

      let officeIdsQuery = `
        SELECT o.id 
        FROM offices o 
        WHERE o.owner_id = $1
        UNION
        SELECT office_id 
        FROM office_users 
        WHERE user_id = $1
      `;

      const officeIds = await pool.query(officeIdsQuery, [userId]);
      const officeIdList = officeIds.rows.map(r => r.id);

      console.log("📌 Accessible office IDs:", officeIdList);

      if (officeIdList.length === 0) {
        return res.json({
          success: true,
          totalProperties: 0,
          totalUnits: 0,
          totalContracts: 0,
          activeContracts: 0,
          expiredContracts: 0,
          totalValue: 0,
          totalPaid: 0,
          totalExpenses: 0,
          remaining: 0,
        });
      }

      // 🟦 Properties
      const properties = await pool.query(
        `SELECT id FROM properties WHERE office_id = ANY($1::int[])`,
        [officeIdList]
      );

      const propertyIds = properties.rows.map(p => p.id);

      // 🟨 Units
      const units = await pool.query(
        `SELECT id FROM units WHERE property_id = ANY($1::int[])`,
        [propertyIds]
      );

      // 🟥 Contracts
      const contracts = await pool.query(
        `SELECT id, tenancy_end, total_contract_value 
         FROM contracts 
         WHERE property_id = ANY($1::int[])`,
        [propertyIds]
      );

      const today = new Date();
      const active = contracts.rows.filter(c => new Date(c.tenancy_end) >= today).length;
      const expired = contracts.rows.length - active;

      const totalValue = contracts.rows.reduce(
        (a, c) => a + Number(c.total_contract_value || 0),
        0
      );

      // 🟩 Total Paid (real cash received)
      const receipts = await pool.query(
        `
        SELECT r.amount
        FROM receipts r
        WHERE 
            (r.property_id = ANY($1::int[]) OR 
            r.unit_id IN (SELECT id FROM units WHERE property_id = ANY($1::int[])) OR
            r.contract_id IN (SELECT id FROM contracts WHERE property_id = ANY($1::int[])))
        AND r.receipt_type = 'قبض'
        `,
        [propertyIds]
      );

      const totalPaid = receipts.rows.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      );


      // 🟫 Expenses
      const expenses = await pool.query(
        `SELECT amount FROM expenses 
         WHERE property_id = ANY($1::int[]) 
            OR office_id = ANY($2::int[])`,
        [propertyIds, officeIdList]
      );

      const totalExpenses = expenses.rows.reduce(
        (a, e) => a + Number(e.amount || 0),
        0
      );

      return res.json({
        success: true,
        totalProperties: properties.rowCount,
        totalUnits: units.rowCount,
        totalContracts: contracts.rowCount,
        activeContracts: active,
        expiredContracts: expired,
        totalValue,
        totalPaid,
        totalExpenses,
        remaining: totalValue - totalPaid,
      });

    } catch (err) {
      console.error("❌ Portfolio Summary Error:", err);
      res.status(500).json({ success: false, message: "Error loading summary" });
    }
  }
);

router.get("/summary/expenses", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "❌ Missing date range (from, to)",
      });
    }

    const data = await fetchExpenseReport(userId, { from, to });

    return res.status(200).json({
      success: true,
      ...data,
    });

  } catch (err) {
    console.error("❌ Error in /expenses/report:", err);
    return res.status(500).json({
      success: false,
      message: "⚠️ Server error while generating expenses report",
    });
  }
});


export default router;
