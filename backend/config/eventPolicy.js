const allowedEventsByRole = {
  office: "all",
  owner: new Set(["login", "contract_view", "payment_view"]),
  tenant: new Set([
    "login",
    "payment_attempt",
    "payment_success",
    "service_request",
  ]),
};

const officeRoleAliases = new Set([
  "office",
  "office_admin",
  "office_user",
  "self_office_admin",
]);

function normalizeRole(role) {
  if (!role) return null;
  const normalized = String(role).toLowerCase();
  if (officeRoleAliases.has(normalized)) return "office";
  if (normalized === "owner") return "owner";
  if (normalized === "tenant") return "tenant";
  if (normalized === "admin" || normalized === "super_admin") return "admin";
  return normalized;
}

function isEventAllowed(userRole, eventType) {
  const role = normalizeRole(userRole);
  if (!role || !eventType) return false;

  const rule = allowedEventsByRole[role];
  if (!rule) return false;
  if (rule === "all") return true;
  return rule.has(eventType);
}

export { isEventAllowed, normalizeRole };
