// middleware/verifyRole.js
export function hasRole(user, ...rolesToCheck) {
  if (!user || !user.roles) return false;

  const userRoles = user.roles.map(r => r.toLowerCase());

  // 🔹 ترتيب الأولوية
  const priority = ["admin", "office", "owner", "tenant"];

  // 🔹 أعلى دور للمستخدم
  const highestUserRole = priority.find(r => userRoles.includes(r));

  // 🔹 أعلى دور مطلوب
  const highestRequiredRole = priority.find(r => rolesToCheck.includes(r));

  // 🔹 المستخدم يمر إذا دوره يساوي أو أعلى من المطلوب
  return (
    highestUserRole &&
    highestRequiredRole &&
    priority.indexOf(highestUserRole) <= priority.indexOf(highestRequiredRole)
  );
}
