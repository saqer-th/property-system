import { pool } from "../server.js"; // 👈 نستخدم الاتصال الجاهز

const defaultTemplates = [
  {
    name: "تذكير بانتهاء العقد",
    trigger_event: "contract_end",
    template:
      "مرحبًا {{name}} 👋، عقدك رقم {{contract_number}} سينتهي بتاريخ {{end_date}}. يرجى مراجعتنا لتجديد العقد.",
    available_vars: ["name", "contract_number", "end_date", "property"],
    channel: "whatsapp",
  },
  {
    name: "تذكير بدفعة إيجار",
    trigger_event: "payment_due",
    template:
      "مرحبًا {{name}}، لديك دفعة مستحقة رقم {{installment_number}} بمبلغ {{amount}} ريال مستحقة بتاريخ {{due_date}}. رقم العقد: {{contract_number}}.",
    available_vars: ["name", "installment_number", "amount", "due_date", "contract_number"],
    channel: "whatsapp",
  },
  {
    name: "إشعار استلام دفعة",
    trigger_event: "payment_received",
    template:
      "تم استلام دفعتك رقم {{installment_number}} بمبلغ {{amount}} ريال بتاريخ {{payment_date}}. نشكرك على التزامك.",
    available_vars: ["name", "installment_number", "amount", "payment_date", "contract_number"],
    channel: "whatsapp",
  },
  {
    name: "رسالة ترحيب بالمستأجر",
    trigger_event: "tenant_welcome",
    template:
      "مرحبًا {{name}}! تم تسجيل عقدك رقم {{contract_number}} في مكتب {{office_name}}. نتمنى لك إقامة مريحة 🌟",
    available_vars: ["name", "contract_number", "office_name"],
    channel: "whatsapp",
  },
    {
    name: "تنبيه بتأخر سداد دفعة",
    trigger_event: "payment_overdue",
    template:
      "مرحبًا {{name}}، نود تنبيهك بأن الدفعة رقم {{installment_number}} بمبلغ {{remaining_amount}} ريال قد تجاوزت موعدها المحدد بتاريخ {{due_date}}. يرجى السداد لتجنب الغرامات. رقم العقد: {{contract_number}}.",
    available_vars: [
      "name",
      "installment_number",
      "remaining_amount",
      "due_date",
      "contract_number",
    ],
    channel: "whatsapp",
  },
  {
    name: "تذكير بتجديد العقد",
    trigger_event: "contract_renewal",
    template:
      "مرحبًا {{name}} 👋، عقدك رقم {{contract_number}} سينتهي قريبًا بتاريخ {{end_date}}. يمكنك تجديده الآن لتجنب توقف الخدمات.",
    available_vars: ["name", "contract_number", "end_date"],
    channel: "whatsapp",
  },

  {
    name: "إشعار بتسجيل دفعة جديدة",
    trigger_event: "new_payment_recorded",
    template:
      "تم تسجيل دفعة جديدة بقيمة {{amount}} ريال على عقد رقم {{contract_number}} بتاريخ {{payment_date}}. شكراً لتعاونك 🙏",
    available_vars: ["amount", "contract_number", "payment_date", "name"],
    channel: "whatsapp",
  },
  {
    name: "تنبيه بفاتورة خدمات",
    trigger_event: "utility_bill_due",
    template:
      "مرحبًا {{name}}، هناك فاتورة خدمات مستحقة على العقار {{property_name}} بمبلغ {{bill_amount}} ريال تستحق بتاريخ {{due_date}}. يرجى السداد لتجنب الإيقاف.",
    available_vars: ["name", "property_name", "bill_amount", "due_date"],
    channel: "whatsapp",
  },
  {
    name: "رسالة شكر بعد انتهاء العقد",
    trigger_event: "contract_end_thank_you",
    template:
      "نشكر لك تعاونك معنا طوال فترة العقد رقم {{contract_number}}. نتمنى لك كل التوفيق، ويسعدنا خدمتك مجددًا مستقبلًا 🌟",
    available_vars: ["name", "contract_number"],
    channel: "whatsapp",
  },
  {
    name: "تذكير بتحديث البيانات",
    trigger_event: "tenant_info_update",
    template:
      "مرحبًا {{name}} 👋، نود تذكيرك بتحديث بياناتك الشخصية لدى المكتب للعقد رقم {{contract_number}} لتجنب أي انقطاع في التواصل.",
    available_vars: ["name", "contract_number"],
    channel: "whatsapp",
  },
];


async function seedTemplates() {
  for (const t of defaultTemplates) {
    await pool.query(
      `INSERT INTO reminder_templates 
       (office_id, name, trigger_event, template, available_vars, channel, system_template, is_active)
       VALUES (NULL, $1, $2, $3, $4, $5, true, true)
       ON CONFLICT DO NOTHING;`,
      [t.name, t.trigger_event, t.template, t.available_vars, t.channel]
    );
  }
  console.log("✅ Default reminder templates seeded");
  process.exit(0);
}

seedTemplates();
