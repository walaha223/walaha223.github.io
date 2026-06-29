const loginView = document.getElementById("loginView");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotPasswordStatus = document.getElementById("forgotPasswordStatus");
const closeForgotModalButton = document.getElementById("closeForgotModalButton");
const cancelForgotModalButton = document.getElementById("cancelForgotModalButton");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const resetPasswordStatus = document.getElementById("resetPasswordStatus");
const backToLoginButton = document.getElementById("backToLoginButton");
const logoutButton = document.getElementById("logoutButton");
const menuButton = document.getElementById("menuButton");
const sidebar = document.querySelector(".sidebar");
const pageTitle = document.getElementById("pageTitle");
const rolePill = document.querySelector(".role-pill");
const routeLinks = document.querySelectorAll("[data-route]");
const views = document.querySelectorAll(".view");

const config = window.WAC_SUPABASE_CONFIG || {};
const supabaseClient = window.supabase?.createClient?.(config.url, config.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const state = {
  admin: null,
  authUserId: null,
  schools: [],
  schoolRequests: [],
  students: [],
  users: [],
  tutors: [],
  tutorRequests: [],
  games: [],
  reports: [],
  payments: [],
  logs: [],
  logsFiltered: [],
  members: [],
  userModeration: [],
  storeModules: [],
  storeSubscriptions: [],
  storePriceHistory: [],
  storeCustom: [],
  pricingConfigs: [],
  parentLinks: [],
  storeStatsPeriod: "month",
  billingSchemaReady: false,
  playPricingSchemaReady: false,
  counts: {}
};

const roles = [
  ["super_admin", "Controle total"],
  ["walaha_admin", "Operations generales"],
  ["moderator", "Moderation comptes et contenus"],
  ["support", "Assistance utilisateurs"],
  ["finance", "Paiements et abonnements"],
  ["school_validator", "Validation des ecoles"],
  ["content_manager", "Jeux educatifs"]
];

const ROLE_CAPABILITIES = {
  super_admin: "Tout : validation, prix, paiements, membres, modération, Store.",
  walaha_admin: "Operations générales sauf gestion des membres WAC.",
  moderator: "Utilisateurs, répétiteurs, signalements. Pas de modification des prix ni validation paiements.",
  support: "Assistance, écoles (lecture), Store (devis). Pas de validation paiements ni changement de prix.",
  finance: "Facturation écoles, rapports Store, tarifs. Pas de modération utilisateurs ni validation écoles.",
  school_validator: "Validation des demandes d'école et signalements liés.",
  content_manager: "Jeux WalahaPlay et catalogue Store. Pas de facturation ni modération comptes."
};

const ROLE_ROUTES = {
  super_admin: ["dashboard", "schools", "users", "tutors", "games", "store", "reports", "payments", "logs", "settings"],
  walaha_admin: ["dashboard", "schools", "users", "tutors", "games", "store", "reports", "payments", "logs"],
  moderator: ["dashboard", "users", "tutors", "reports", "logs"],
  support: ["dashboard", "schools", "users", "tutors", "store", "reports", "logs"],
  finance: ["dashboard", "store", "payments", "logs"],
  school_validator: ["dashboard", "schools", "reports", "logs"],
  content_manager: ["dashboard", "games", "store", "logs", "settings"]
};

const DASH_ROUTE_META = {
  schools: { label: "Écoles", icon: "⌂" },
  users: { label: "Utilisateurs", icon: "◎" },
  tutors: { label: "Répétiteurs", icon: "✦" },
  games: { label: "Jeux", icon: "▶" },
  store: { label: "WalahaStore", icon: "✚" },
  reports: { label: "Signalements", icon: "!" },
  payments: { label: "Facturation", icon: "₣" },
  logs: { label: "Audit", icon: "⌁" },
  settings: { label: "Paramètres", icon: "⚙" }
};

const TASK_ICONS = {
  "Signalement urgent": "!",
  "École à valider": "⌂",
  "Activation Store": "✚",
  "Module sur devis": "✎",
  "Paiement en retard": "₣",
  "Renouvellement Store": "↻",
  "Demande répétiteur": "✦",
  "Compte à surveiller": "◉"
};

const ACTION_ROLES = {
  "member.add": ["super_admin"],
  "member.role": ["super_admin"],
  "member.revoke": ["super_admin"],
  "member.reactivate": ["super_admin"],
  "payment.create": ["super_admin", "walaha_admin", "finance"],
  "payment.confirm": ["super_admin", "walaha_admin", "finance"],
  "payment.edit": ["super_admin", "walaha_admin", "finance"],
  "payment.printProforma": ["super_admin", "walaha_admin", "finance"],
  "payment.printInvoice": ["super_admin", "walaha_admin", "finance"],
  "payment.remind": ["super_admin", "walaha_admin", "finance"],
  "pricing.school.edit": ["super_admin", "walaha_admin", "finance"],
  "module.create": ["super_admin", "walaha_admin", "content_manager"],
  "module.edit": ["super_admin", "walaha_admin", "content_manager"],
  "module.disable": ["super_admin", "walaha_admin", "content_manager"],
  "module.enable": ["super_admin", "walaha_admin", "content_manager"],
  "store.approve": ["super_admin", "walaha_admin", "finance"],
  "store.activate": ["super_admin", "walaha_admin", "finance"],
  "store.renew": ["super_admin", "walaha_admin", "finance"],
  "store.reject": ["super_admin", "walaha_admin", "finance"],
  "store.suspend": ["super_admin", "walaha_admin"],
  "store.customReview": ["super_admin", "walaha_admin", "support"],
  "store.customQuote": ["super_admin", "walaha_admin", "finance"],
  "store.customClose": ["super_admin", "walaha_admin", "support"],
  "store.customReject": ["super_admin", "walaha_admin"],
  "school.verify": ["super_admin", "walaha_admin", "school_validator"],
  "school.validate": ["super_admin", "walaha_admin", "school_validator"],
  "school.reject": ["super_admin", "walaha_admin", "school_validator"],
  "tutorRequest.approve": ["super_admin", "walaha_admin", "moderator"],
  "tutorRequest.reject": ["super_admin", "walaha_admin", "moderator"],
  "tutorRequest.hold": ["super_admin", "walaha_admin", "moderator"],
  "tutorRequest.view": ["super_admin", "walaha_admin", "moderator", "support"],
  "report.claim": ["super_admin", "walaha_admin", "moderator", "support"],
  "report.resolve": ["super_admin", "walaha_admin", "moderator"],
  "report.reject": ["super_admin", "walaha_admin", "moderator"],
  "report.escalate": ["super_admin", "walaha_admin", "moderator", "support"],
  "report.assign": ["super_admin", "walaha_admin", "moderator"],
  "user.suspend": ["super_admin", "walaha_admin", "moderator"],
  "user.reactivate": ["super_admin", "walaha_admin", "moderator"],
  "user.archive": ["super_admin", "walaha_admin"],
  "game.create": ["super_admin", "walaha_admin", "content_manager"],
  "game.publish": ["super_admin", "walaha_admin", "content_manager"],
  "game.archive": ["super_admin", "walaha_admin", "content_manager"],
  "game.price": ["super_admin", "walaha_admin", "finance", "content_manager"],
  "log.view": ["super_admin", "walaha_admin", "moderator", "support", "finance", "school_validator", "content_manager"],
  "student.view": ["super_admin", "walaha_admin", "moderator", "support", "school_validator"]
};

function canRoute(route) {
  const allowed = ROLE_ROUTES[state.admin?.role || "support"] || ROLE_ROUTES.support;
  return allowed.includes(route);
}

function canAct(action) {
  const allowed = ACTION_ROLES[action];
  return !allowed || allowed.includes(state.admin?.role || "");
}

function setLoginStatus(message, isError = true) {
  if (!loginStatus) return;
  loginStatus.textContent = message || "";
  loginStatus.classList.toggle("success", !isError);
}

function setResetStatus(message, isError = true) {
  if (!resetPasswordStatus) return;
  resetPasswordStatus.textContent = message || "";
  resetPasswordStatus.classList.toggle("success", !isError);
}

function setForgotStatus(message, isError = true) {
  if (!forgotPasswordStatus) return;
  forgotPasswordStatus.textContent = message || "";
  forgotPasswordStatus.classList.toggle("success", !isError);
}

function openForgotModal() {
  const loginEmail = String(document.getElementById("adminEmail")?.value || "").trim();
  const forgotEmail = document.getElementById("forgotEmail");
  if (forgotEmail && loginEmail) {
    forgotEmail.value = loginEmail;
  }
  setForgotStatus("");
  forgotPasswordModal.classList.remove("is-hidden");
  window.setTimeout(() => forgotEmail?.focus(), 20);
}

function closeForgotModal() {
  forgotPasswordModal.classList.add("is-hidden");
  setForgotStatus("");
}

function showPasswordReset() {
  showLogin();
  loginForm.classList.add("is-hidden");
  resetPasswordForm.classList.remove("is-hidden");
  setLoginStatus("");
  setResetStatus("");
}

function showLoginForm() {
  resetPasswordForm.classList.add("is-hidden");
  loginForm.classList.remove("is-hidden");
  setResetStatus("");
}

function formatSupabaseError(error) {
  if (!error) return "Erreur inconnue.";
  if (typeof error === "string") return error;
  if (error.status === 429 || error.code === 429 || error.error_code === "over_email_send_rate_limit") {
    return "trop de demandes ont ete envoyees. Patientez quelques minutes avant de reessayer.";
  }
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  if (error.status || error.name) {
    return [error.name, error.status, error.code].filter(Boolean).join(" ");
  }
  return "Supabase a refuse la demande sans detail. Verifiez la configuration Auth et les Redirect URLs.";
}

function requireSupabase() {
  if (!supabaseClient) {
    setLoginStatus("Configuration Supabase introuvable. Verifiez js/supabase-config.js.");
    return false;
  }
  return true;
}

function statusBadge(status = "unknown") {
  const safe = escapeHtml(status);
  const labels = {
    to_prepare: "à préparer",
    pending: "à facturer",
    paid: "payée",
    partial: "partiel",
    overdue: "en retard",
    cancelled: "annulée",
    refunded: "remboursée",
    pending_review: "en attente",
    on_hold: "en attente Walaha",
    approved: "acceptée",
    rejected: "refusée",
    verified: "vérifiée"
  };
  return `<span class="status ${safe}">${escapeHtml(labels[status] || safe.replaceAll("_", " "))}</span>`;
}

function rowBtn(act, id, label, variant = "") {
  if (!canAct(act)) {
    return `<button type="button" class="row-action is-disabled" disabled title="Action non autorisee pour le role ${escapeHtml(state.admin?.role || "admin")}">${escapeHtml(label)}</button>`;
  }
  return `<button type="button" class="row-action ${variant}" data-act="${act}" data-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
}

function rowBtns(buttons) {
  return `<div class="row-actions">${buttons.filter(Boolean).join("")}</div>`;
}

function emptyRow(colspan, message) {
  return `<tr class="empty-row"><td colspan="${colspan}"><div class="empty-state"><strong>Aucun résultat</strong><small>${escapeHtml(message)}</small></div></td></tr>`;
}

function renderTable(targetId, rows, colspan = 6, empty = "Aucune donnee trouvee.") {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = rows.length ? rows.join("") : emptyRow(colspan, empty);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function text(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return escapeHtml(value);
}

function studentDisplayName(student) {
  const split = [student.first_name, student.last_name].filter(Boolean).join(" ").trim();
  return split || student.full_name || student.public_code || student.id;
}

function adminLabel(adminId) {
  if (!adminId) return "-";
  const user = state.users.find((u) => u.id === adminId);
  if (user) return user.display_name || user.email || adminId;
  const member = state.members.find((m) => m.user_id === adminId);
  if (member) return `${member.role} · ${adminId.slice(0, 8)}…`;
  return adminId;
}

function roleLabel(role) {
  const labels = {
    super_admin: "Super admin",
    walaha_admin: "Admin Walaha",
    moderator: "Modérateur",
    support: "Support",
    finance: "Finance",
    school_validator: "Validateur écoles",
    content_manager: "Contenu"
  };
  return labels[role] || String(role || "admin").replace(/_/g, " ");
}

function formatRelativeTime(iso) {
  if (!iso) return "-";
  const then = new Date(iso);
  const diff = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diff < 45) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return "hier";
  return then.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function auditLogsFor(targetType, targetId, limit = 8) {
  return state.logs
    .filter((log) => log.target_type === targetType && String(log.target_id) === String(targetId))
    .slice(0, limit);
}

function withAuditHistory(details, targetType, targetId) {
  const history = auditLogsFor(targetType, targetId, 6);
  if (!history.length) return details;
  return [
    ...details,
    ["— Historique audit —", `${history.length} entrée(s) récente(s)`],
    ...history.map((log) => [
      log.action_type,
      `${adminLabel(log.admin_id)} · ${new Date(log.created_at).toLocaleString("fr-FR")}${log.reason ? ` · ${log.reason}` : ""}`
    ])
  ];
}

function moduleCommercialStats(module) {
  const subs = state.storeSubscriptions.filter((s) => s.module_id === module.id);
  const active = subs.filter((s) => s.status === "active");
  const pending = subs.filter((s) => ["requested", "approved"].includes(s.status));
  const renewals = active.filter((s) => expiryState(s.expires_at) === "soon");
  const expired = active.filter((s) => expiryState(s.expires_at) === "expired");
  const revenue = active.reduce((sum, s) => sum + subscriptionValue(s), 0);
  const adoption = state.schools.length ? Math.round((active.length / state.schools.length) * 100) : 0;
  const negotiated = subs.filter((s) => s.price_agreed != null).map((s) => Number(s.price_agreed || 0));
  const avgPrice = negotiated.length ? negotiated.reduce((a, b) => a + b, 0) / negotiated.length : null;
  const minPrice = negotiated.length ? Math.min(...negotiated) : null;
  const maxPrice = negotiated.length ? Math.max(...negotiated) : null;
  const priceRange = minPrice == null ? "-" : minPrice === maxPrice ? xof(minPrice) : `${xof(minPrice)} – ${xof(maxPrice)}`;
  return { subs, active, pending, renewals, expired, revenue, adoption, avgPrice, priceRange };
}

async function queryStudents() {
  const extended = await queryTable(
    "canonical_students",
    "id, public_code, first_name, last_name, full_name, origin_canonical_school_id, created_at, deleted_at",
    { order: { column: "created_at" }, limit: 5000 }
  );
  if (!extended.error) return extended;
  return queryTable("canonical_students", "id, origin_canonical_school_id, deleted_at", { order: { column: "created_at" }, limit: 5000 });
}

async function queryParentLinks() {
  const result = await queryTable("school_student_parents", "id, parent_user_id, student_id, status", { limit: 5000 });
  return result.error ? { data: [] } : result;
}

function billingGross(payment) {
  return Number(payment.billed_students || 0) * Number(payment.amount_per_student_xof || 0);
}

function billingDiscount(payment) {
  return Math.max(0, Number(payment.discount_xof || 0));
}

function billingNet(payment) {
  return Math.max(0, billingGross(payment) - billingDiscount(payment));
}

function xof(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function schoolCodeForPayment(payment) {
  const school = state.schools.find((s) => s.id === payment.canonical_school_id || s.name === payment.school_name);
  return school?.public_code || "ECO";
}

function yearCode(year) {
  return String(year || "").replace(/[^0-9]/g, "").slice(-4) || new Date().getFullYear();
}

function shortId(id) {
  return String(id || "").replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
}

function defaultProformaNumber(payment) {
  return `PRO-${yearCode(payment.academic_year)}-${schoolCodeForPayment(payment)}-${shortId(payment.id)}`;
}

function defaultInvoiceNumber(payment) {
  return `FAC-${yearCode(payment.academic_year)}-${schoolCodeForPayment(payment)}-${shortId(payment.id)}`;
}

function currentAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

function studentCountForSchool(schoolId) {
  return state.students.filter((student) => student.origin_canonical_school_id === schoolId).length;
}

function paymentForSchool(schoolId, academicYear = currentAcademicYear()) {
  return state.payments.find((p) => p.canonical_school_id === schoolId && p.academic_year === academicYear)
    || state.payments.find((p) => p.canonical_school_id === schoolId)
    || null;
}

function billingRows() {
  const schoolRows = state.schools.map((school) => {
    const payment = paymentForSchool(school.id);
    if (payment) return { ...payment, isDraftBilling: false };
    const billedStudents = studentCountForSchool(school.id);
    return {
      id: `draft:${school.id}`,
      canonical_school_id: school.id,
      school_name: school.name,
      academic_year: currentAcademicYear(),
      billed_students: billedStudents,
      amount_per_student_xof: schoolSubscriptionAmount(),
      status: "to_prepare",
      isDraftBilling: true,
      created_at: school.created_at
    };
  });
  const schoolIds = new Set(state.schools.map((school) => school.id));
  const orphanPayments = state.payments
    .filter((payment) => payment.canonical_school_id && !schoolIds.has(payment.canonical_school_id))
    .map((payment) => ({ ...payment, isDraftBilling: false }));
  const legacyPayments = state.payments
    .filter((payment) => !payment.canonical_school_id)
    .map((payment) => ({ ...payment, isDraftBilling: false }));
  return [...schoolRows, ...orphanPayments, ...legacyPayments];
}

function billingRowById(id) {
  return billingRows().find((row) => row.id === id);
}

function billingSnapshot(payment) {
  return {
    billed_students: payment.billed_students,
    amount_per_student_xof: payment.amount_per_student_xof,
    discount_xof: payment.discount_xof,
    status: payment.status,
    invoice_number: payment.invoice_number,
    proforma_number: payment.proforma_number,
    due_date: payment.due_date
  };
}

function billingDetails(payment) {
  const base = [
    ["École", payment.school_name],
    ["Code école", schoolCodeForPayment(payment)],
    ["Année scolaire", payment.academic_year],
    ["Élèves facturés", Number(payment.billed_students || 0).toLocaleString("fr-FR")],
    ["Élèves rattachés (réel)", studentCountForSchool(payment.canonical_school_id).toLocaleString("fr-FR")],
    ["Prix par élève", xof(payment.amount_per_student_xof || 0)],
    ["Montant brut", xof(billingGross(payment))],
    ["Réduction", `${xof(billingDiscount(payment))}${payment.discount_reason ? ` · ${payment.discount_reason}` : ""}`],
    ["Net à payer", xof(billingNet(payment))],
    ["Proforma", payment.proforma_number || defaultProformaNumber(payment)],
    ["Facture", payment.invoice_number || defaultInvoiceNumber(payment)],
    ["Échéance", payment.due_date ? new Date(payment.due_date).toLocaleDateString("fr-FR") : "-"],
    ["Contact facturation", payment.billing_contact || "-"],
    ["Email / téléphone", [payment.billing_email, payment.billing_phone].filter(Boolean).join(" · ") || "-"],
    ["Adresse", payment.billing_address || "-"],
    ["NIF / RCCM", payment.tax_id || "-"],
    ["Référence comptable", payment.accounting_ref || "-"],
    ["Statut", payment.status]
  ];
  if (payment.isDraftBilling) return base;
  return withAuditHistory(base, "school_digital_payment", payment.id);
}

function billingDocumentDetails(payment, type) {
  const title = type === "proforma" ? "Facture proforma" : type === "receipt" ? "Facture payée / reçu" : "Facture";
  return [
    ["Document", title],
    ["Numéro", type === "proforma" ? (payment.proforma_number || defaultProformaNumber(payment)) : (payment.invoice_number || defaultInvoiceNumber(payment))],
    ...billingDetails(payment),
    ["Conditions", payment.due_date ? `Paiement attendu avant le ${new Date(payment.due_date).toLocaleDateString("fr-FR")}` : "Échéance à définir"],
    ["Paiement", payment.status === "paid" ? `${payment.payment_method || "-"} · ${payment.payment_reference || "-"}` : "Non payé"],
    ["Confirmé le", payment.confirmed_at ? new Date(payment.confirmed_at).toLocaleString("fr-FR") : "-"]
  ];
}

function billingDocumentNumber(payment, type) {
  return type === "proforma"
    ? (payment.proforma_number || defaultProformaNumber(payment))
    : (payment.invoice_number || defaultInvoiceNumber(payment));
}

function printBillingDocument(payment, type) {
  const title = type === "proforma" ? "Facture proforma" : type === "receipt" ? "Facture payée / reçu" : "Facture";
  const number = billingDocumentNumber(payment, type);
  const rows = [
    ["École", payment.school_name],
    ["Code école", schoolCodeForPayment(payment)],
    ["Année scolaire", payment.academic_year],
    ["Élèves facturés", Number(payment.billed_students || 0).toLocaleString("fr-FR")],
    ["Prix unitaire", xof(payment.amount_per_student_xof || 0)],
    ["Montant brut", xof(billingGross(payment))],
    ["Réduction", xof(billingDiscount(payment))],
    ["Net à payer", xof(billingNet(payment))],
    ["Échéance", payment.due_date ? new Date(payment.due_date).toLocaleDateString("fr-FR") : "-"],
    ["Statut", payment.status],
    ["Référence comptable", payment.accounting_ref || "-"],
    ["Paiement", payment.status === "paid" ? `${payment.payment_method || "-"} · ${payment.payment_reference || "-"}` : "Non payé"]
  ];
  const win = window.open("", "_blank");
  if (!win) throw new Error("Le navigateur a bloque l'ouverture du document. Autorisez les popups pour WAC.");
  win.document.write(`<!doctype html>
    <html><head><meta charset="utf-8"><title>${escapeHtml(number)}</title>
    <style>
      body{font-family:Inter,Arial,sans-serif;margin:34px;color:#2c2118}
      header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #159ca3;padding-bottom:18px;margin-bottom:24px}
      h1{margin:0;font-size:28px} .brand{color:#159ca3;font-weight:900}
      table{width:100%;border-collapse:collapse;margin-top:18px} td{padding:10px 12px;border-bottom:1px solid #eadfd3}
      td:first-child{color:#786b61;font-weight:800;width:34%} .total{font-size:22px;font-weight:900;color:#159ca3}
      footer{margin-top:34px;color:#786b61;font-size:12px} @media print{button{display:none}}
    </style></head><body>
    <header><div><div class="brand">Walaha Admin Center</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(number)}</p></div><button onclick="window.print()">Imprimer / PDF</button></header>
    <section><strong>Client</strong><p>${escapeHtml(payment.billing_contact || payment.school_name || "-")}<br>${escapeHtml([payment.billing_email, payment.billing_phone].filter(Boolean).join(" · ") || "")}<br>${escapeHtml(payment.billing_address || "")}</p></section>
    <table>${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("")}</table>
    <p class="total">Total net : ${escapeHtml(xof(billingNet(payment)))}</p>
    <footer>Document généré par Walaha WAC le ${new Date().toLocaleString("fr-FR")}. Les montants sont établis depuis les données de facturation enregistrées.</footer>
    <script>window.focus(); setTimeout(()=>window.print(), 300);</script>
    </body></html>`);
  win.document.close();
}

function exportCsv(filename, rows) {
  if (!rows.length) {
    window.alert("Aucune donnée à exporter.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => cell(row[h])).join(","))
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function accountingJournalRows() {
  return billingRows()
    .filter((payment) => !payment.isDraftBilling)
    .flatMap((payment) => {
      const net = billingNet(payment);
      const base = {
        ecole: payment.school_name,
        annee_scolaire: payment.academic_year,
        reference_comptable: payment.accounting_ref || "",
        eleves_factures: payment.billed_students,
        montant_brut_xof: billingGross(payment),
        reduction_xof: billingDiscount(payment),
        montant_net_xof: net
      };
      const rows = [{
        ...base,
        type_ligne: "facturation",
        document: payment.invoice_number || payment.proforma_number || "",
        debit_xof: net,
        credit_xof: "",
        statut: payment.status,
        date: payment.issued_at || payment.created_at || "",
        methode_paiement: "",
        reference_paiement: ""
      }];
      if (payment.status === "paid") {
        rows.push({
          ...base,
          type_ligne: "encaissement",
          document: payment.invoice_number || payment.proforma_number || "",
          debit_xof: "",
          credit_xof: net,
          statut: "paid",
          date: payment.confirmed_at || payment.issued_at || payment.created_at || "",
          methode_paiement: payment.payment_method || "",
          reference_paiement: payment.payment_reference || ""
        });
      }
      return rows;
    });
}

const EXPORTS = {
  users: () => ({
    name: "walaha-utilisateurs.csv",
    rows: state.users.map((u) => ({ id: u.id, nom: u.display_name || "", email: u.email, langue: u.preferred_language || "", statut: moderationStatusFor(u.id), cree_le: u.created_at }))
  }),
  payments: () => ({
    name: "walaha-paiements.csv",
    rows: billingRows().map((p) => ({
      ecole: p.school_name,
      annee: p.academic_year,
      eleves_factures: p.billed_students,
      montant_par_eleve_xof: p.amount_per_student_xof,
      montant_brut_xof: billingGross(p),
      reduction_xof: billingDiscount(p),
      net_a_payer_xof: billingNet(p),
      proforma: p.proforma_number || "",
      facture: p.invoice_number || "",
      echeance: p.due_date || "",
      statut: p.status,
      dossier_cree: p.isDraftBilling ? "non" : "oui",
      reference_comptable: p.accounting_ref || "",
      methode_paiement: p.payment_method || "",
      reference_paiement: p.payment_reference || ""
    }))
  }),
  reports: () => ({
    name: "walaha-signalements.csv",
    rows: state.reports.map((r) => ({ motif: r.reason, cible_type: r.target_type, cible_id: r.target_id, priorite: r.priority, statut: r.status }))
  }),
  logs: () => ({
    name: "walaha-audit.csv",
    rows: state.logsFiltered.map((l) => ({
      action: l.action_type,
      cible_type: l.target_type,
      cible_id: l.target_id,
      admin_id: l.admin_id,
      admin_nom: adminLabel(l.admin_id),
      motif: l.reason,
      date: l.created_at
    }))
  }),
  accounting: () => ({
    name: "walaha-journal-comptable.csv",
    rows: accountingJournalRows()
  }),
  storeCommercial: () => ({
    name: "walaha-store-commercial.csv",
    rows: state.storeModules.map((module) => {
      const stats = moduleCommercialStats(module);
      return {
        module: module.name,
        code: module.code,
        adoption_pct: stats.adoption,
        ecoles_actives: stats.active.length,
        revenu_actif_xof: stats.revenue,
        en_attente: stats.pending.length,
        renouvellements: stats.renewals.length,
        expires: stats.expired.length,
        prix_negocie: stats.priceRange,
        prix_moyen_xof: stats.avgPrice ?? ""
      };
    })
  }),
  storeRequests: () => ({
    name: "walaha-store-activations.csv",
    rows: state.storeSubscriptions.map((s) => ({
      module: storeModuleById(s.module_id)?.name || s.module_id,
      ecole: state.schools.find((x) => x.id === s.school_id)?.name || s.school_id,
      statut: s.status,
      prix_convenu: s.price_agreed ?? "",
      expire_le: s.expires_at ? new Date(s.expires_at).toLocaleDateString("fr-FR") : "",
      note: s.note || "",
      decision: s.decision_note || ""
    }))
  }),
  storePriceHistory: () => ({
    name: "walaha-store-historique-prix.csv",
    rows: state.storePriceHistory.map((h) => ({
      date: h.created_at ? new Date(h.created_at).toLocaleString("fr-FR") : "",
      module: storeModuleById(h.module_id)?.name || h.module_id,
      ecole: state.schools.find((x) => x.id === h.school_id)?.name || h.school_id,
      changement: h.change_type,
      ancien_prix: h.old_price_agreed ?? "",
      nouveau_prix: h.new_price_agreed ?? "",
      devise: h.price_currency || "XOF",
      ancien_statut: h.old_status || "",
      nouveau_statut: h.new_status || "",
      ancienne_echeance: h.old_expires_at ? new Date(h.old_expires_at).toLocaleDateString("fr-FR") : "",
      nouvelle_echeance: h.new_expires_at ? new Date(h.new_expires_at).toLocaleDateString("fr-FR") : "",
      admin: h.changed_by || "",
      note: h.note || ""
    }))
  }),
  storeCustom: () => ({
    name: "walaha-store-sur-devis.csv",
    rows: state.storeCustom.map((c) => ({
      titre: c.title,
      ecole: state.schools.find((x) => x.id === c.school_id)?.name || c.school_id,
      description: c.description || "",
      statut: c.status,
      note_interne: c.internal_note || ""
    }))
  })
};

function getPasswordResetOptions() {
  const canUseRedirect = ["http:", "https:"].includes(window.location.protocol);
  return canUseRedirect
    ? { redirectTo: `${window.location.origin}${window.location.pathname}` }
    : undefined;
}

async function queryTable(table, select = "*", options = {}) {
  let query = supabaseClient.from(table).select(select);

  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.eq) {
    options.eq.forEach(([column, value]) => {
      query = query.eq(column, value);
    });
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`[WAC] ${table}:`, error.message);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

function paymentSelect(extended = true) {
  const base = "id, canonical_school_id, school_name, academic_year, billed_students, amount_per_student_xof, status, created_at, confirmed_at, internal_note";
  if (!extended) return base;
  return `${base}, invoice_number, proforma_number, document_type, discount_xof, discount_reason, due_date, billing_contact, billing_email, billing_phone, billing_address, tax_id, accounting_ref, payment_method, payment_reference, issued_at`;
}

async function queryPayments() {
  const options = { order: { column: "created_at" } };
  const extended = await queryTable("school_digital_payments", paymentSelect(true), options);
  state.billingSchemaReady = !extended.error;
  if (!extended.error) return extended;
  return queryTable("school_digital_payments", paymentSelect(false), options);
}

function gameSelect(extended = true) {
  const base = "id, title, short_description, activity_type, domains, age_min, age_max, difficulty, validation_status, visibility, created_at, deleted_at";
  if (!extended) return base;
  return `${base}, is_paid, pricing_type, price_amount, price_currency`;
}

async function queryGames() {
  const options = { order: { column: "created_at" }, limit: 5000 };
  const extended = await queryTable("educational_activities", gameSelect(true), options);
  state.playPricingSchemaReady = !extended.error;
  if (!extended.error) return extended;
  return queryTable("educational_activities", gameSelect(false), options);
}

async function queryPricingConfigs() {
  return queryTable("app_pricing_configs", "id, config_key, label, category, pricing_type, price_amount, price_currency, status, description, updated_at", { order: { column: "updated_at" } });
}

// Compte exact côté serveur (head: true => aucune ligne téléchargée).
// Indispensable car .select() plafonne à 1000 lignes : compter via .length
// sous-évalue les grandes tables (élèves, utilisateurs...).
async function countTable(table, opts = {}) {
  let query = supabaseClient.from(table).select("id", { count: "exact", head: true });
  (opts.isNull || []).forEach((column) => {
    query = query.is(column, null);
  });
  if (opts.in) {
    query = query.in(opts.in[0], opts.in[1]);
  }
  const { count, error } = await query;
  if (error) {
    console.warn(`[WAC] count ${table}:`, error.message);
    return null;
  }
  return count ?? 0;
}

async function getAdminMembership(userId) {
  const { data, error } = await supabaseClient
    .from("admin_members")
    .select("id, user_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Impossible de verifier admin_members: ${error.message}`);
  }

  return data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function recordAudit({ action_type, target_type, target_id, reason, old_data, new_data }) {
  if (!supabaseClient || !state.authUserId) return;
  // admin_audit_logs.target_id est UUID : si la cible a un id TEXT (ex. jeux),
  // on le déplace dans new_data plutôt que de faire échouer l'insertion.
  let tid = target_id || null;
  let nd = new_data || null;
  if (tid && !UUID_RE.test(String(tid))) {
    nd = { ...(nd || {}), _target_ref: String(tid) };
    tid = null;
  }
  const { error } = await supabaseClient.from("admin_audit_logs").insert({
    admin_id: state.authUserId,
    action_type,
    target_type,
    target_id: tid,
    reason: reason || null,
    old_data: old_data || null,
    new_data: nd,
    user_agent: navigator.userAgent
  });
  if (error) console.warn("[WAC] audit insert:", error.message);
}

async function updateRow(table, id, patch) {
  const { error } = await supabaseClient.from(table).update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

const STORE_CATEGORIES = ["Pédagogie", "Communication", "Administration", "Finance", "Premium", "Pilotage", "Visibilité", "Services scolaires"];
const STORE_PRICING = [["annual", "Annuel"], ["monthly", "Mensuel"], ["per_student", "Par élève"], ["per_school", "Par école"], ["one_time", "Paiement unique"], ["included", "Inclus"], ["quote", "Sur devis"]];
const STORE_STATUSES = [["available", "Disponible"], ["beta", "Bêta"], ["coming_soon", "Bientôt"], ["quote", "Sur devis"], ["premium_reserved", "Réservé premium"], ["disabled", "Désactivé"]];

const ACTIONS = {
  // --- Signalements (RLS UPDATE admin) ---
  "report.claim": {
    eyebrow: "Signalement", label: "Prendre en charge", confirmLabel: "M'assigner",
    entity: (id) => state.reports.find((r) => r.id === id),
    description: (e) => `M'assigner ce signalement « ${text(e.reason)} » et le passer en revue.`,
    details: (e) => [["Cible", `${e.target_type} · ${e.target_id || "-"}`], ["Statut actuel", e.status]],
    run: async (e, reason) => {
      const patch = { assigned_admin_id: state.authUserId, status: "in_review" };
      await updateRow("moderation_reports", e.id, patch);
      await recordAudit({ action_type: "REPORT_CLAIMED", target_type: "moderation_report", target_id: e.id, reason, old_data: { status: e.status, assigned_admin_id: e.assigned_admin_id }, new_data: patch });
    }
  },
  "report.resolve": {
    eyebrow: "Signalement", label: "Marquer résolu", confirmLabel: "Résoudre", reasonRequired: true, reasonLabel: "Décision finale",
    entity: (id) => state.reports.find((r) => r.id === id),
    description: (e) => `Clore le signalement « ${text(e.reason)} » comme résolu.`,
    run: async (e, reason) => {
      const patch = { status: "resolved", decision_note: reason, resolved_at: new Date().toISOString() };
      await updateRow("moderation_reports", e.id, patch);
      await recordAudit({ action_type: "REPORT_RESOLVED", target_type: "moderation_report", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
      await invokeEdge("wac-moderation-report-notify", { reportId: e.id, decision: "resolved", note: reason });
    }
  },
  "report.reject": {
    eyebrow: "Signalement", label: "Rejeter le signalement", confirmLabel: "Rejeter", danger: true, reasonRequired: true, reasonLabel: "Motif du rejet",
    entity: (id) => state.reports.find((r) => r.id === id),
    description: (e) => `Rejeter le signalement « ${text(e.reason)} » (non fondé).`,
    run: async (e, reason) => {
      const patch = { status: "rejected", decision_note: reason };
      await updateRow("moderation_reports", e.id, patch);
      await recordAudit({ action_type: "REPORT_REJECTED", target_type: "moderation_report", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
      await invokeEdge("wac-moderation-report-notify", { reportId: e.id, decision: "rejected", note: reason });
    }
  },
  "report.escalate": {
    eyebrow: "Signalement", label: "Escalader le cas", confirmLabel: "Escalader", danger: true, reasonRequired: true, reasonLabel: "Raison de l'escalade",
    entity: (id) => state.reports.find((r) => r.id === id),
    description: (e) => `Escalader le signalement « ${text(e.reason)} » en priorité critique.`,
    run: async (e, reason) => {
      const patch = { status: "escalated", priority: "critical", decision_note: reason };
      await updateRow("moderation_reports", e.id, patch);
      await recordAudit({ action_type: "REPORT_ESCALATED", target_type: "moderation_report", target_id: e.id, reason, old_data: { status: e.status, priority: e.priority }, new_data: patch });
    }
  },
  "report.assign": {
    eyebrow: "Signalement", label: "Assigner à un membre", confirmLabel: "Assigner", reasonLabel: "Note (optionnel)",
    entity: (id) => state.reports.find((r) => r.id === id),
    description: (e) => `Assigner le signalement « ${text(e.reason)} » à un membre de la Walaha Team.`,
    fields: () => [{ name: "assignee", label: "Membre", type: "select", options: assignableMembers() }],
    run: async (e, reason, v) => {
      if (!v.assignee) throw new Error("Aucun membre disponible à assigner.");
      const patch = { assigned_admin_id: v.assignee, status: e.status === "open" ? "in_review" : e.status };
      await updateRow("moderation_reports", e.id, patch);
      await recordAudit({ action_type: "REPORT_ASSIGNED", target_type: "moderation_report", target_id: e.id, reason, old_data: { assigned_admin_id: e.assigned_admin_id }, new_data: patch });
    }
  },
  "report.view": {
    eyebrow: "Signalement", label: "Détail du signalement", view: true,
    entity: (id) => state.reports.find((r) => r.id === id),
    details: (e) => [["Motif", e.reason], ["Cible", `${e.target_type} · ${e.target_id || "-"}`], ["Priorité", e.priority], ["Statut", e.status], ["Décision", e.decision_note || "-"]]
  },

  // --- Paiements (RLS finance ALL) ---
  "payment.create": {
    eyebrow: "Facturation", label: "Préparer la facture école", confirmLabel: "Créer le dossier", reasonLabel: "Note interne (optionnel)",
    entity: (id) => billingRowById(id),
    description: (e) => `Créer un dossier de facturation pour ${text(e.school_name)}.`,
    fields: (e) => [
      { name: "academic_year", label: "Année scolaire", value: e.academic_year || currentAcademicYear(), required: true },
      { name: "billed_students", label: "Nombre d'élèves facturés", type: "number", value: e.billed_students || 0, required: true },
      { name: "amount_per_student_xof", label: "Montant par élève (FCFA)", type: "number", value: e.amount_per_student_xof || schoolSubscriptionAmount(), required: true },
      { name: "discount_xof", label: "Réduction (FCFA)", type: "number", value: 0 },
      { name: "discount_reason", label: "Motif réduction", value: "" },
      { name: "proforma_number", label: "Numéro proforma", value: defaultProformaNumber(e) },
      { name: "due_date", label: "Date d'échéance", type: "date", value: "" },
      { name: "billing_contact", label: "Contact facturation", value: "" },
      { name: "billing_email", label: "Email facturation", type: "email", value: "" },
      { name: "billing_phone", label: "Téléphone facturation", value: "" },
      { name: "accounting_ref", label: "Référence comptable interne", value: "" }
    ],
    run: async (e, reason, v) => {
      const row = {
        canonical_school_id: e.canonical_school_id,
        school_name: e.school_name,
        academic_year: v.academic_year,
        billed_students: Number(v.billed_students || 0),
        amount_per_student_xof: Number(v.amount_per_student_xof || 0),
        status: "pending",
        internal_note: reason || null
      };
      if (state.billingSchemaReady) {
        Object.assign(row, {
          discount_xof: Number(v.discount_xof || 0),
          discount_reason: v.discount_reason || null,
          proforma_number: v.proforma_number || null,
          due_date: v.due_date || null,
          billing_contact: v.billing_contact || null,
          billing_email: v.billing_email || null,
          billing_phone: v.billing_phone || null,
          accounting_ref: v.accounting_ref || null,
          document_type: "proforma",
          issued_at: new Date().toISOString()
        });
      }
      const { data, error } = await supabaseClient.from("school_digital_payments").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      await recordAudit({ action_type: "PAYMENT_BILLING_CREATED", target_type: "school_digital_payment", target_id: data?.id, reason, new_data: row });
    }
  },
  "payment.confirm": {
    eyebrow: "Paiement", label: "Confirmer le paiement", confirmLabel: "Confirmer", reasonLabel: "Note interne (optionnel)",
    entity: (id) => state.payments.find((p) => p.id === id),
    description: (e) => `Confirmer le paiement de ${text(e.school_name)} pour ${text(e.academic_year)}.`,
    details: (e) => billingDetails(e),
    fields: (e) => [
      { name: "payment_method", label: "Méthode de paiement", type: "select", options: [["virement", "Virement"], ["mobile_money", "Mobile Money"], ["cash", "Espèces"], ["cheque", "Chèque"], ["other", "Autre"]], value: e.payment_method || "virement" },
      { name: "payment_reference", label: "Référence paiement", value: e.payment_reference || "" }
    ],
    run: async (e, reason, v) => {
      const patch = { status: "paid", confirmed_by: state.authUserId, confirmed_at: new Date().toISOString(), internal_note: reason || null };
      if (state.billingSchemaReady) {
        Object.assign(patch, { document_type: "receipt", payment_method: v.payment_method || null, payment_reference: v.payment_reference || null });
      }
      await updateRow("school_digital_payments", e.id, patch);
      await recordAudit({ action_type: "PAYMENT_CONFIRMED", target_type: "school_digital_payment", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "payment.edit": {
    eyebrow: "Facturation", label: "Modifier la facturation", confirmLabel: "Enregistrer", reasonLabel: "Note interne (optionnel)",
    entity: (id) => state.payments.find((p) => p.id === id),
    description: (e) => `Ajuster les informations comptables de ${text(e.school_name)}.`,
    fields: (e) => [
      { name: "academic_year", label: "Année scolaire", value: e.academic_year, required: true },
      { name: "billed_students", label: "Nombre d'élèves facturés", type: "number", value: e.billed_students, required: true },
      { name: "amount_per_student_xof", label: "Montant par élève (FCFA)", type: "number", value: e.amount_per_student_xof || schoolSubscriptionAmount(), required: true },
      { name: "discount_xof", label: "Réduction (FCFA)", type: "number", value: e.discount_xof || 0 },
      { name: "discount_reason", label: "Motif réduction", value: e.discount_reason || "" },
      { name: "proforma_number", label: "Numéro proforma", value: e.proforma_number || defaultProformaNumber(e) },
      { name: "invoice_number", label: "Numéro facture", value: e.invoice_number || defaultInvoiceNumber(e) },
      { name: "due_date", label: "Date d'échéance", type: "date", value: e.due_date || "" },
      { name: "billing_contact", label: "Contact facturation", value: e.billing_contact || "" },
      { name: "billing_email", label: "Email facturation", type: "email", value: e.billing_email || "" },
      { name: "billing_phone", label: "Téléphone facturation", value: e.billing_phone || "" },
      { name: "billing_address", label: "Adresse de facturation", type: "textarea", value: e.billing_address || "" },
      { name: "tax_id", label: "NIF / RCCM / Identifiant fiscal", value: e.tax_id || "" },
      { name: "accounting_ref", label: "Référence comptable interne", value: e.accounting_ref || "" },
      { name: "status", label: "Statut", type: "select", options: [["pending", "À facturer"], ["partial", "Partiel"], ["overdue", "En retard"], ["paid", "Payée"], ["cancelled", "Annulée"], ["refunded", "Remboursée"]], value: e.status }
    ],
    run: async (e, reason, v) => {
      const patch = {
        academic_year: v.academic_year,
        billed_students: Number(v.billed_students || 0),
        amount_per_student_xof: Number(v.amount_per_student_xof || 0),
        status: v.status || e.status,
        internal_note: reason || e.internal_note || null
      };
      if (state.billingSchemaReady) {
        Object.assign(patch, {
          discount_xof: Number(v.discount_xof || 0),
          discount_reason: v.discount_reason || null,
          proforma_number: v.proforma_number || null,
          invoice_number: v.invoice_number || null,
          due_date: v.due_date || null,
          billing_contact: v.billing_contact || null,
          billing_email: v.billing_email || null,
          billing_phone: v.billing_phone || null,
          billing_address: v.billing_address || null,
          tax_id: v.tax_id || null,
          accounting_ref: v.accounting_ref || null,
          document_type: v.status === "paid" ? "receipt" : (v.invoice_number ? "invoice" : "proforma"),
          issued_at: e.issued_at || new Date().toISOString()
        });
      }
      await updateRow("school_digital_payments", e.id, patch);
      await recordAudit({ action_type: "PAYMENT_BILLING_UPDATED", target_type: "school_digital_payment", target_id: e.id, reason, old_data: billingSnapshot(e), new_data: patch });
    }
  },
  "payment.proforma": {
    eyebrow: "Document", label: "Facture proforma", view: true,
    entity: (id) => state.payments.find((p) => p.id === id),
    details: (e) => billingDocumentDetails(e, "proforma")
  },
  "payment.invoice": {
    eyebrow: "Document", label: "Facture / reçu", view: true,
    entity: (id) => state.payments.find((p) => p.id === id),
    details: (e) => billingDocumentDetails(e, e.status === "paid" ? "receipt" : "invoice")
  },
  "payment.printProforma": {
    eyebrow: "Document", label: "Imprimer la proforma", confirmLabel: "Ouvrir le PDF", hideReason: true,
    entity: (id) => state.payments.find((p) => p.id === id),
    description: (e) => `Préparer une version imprimable de la proforma ${text(e.proforma_number || defaultProformaNumber(e))}.`,
    run: async (e) => printBillingDocument(e, "proforma")
  },
  "payment.printInvoice": {
    eyebrow: "Document", label: "Imprimer facture / reçu", confirmLabel: "Ouvrir le PDF", hideReason: true,
    entity: (id) => state.payments.find((p) => p.id === id),
    description: (e) => `Préparer une version imprimable de ${e.status === "paid" ? "la facture payée" : "la facture"}.`,
    run: async (e) => printBillingDocument(e, e.status === "paid" ? "receipt" : "invoice")
  },
  "payment.remind": {
    eyebrow: "Facturation", label: "Préparer une relance", confirmLabel: "Tracer la relance", reasonRequired: true, reasonLabel: "Message / note de relance",
    entity: (id) => state.payments.find((p) => p.id === id),
    description: (e) => `Tracer une relance comptable pour ${text(e.school_name)}.`,
    run: async (e, reason) => {
      const patch = { internal_note: reason };
      await updateRow("school_digital_payments", e.id, patch);
      await recordAudit({ action_type: "PAYMENT_REMINDER_SENT", target_type: "school_digital_payment", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "payment.view": {
    eyebrow: "Paiement", label: "Fiche facturation école", view: true,
    entity: (id) => billingRowById(id) || state.payments.find((p) => p.id === id),
    details: (e) => billingDetails(e),
    quickActions: (e) => {
      if (e.isDraftBilling) {
        return canAct("payment.create") ? [{ act: "payment.create", id: e.id, label: "Créer le dossier", variant: "go" }] : [];
      }
      const actions = [];
      if (canAct("payment.edit")) actions.push({ act: "payment.edit", id: e.id, label: "Modifier" });
      if (canAct("payment.printProforma")) actions.push({ act: "payment.printProforma", id: e.id, label: "Proforma PDF" });
      if (canAct("payment.printInvoice")) actions.push({ act: "payment.printInvoice", id: e.id, label: e.status === "paid" ? "Reçu PDF" : "Facture PDF" });
      if (canAct("payment.confirm") && e.status !== "paid") actions.push({ act: "payment.confirm", id: e.id, label: "Confirmer paiement", variant: "go" });
      if (canAct("payment.remind") && e.status !== "paid") actions.push({ act: "payment.remind", id: e.id, label: "Relancer" });
      return actions;
    }
  },

  // --- Configuration des prix ---
  "pricing.school.edit": {
    eyebrow: "Configuration des prix", label: "Souscription par école", confirmLabel: "Enregistrer", hideReason: true,
    entity: () => schoolSubscriptionConfig(),
    description: () => "Prix utilisé comme base pour préparer la facturation annuelle des écoles.",
    fields: (e) => [
      { name: "label", label: "Libellé", value: e.label, required: true },
      { name: "pricing_type", label: "Type de prix", type: "select", options: STORE_PRICING, value: e.pricing_type || "per_student" },
      { name: "price_amount", label: "Montant (FCFA)", type: "number", value: e.price_amount ?? 5000, required: true },
      { name: "status", label: "Statut", type: "select", options: [["active", "Actif"], ["draft", "Brouillon"], ["disabled", "Désactivé"]], value: e.status || "active" },
      { name: "description", label: "Description", type: "textarea", value: e.description || "" }
    ],
    run: async (_e, _reason, v) => {
      const row = {
        config_key: "school_subscription_default",
        label: v.label,
        category: "school_subscription",
        pricing_type: v.pricing_type || "per_student",
        price_amount: Number(v.price_amount || 0),
        price_currency: "XOF",
        status: v.status || "active",
        description: v.description || null,
        updated_by: state.authUserId
      };
      const { error } = await supabaseClient.from("app_pricing_configs").upsert(row, { onConflict: "config_key" });
      if (error) throw new Error(error.message);
      await recordAudit({ action_type: "PRICING_SCHOOL_UPDATED", target_type: "app_pricing_config", reason: null, new_data: row });
    }
  },
  "game.price": {
    eyebrow: "WalahaPlay", label: "Configurer le prix", confirmLabel: "Enregistrer", hideReason: true,
    entity: (id) => state.games.find((g) => g.id === id),
    description: (e) => `Prix de l'activité « ${text(e.title)} ».`,
    fields: (e) => [
      { name: "is_paid", label: "Mode", type: "select", options: [["false", "Inclus / gratuit"], ["true", "Payant"]], value: String(Boolean(e.is_paid)) },
      { name: "pricing_type", label: "Type de prix", type: "select", options: STORE_PRICING, value: e.pricing_type || "included" },
      { name: "price_amount", label: "Montant (FCFA)", type: "number", value: e.price_amount || "" }
    ],
    run: async (e, _reason, v) => {
      if (!state.playPricingSchemaReady) {
        throw new Error("Appliquez la migration 202506250010_price_configuration.sql pour activer les prix WalahaPlay.");
      }
      const patch = {
        is_paid: v.is_paid === "true",
        pricing_type: v.pricing_type || "included",
        price_amount: v.price_amount ? Number(v.price_amount) : null,
        price_currency: "XOF"
      };
      await updateRow("educational_activities", e.id, patch);
      await recordAudit({ action_type: "PLAY_PRICE_UPDATED", target_type: "educational_activity", target_id: e.id, old_data: { is_paid: e.is_paid, pricing_type: e.pricing_type, price_amount: e.price_amount }, new_data: patch });
    }
  },

  // --- Jeux éducatifs (RLS content_manager) ---
  "game.publish": {
    eyebrow: "WalahaPlay", label: "Publier le jeu", confirmLabel: "Publier",
    entity: (id) => state.games.find((g) => g.id === id),
    description: (e) => `Rendre « ${text(e.title)} » visible et publié.`,
    run: async (e, reason) => {
      const patch = { validation_status: "published" };
      await updateRow("educational_activities", e.id, patch);
      await recordAudit({ action_type: "GAME_PUBLISHED", target_type: "educational_activity", target_id: e.id, reason, old_data: { validation_status: e.validation_status }, new_data: patch });
    }
  },
  "game.archive": {
    eyebrow: "WalahaPlay", label: "Archiver le jeu", confirmLabel: "Archiver", danger: true, reasonRequired: true, reasonLabel: "Motif de l'archivage",
    entity: (id) => state.games.find((g) => g.id === id),
    description: (e) => `Retirer « ${text(e.title)} » de la liste des jeux actifs.`,
    run: async (e, reason) => {
      const patch = { validation_status: "archived" };
      await updateRow("educational_activities", e.id, patch);
      await recordAudit({ action_type: "GAME_ARCHIVED", target_type: "educational_activity", target_id: e.id, reason, old_data: { validation_status: e.validation_status }, new_data: patch });
    }
  },

  // --- Utilisateurs (RLS update, soft-delete uniquement) ---
  "user.view": {
    eyebrow: "Compte", label: "Fiche utilisateur", view: true,
    entity: (id) => state.users.find((u) => u.id === id),
    details: (e) => userDetails(e),
    quickActions: (e) => {
      const status = moderationStatusFor(e.id);
      const actions = [];
      if (status === "active" && canAct("user.suspend")) actions.push({ act: "user.suspend", id: e.id, label: "Suspendre", variant: "danger" });
      if (status !== "active" && canAct("user.reactivate")) actions.push({ act: "user.reactivate", id: e.id, label: "Réactiver", variant: "go" });
      if (canAct("user.archive")) actions.push({ act: "user.archive", id: e.id, label: "Archiver", variant: "danger" });
      return actions;
    }
  },
  "user.suspend": {
    eyebrow: "Compte", label: "Suspendre le compte", confirmLabel: "Suspendre", danger: true, reasonRequired: true, reasonLabel: "Motif de la suspension",
    entity: (id) => state.users.find((u) => u.id === id),
    description: (e) => `Bloquer l'accès de ${text(e.display_name || e.email)}. Le compte ne pourra plus se connecter.`,
    run: async (e, reason) => invokeEdge("wac-moderate-user", { action: "suspend", userId: e.id, reason })
  },
  "user.reactivate": {
    eyebrow: "Compte", label: "Réactiver le compte", confirmLabel: "Réactiver", reasonLabel: "Note (optionnel)",
    entity: (id) => state.users.find((u) => u.id === id),
    description: (e) => `Rétablir l'accès de ${text(e.display_name || e.email)}.`,
    run: async (e, reason) => invokeEdge("wac-moderate-user", { action: "reactivate", userId: e.id, reason })
  },
  "user.archive": {
    eyebrow: "Compte", label: "Archiver le compte", confirmLabel: "Archiver", danger: true, reasonRequired: true, reasonLabel: "Motif de l'archivage",
    entity: (id) => state.users.find((u) => u.id === id),
    description: (e) => `Archiver (suppression logique) le compte de ${text(e.display_name || e.email)}. Réversible côté base.`,
    run: async (e, reason) => {
      const patch = { deleted_at: new Date().toISOString() };
      await updateRow("users", e.id, patch);
      await recordAudit({ action_type: "USER_ARCHIVED", target_type: "user", target_id: e.id, reason, old_data: { deleted_at: null }, new_data: patch });
    }
  },

  // --- Détails lecture seule (mutations sensibles -> Edge Function à venir) ---
  "school.verify": {
    eyebrow: "Demande d'école", label: "Marquer vérifiée", confirmLabel: "Vérifier", reasonLabel: "Note de vérification (optionnel)",
    entity: (id) => state.schoolRequests.find((s) => s.id === id),
    description: (e) => `Marquer la demande de « ${text(e.name)} » comme vérifiée (informations contrôlées).`,
    details: (e) => [["École", e.name], ["Ville", e.city], ["Contact", e.phone || e.email]],
    run: async (e, reason) => {
      const patch = { status: "verified", reviewed_by: state.authUserId, reviewed_at: new Date().toISOString(), internal_note: reason || e.internal_note || null };
      await updateRow("school_requests", e.id, patch);
      await recordAudit({ action_type: "SCHOOL_VERIFIED", target_type: "school_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "school.validate": {
    eyebrow: "Demande d'école", label: "Valider et créer l'école officielle", confirmLabel: "Valider et créer", reasonLabel: "Note interne (optionnel)",
    entity: (id) => state.schoolRequests.find((s) => s.id === id),
    description: (e) => `Créer l'école officielle « ${text(e.name)} », générer son code ECO- et activer la demande. Action serveur sécurisée.`,
    details: (e) => [["École", e.name], ["Type", e.school_type], ["Ville", e.city], ["Promoteur", e.promoter_name || "-"]],
    run: async (e, reason) => {
      await invokeEdge("wac-validate-school", { requestId: e.id, note: reason || null });
    }
  },
  "school.reject": {
    eyebrow: "Demande d'école", label: "Rejeter la demande", confirmLabel: "Rejeter", danger: true, reasonRequired: true, reasonLabel: "Motif du rejet",
    entity: (id) => state.schoolRequests.find((s) => s.id === id),
    description: (e) => `Rejeter la demande d'école « ${text(e.name)} ».`,
    run: async (e, reason) => {
      const patch = { status: "rejected", reviewed_by: state.authUserId, reviewed_at: new Date().toISOString(), internal_note: reason };
      await updateRow("school_requests", e.id, patch);
      await recordAudit({ action_type: "SCHOOL_REJECTED", target_type: "school_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
      await invokeEdge("wac-school-request-notify", { requestId: e.id, decision: "rejected", note: reason });
    }
  },
  "school.view": {
    eyebrow: "Demande d'école", label: "Fiche demande école", view: true,
    entity: (id) => state.schoolRequests.find((s) => s.id === id),
    details: (e) => withAuditHistory([
      ["École", e.name], ["Code ECO-", e.public_code || "non attribué"], ["Type", e.school_type],
      ["Ville", e.city], ["Commune", e.commune], ["Contact", e.phone || e.email],
      ["Promoteur", e.promoter_name || "-"], ["Directeur", e.director_name || "-"],
      ["Statut", e.status], ["Note", e.internal_note || "-"]
    ], "school_request", e.id),
    quickActions: (e) => {
      const actions = [];
      if (["pending_review", "verified"].includes(e.status) && canAct("school.validate")) {
        actions.push({ act: "school.validate", id: e.id, label: "Valider", variant: "go" });
      }
      if (canAct("school.reject") && !["rejected", "active"].includes(e.status)) {
        actions.push({ act: "school.reject", id: e.id, label: "Rejeter", variant: "danger" });
      }
      return actions;
    }
  },
  "school.viewOfficial": {
    eyebrow: "École officielle", label: "Fiche école", view: true,
    entity: (id) => state.schools.find((s) => s.id === id),
    details: (e) => officialSchoolDetails(e),
    quickActions: (e) => {
      const payment = paymentForSchool(e.id);
      const draftId = `draft:${e.id}`;
      if (!payment && canAct("payment.create")) {
        return [{ act: "payment.create", id: draftId, label: "Préparer facturation", variant: "go" }];
      }
      if (payment && canAct("payment.view")) {
        return [{ act: "payment.view", id: payment.id, label: "Voir facturation" }];
      }
      return [];
    }
  },
  "tutor.view": {
    eyebrow: "Répétiteur", label: "Fiche répétiteur", view: true,
    entity: (id) => state.tutors.find((t) => t.id === id),
    details: (e) => [["Nom", e.full_name], ["Code", e.public_code], ["Matières", Array.isArray(e.subjects) ? e.subjects.join(", ") : "-"], ["Téléphone", e.phone], ["Email", e.email]]
  },
  "tutorRequest.approve": {
    eyebrow: "Demande répétiteur", label: "Accepter la demande", confirmLabel: "Accepter et créer REP-", reasonLabel: "Note interne (optionnel)",
    entity: (id) => state.tutorRequests.find((r) => r.id === id),
    description: (e) => `Créer le profil répétiteur officiel pour « ${text(e.full_name)} » et attribuer un code REP-.`,
    details: (e) => tutorRequestDetails(e),
    run: async (e, reason) => {
      await invokeEdge("wac-validate-tutor", { requestId: e.id, note: reason || null });
    }
  },
  "tutorRequest.reject": {
    eyebrow: "Demande répétiteur", label: "Refuser la demande", confirmLabel: "Refuser", danger: true, reasonRequired: true, reasonLabel: "Motif du refus",
    entity: (id) => state.tutorRequests.find((r) => r.id === id),
    description: (e) => `Refuser la demande répétiteur de « ${text(e.full_name)} ».`,
    details: (e) => tutorRequestDetails(e),
    run: async (e, reason) => {
      const patch = { status: "rejected", reviewed_by: state.authUserId, reviewed_at: new Date().toISOString(), internal_note: reason };
      await updateRow("tutor_requests", e.id, patch);
      await recordAudit({ action_type: "TUTOR_REQUEST_REJECTED", target_type: "tutor_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
      await invokeEdge("wac-tutor-request-notify", { requestId: e.id, decision: "rejected", note: reason });
    }
  },
  "tutorRequest.hold": {
    eyebrow: "Demande répétiteur", label: "Mettre en attente", confirmLabel: "Mettre en attente", reasonLabel: "Note pour le parent / équipe (optionnel)",
    entity: (id) => state.tutorRequests.find((r) => r.id === id),
    description: (e) => `Mettre la demande de « ${text(e.full_name)} » en attente (compléments ou vérification).`,
    details: (e) => tutorRequestDetails(e),
    run: async (e, reason) => {
      const patch = { status: "on_hold", reviewed_by: state.authUserId, reviewed_at: new Date().toISOString(), internal_note: reason || e.internal_note || null };
      await updateRow("tutor_requests", e.id, patch);
      await recordAudit({ action_type: "TUTOR_REQUEST_ON_HOLD", target_type: "tutor_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
      await invokeEdge("wac-tutor-request-notify", { requestId: e.id, decision: "on_hold", note: reason || null });
    }
  },
  "tutorRequest.view": {
    eyebrow: "Demande répétiteur", label: "Fiche demande", view: true,
    entity: (id) => state.tutorRequests.find((r) => r.id === id),
    details: (e) => withAuditHistory(tutorRequestDetails(e), "tutor_request", e.id),
    quickActions: (e) => {
      const actions = [];
      if (["pending_review", "on_hold"].includes(e.status) && canAct("tutorRequest.approve")) {
        actions.push({ act: "tutorRequest.approve", id: e.id, label: "Accepter", variant: "go" });
      }
      if (["pending_review", "on_hold"].includes(e.status) && canAct("tutorRequest.hold") && e.status !== "on_hold") {
        actions.push({ act: "tutorRequest.hold", id: e.id, label: "En attente", variant: "" });
      }
      if (["pending_review", "on_hold"].includes(e.status) && canAct("tutorRequest.reject")) {
        actions.push({ act: "tutorRequest.reject", id: e.id, label: "Refuser", variant: "danger" });
      }
      if (e.status === "approved" && e.canonical_tutor_id && canAct("tutor.view")) {
        actions.push({ act: "tutor.view", id: e.canonical_tutor_id, label: "Voir REP-", variant: "go" });
      }
      return actions;
    }
  },
  "student.view": {
    eyebrow: "Élève", label: "Fiche élève", view: true,
    entity: (id) => state.students.find((s) => s.id === id),
    details: (e) => {
      const school = state.schools.find((s) => s.id === e.origin_canonical_school_id);
      const parents = state.parentLinks
        .filter((link) => link.student_id === e.id && link.status === "active")
        .map((link) => state.users.find((u) => u.id === link.parent_user_id))
        .filter(Boolean)
        .map((u) => u.display_name || u.email)
        .join(", ");
      return [
        ["Nom", studentDisplayName(e)],
        ["Code ELV-", e.public_code || "-"],
        ["École d'origine", school?.name || e.origin_canonical_school_id || "-"],
        ["Parents liés", parents || "-"],
        ["Créé le", e.created_at ? new Date(e.created_at).toLocaleDateString("fr-FR") : "-"]
      ];
    }
  },
  "log.view": {
    eyebrow: "Audit", label: "Détail audit log", view: true,
    entity: (id) => state.logs.find((l) => l.id === id),
    details: (e) => [
      ["Action", e.action_type],
      ["Cible", `${e.target_type} · ${e.target_id || "-"}`],
      ["Admin", adminLabel(e.admin_id)],
      ["Date", new Date(e.created_at).toLocaleString("fr-FR")],
      ["Motif", e.reason || "-"],
      ["Données avant", e.old_data ? JSON.stringify(e.old_data, null, 2) : "-"],
      ["Données après", e.new_data ? JSON.stringify(e.new_data, null, 2) : "-"]
    ]
  },

  // --- Création de jeu éducatif (RLS INSERT content_manager) ---
  "game.create": {
    eyebrow: "WalahaPlay", label: "Ajouter un jeu éducatif", confirmLabel: "Créer (brouillon)", hideReason: true,
    description: () => "Le jeu est créé en brouillon, puis vous pourrez le publier depuis la liste.",
    fields: () => [
      { name: "title", label: "Titre", required: true },
      { name: "short_description", label: "Description courte", required: true },
      { name: "activity_type", label: "Type d'activité", placeholder: "ex. jeu, exercice, quiz", required: true },
      { name: "domains", label: "Domaines (séparés par des virgules)", placeholder: "Mathématiques, Logique" },
      { name: "age_min", label: "Âge min", type: "number", value: "6", required: true },
      { name: "age_max", label: "Âge max", type: "number", value: "12", required: true },
      { name: "difficulty", label: "Difficulté", type: "select", options: [["facile", "Facile"], ["moyen", "Moyen"], ["difficile", "Difficile"]], value: "moyen" },
      { name: "duration_min", label: "Durée min (minutes)", type: "number", value: "10", required: true },
      { name: "duration_max", label: "Durée max (minutes)", type: "number", value: "20", required: true },
      { name: "objective", label: "Objectif pédagogique", type: "textarea", required: true },
      { name: "is_paid", label: "Prix", type: "select", options: [["false", "Inclus / gratuit"], ["true", "Payant"]], value: "false" },
      { name: "pricing_type", label: "Type de prix", type: "select", options: STORE_PRICING, value: "included" },
      { name: "price_amount", label: "Montant (FCFA)", type: "number" }
    ],
    run: async (_e, _reason, v) => {
      const id = (window.crypto?.randomUUID?.() || `act-${Date.now()}`);
      const row = {
        id,
        title: v.title,
        short_description: v.short_description,
        activity_type: v.activity_type,
        domains: v.domains ? v.domains.split(",").map((s) => s.trim()).filter(Boolean) : [],
        age_min: Number(v.age_min) || 0,
        age_max: Number(v.age_max) || 0,
        difficulty: v.difficulty || "moyen",
        duration_min_minutes: Number(v.duration_min) || 0,
        duration_max_minutes: Number(v.duration_max) || 0,
        objective: v.objective,
        validation_status: "draft",
        visibility: "public",
        created_by: state.authUserId,
        creator_role: state.admin?.role || null
      };
      if (state.playPricingSchemaReady) {
        Object.assign(row, {
          is_paid: v.is_paid === "true",
          pricing_type: v.pricing_type || "included",
          price_amount: v.price_amount ? Number(v.price_amount) : null,
          price_currency: "XOF"
        });
      }
      const { error } = await supabaseClient.from("educational_activities").insert(row);
      if (error) throw new Error(error.message);
      await recordAudit({ action_type: "GAME_CREATED", target_type: "educational_activity", target_id: id, new_data: { title: v.title, validation_status: "draft" } });
    }
  },

  // --- Gestion des membres (Edge Function, super_admin) ---
  "member.add": {
    eyebrow: "Walaha Team", label: "Ajouter un membre", confirmLabel: "Ajouter", hideReason: true,
    description: () => "Le compte doit déjà exister dans Walaha (auth). Saisissez son email et son rôle interne.",
    fields: () => [
      { name: "email", label: "Email du compte", type: "email", required: true },
      { name: "role", label: "Rôle interne", type: "select", options: roles.map(([role]) => role), value: "support" }
    ],
    run: async (_e, _reason, v) => invokeAdminFn({ action: "add", email: v.email, role: v.role })
  },
  "member.role": {
    eyebrow: "Walaha Team", label: "Changer le rôle", confirmLabel: "Mettre à jour", hideReason: true,
    entity: (id) => state.members.find((m) => m.id === id),
    description: (e) => `Modifier le rôle de ${text(memberUser(e)?.display_name || memberUser(e)?.email || "ce membre")}.`,
    fields: (e) => [{ name: "role", label: "Nouveau rôle", type: "select", options: roles.map(([role]) => role), value: e.role }],
    run: async (e, _reason, v) => invokeAdminFn({ action: "set_role", memberId: e.id, role: v.role })
  },
  "member.revoke": {
    eyebrow: "Walaha Team", label: "Révoquer l'accès", confirmLabel: "Révoquer", danger: true, reasonRequired: true, reasonLabel: "Motif de la révocation",
    entity: (id) => state.members.find((m) => m.id === id),
    description: (e) => `Retirer l'accès WAC de ${text(memberUser(e)?.display_name || memberUser(e)?.email || "ce membre")}.`,
    run: async (e, reason) => invokeAdminFn({ action: "set_status", memberId: e.id, status: "revoked", reason })
  },
  "member.reactivate": {
    eyebrow: "Walaha Team", label: "Réactiver le membre", confirmLabel: "Réactiver",
    entity: (id) => state.members.find((m) => m.id === id),
    description: (e) => `Réactiver l'accès WAC de ${text(memberUser(e)?.display_name || memberUser(e)?.email || "ce membre")}.`,
    run: async (e, reason) => invokeAdminFn({ action: "set_status", memberId: e.id, status: "active", reason })
  },

  // --- WalahaStore : catalogue de modules (RLS manage admin) ---
  "module.create": {
    eyebrow: "WalahaStore", label: "Créer un module", confirmLabel: "Créer", hideReason: true,
    fields: () => [
      { name: "code", label: "Code (slug unique)", placeholder: "ex. homework", required: true },
      { name: "name", label: "Nom", required: true },
      { name: "category", label: "Catégorie", type: "select", options: STORE_CATEGORIES, value: "Premium" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "objective", label: "Objectif", type: "textarea" },
      { name: "pricing_type", label: "Tarification", type: "select", options: STORE_PRICING, value: "annual" },
      { name: "price_amount", label: "Prix (FCFA, vide si sur devis)", type: "number" },
      { name: "status", label: "Statut", type: "select", options: STORE_STATUSES, value: "available" }
    ],
    run: async (_e, _reason, v) => {
      const code = (v.code || "").trim().toLowerCase().replace(/\s+/g, "_");
      if (!code || !v.name) throw new Error("Code et nom requis.");
      const row = {
        code, name: v.name, category: v.category || "Premium",
        description: v.description || null, objective: v.objective || null,
        pricing_type: v.pricing_type || "annual",
        price_amount: v.price_amount ? Number(v.price_amount) : null,
        status: v.status || "available", created_by: state.authUserId
      };
      const { data, error } = await supabaseClient.from("store_modules").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      await recordAudit({ action_type: "STORE_MODULE_CREATED", target_type: "store_module", target_id: data.id, new_data: { code, name: row.name, status: row.status } });
    }
  },
  "module.edit": {
    eyebrow: "WalahaStore", label: "Modifier le module", confirmLabel: "Enregistrer", hideReason: true,
    entity: (id) => storeModuleById(id),
    description: (e) => `Code : ${text(e.code)} (non modifiable).`,
    fields: (e) => [
      { name: "name", label: "Nom", value: e.name, required: true },
      { name: "category", label: "Catégorie", type: "select", options: STORE_CATEGORIES, value: e.category },
      { name: "description", label: "Description", type: "textarea", value: e.description },
      { name: "objective", label: "Objectif", type: "textarea", value: e.objective },
      { name: "pricing_type", label: "Tarification", type: "select", options: STORE_PRICING, value: e.pricing_type },
      { name: "price_amount", label: "Prix (FCFA, vide si sur devis)", type: "number", value: e.price_amount },
      { name: "status", label: "Statut", type: "select", options: STORE_STATUSES, value: e.status }
    ],
    run: async (e, _reason, v) => {
      if (!v.name) throw new Error("Le nom est requis.");
      const patch = {
        name: v.name,
        category: v.category || e.category,
        description: v.description || null,
        objective: v.objective || null,
        pricing_type: v.pricing_type || e.pricing_type,
        price_amount: v.price_amount ? Number(v.price_amount) : null,
        status: v.status || e.status
      };
      await updateRow("store_modules", e.id, patch);
      await recordAudit({ action_type: "STORE_MODULE_UPDATED", target_type: "store_module", target_id: e.id, old_data: { name: e.name, price_amount: e.price_amount, status: e.status, pricing_type: e.pricing_type }, new_data: patch });
    }
  },
  "module.view": {
    eyebrow: "WalahaStore", label: "Fiche module commercial", view: true,
    entity: (id) => storeModuleById(id),
    details: (e) => storeModuleBusinessDetails(e),
    quickActions: (e) => {
      const actions = [];
      if (canAct("module.edit")) actions.push({ act: "module.edit", id: e.id, label: "Modifier le prix" });
      if (e.status === "disabled" && canAct("module.enable")) actions.push({ act: "module.enable", id: e.id, label: "Réactiver", variant: "go" });
      if (e.status !== "disabled" && canAct("module.disable")) actions.push({ act: "module.disable", id: e.id, label: "Désactiver", variant: "danger" });
      return actions;
    }
  },
  "module.disable": {
    eyebrow: "WalahaStore", label: "Désactiver le module", confirmLabel: "Désactiver", danger: true, reasonRequired: true, reasonLabel: "Motif",
    entity: (id) => storeModuleById(id),
    description: (e) => `Retirer « ${text(e.name)} » du catalogue (les écoles ne pourront plus le demander).`,
    run: async (e, reason) => {
      await updateRow("store_modules", e.id, { status: "disabled" });
      await recordAudit({ action_type: "STORE_MODULE_DISABLED", target_type: "store_module", target_id: e.id, reason, old_data: { status: e.status }, new_data: { status: "disabled" } });
    }
  },
  "module.enable": {
    eyebrow: "WalahaStore", label: "Réactiver le module", confirmLabel: "Réactiver",
    entity: (id) => storeModuleById(id),
    description: (e) => `Remettre « ${text(e.name)} » comme disponible au catalogue.`,
    run: async (e, reason) => {
      await updateRow("store_modules", e.id, { status: "available" });
      await recordAudit({ action_type: "STORE_MODULE_ENABLED", target_type: "store_module", target_id: e.id, reason, old_data: { status: e.status }, new_data: { status: "available" } });
    }
  },

  // --- WalahaStore : cycle d'activation (RLS update admin) ---
  "store.approve": {
    eyebrow: "Activation", label: "Approuver la demande", confirmLabel: "Approuver", reasonLabel: "Note (optionnel)",
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    description: (e) => {
      const m = storeModuleById(e.module_id);
      const hint = m?.pricing_type === "per_student" ? " (tarif par élève : indiquez le total convenu pour l'école)" : "";
      return `Approuver « ${text(m?.name)} ». Confirmez le prix total convenu${hint}.`;
    },
    fields: (e) => [{ name: "price", label: "Prix total convenu (FCFA)", type: "number", value: e.price_agreed ?? storeModuleById(e.module_id)?.price_amount ?? "" }],
    run: async (e, reason, v) => {
      const fallback = e.price_agreed ?? storeModuleById(e.module_id)?.price_amount ?? null;
      const priceAgreed = v.price !== "" && v.price != null ? Number(v.price) : fallback;
      const patch = { status: "approved", price_agreed: priceAgreed, decided_by: state.authUserId, decided_at: new Date().toISOString(), decision_note: reason || null };
      await updateRow("store_subscriptions", e.id, patch);
      await recordAudit({ action_type: "STORE_REQUEST_APPROVED", target_type: "store_subscription", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.activate": {
    eyebrow: "Activation", label: "Activer le module", confirmLabel: "Activer", reasonLabel: "Note (optionnel)",
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    description: (e) => `Activer « ${text(storeModuleById(e.module_id)?.name)} » pour cette école.`,
    run: async (e, reason) => {
      const expires = computeModuleExpiry(storeModuleById(e.module_id)?.pricing_type, new Date());
      const patch = { status: "active", activated_at: new Date().toISOString(), expires_at: expires, decided_by: state.authUserId };
      await updateRow("store_subscriptions", e.id, patch);
      await recordAudit({ action_type: "STORE_MODULE_ACTIVATED", target_type: "store_subscription", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.renew": {
    eyebrow: "Activation", label: "Renouveler l'abonnement", confirmLabel: "Renouveler", reasonLabel: "Note (optionnel)",
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    description: (e) => `Prolonger « ${text(storeModuleById(e.module_id)?.name)} » d'une période pour cette école.`,
    run: async (e, reason) => {
      const module = storeModuleById(e.module_id);
      // Repart de l'échéance restante si non expirée, sinon de maintenant.
      const base = e.expires_at && new Date(e.expires_at) > new Date() ? new Date(e.expires_at) : new Date();
      const expires = computeModuleExpiry(module?.pricing_type, base);
      const patch = { status: "active", expires_at: expires };
      await updateRow("store_subscriptions", e.id, patch);
      await recordAudit({ action_type: "STORE_MODULE_RENEWED", target_type: "store_subscription", target_id: e.id, reason, old_data: { expires_at: e.expires_at }, new_data: patch });
    }
  },
  "store.reject": {
    eyebrow: "Activation", label: "Refuser la demande", confirmLabel: "Refuser", danger: true, reasonRequired: true, reasonLabel: "Motif du refus",
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    description: (e) => `Refuser l'activation de « ${text(storeModuleById(e.module_id)?.name)} ».`,
    run: async (e, reason) => {
      const patch = { status: "rejected", decided_by: state.authUserId, decided_at: new Date().toISOString(), decision_note: reason };
      await updateRow("store_subscriptions", e.id, patch);
      await recordAudit({ action_type: "STORE_REQUEST_REJECTED", target_type: "store_subscription", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.suspend": {
    eyebrow: "Activation", label: "Suspendre le module", confirmLabel: "Suspendre", danger: true, reasonRequired: true, reasonLabel: "Motif",
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    description: (e) => `Suspendre « ${text(storeModuleById(e.module_id)?.name)} » pour cette école.`,
    run: async (e, reason) => {
      const patch = { status: "suspended", decision_note: reason };
      await updateRow("store_subscriptions", e.id, patch);
      await recordAudit({ action_type: "STORE_MODULE_SUSPENDED", target_type: "store_subscription", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.view": {
    eyebrow: "Activation", label: "Fiche activation Store", view: true,
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    details: (e) => withAuditHistory([
      ["Module", storeModuleById(e.module_id)?.name || e.module_id],
      ["École", state.schools.find((s) => s.id === e.school_id)?.name || e.school_id],
      ["Statut", e.status],
      ["Prix convenu", e.price_agreed != null ? xof(e.price_agreed) : "-"],
      ["Activé le", e.activated_at ? new Date(e.activated_at).toLocaleDateString("fr-FR") : "-"],
      ["Expire le", e.expires_at ? new Date(e.expires_at).toLocaleDateString("fr-FR") : "-"],
      ["Note demande", e.note || "-"],
      ["Décision", e.decision_note || "-"]
    ], "store_subscription", e.id),
    quickActions: (e) => {
      const actions = [{ act: "store.history", id: e.id, label: "Historique prix" }];
      if (e.status === "requested" && canAct("store.approve")) actions.push({ act: "store.approve", id: e.id, label: "Approuver", variant: "go" });
      if (e.status === "approved" && canAct("store.activate")) actions.push({ act: "store.activate", id: e.id, label: "Activer", variant: "go" });
      if (e.status === "active" && canAct("store.renew")) actions.push({ act: "store.renew", id: e.id, label: "Renouveler", variant: "go" });
      return actions;
    }
  },
  "store.history": {
    eyebrow: "WalahaStore", label: "Historique prix et abonnement", view: true,
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    description: (e) => {
      const module = storeModuleById(e.module_id)?.name || e.module_id;
      const school = state.schools.find((s) => s.id === e.school_id)?.name || e.school_id;
      return `${text(module)} · ${text(school)}`;
    },
    details: (e) => storePriceHistoryRows(e.id)
  },

  // --- WalahaStore : demandes de modules personnalisés (sur devis) ---
  "store.customReview": {
    eyebrow: "Sur devis", label: "Mettre à l'étude", confirmLabel: "À l'étude", reasonLabel: "Note interne (optionnel)",
    entity: (id) => state.storeCustom.find((c) => c.id === id),
    description: (e) => `Marquer la demande « ${text(e.title)} » comme en cours d'étude.`,
    run: async (e, reason) => {
      const patch = { status: "in_review", handled_by: state.authUserId, internal_note: reason || e.internal_note || null };
      await updateRow("store_custom_requests", e.id, patch);
      await recordAudit({ action_type: "STORE_CUSTOM_REVIEW", target_type: "store_custom_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.customQuote": {
    eyebrow: "Sur devis", label: "Devis envoyé", confirmLabel: "Marquer devis envoyé", reasonLabel: "Détail du devis (optionnel)",
    entity: (id) => state.storeCustom.find((c) => c.id === id),
    description: (e) => `Indiquer qu'un devis a été envoyé pour « ${text(e.title)} ».`,
    run: async (e, reason) => {
      const patch = { status: "quoted", handled_by: state.authUserId, internal_note: reason || e.internal_note || null };
      await updateRow("store_custom_requests", e.id, patch);
      await recordAudit({ action_type: "STORE_CUSTOM_QUOTED", target_type: "store_custom_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.customClose": {
    eyebrow: "Sur devis", label: "Clore la demande", confirmLabel: "Clore", reasonRequired: true, reasonLabel: "Conclusion",
    entity: (id) => state.storeCustom.find((c) => c.id === id),
    description: (e) => `Clore la demande « ${text(e.title)} » (traitée).`,
    run: async (e, reason) => {
      const patch = { status: "closed", handled_by: state.authUserId, internal_note: reason };
      await updateRow("store_custom_requests", e.id, patch);
      await recordAudit({ action_type: "STORE_CUSTOM_CLOSED", target_type: "store_custom_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.customReject": {
    eyebrow: "Sur devis", label: "Rejeter la demande", confirmLabel: "Rejeter", danger: true, reasonRequired: true, reasonLabel: "Motif du rejet",
    entity: (id) => state.storeCustom.find((c) => c.id === id),
    description: (e) => `Rejeter la demande « ${text(e.title)} ».`,
    run: async (e, reason) => {
      const patch = { status: "rejected", handled_by: state.authUserId, internal_note: reason };
      await updateRow("store_custom_requests", e.id, patch);
      await recordAudit({ action_type: "STORE_CUSTOM_REJECTED", target_type: "store_custom_request", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.customView": {
    eyebrow: "Sur devis", label: "Détail de la demande", view: true,
    entity: (id) => state.storeCustom.find((c) => c.id === id),
    details: (e) => [["Titre", e.title], ["École", state.schools.find((s) => s.id === e.school_id)?.name || e.school_id], ["Description", e.description || "-"], ["Statut", e.status], ["Note interne", e.internal_note || "-"]]
  }
};

async function edgeErrorMessage(error, data) {
  if (data?.error) return data.detail || data.error;
  try {
    const body = await error?.context?.json?.();
    if (body) return body.detail || body.error || error.message;
  } catch (_) { /* corps non JSON */ }
  return error?.message || "Échec de l'opération.";
}

async function invokeEdge(fnName, payload) {
  const { data, error } = await supabaseClient.functions.invoke(fnName, { body: payload });
  if (error) throw new Error(await edgeErrorMessage(error, data));
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

function invokeAdminFn(payload) {
  return invokeEdge("wac-manage-admins", payload);
}

const actionModal = document.getElementById("actionModal");
const actionModalForm = document.getElementById("actionModalForm");
const actionModalEyebrow = document.getElementById("actionModalEyebrow");
const actionModalTitle = document.getElementById("actionModalTitle");
const actionModalDescription = document.getElementById("actionModalDescription");
const actionModalDetails = document.getElementById("actionModalDetails");
const actionModalQuickActions = document.getElementById("actionModalQuickActions");
const actionModalFields = document.getElementById("actionModalFields");
const actionModalReasonWrap = document.getElementById("actionModalReasonWrap");
const actionModalReason = document.getElementById("actionModalReason");
const actionModalReasonLabel = document.getElementById("actionModalReasonLabel");
const actionModalConfirm = document.getElementById("actionModalConfirm");
const actionModalCancel = document.getElementById("actionModalCancel");
const actionModalClose = document.getElementById("actionModalClose");
const actionModalStatus = document.getElementById("actionModalStatus");

let activeAction = null;

function fieldHtml(field) {
  const id = `af_${field.name}`;
  const req = field.required ? "required" : "";
  if (field.type === "select") {
    const options = (field.options || []).map((opt) => {
      const [value, label] = Array.isArray(opt) ? opt : [opt, opt];
      const selected = String(field.value ?? "") === String(value) ? "selected" : "";
      return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
    }).join("");
    return `<label for="${id}">${escapeHtml(field.label)}</label><select id="${id}" data-field="${escapeHtml(field.name)}" ${req}>${options}</select>`;
  }
  if (field.type === "textarea") {
    return `<label for="${id}">${escapeHtml(field.label)}</label><textarea id="${id}" data-field="${escapeHtml(field.name)}" rows="2" ${req}>${escapeHtml(field.value || "")}</textarea>`;
  }
  return `<label for="${id}">${escapeHtml(field.label)}</label><input id="${id}" data-field="${escapeHtml(field.name)}" type="${field.type || "text"}" value="${escapeHtml(field.value ?? "")}" placeholder="${escapeHtml(field.placeholder || "")}" ${req}>`;
}

function collectFields() {
  const values = {};
  let firstMissing = null;
  actionModalFields.querySelectorAll("[data-field]").forEach((el) => {
    const value = typeof el.value === "string" ? el.value.trim() : el.value;
    values[el.dataset.field] = value;
    if (el.hasAttribute("required") && !value && !firstMissing) {
      firstMissing = el.previousElementSibling?.textContent || el.dataset.field;
    }
  });
  return { values, firstMissing };
}

function setActionStatus(message, isError = true) {
  if (!actionModalStatus) return;
  actionModalStatus.textContent = message || "";
  actionModalStatus.classList.toggle("success", !isError);
}

function closeActionModal() {
  activeAction = null;
  actionModal.classList.add("is-hidden");
  setActionStatus("");
}

function openActionModal(actKey, id) {
  const def = ACTIONS[actKey];
  if (!def) return;
  if (!canAct(actKey)) {
    window.alert(`Action non autorisee pour le role ${state.admin?.role || "admin"}.`);
    return;
  }
  const entity = def.entity ? def.entity(id) : null;
  if (def.entity && !entity) {
    window.alert("Élément introuvable (données rechargées ?).");
    return;
  }

  activeAction = { def, entity };
  actionModalEyebrow.textContent = def.eyebrow || "Action";
  actionModalTitle.textContent = def.label || "Confirmer";
  actionModalDescription.textContent = typeof def.description === "function" ? def.description(entity) : (def.description || "");
  actionModalDetails.innerHTML = typeof def.details === "function"
    ? def.details(entity).map(([key, value]) => `<div class="detail-row${String(key).startsWith("—") ? " detail-section" : ""}"><span>${escapeHtml(key)}</span><strong>${text(value)}</strong></div>`).join("")
    : "";

  const quickActions = typeof def.quickActions === "function" ? def.quickActions(entity) : [];
  if (actionModalQuickActions) {
    actionModalQuickActions.classList.toggle("is-hidden", !quickActions.length);
    actionModalQuickActions.innerHTML = quickActions.length
      ? `<p class="eyebrow">Actions rapides</p><div class="row-actions">${quickActions.map((qa) => rowBtn(qa.act, qa.id, qa.label, qa.variant || "")).join("")}</div>`
      : "";
  }

  const fields = typeof def.fields === "function" ? def.fields(entity) : (def.fields || []);
  actionModalFields.innerHTML = fields.map(fieldHtml).join("");

  const showReason = !def.view && !def.hideReason;
  actionModalReasonWrap.classList.toggle("is-hidden", !showReason);
  actionModalReason.value = "";
  actionModalReason.required = Boolean(def.reasonRequired);
  actionModalReasonLabel.textContent = def.reasonLabel || "Motif / note interne";
  actionModalConfirm.classList.toggle("is-hidden", Boolean(def.view));
  actionModalConfirm.textContent = def.confirmLabel || "Confirmer";
  actionModalConfirm.classList.toggle("danger-btn", Boolean(def.danger));
  actionModalCancel.textContent = def.view ? "Fermer" : "Annuler";

  setActionStatus("");
  actionModal.classList.remove("is-hidden");
  window.setTimeout(() => {
    const firstField = actionModalFields.querySelector("[data-field]");
    (firstField || (showReason ? actionModalReason : actionModalCancel)).focus();
  }, 20);
}

function showAdmin() {
  loginView.classList.add("is-hidden");
  adminShell.classList.remove("is-hidden");
  rolePill.textContent = state.admin?.role || "admin";
  applyRolePermissions();
}

function showLogin() {
  adminShell.classList.add("is-hidden");
  loginView.classList.remove("is-hidden");
}

async function loadData() {
  const [
    schoolsResult,
    schoolRequestsResult,
    studentsResult,
    usersResult,
    tutorsResult,
    tutorRequestsResult,
    gamesResult,
    reportsResult,
    paymentsResult,
    logsResult,
    membersResult,
    moderationResult,
    storeModulesResult,
    storeSubsResult,
    storePriceHistoryResult,
    storeCustomResult,
    pricingConfigsResult,
    parentLinksResult
  ] = await Promise.all([
    queryTable("canonical_schools", "id, public_code, name, school_type, city, created_at, deleted_at", { order: { column: "created_at" } }),
    queryTable("school_requests", "id, name, school_type, city, commune, phone, email, promoter_name, director_name, status, public_code, internal_note, requested_by, created_at", { order: { column: "created_at" } }),
    queryStudents(),
    queryTable("users", "id, email, display_name, preferred_language, created_at, deleted_at", { order: { column: "created_at" } }),
    queryTable("canonical_tutors", "id, public_code, full_name, email, phone, subjects, created_at, deleted_at", { order: { column: "created_at" } }),
    queryTable("tutor_requests", "id, parent_id, requested_by, full_name, email, phone, subjects, bio, status, internal_note, public_code, canonical_tutor_id, created_at, reviewed_at", { order: { column: "created_at" } }),
    queryGames(),
    queryTable("moderation_reports", "id, target_type, target_id, reason, status, priority, assigned_admin_id, created_at", { order: { column: "created_at" } }),
    queryPayments(),
    queryTable("admin_audit_logs", "id, action_type, target_type, target_id, reason, old_data, new_data, created_at, admin_id", { order: { column: "created_at" }, limit: 300 }),
    queryTable("admin_members", "id, user_id, role, status, created_at", { order: { column: "created_at" } }),
    queryTable("user_moderation", "user_id, status, reason, updated_at"),
    queryTable("store_modules", "id, code, name, category, description, objective, pricing_type, price_amount, price_currency, status, requires_validation, sort_order, created_at, deleted_at", { order: { column: "sort_order", ascending: true } }),
    queryTable("store_subscriptions", "id, module_id, school_id, requested_by, status, price_agreed, note, decision_note, activated_at, expires_at, created_at", { order: { column: "created_at" } }),
    queryTable("store_subscription_price_history", "id, subscription_id, module_id, school_id, change_type, old_price_agreed, new_price_agreed, price_currency, old_status, new_status, old_expires_at, new_expires_at, changed_by, note, created_at", { order: { column: "created_at" }, limit: 500 }),
    queryTable("store_custom_requests", "id, school_id, requested_by, title, description, status, internal_note, created_at", { order: { column: "created_at" } }),
    queryPricingConfigs(),
    queryParentLinks()
  ]);

  state.schools = schoolsResult.data.filter((item) => !item.deleted_at);
  state.schoolRequests = schoolRequestsResult.data;
  state.students = studentsResult.data.filter((item) => !item.deleted_at);
  state.users = usersResult.data.filter((item) => !item.deleted_at);
  state.tutors = tutorsResult.data.filter((item) => !item.deleted_at);
  state.tutorRequests = tutorRequestsResult.data;
  state.games = gamesResult.data.filter((item) => !item.deleted_at);
  state.reports = reportsResult.data;
  state.payments = paymentsResult.data;
  state.logs = logsResult.data;
  state.members = membersResult.data;
  state.userModeration = moderationResult.data;
  state.storeModules = storeModulesResult.data.filter((item) => !item.deleted_at);
  state.storeSubscriptions = storeSubsResult.data;
  state.storePriceHistory = storePriceHistoryResult.data;
  state.storeCustom = storeCustomResult.data;
  state.pricingConfigs = pricingConfigsResult.data;
  state.parentLinks = parentLinksResult.data.filter((link) => link.status === "active");

  populateLogsAdminFilter();
  refreshLogsFilter();

  // Comptes exacts (totaux réels, non plafonnés à 1000 lignes).
  const [schoolsCount, studentsCount, usersCount, tutorsCount, paymentsCount, reportsPendingCount] = await Promise.all([
    countTable("canonical_schools", { isNull: ["deleted_at"] }),
    countTable("canonical_students", { isNull: ["deleted_at"] }),
    countTable("users", { isNull: ["deleted_at"] }),
    countTable("canonical_tutors", { isNull: ["deleted_at"] }),
    countTable("school_digital_payments"),
    countTable("moderation_reports", { in: ["status", ["open", "in_review", "escalated"]] })
  ]);
  state.counts = {
    schools: schoolsCount,
    students: studentsCount,
    users: usersCount,
    tutors: tutorsCount,
    payments: paymentsCount,
    reportsPending: reportsPendingCount
  };

  renderAll();

  const missing = [
    ["admin_members", state.admin ? null : "membership"],
    ["canonical_students", studentsResult.error],
    ["school_requests", schoolRequestsResult.error],
    ["tutor_requests", tutorRequestsResult.error],
    ["moderation_reports", reportsResult.error],
    ["school_digital_payments", paymentsResult.error],
    ["admin_audit_logs", logsResult.error],
    ["store_subscription_price_history", storePriceHistoryResult.error],
    ["app_pricing_configs", pricingConfigsResult.error]
  ].filter(([, error]) => error);

  if (missing.length) {
    console.warn("[WAC] Tables WAC a verifier:", missing.map(([name]) => name).join(", "));
  }
}

function renderMetrics() {
  renderDashMetrics();
}

function renderDashMetrics() {
  const target = document.getElementById("dashMetrics");
  if (!target) return;

  const c = state.counts || {};
  const pendingReports = state.reports.filter((report) => ["open", "in_review", "escalated"].includes(report.status)).length;
  const pendingSchools = state.schoolRequests.filter((r) => ["pending_review", "verified"].includes(r.status)).length;
  const pick = (exact, fallback) => (typeof exact === "number" ? exact : fallback);
  const fmt = (value) => Number(value || 0).toLocaleString("fr-FR");

  const items = [
    { label: "Écoles officielles", value: fmt(pick(c.schools, state.schools.length)), hint: `${pendingSchools} demande(s)`, tone: "tone-brand", icon: "⌂", route: "schools" },
    { label: "Élèves", value: fmt(pick(c.students, state.students.length)), hint: "Profils ELV-", tone: "tone-teal", icon: "◎", route: "schools" },
    { label: "Utilisateurs", value: fmt(pick(c.users, state.users.length)), hint: "Comptes actifs", tone: "tone-info", icon: "◉", route: "users" },
    { label: "Signalements", value: fmt(pick(c.reportsPending, pendingReports)), hint: "Modération", tone: pendingReports ? "tone-danger" : "tone-teal", icon: "!", route: "reports" },
    { label: "Répétiteurs", value: fmt(pick(c.tutors, state.tutors.length)), hint: "Profils REP-", tone: "tone-warning", icon: "✦", route: "tutors" },
    { label: "Facturation", value: fmt(pick(c.payments, state.payments.length)), hint: `${overduePayments().length} retard(s)`, tone: overduePayments().length ? "tone-danger" : "tone-brand", icon: "₣", route: "payments" }
  ];

  target.innerHTML = items.map((item) => `
    <button type="button" class="dash-kpi ${item.tone}" data-route="${item.route}">
      <span class="dash-kpi-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
      <span class="dash-kpi-label">${escapeHtml(item.label)}</span>
      <span class="dash-kpi-value">${escapeHtml(item.value)}</span>
      <span class="dash-kpi-hint">${escapeHtml(item.hint)}</span>
    </button>
  `).join("");
}

function renderDashTasks() {
  const target = document.getElementById("dashTaskList");
  const badge = document.getElementById("dashTaskBadge");
  if (!target) return;

  const items = internalNotifications();
  if (badge) {
    badge.textContent = String(items.length);
    badge.classList.toggle("is-zero", items.length === 0);
  }

  if (!items.length) {
    target.innerHTML = `
      <div class="dash-task-empty">
        <strong>Rien à traiter</strong>
        <small>Les écoles, signalements et paiements en attente apparaîtront ici.</small>
      </div>
    `;
    return;
  }

  target.innerHTML = items.map((item) => `
    <button type="button" class="dash-task ${item.severity}" data-route="${item.route}" ${item.act ? `data-act="${item.act}" data-id="${escapeHtml(item.id)}"` : ""}>
      <span class="dash-task-icon" aria-hidden="true">${escapeHtml(TASK_ICONS[item.title] || "•")}</span>
      <span class="dash-task-body">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.body)}</small>
      </span>
      <span class="dash-task-action">Ouvrir</span>
    </button>
  `).join("");
}

function renderDashShortcuts() {
  const target = document.getElementById("dashShortcuts");
  if (!target) return;

  const role = state.admin?.role || "support";
  const allowed = (ROLE_ROUTES[role] || ROLE_ROUTES.support).filter((route) => route !== "dashboard");
  const priority = ["schools", "reports", "payments", "store", "users", "logs", "tutors", "games", "settings"];
  const routes = priority.filter((route) => allowed.includes(route)).slice(0, 6);

  target.innerHTML = routes.map((route) => {
    const meta = DASH_ROUTE_META[route] || { label: route, icon: "›" };
    return `
      <button type="button" class="dash-shortcut" data-route="${route}">
        <span class="dash-shortcut-icon" aria-hidden="true">${escapeHtml(meta.icon)}</span>
        ${escapeHtml(meta.label)}
      </button>
    `;
  }).join("");
}

function renderDashFinanceViz() {
  const target = document.getElementById("dashFinanceViz");
  if (!target) return;

  const rows = billingRows();
  const due = rows.filter((p) => p.status !== "paid").reduce((sum, p) => sum + billingNet(p), 0);
  const paid = rows.filter((p) => p.status === "paid").reduce((sum, p) => sum + billingNet(p), 0);
  const total = due + paid;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  target.innerHTML = `
    <div class="dash-progress-head">
      <strong>Taux d'encaissement</strong>
      <span>${pct}%</span>
    </div>
    <div class="dash-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="dash-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="dash-progress-legend">
      <span>Encaissé ${escapeHtml(xof(paid))}</span>
      <span>À encaisser ${escapeHtml(xof(due))}</span>
    </div>
  `;
}

function renderDashMeta() {
  const greeting = document.getElementById("dashGreeting");
  const dateEl = document.getElementById("dashDate");
  const roleEl = document.getElementById("dashRole");
  const statusEl = document.getElementById("dashStatus");

  if (greeting) {
    const hour = new Date().getHours();
    const salut = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    const me = state.users.find((u) => u.id === state.authUserId);
    const name = me?.display_name?.split(/\s+/)[0] || me?.email?.split("@")[0] || "";
    greeting.textContent = name ? `${salut}, ${name}` : salut;
  }

  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
  }

  if (roleEl) {
    roleEl.textContent = roleLabel(state.admin?.role);
  }

  if (statusEl) {
    const tasks = internalNotifications().length;
    if (tasks) {
      statusEl.textContent = `${tasks} priorité${tasks > 1 ? "s" : ""}`;
      statusEl.classList.remove("is-ok");
    } else {
      statusEl.textContent = "Plateforme stable";
      statusEl.classList.add("is-ok");
    }
  }
}

function tutorRequestDetails(e) {
  const parentUser = state.users.find((u) => u.id === e.requested_by);
  return [
    ["Parent", e.full_name],
    ["Email", e.email || parentUser?.email || "-"],
    ["Téléphone", e.phone || "-"],
    ["Matières", Array.isArray(e.subjects) ? e.subjects.join(", ") : "-"],
    ["Bio", e.bio || "-"],
    ["Statut", e.status],
    ["Code REP-", e.public_code || "non attribué"],
    ["Note interne", e.internal_note || "-"],
    ["Demandé le", e.created_at ? new Date(e.created_at).toLocaleString("fr-FR") : "-"]
  ];
}

function tutorRequestRowActions(req) {
  if (!["pending_review", "on_hold"].includes(req.status)) {
    return rowBtn("tutorRequest.view", req.id, "Voir");
  }
  return rowBtns([
    rowBtn("tutorRequest.view", req.id, "Voir"),
    rowBtn("tutorRequest.approve", req.id, "Accepter", "go"),
    req.status === "pending_review" ? rowBtn("tutorRequest.hold", req.id, "En attente") : "",
    rowBtn("tutorRequest.reject", req.id, "Refuser", "danger")
  ]);
}

// Liste fusionnée : écoles officielles (canonical_schools, données réelles)
// + demandes encore ouvertes (school_requests non encore validées).
function schoolsList() {
  const official = state.schools.map((s) => ({
    kind: "school",
    id: s.id,
    name: s.name,
    code: s.public_code,
    city: s.city,
    contact: s.school_type,
    requester: "Officielle",
    status: "active"
  }));
  const requests = state.schoolRequests
    .filter((r) => r.status !== "active")
    .map((r) => ({
      kind: "request",
      id: r.id,
      name: r.name,
      code: r.public_code || r.school_type,
      city: r.city,
      contact: r.phone || r.email,
      requester: r.promoter_name || r.director_name || "Demande",
      status: r.status
    }));
  return [...requests, ...official];
}

function renderSchools(list = schoolsList()) {
  renderTable("schoolsTable", list.map((item) => `
      <tr>
        <td><strong>${text(item.name)}</strong><small>${text(item.code)}</small></td>
        <td>${text(item.city)}</td>
        <td>${text(item.contact)}</td>
        <td>${text(item.requester)}</td>
        <td>${statusBadge(item.status)}</td>
        <td>${schoolActionButtons(item)}</td>
      </tr>
    `), 6, "Aucune école ni demande. Vérifiez la connexion à canonical_schools / school_requests.");
}

function schoolActionButtons(item) {
  if (item.kind === "school") {
    return rowBtn("school.viewOfficial", item.id, "Voir");
  }
  if (["pending_review", "verified"].includes(item.status)) {
    return rowBtns([
      item.status === "pending_review" ? rowBtn("school.verify", item.id, "Vérifier") : "",
      rowBtn("school.validate", item.id, "Valider", "go"),
      rowBtn("school.reject", item.id, "Rejeter", "danger")
    ]);
  }
  return rowBtn("school.view", item.id, "Voir");
}

function officialSchoolDetails(school) {
  const payment = paymentForSchool(school.id);
  const schoolPayments = state.payments.filter((p) => p.canonical_school_id === school.id);
  const storeActive = state.storeSubscriptions.filter((sub) => sub.school_id === school.id && sub.status === "active");
  const storePending = state.storeSubscriptions.filter((sub) => sub.school_id === school.id && ["requested", "approved"].includes(sub.status));
  const billingHistory = schoolPayments.length
    ? schoolPayments.map((p) => `${p.academic_year}: ${p.status} · net ${xof(billingNet(p))}`).join(" | ")
    : "—";
  const base = [
    ["École", school.name],
    ["Code ECO-", school.public_code],
    ["Type", school.school_type],
    ["Ville", school.city],
    ["Élèves rattachés", studentCountForSchool(school.id).toLocaleString("fr-FR")],
    ["Facturation (année courante)", payment ? `${payment.status} · ${xof(billingNet(payment))}` : "Dossier à préparer"],
    ["Élèves facturés", payment ? Number(payment.billed_students || 0).toLocaleString("fr-FR") : "—"],
    ["Réduction", payment ? `${xof(billingDiscount(payment))}${payment.discount_reason ? ` · ${payment.discount_reason}` : ""}` : "—"],
    ["Proforma", payment?.proforma_number || (payment ? defaultProformaNumber(payment) : "-")],
    ["Facture", payment?.invoice_number || (payment ? defaultInvoiceNumber(payment) : "-")],
    ["Réf. comptable", payment?.accounting_ref || "—"],
    ["Historique facturation", billingHistory],
    ["Modules Store actifs", storeActive.map((s) => storeModuleById(s.module_id)?.name || s.module_id).join(", ") || "0"],
    ["Demandes Store en attente", storePending.length],
    ["Créée le", new Date(school.created_at).toLocaleDateString("fr-FR")]
  ];
  return withAuditHistory(base, "canonical_school", school.id);
}

function moderationStatusFor(userId) {
  return state.userModeration.find((m) => m.user_id === userId)?.status || "active";
}

function userDetails(user) {
  const moderation = state.userModeration.find((m) => m.user_id === user.id);
  const member = state.members.find((m) => m.user_id === user.id);
  const children = state.parentLinks
    .filter((link) => link.parent_user_id === user.id)
    .map((link) => state.students.find((s) => s.id === link.student_id))
    .filter(Boolean)
    .map((s) => studentDisplayName(s))
    .join(", ");
  const base = [
    ["Nom", user.display_name || "Sans nom"],
    ["Email", user.email],
    ["Langue", user.preferred_language || "fr"],
    ["Rôle app", children ? "Parent" : "Utilisateur"],
    ["Enfants liés", children || "-"],
    ["Statut modération", moderation?.status || "active"],
    ["Raison modération", moderation?.reason || "-"],
    ["Rôle WAC", member?.role || "-"],
    ["Statut WAC", member?.status || "-"],
    ["Créé le", new Date(user.created_at).toLocaleDateString("fr-FR")]
  ];
  return withAuditHistory(base, "user", user.id);
}

function renderUsers(list = state.users) {
  renderTable("usersTable", list.map((user) => {
    const status = moderationStatusFor(user.id);
    const actions = status === "active"
      ? [rowBtn("user.view", user.id, "Voir"), rowBtn("user.suspend", user.id, "Suspendre", "danger"), rowBtn("user.archive", user.id, "Archiver", "danger")]
      : [rowBtn("user.view", user.id, "Voir"), rowBtn("user.reactivate", user.id, "Réactiver", "go"), rowBtn("user.archive", user.id, "Archiver", "danger")];
    return `
    <tr>
      <td><strong>${text(user.display_name, "Sans nom")}</strong><small>${text(user.email)}</small></td>
      <td>utilisateur</td>
      <td>${text(user.preferred_language, "fr")}</td>
      <td>${new Date(user.created_at).toLocaleDateString("fr-FR")}</td>
      <td>${statusBadge(status)}</td>
      <td>${rowBtns(actions)}</td>
    </tr>
  `;
  }));
}

function renderTutorRequests(list = state.tutorRequests) {
  renderTable("tutorRequestsTable", list.map((req) => `
    <tr>
      <td><strong>${text(req.full_name)}</strong><small>${text(req.email)}</small></td>
      <td>${Array.isArray(req.subjects) && req.subjects.length ? escapeHtml(req.subjects.join(", ")) : "-"}</td>
      <td>${text(req.phone)}</td>
      <td>${req.created_at ? new Date(req.created_at).toLocaleDateString("fr-FR") : "-"}</td>
      <td>${statusBadge(req.status)}</td>
      <td>${tutorRequestRowActions(req)}</td>
    </tr>
  `), 6, "Aucune demande répétiteur. Les parents soumettent depuis Mon profil.");
}

function renderTutors() {
  renderTable("tutorsTable", state.tutors.map((tutor) => `
    <tr>
      <td><strong>${text(tutor.full_name)}</strong><small>${text(tutor.public_code)}</small></td>
      <td>${Array.isArray(tutor.subjects) && tutor.subjects.length ? escapeHtml(tutor.subjects.join(", ")) : "-"}</td>
      <td>${text(tutor.phone)}</td>
      <td>${text(tutor.email)}</td>
      <td>${statusBadge("active")}</td>
      <td>${rowBtn("tutor.view", tutor.id, "Ouvrir")}</td>
    </tr>
  `));
}

function renderGames() {
  const target = document.getElementById("gamesGrid");
  if (!target) return;

  target.innerHTML = state.games.length ? state.games.map((game) => `
    <article class="game-card">
      <h2>${text(game.title)}</h2>
      <p>${text(game.short_description)}</p>
      <div class="game-meta">
        <span>${text(game.activity_type)}</span>
        <span>${text(game.age_min)}-${text(game.age_max)} ans</span>
        <span>${text(game.difficulty)}</span>
        ${statusBadge(game.validation_status)}
      </div>
      <div class="row-actions">
        ${game.validation_status !== "published" ? rowBtn("game.publish", game.id, "Publier", "go") : ""}
        ${game.validation_status !== "archived" ? rowBtn("game.archive", game.id, "Archiver", "danger") : ""}
      </div>
    </article>
  `).join("") : `<article class="game-card"><h2>Aucun jeu</h2><p>La table educational_activities est vide ou non lisible pour cet admin.</p></article>`;
}

function renderReports() {
  renderTable("reportsTable", state.reports.map((report) => `
    <tr>
      <td>${text(report.reason)}</td>
      <td><strong>${text(report.target_type)}</strong><small>${text(report.target_id)}</small></td>
      <td>${statusBadge(report.priority)}</td>
      <td>${statusBadge(report.status)}</td>
      <td>${text(report.assigned_admin_id, "Non assigne")}</td>
      <td>${reportActionButtons(report)}</td>
    </tr>
  `));
}

function reportActionButtons(report) {
  const closed = ["resolved", "rejected"].includes(report.status);
  if (closed) {
    return rowBtn("report.view", report.id, "Voir");
  }
  return rowBtns([
    report.assigned_admin_id ? "" : rowBtn("report.claim", report.id, "Prendre"),
    rowBtn("report.assign", report.id, "Assigner"),
    rowBtn("report.resolve", report.id, "Résoudre", "go"),
    rowBtn("report.reject", report.id, "Rejeter", "danger"),
    rowBtn("report.escalate", report.id, "Escalader", "danger")
  ]);
}

function assignableMembers() {
  return state.members
    .filter((m) => m.status === "active")
    .map((m) => {
      const user = memberUser(m);
      return [m.user_id, `${user?.display_name || user?.email || m.user_id} (${m.role})`];
    });
}

function renderPayments(list = billingRows()) {
  renderBillingMetrics();
  renderTable("paymentsTable", list.map((payment) => `
    <tr>
      <td><strong>${text(payment.school_name)}</strong><small>${text(schoolCodeForPayment(payment))}</small></td>
      <td>${text(payment.academic_year)}<small>${payment.due_date ? `Échéance ${new Date(payment.due_date).toLocaleDateString("fr-FR")}` : "Échéance à définir"}</small></td>
      <td><strong>${Number(payment.billed_students || 0).toLocaleString("fr-FR")}</strong><small>${xof(payment.amount_per_student_xof || 0)} / élève</small></td>
      <td><strong>${xof(billingNet(payment))}</strong><small>Brut ${xof(billingGross(payment))} · remise ${xof(billingDiscount(payment))}</small></td>
      <td><strong>${text(payment.proforma_number, defaultProformaNumber(payment))}</strong><small>${text(payment.invoice_number, defaultInvoiceNumber(payment))}</small></td>
      <td><strong>${text(payment.accounting_ref, "Réf. à renseigner")}</strong><small>${[payment.tax_id, payment.payment_reference].filter(Boolean).join(" · ") || "Infos comptables à compléter"}</small></td>
      <td>${statusBadge(payment.status)}</td>
      <td>${paymentActionButtons(payment)}</td>
    </tr>
  `), 8, "Aucun dossier de facturation. Créez des lignes dans school_digital_payments.");
}

function renderBillingMetrics() {
  const target = document.getElementById("billingMetrics");
  if (!target) return;
  const rows = billingRows();
  const gross = rows.reduce((sum, p) => sum + billingGross(p), 0);
  const discounts = rows.reduce((sum, p) => sum + billingDiscount(p), 0);
  const net = rows.reduce((sum, p) => sum + billingNet(p), 0);
  const paid = rows.filter((p) => p.status === "paid").reduce((sum, p) => sum + billingNet(p), 0);
  const due = Math.max(0, net - paid);
  const students = rows.reduce((sum, p) => sum + Number(p.billed_students || 0), 0);
  const cards = [
    ["Écoles suivies", rows.length.toLocaleString("fr-FR"), `${students.toLocaleString("fr-FR")} élèves`],
    ["Net à encaisser", xof(net), `Brut ${xof(gross)}`],
    ["Réductions", xof(discounts), "Remises appliquées"],
    ["Reste à payer", xof(due), `${rows.filter((p) => p.status !== "paid").length} dossier(s) ouverts`]
  ];
  target.innerHTML = cards.map(([label, value, hint]) => `
    <article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>
  `).join("");
}

function paymentActionButtons(payment) {
  if (payment.isDraftBilling) {
    return rowBtns([
      rowBtn("payment.create", payment.id, "Préparer", "go")
    ]);
  }
  const actions = [
    rowBtn("payment.view", payment.id, "Voir"),
    rowBtn("payment.edit", payment.id, "Modifier"),
    rowBtn("payment.proforma", payment.id, "Proforma"),
    rowBtn("payment.invoice", payment.id, payment.status === "paid" ? "Reçu" : "Facture"),
    rowBtn("payment.printProforma", payment.id, "PDF proforma"),
    rowBtn("payment.printInvoice", payment.id, "PDF facture")
  ];
  if (payment.status !== "paid") {
    actions.push(rowBtn("payment.confirm", payment.id, "Payée", "go"));
    actions.push(rowBtn("payment.remind", payment.id, "Relance"));
  }
  return rowBtns(actions);
}

function schoolSubscriptionConfig() {
  return state.pricingConfigs.find((item) => item.config_key === "school_subscription_default") || {
    config_key: "school_subscription_default",
    label: "Souscription annuelle par école",
    category: "school_subscription",
    pricing_type: "per_student",
    price_amount: 5000,
    price_currency: "XOF",
    status: "active",
    description: "Prix par élève utilisé pour préparer la facturation annuelle des écoles."
  };
}

function schoolSubscriptionAmount() {
  return Number(schoolSubscriptionConfig().price_amount || 5000);
}

function pricingLabel(item) {
  return modulePriceLabel({
    pricing_type: item.pricing_type,
    price_amount: item.price_amount,
    price_currency: item.price_currency || "XOF"
  });
}

function playPriceLabel(game) {
  if (!game.is_paid || game.pricing_type === "included") return "Inclus";
  return pricingLabel(game);
}

function renderPricingSettings() {
  renderSchoolPricing();
  renderStorePricing();
  renderPlayPricing();
}

function renderSchoolPricing() {
  const config = schoolSubscriptionConfig();
  renderTable("schoolPricingTable", [`
    <tr>
      <td><strong>${text(config.label)}</strong><small>${text(config.description)}</small></td>
      <td>${pricingLabel(config)}<small>${text(config.pricing_type)}</small></td>
      <td>${statusBadge(config.status || "active")}</td>
      <td>${rowBtn("pricing.school.edit", "school_subscription_default", "Modifier", "go")}</td>
    </tr>
  `], 4, "Aucune configuration de souscription.");
}

function renderStorePricing() {
  renderTable("storePricingTable", state.storeModules.map((module) => `
    <tr>
      <td><strong>${text(module.name)}</strong><small>${text(module.code)}</small></td>
      <td>${text(module.category)}</td>
      <td>${pricingLabel(module)}<small>${text(module.pricing_type)}</small></td>
      <td>${statusBadge(module.status)}</td>
      <td>${rowBtn("module.edit", module.id, "Configurer", "go")}</td>
    </tr>
  `), 5, "Aucun module WalahaStore.");
}

function renderPlayPricing() {
  renderTable("playPricingTable", state.games.map((game) => `
    <tr>
      <td><strong>${text(game.title)}</strong><small>${text(game.short_description)}</small></td>
      <td>${text(game.activity_type)}<small>${text(game.difficulty)}</small></td>
      <td>${playPriceLabel(game)}<small>${game.is_paid ? "Payant" : "Inclus"}</small></td>
      <td>${statusBadge(game.validation_status)}</td>
      <td>${rowBtn("game.price", game.id, "Modifier", "go")}</td>
    </tr>
  `), 5, "Aucune activité WalahaPlay.");
}

function renderLogs(list) {
  const rows = list ?? state.logsFiltered;
  renderTable("logsTable", rows.map((log) => `
    <tr>
      <td><span class="action-chip">${text(log.action_type)}</span></td>
      <td>${text(log.target_type)}<small>${text(log.target_id)}</small></td>
      <td><strong>${text(adminLabel(log.admin_id))}</strong></td>
      <td>${text(log.reason)}</td>
      <td>${new Date(log.created_at).toLocaleString("fr-FR")}</td>
      <td>${rowBtn("log.view", log.id, "Détail")}</td>
    </tr>
  `), 6, "Aucun audit log. Vérifiez la table admin_audit_logs et vos droits de lecture.");
}

function populateLogsAdminFilter() {
  const select = document.getElementById("logsAdminFilter");
  if (!select) return;
  const current = select.value;
  const adminIds = [...new Set(state.logs.map((log) => log.admin_id).filter(Boolean))];
  select.innerHTML = `<option value="all">Tous les admins</option>${adminIds.map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(adminLabel(id))}</option>`).join("")}`;
  if ([...select.options].some((opt) => opt.value === current)) select.value = current;
}

function renderStoreCommercialTable() {
  const rows = state.storeModules.map((module) => {
    const stats = moduleCommercialStats(module);
    return `
      <tr>
        <td><strong>${text(module.name)}</strong><small>${text(module.code)} · ${escapeHtml(modulePriceLabel(module))}</small></td>
        <td><strong>${stats.adoption}%</strong><small>${stats.active.length} école(s)</small></td>
        <td><strong>${xof(stats.revenue)}</strong></td>
        <td>${stats.active.length}</td>
        <td>${stats.pending.length}</td>
        <td>${stats.renewals.length}</td>
        <td>${stats.expired.length}</td>
        <td><small>${text(stats.priceRange)}</small></td>
        <td>${rowBtn("module.view", module.id, "Fiche")}</td>
      </tr>
    `;
  });
  renderTable("storeCommercialTable", rows, 9, "Aucun module WalahaStore. Créez un module ou appliquez la migration store.");
}

function renderDashboard() {
  renderDashMeta();
  renderDashShortcuts();
  renderOpsBrief();
  renderDashTasks();
  renderDashFinanceViz();
  renderDecisionGrid();
  renderDashActivity();
}

function renderDashActivity() {
  const activity = document.getElementById("recentActivity");
  if (!activity) return;

  if (!state.logs.length) {
    activity.innerHTML = `
      <div class="dash-task-empty">
        <strong>Aucune activité</strong>
        <small>Validations, paiements et activations Store seront tracés ici.</small>
      </div>
    `;
    return;
  }

  activity.innerHTML = state.logs.slice(0, 8).map((log) => `
    <button type="button" class="dash-timeline-item" data-act="log.view" data-id="${escapeHtml(log.id)}">
      <span class="dash-timeline-dot" aria-hidden="true"></span>
      <span class="dash-timeline-body">
        <strong>${text(log.action_type)}</strong>
        <span>${text(adminLabel(log.admin_id))} · ${formatRelativeTime(log.created_at)}</span>
      </span>
    </button>
  `).join("");
}

function overduePayments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return billingRows().filter((p) => p.due_date && p.status !== "paid" && new Date(p.due_date) < today);
}

function internalNotifications() {
  const urgentReports = state.reports.filter((r) => ["open", "in_review", "escalated"].includes(r.status) && ["high", "critical"].includes(r.priority));
  const assignedToMe = state.reports.filter((r) => ["open", "in_review", "escalated"].includes(r.status) && r.assigned_admin_id === state.authUserId);
  const schoolQueue = state.schoolRequests.filter((r) => ["pending_review", "verified"].includes(r.status));
  const suspendedSchools = state.schoolRequests.filter((r) => r.status === "suspended");
  const storeQueue = state.storeSubscriptions.filter((s) => ["requested", "approved"].includes(s.status));
  const customQueue = state.storeCustom.filter((c) => ["open", "in_review"].includes(c.status));
  const overdue = overduePayments();
  const suspicious = state.userModeration.filter((m) => ["suspended", "flagged", "under_review"].includes(m.status));
  const renewals = state.storeSubscriptions.filter((s) => s.status === "active" && ["expired", "soon"].includes(expiryState(s.expires_at)));

  return [
    ...assignedToMe.slice(0, 3).map((r) => ({ severity: "warning", route: "reports", title: "Signalement assigné", body: `${r.reason || "cas"} · vous`, act: "report.view", id: r.id })),
    ...urgentReports.map((r) => ({ severity: "danger", route: "reports", title: "Signalement urgent", body: `${r.priority || "priorite"} · ${r.reason || "cas ouvert"}`, act: "report.view", id: r.id })),
    ...schoolQueue.slice(0, 4).map((s) => ({ severity: "info", route: "schools", title: "École à valider", body: `${s.name || "Demande école"} · ${s.city || "-"}`, act: "school.view", id: s.id })),
    ...suspendedSchools.slice(0, 2).map((s) => ({ severity: "danger", route: "schools", title: "École suspendue", body: `${s.name || "Demande"} · ${s.status}`, act: "school.view", id: s.id })),
    ...state.tutorRequests.filter((r) => ["pending_review", "on_hold"].includes(r.status)).slice(0, 4).map((r) => ({
      severity: r.status === "on_hold" ? "warning" : "info",
      route: "tutors",
      title: "Demande répétiteur",
      body: `${r.full_name || "Parent"} · ${Array.isArray(r.subjects) ? r.subjects.slice(0, 2).join(", ") : "matières"}`,
      act: "tutorRequest.view",
      id: r.id
    })),
    ...storeQueue.slice(0, 4).map((s) => ({ severity: "warning", route: "store", title: "Activation Store", body: `${storeModuleById(s.module_id)?.name || "Module"} · ${s.status}`, act: "store.view", id: s.id })),
    ...customQueue.slice(0, 3).map((c) => ({ severity: "warning", route: "store", title: "Module sur devis", body: `${c.title || "Demande"} · ${c.status}`, act: "store.customView", id: c.id })),
    ...overdue.slice(0, 4).map((p) => ({ severity: "danger", route: "payments", title: "Paiement en retard", body: `${p.school_name} · ${xof(billingNet(p))}`, act: "payment.view", id: p.id })),
    ...renewals.slice(0, 4).map((s) => ({ severity: "warning", route: "store", title: "Renouvellement Store", body: `${storeModuleById(s.module_id)?.name || "Module"} · ${dateLabel(s.expires_at)}`, act: "store.history", id: s.id })),
    ...suspicious.slice(0, 3).map((m) => ({ severity: "danger", route: "users", title: "Compte à surveiller", body: `${m.status} · ${m.reason || m.user_id}`, act: "user.view", id: m.user_id }))
  ].slice(0, 12);
}

function renderNotifications() {
  const target = document.getElementById("notificationsList");
  if (!target) return;
  const items = internalNotifications();
  target.innerHTML = items.length ? items.map((item) => `
    <button type="button" class="notification-item ${item.severity}" data-route="${item.route}" ${item.act ? `data-act="${item.act}" data-id="${escapeHtml(item.id)}"` : ""}>
      <span></span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.body)}</small>
    </button>
  `).join("") : `<div class="notification-empty"><strong>Aucune alerte critique</strong><small>Les files WAC sont propres pour le moment.</small></div>`;

  const badge = document.getElementById("notifBellBadge");
  if (badge) {
    badge.textContent = String(items.length);
    badge.classList.toggle("is-zero", items.length === 0);
  }
}

function toggleNotificationsDropdown(forceOpen) {
  const dropdown = document.getElementById("notificationsDropdown");
  const button = document.getElementById("notifBellButton");
  if (!dropdown || !button) return;
  const open = typeof forceOpen === "boolean" ? forceOpen : dropdown.classList.contains("is-hidden");
  dropdown.classList.toggle("is-hidden", !open);
  button.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) renderNotifications();
}

function renderDecisionGrid() {
  const target = document.getElementById("decisionGrid");
  if (!target) return;
  const rows = billingRows();
  const due = rows.filter((p) => p.status !== "paid").reduce((sum, p) => sum + billingNet(p), 0);
  const paid = rows.filter((p) => p.status === "paid").reduce((sum, p) => sum + billingNet(p), 0);
  const storeRevenue = state.storeSubscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + subscriptionValue(s), 0);
  const auditToday = state.logs.filter((l) => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const suspiciousCount = state.userModeration.filter((m) => ["suspended", "flagged", "under_review"].includes(m.status)).length;
  const cards = [
    ["À encaisser", xof(due), `${overduePayments().length} retard(s)`, "payments"],
    ["Encaissé", xof(paid), "Factures payées", "payments"],
    ["Store actif", xof(storeRevenue), `${state.storeSubscriptions.filter((s) => s.status === "active").length} modules`, "store"],
    ["Comptes surveillés", suspiciousCount.toLocaleString("fr-FR"), "modération", "users"],
    ["Audit aujourd'hui", auditToday.toLocaleString("fr-FR"), "actions tracées", "logs"]
  ];
  target.innerHTML = cards.map(([label, value, hint, route]) => `
    <button type="button" class="dash-finance-item" data-route="${route}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
      <em aria-hidden="true">›</em>
    </button>
  `).join("");
}

function renderOpsBrief() {
  const copy = document.getElementById("opsBriefCopy");
  if (!copy) return;

  const pendingReports = state.reports.filter((report) => ["open", "in_review", "escalated"].includes(report.status)).length;
  const assignedReports = state.reports.filter((report) => ["open", "in_review", "escalated"].includes(report.status) && report.assigned_admin_id === state.authUserId).length;
  const pendingSchools = state.schoolRequests.filter((r) => ["pending_review", "verified"].includes(r.status)).length;
  const suspendedSchools = state.schoolRequests.filter((r) => r.status === "suspended").length;
  const pendingStore = state.storeSubscriptions.filter((s) => ["requested", "approved"].includes(s.status)).length;
  const overdue = overduePayments().length;
  const tasks = internalNotifications().length;

  const parts = [];
  if (pendingSchools) parts.push(`${pendingSchools} école${pendingSchools > 1 ? "s" : ""}`);
  const pendingTutors = state.tutorRequests.filter((r) => ["pending_review", "on_hold"].includes(r.status)).length;
  if (pendingTutors) parts.push(`${pendingTutors} demande${pendingTutors > 1 ? "s" : ""} répétiteur`);
  if (assignedReports) parts.push(`${assignedReports} signalement${assignedReports > 1 ? "s" : ""} assigné${assignedReports > 1 ? "s" : ""}`);
  if (pendingReports) parts.push(`${pendingReports} signalement${pendingReports > 1 ? "s" : ""}`);
  if (suspendedSchools) parts.push(`${suspendedSchools} école${suspendedSchools > 1 ? "s" : ""} suspendue${suspendedSchools > 1 ? "s" : ""}`);
  if (pendingStore) parts.push(`${pendingStore} activation${pendingStore > 1 ? "s" : ""} Store`);
  if (overdue) parts.push(`${overdue} paiement${overdue > 1 ? "s" : ""} en retard`);

  if (parts.length) {
    copy.textContent = `${tasks} action${tasks > 1 ? "s" : ""} prioritaire${tasks > 1 ? "s" : ""} · ${parts.join(" · ")}`;
  } else {
    copy.textContent = "Plateforme stable — aucune urgence détectée.";
  }
}

function renderRoles() {
  const target = document.getElementById("rolesList");
  if (!target) return;
  target.innerHTML = roles.map(([role, description]) => `
    <div class="role-item">
      <div>
        <strong>${role}</strong>
        <span>${description}</span>
        <small class="role-cap">${escapeHtml(ROLE_CAPABILITIES[role] || "")}</small>
      </div>
      ${statusBadge(state.admin?.role === role ? "active" : "available")}
    </div>
  `).join("");
}

function memberUser(member) {
  return state.users.find((user) => user.id === member.user_id);
}

function renderMembers() {
  const target = document.getElementById("membersTable");
  if (!target) return;

  const isSuper = state.admin?.role === "super_admin";
  const addButton = document.getElementById("addMemberButton");
  if (addButton) addButton.classList.toggle("is-hidden", !isSuper);

  renderTable("membersTable", state.members.map((member) => {
    const user = memberUser(member);
    const self = member.user_id === state.authUserId;
    const canManage = isSuper && !self;
    const actions = canManage
      ? rowBtns([
          rowBtn("member.role", member.id, "Rôle"),
          member.status === "active"
            ? rowBtn("member.revoke", member.id, "Révoquer", "danger")
            : rowBtn("member.reactivate", member.id, "Réactiver", "go")
        ])
      : `<small>${self ? "Vous" : "Lecture seule"}</small>`;
    return `
      <tr>
        <td><strong>${text(user?.display_name, "Compte Walaha")}</strong><small>${text(user?.email, member.user_id)}</small></td>
        <td>${text(member.role)}</td>
        <td>${statusBadge(member.status)}</td>
        <td>${new Date(member.created_at).toLocaleDateString("fr-FR")}</td>
        <td>${actions}</td>
      </tr>
    `;
  }), 5, "Aucun membre lisible. Verifiez la policy admin_members_select_admin.");
}

function modulePriceLabel(module) {
  const amount = module.price_amount != null ? Number(module.price_amount).toLocaleString("fr-FR") : null;
  switch (module.pricing_type) {
    case "included": return "Inclus";
    case "quote": return "Sur devis";
    case "annual": return amount ? `${amount} FCFA / an` : "Annuel";
    case "monthly": return amount ? `${amount} FCFA / mois` : "Mensuel";
    case "per_student": return amount ? `${amount} FCFA / élève` : "Par élève";
    case "per_school": return amount ? `${amount} FCFA / école` : "Par école";
    case "one_time": return amount ? `${amount} FCFA (unique)` : "Paiement unique";
    default: return amount ? `${amount} FCFA` : "-";
  }
}

function storeModuleById(id) {
  return state.storeModules.find((m) => m.id === id);
}

// Durée d'abonnement selon la tarification (null = pas d'expiration).
function computeModuleExpiry(pricingType, fromDate = new Date()) {
  const d = new Date(fromDate);
  if (pricingType === "monthly") { d.setMonth(d.getMonth() + 1); return d.toISOString(); }
  if (["annual", "per_student", "per_school"].includes(pricingType)) { d.setFullYear(d.getFullYear() + 1); return d.toISOString(); }
  return null; // one_time, included, quote
}

// "expired" / "soon" (<= 30 j) / "ok" / null
function expiryState(expiresAt) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "ok";
}

function storeActiveSubscriptionsForModule(moduleId) {
  return state.storeSubscriptions.filter((s) => s.module_id === moduleId && s.status === "active").length;
}

function storeModuleBusinessDetails(module) {
  const stats = moduleCommercialStats(module);
  const clients = stats.active
    .map((s) => state.schools.find((school) => school.id === s.school_id)?.name || s.school_id)
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
  return [
    ["Module", module.name],
    ["Code", module.code],
    ["Catégorie", module.category],
    ["Tarif catalogue", modulePriceLabel(module)],
    ["Taux d'adoption", `${stats.adoption}% (${stats.active.length}/${state.schools.length || 0} écoles)`],
    ["Revenu actif estimé", xof(stats.revenue)],
    ["Prix négocié moyen", stats.avgPrice == null ? "-" : xof(stats.avgPrice)],
    ["Fourchette prix négociés", stats.priceRange],
    ["Écoles clientes", clients || "-"],
    ["Demandes en attente", stats.pending.length],
    ["À renouveler (≤30j)", stats.renewals.length],
    ["Expirés", stats.expired.length],
    ["Demandes totales", stats.subs.length],
    ["Statut catalogue", module.status],
    ["Objectif", module.objective || "-"]
  ];
}

function moneyLabel(value, currency = "XOF") {
  if (value === null || value === undefined || value === "") return "-";
  const suffix = currency === "XOF" ? "FCFA" : currency;
  return `${Number(value).toLocaleString("fr-FR")} ${suffix}`;
}

function dateLabel(value, withTime = false) {
  if (!value) return "-";
  return withTime ? new Date(value).toLocaleString("fr-FR") : new Date(value).toLocaleDateString("fr-FR");
}

function storePriceHistoryFor(subscriptionId) {
  return state.storePriceHistory
    .filter((h) => h.subscription_id === subscriptionId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function storePriceHistoryRows(subscriptionId) {
  const rows = storePriceHistoryFor(subscriptionId);
  if (!rows.length) {
    return [["Historique", "Aucun changement historisé. Appliquez la migration 20250625000800_store_subscription_price_history.sql pour activer le suivi."]];
  }
  return rows.slice(0, 12).map((h) => {
    const price = `${moneyLabel(h.old_price_agreed, h.price_currency)} → ${moneyLabel(h.new_price_agreed, h.price_currency)}`;
    const expiry = `${dateLabel(h.old_expires_at)} → ${dateLabel(h.new_expires_at)}`;
    return [
      `${dateLabel(h.created_at, true)} · ${h.change_type}`,
      `${price} · statut ${text(h.old_status)} → ${text(h.new_status)} · échéance ${expiry}`
    ];
  });
}

const STORE_PERIODS = {
  day: { label: "aujourd'hui", days: 1, buckets: 8 },
  week: { label: "7 derniers jours", days: 7, buckets: 7 },
  month: { label: "30 derniers jours", days: 30, buckets: 10 },
  quarter: { label: "trimestre", days: 90, buckets: 12 },
  semester: { label: "semestre", days: 182, buckets: 13 },
  year: { label: "12 derniers mois", days: 365, buckets: 12 }
};

function selectedStorePeriod() {
  return STORE_PERIODS[state.storeStatsPeriod] || STORE_PERIODS.month;
}

function storePeriodStart() {
  const period = selectedStorePeriod();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Math.max(0, period.days - 1));
  return start;
}

function eventDate(item, fields = ["activated_at", "created_at"]) {
  for (const field of fields) {
    if (item?.[field]) {
      const date = new Date(item[field]);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function isInStorePeriod(item, fields) {
  const date = eventDate(item, fields);
  return date ? date >= storePeriodStart() : false;
}

function subscriptionValue(sub) {
  const module = storeModuleById(sub.module_id);
  const value = sub.price_agreed != null ? Number(sub.price_agreed) : Number(module?.price_amount || 0);
  return Number.isFinite(value) ? value : 0;
}

function storePeriodSubscriptions() {
  return state.storeSubscriptions.filter((sub) => isInStorePeriod(sub, ["activated_at", "created_at"]));
}

function storePeriodCustomRequests() {
  return state.storeCustom.filter((req) => isInStorePeriod(req, ["created_at"]));
}

function storePeriodHistory() {
  return state.storePriceHistory.filter((item) => isInStorePeriod(item, ["created_at"]));
}

function bucketLabel(date, periodKey) {
  if (periodKey === "year") {
    return date.toLocaleDateString("fr-FR", { month: "short" });
  }
  if (periodKey === "day") {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit" });
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function buildStoreBuckets() {
  const period = selectedStorePeriod();
  const start = storePeriodStart();
  const now = new Date();
  const bucketCount = period.buckets;
  const span = Math.max(1, now - start);
  const bucketMs = Math.max(3600000, span / bucketCount);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(start.getTime() + bucketMs * index);
    return { label: bucketLabel(date, state.storeStatsPeriod), requests: 0, activations: 0 };
  });
  const add = (date, key) => {
    if (!date || date < start) return;
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((date - start) / bucketMs)));
    buckets[index][key] += 1;
  };
  state.storeSubscriptions.forEach((sub) => {
    add(eventDate(sub, ["created_at"]), "requests");
    if (sub.status === "active") add(eventDate(sub, ["activated_at", "created_at"]), "activations");
  });
  state.storeCustom.forEach((req) => {
    add(eventDate(req, ["created_at"]), "requests");
  });
  return buckets;
}

function groupSum(items, keyFn, valueFn = () => 1) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc.set(key, (acc.get(key) || 0) + valueFn(item));
    return acc;
  }, new Map());
}

function renderMiniBars(targetId, rows, options = {}) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = `<small>Aucune donnee sur cette periode.</small>`;
    return;
  }
  const max = Math.max(1, ...rows.map((row) => row.value));
  target.innerHTML = rows.map((row) => `
    <div class="store-mini-row">
      <span>${escapeHtml(row.label)}</span>
      <div class="store-mini-track"><i style="width:${Math.max(4, (row.value / max) * 100)}%"></i></div>
      <strong>${options.money ? xof(row.value) : Number(row.value || 0).toLocaleString("fr-FR")}</strong>
    </div>
  `).join("");
}

function renderStoreStatsCharts() {
  const subtitle = document.getElementById("storeStatsSubtitle");
  const period = selectedStorePeriod();
  if (subtitle) {
    subtitle.textContent = `Indicateurs reels calcules sur ${period.label}.`;
  }

  const periodSubs = storePeriodSubscriptions();
  const periodCustom = storePeriodCustomRequests();
  const periodHistory = storePeriodHistory();
  const totalTrend = document.getElementById("storeTrendTotal");
  const trendTotal = periodSubs.length + periodCustom.length;
  if (totalTrend) totalTrend.textContent = trendTotal.toLocaleString("fr-FR");

  const buckets = buildStoreBuckets();
  const trendTarget = document.getElementById("storeTrendChart");
  if (trendTarget) {
    const max = Math.max(1, ...buckets.map((bucket) => bucket.requests + bucket.activations));
    trendTarget.innerHTML = buckets.map((bucket) => `
      <div class="store-bar" title="${escapeHtml(bucket.label)}">
        <span style="height:${Math.max(5, (bucket.requests / max) * 100)}%"></span>
        <i style="height:${Math.max(5, (bucket.activations / max) * 100)}%"></i>
        <small>${escapeHtml(bucket.label)}</small>
      </div>
    `).join("");
  }

  const activeInPeriod = periodSubs.filter((sub) => sub.status === "active");
  const revenueByModule = Array.from(groupSum(activeInPeriod, (sub) => {
    const module = storeModuleById(sub.module_id);
    return module?.name || sub.module_id || "Module";
  }, subscriptionValue)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  renderMiniBars("storeRevenueChart", revenueByModule, { money: true });

  const statusRows = Array.from(groupSum(periodSubs.concat(periodCustom), (item) => item.status || "unknown"))
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }));
  renderMiniBars("storeStatusChart", statusRows);

  const moduleRows = Array.from(groupSum(periodSubs, (sub) => {
    const module = storeModuleById(sub.module_id);
    return module?.name || sub.module_id || "Module";
  })).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const schoolRows = Array.from(groupSum(periodSubs, (sub) => {
    const school = state.schools.find((s) => s.id === sub.school_id);
    return school?.name || sub.school_id || "Ecole";
  })).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const historyRevenue = periodHistory.reduce((sum, item) => sum + Math.max(0, Number(item.new_price_agreed || 0) - Number(item.old_price_agreed || 0)), 0);
  const topTarget = document.getElementById("storeTopList");
  if (topTarget) {
    topTarget.innerHTML = `
      <div class="store-top-grid">
        <div>
          <strong>Modules les plus demandes</strong>
          ${moduleRows.length ? moduleRows.map(([label, value]) => `<span>${escapeHtml(label)} <b>${value}</b></span>`).join("") : "<small>Aucun module sur la periode.</small>"}
        </div>
        <div>
          <strong>Ecoles les plus actives</strong>
          ${schoolRows.length ? schoolRows.map(([label, value]) => `<span>${escapeHtml(label)} <b>${value}</b></span>`).join("") : "<small>Aucune ecole sur la periode.</small>"}
        </div>
        <div>
          <strong>Variation prix</strong>
          <span>Historique <b>${periodHistory.length.toLocaleString("fr-FR")}</b></span>
          <span>Delta estime <b>${xof(historyRevenue)}</b></span>
        </div>
      </div>
    `;
  }
}

function renderStore() {
  const grid = document.getElementById("storeModulesGrid");
  if (grid) {
    grid.innerHTML = state.storeModules.length ? state.storeModules.map((m) => `
      <article class="game-card">
        <h2>${text(m.name)}</h2>
        <p>${text(m.description)}</p>
        <div class="game-meta">
          <span>${text(m.category)}</span>
          <span>${escapeHtml(modulePriceLabel(m))}</span>
          ${statusBadge(m.status)}
        </div>
        <div class="row-actions">
          ${rowBtn("module.view", m.id, "Détail")}
          ${m.status === "disabled" ? rowBtn("module.enable", m.id, "Réactiver", "go") : rowBtn("module.disable", m.id, "Désactiver", "danger")}
        </div>
      </article>
    `).join("") : `<article class="game-card"><h2>Aucun module</h2><p>Créez un module ou appliquez la migration store_modules.</p></article>`;
  }
  renderStoreMetrics();
  renderStoreCommercialTable();
  renderStoreStatsCharts();
  renderStoreRequests();
  renderStorePriceHistory();
  renderStoreCustom();
}

function renderStoreMetrics() {
  const target = document.getElementById("storeMetrics");
  if (!target) return;
  const active = state.storeSubscriptions.filter((s) => s.status === "active");
  const periodSubs = storePeriodSubscriptions();
  const periodCustom = storePeriodCustomRequests();
  const pending = state.storeSubscriptions.filter((s) => ["requested", "approved"].includes(s.status));
  const revenue = active.reduce((sum, s) => {
    return sum + subscriptionValue(s);
  }, 0);
  const periodRevenue = periodSubs.filter((s) => s.status === "active").reduce((sum, s) => sum + subscriptionValue(s), 0);
  const toRenew = active.filter((s) => ["expired", "soon"].includes(expiryState(s.expires_at))).length;
  const cards = [
    ["Modules actifs", active.length.toLocaleString("fr-FR"), `${periodSubs.length.toLocaleString("fr-FR")} demande(s) periode`],
    ["Revenu actif", xof(revenue), `${xof(periodRevenue)} sur periode`],
    ["Demandes ouvertes", (pending.length + state.storeCustom.filter((c) => ["open", "in_review"].includes(c.status)).length).toLocaleString("fr-FR"), `${periodCustom.length.toLocaleString("fr-FR")} devis periode`],
    ["À renouveler", toRenew.toLocaleString("fr-FR"), "Expirés ou ≤ 30 jours"]
  ];
  target.innerHTML = cards.map(([label, value, hint]) => `
    <article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>
  `).join("");
}

function storeCustomActions(req) {
  if (["closed", "rejected"].includes(req.status)) {
    return rowBtn("store.customView", req.id, "Voir");
  }
  return rowBtns([
    req.status === "open" ? rowBtn("store.customReview", req.id, "Étudier") : "",
    rowBtn("store.customQuote", req.id, "Devis envoyé", "go"),
    rowBtn("store.customClose", req.id, "Clore"),
    rowBtn("store.customReject", req.id, "Rejeter", "danger")
  ]);
}

function renderStoreCustom(list = state.storeCustom) {
  renderTable("storeCustomTable", list.map((req) => {
    const school = state.schools.find((s) => s.id === req.school_id);
    return `
      <tr>
        <td><strong>${text(req.title)}</strong><small>${text(req.description)}</small></td>
        <td>${text(school?.name, req.school_id)}</td>
        <td>${statusBadge(req.status)}</td>
        <td>${storeCustomActions(req)}</td>
      </tr>
    `;
  }), 4, "Aucune demande de module personnalisé.");
}

function storeRequestActions(sub) {
  if (sub.status === "requested") {
    return rowBtns([rowBtn("store.history", sub.id, "Historique"), rowBtn("store.approve", sub.id, "Approuver", "go"), rowBtn("store.reject", sub.id, "Refuser", "danger")]);
  }
  if (sub.status === "approved") {
    return rowBtns([rowBtn("store.history", sub.id, "Historique"), rowBtn("store.activate", sub.id, "Activer", "go"), rowBtn("store.reject", sub.id, "Refuser", "danger")]);
  }
  if (sub.status === "active") {
    return rowBtns([rowBtn("store.view", sub.id, "Voir"), rowBtn("store.history", sub.id, "Historique"), rowBtn("store.renew", sub.id, "Renouveler", "go"), rowBtn("store.suspend", sub.id, "Suspendre", "danger")]);
  }
  return rowBtns([rowBtn("store.view", sub.id, "Voir"), rowBtn("store.history", sub.id, "Historique")]);
}

function expiryCell(sub) {
  if (sub.status !== "active" || !sub.expires_at) return "";
  const st = expiryState(sub.expires_at);
  const date = new Date(sub.expires_at).toLocaleDateString("fr-FR");
  const label = st === "expired" ? `Expiré le ${date}` : `Expire le ${date}`;
  const cls = st === "expired" ? "expiry-bad" : st === "soon" ? "expiry-soon" : "expiry-ok";
  return `<small class="${cls}">${label}</small>`;
}

function renderStoreRequests(list = state.storeSubscriptions) {
  renderTable("storeRequestsTable", list.map((sub) => {
    const module = storeModuleById(sub.module_id);
    const school = state.schools.find((s) => s.id === sub.school_id);
    const price = sub.price_agreed != null
      ? `${Number(sub.price_agreed).toLocaleString("fr-FR")} FCFA`
      : (module ? escapeHtml(modulePriceLabel(module)) : "-");
    return `
      <tr>
        <td><strong>${text(module?.name, sub.module_id)}</strong></td>
        <td>${text(school?.name, sub.school_id)}</td>
        <td>${text(sub.requested_by)}</td>
        <td>${price}</td>
        <td>${statusBadge(sub.status)}${expiryCell(sub)}</td>
        <td>${storeRequestActions(sub)}</td>
      </tr>
    `;
  }), 6, "Aucune demande d'activation.");
}

function renderStorePriceHistory(list = state.storePriceHistory.slice(0, 50)) {
  renderTable("storePriceHistoryTable", list.map((h) => {
    const module = storeModuleById(h.module_id);
    const school = state.schools.find((s) => s.id === h.school_id);
    return `
      <tr>
        <td>${dateLabel(h.created_at, true)}</td>
        <td><strong>${text(module?.name, h.module_id)}</strong><small>${text(school?.name, h.school_id)} · ${text(h.change_type).replaceAll("_", " ")}</small></td>
        <td><strong>${moneyLabel(h.new_price_agreed, h.price_currency)}</strong><small>Avant : ${moneyLabel(h.old_price_agreed, h.price_currency)}</small></td>
        <td><strong>${dateLabel(h.new_expires_at)}</strong><small>Avant : ${dateLabel(h.old_expires_at)}</small></td>
      </tr>
    `;
  }), 4, "Aucun historique de prix. Appliquez la migration 20250625000800_store_subscription_price_history.sql puis validez/renouvelez une demande.");
}

function renderAll() {
  renderMetrics();
  renderDashboard();
  renderNotifications();
  renderSchools();
  renderUsers();
  renderTutorRequests();
  renderTutors();
  renderGames();
  renderReports();
  renderPayments();
  renderLogs();
  renderRoles();
  renderMembers();
  renderStore();
  renderPricingSettings();
  renderGlobalSearch();
}

function setRoute(route) {
  if (!canRoute(route)) {
    route = "dashboard";
  }
  const view = document.getElementById(`view-${route}`);
  if (!view) return;

  views.forEach((item) => {
    const active = item === view;
    item.classList.toggle("is-active", active);
    item.toggleAttribute("hidden", !active);
  });
  routeLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.route === route));
  document.querySelector(".workspace")?.classList.toggle("is-dashboard", route === "dashboard");
  pageTitle.textContent = view.dataset.title || "Walaha Admin Center";
  window.location.hash = route;
  sidebar.classList.remove("is-open");
}

function applyRolePermissions() {
  routeLinks.forEach((link) => {
    const allowed = canRoute(link.dataset.route);
    link.classList.toggle("is-hidden", !allowed);
  });
  const isSuper = state.admin?.role === "super_admin";
  const isFinance = state.admin?.role === "finance";
  document.getElementById("addMemberButton")?.classList.toggle("is-hidden", !isSuper);
  document.querySelector('[data-settings-tab="members"]')?.classList.toggle("is-hidden", !isSuper && !["walaha_admin"].includes(state.admin?.role || ""));
  document.querySelector('[data-settings-tab="pricing"]')?.classList.toggle("is-hidden", !(isSuper || isFinance || state.admin?.role === "content_manager" || state.admin?.role === "walaha_admin"));
  if (isFinance) {
    document.querySelector('[data-settings-tab="pricing"]')?.click();
  }
}

function applyFilter(moduleName, sourceGetter, renderer) {
  const search = document.querySelector(`[data-search="${moduleName}"]`);
  const filter = document.querySelector(`[data-filter="${moduleName}"]`);

  const run = () => {
    const q = (search?.value || "").trim().toLowerCase();
    const status = filter?.value || "all";
    const source = sourceGetter();
    const list = source.filter((item) => {
      const matchesText = JSON.stringify(item).toLowerCase().includes(q);
      const itemStatus = item.status || item.validation_status || "active";
      const matchesStatus = status === "all" || itemStatus === status;
      return matchesText && matchesStatus;
    });
    renderer(list);
  };

  search?.addEventListener("input", run);
  filter?.addEventListener("change", run);
}

function globalSearchItems() {
  const schoolItems = schoolsList().map((s) => ({
    type: "École",
    title: s.name,
    meta: [s.code, s.city, s.status].filter(Boolean).join(" · "),
    route: "schools",
    act: s.kind === "school" ? "school.viewOfficial" : "school.view",
    id: s.id,
    raw: s
  }));
  const users = state.users.map((u) => ({
    type: "Utilisateur",
    title: u.display_name || u.email,
    meta: [u.email, moderationStatusFor(u.id)].filter(Boolean).join(" · "),
    route: "users",
    act: "user.view",
    id: u.id,
    raw: u
  }));
  const parents = state.users
    .filter((u) => state.parentLinks.some((link) => link.parent_user_id === u.id))
    .map((u) => ({
      type: "Parent",
      title: u.display_name || u.email,
      meta: [u.email, "compte parent"].join(" · "),
      route: "users",
      act: "user.view",
      id: u.id,
      raw: u
    }));
  const students = state.students.map((s) => {
    const school = state.schools.find((sc) => sc.id === s.origin_canonical_school_id);
    return {
      type: "Élève",
      title: studentDisplayName(s),
      meta: [s.public_code, school?.name].filter(Boolean).join(" · "),
      route: "schools",
      act: "student.view",
      id: s.id,
      raw: s
    };
  });
  const tutors = state.tutors.map((t) => ({
    type: "Répétiteur",
    title: t.full_name,
    meta: [t.public_code, t.email].filter(Boolean).join(" · "),
    route: "tutors",
    act: "tutor.view",
    id: t.id,
    raw: t
  }));
  const tutorReqs = state.tutorRequests.map((r) => ({
    type: "Demande REP-",
    title: r.full_name,
    meta: [Array.isArray(r.subjects) ? r.subjects.join(", ") : "", r.status, r.email].filter(Boolean).join(" · "),
    route: "tutors",
    act: "tutorRequest.view",
    id: r.id,
    raw: r
  }));
  const store = state.storeModules.map((m) => ({
    type: "Module",
    title: m.name,
    meta: [m.code, m.category, m.status].filter(Boolean).join(" · "),
    route: "store",
    act: "module.view",
    id: m.id,
    raw: m
  }));
  const storeSubs = state.storeSubscriptions.map((sub) => {
    const module = storeModuleById(sub.module_id);
    const school = state.schools.find((s) => s.id === sub.school_id);
    return {
      type: "Activation Store",
      title: `${module?.name || "Module"} · ${school?.name || "École"}`,
      meta: [sub.status, sub.price_agreed != null ? xof(sub.price_agreed) : ""].filter(Boolean).join(" · "),
      route: "store",
      act: "store.view",
      id: sub.id,
      raw: sub
    };
  });
  const payments = billingRows().map((p) => ({
    type: "Facturation",
    title: p.school_name,
    meta: [p.academic_year, p.proforma_number || defaultProformaNumber(p), p.invoice_number, p.status].filter(Boolean).join(" · "),
    route: "payments",
    act: p.isDraftBilling ? "payment.create" : "payment.view",
    id: p.id,
    raw: p
  }));
  const reports = state.reports.map((r) => ({
    type: "Signalement",
    title: r.reason || r.target_type,
    meta: [r.target_type, r.priority, r.status].filter(Boolean).join(" · "),
    route: "reports",
    act: "report.view",
    id: r.id,
    raw: r
  }));
  const logs = state.logs.slice(0, 100).map((log) => ({
    type: "Audit",
    title: log.action_type,
    meta: [log.target_type, adminLabel(log.admin_id)].filter(Boolean).join(" · "),
    route: "logs",
    act: "log.view",
    id: log.id,
    raw: log
  }));
  return [...schoolItems, ...users, ...parents, ...students, ...tutors, ...tutorReqs, ...store, ...storeSubs, ...payments, ...reports, ...logs];
}

function renderGlobalSearch() {
  const input = document.getElementById("globalSearch");
  const target = document.getElementById("globalResults");
  if (!input || !target) return;
  const q = input.value.trim().toLowerCase();
  if (q.length < 2) {
    target.classList.add("is-hidden");
    target.innerHTML = "";
    return;
  }
  const rows = globalSearchItems().filter((item) => JSON.stringify(item).toLowerCase().includes(q)).slice(0, 12);
  target.innerHTML = rows.length ? rows.map((item) => `
    <button type="button" data-route="${item.route}" data-act="${item.act}" data-id="${escapeHtml(item.id)}">
      <span>${escapeHtml(item.type)}</span>
      <strong>${text(item.title)}</strong>
      <small>${text(item.meta)}</small>
    </button>
  `).join("") : `<div class="global-empty"><strong>Aucun résultat</strong><small>Essayez un code ECO-, ELV-, email, numéro de facture ou nom de module.</small></div>`;
  target.classList.remove("is-hidden");
}

async function enterAdmin(user) {
  try {
    state.authUserId = user.id;
    state.admin = await getAdminMembership(user.id);
    if (!state.admin) {
      await supabaseClient.auth.signOut();
      showLogin();
      setLoginStatus("Acces refuse : ce compte n'est pas actif dans admin_members.");
      return;
    }

    showAdmin();
    setRoute((window.location.hash || "#dashboard").replace("#", ""));
    await loadData();
  } catch (error) {
    await supabaseClient.auth.signOut();
    showLogin();
    setLoginStatus(error.message);
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireSupabase()) return;

  setLoginStatus("Connexion en cours...", false);
  const form = new FormData(loginForm);
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setLoginStatus(`Connexion refusee : ${error.message}`);
    return;
  }

  await enterAdmin(data.user);
});

forgotPasswordButton?.addEventListener("click", () => {
  openForgotModal();
});

forgotPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireSupabase()) return;

  const form = new FormData(forgotPasswordForm);
  const email = String(form.get("forgotEmail") || "").trim();
  if (!email) {
    setForgotStatus("Entrez votre email admin.");
    return;
  }

  setForgotStatus("Envoi du lien en cours...", false);
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, getPasswordResetOptions());

  if (error) {
    console.error("[WAC] reset password error", error);
    setForgotStatus(`Impossible d'envoyer le lien : ${formatSupabaseError(error)}`);
    return;
  }

  setForgotStatus("Lien envoye. Verifiez votre boite mail si ce compte existe.", false);
});

closeForgotModalButton?.addEventListener("click", closeForgotModal);
cancelForgotModalButton?.addEventListener("click", closeForgotModal);
forgotPasswordModal?.addEventListener("click", (event) => {
  if (event.target === forgotPasswordModal) closeForgotModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!forgotPasswordModal.classList.contains("is-hidden")) {
    closeForgotModal();
  }
  if (!actionModal.classList.contains("is-hidden")) {
    closeActionModal();
  }
});

resetPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireSupabase()) return;

  const form = new FormData(resetPasswordForm);
  const newPassword = String(form.get("newPassword") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    setResetStatus("Le mot de passe doit contenir au moins 8 caracteres.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setResetStatus("Les deux mots de passe ne correspondent pas.");
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

  if (error) {
    console.error("[WAC] update password error", error);
    setResetStatus(`Impossible de mettre a jour le mot de passe : ${formatSupabaseError(error)}`);
    return;
  }

  resetPasswordForm.reset();
  await supabaseClient.auth.signOut();
  showLoginForm();
  setLoginStatus("Mot de passe mis a jour. Connectez-vous avec votre nouveau mot de passe.", false);
});

backToLoginButton?.addEventListener("click", () => {
  showLoginForm();
});

logoutButton?.addEventListener("click", async () => {
  await supabaseClient?.auth.signOut();
  state.admin = null;
  showLogin();
});

menuButton?.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
});

document.getElementById("globalSearch")?.addEventListener("input", renderGlobalSearch);

document.getElementById("notifBellButton")?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleNotificationsDropdown();
});

document.getElementById("notificationsDropdown")?.addEventListener("click", (event) => {
  const btn = event.target.closest(".notification-item[data-route]");
  if (!btn) return;
  const route = btn.dataset.route;
  const act = btn.dataset.act;
  const id = btn.dataset.id;
  toggleNotificationsDropdown(false);
  if (route) setRoute(route);
  if (act && id) queueMicrotask(() => openActionModal(act, id));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".notif-center")) {
    toggleNotificationsDropdown(false);
  }
  const globalResults = document.getElementById("globalResults");
  const globalSearch = document.getElementById("globalSearch");
  if (globalResults && globalSearch && !event.target.closest(".global-search")) {
    globalResults.classList.add("is-hidden");
  }

  const exportButton = event.target.closest("[data-export]");
  if (exportButton) {
    const dataset = EXPORTS[exportButton.dataset.export]?.();
    if (dataset) exportCsv(dataset.name, dataset.rows);
    return;
  }

  const settingsTab = event.target.closest("[data-settings-tab]");
  if (settingsTab) {
    document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
      tab.classList.toggle("is-active", tab === settingsTab);
    });
    document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.settingsPanel === settingsTab.dataset.settingsTab);
    });
    return;
  }

  const priceTab = event.target.closest("[data-price-tab]");
  if (priceTab) {
    document.querySelectorAll("[data-price-tab]").forEach((tab) => {
      tab.classList.toggle("is-active", tab === priceTab);
    });
    document.querySelectorAll("[data-price-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.pricePanel === priceTab.dataset.priceTab);
    });
    return;
  }

  const storeTab = event.target.closest("[data-store-tab]");
  if (storeTab) {
    document.querySelectorAll("[data-store-tab]").forEach((tab) => {
      tab.classList.toggle("is-active", tab === storeTab);
    });
    document.querySelectorAll("[data-store-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.storePanel === storeTab.dataset.storeTab);
    });
    return;
  }

  const storePeriod = event.target.closest("[data-store-period]");
  if (storePeriod) {
    state.storeStatsPeriod = storePeriod.dataset.storePeriod || "month";
    document.querySelectorAll("[data-store-period]").forEach((button) => {
      button.classList.toggle("is-active", button === storePeriod);
    });
    renderStoreMetrics();
    renderStoreStatsCharts();
    return;
  }

  const actionButtonEl = event.target.closest("[data-act]");
  if (actionButtonEl) {
    if (actionButtonEl.dataset.route) {
      setRoute(actionButtonEl.dataset.route);
    }
    globalResults?.classList.add("is-hidden");
    openActionModal(actionButtonEl.dataset.act, actionButtonEl.dataset.id);
    return;
  }

  const routeButton = event.target.closest("[data-route]");
  if (routeButton && routeButton.dataset.route) {
    event.preventDefault();
    setRoute(routeButton.dataset.route);
  }
});

actionModalForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeAction) {
    closeActionModal();
    return;
  }
  if (activeAction.def.view) {
    closeActionModal();
    return;
  }

  const reason = String(actionModalReason.value || "").trim();
  if (activeAction.def.reasonRequired && !reason) {
    setActionStatus("Un motif / une note interne est obligatoire pour cette action.");
    return;
  }

  const { values, firstMissing } = collectFields();
  if (firstMissing) {
    setActionStatus(`Champ obligatoire manquant : ${firstMissing}`);
    return;
  }

  actionModalConfirm.disabled = true;
  setActionStatus("Action en cours...", false);
  try {
    await activeAction.def.run(activeAction.entity, reason, values);
    closeActionModal();
    await loadData();
  } catch (error) {
    console.error("[WAC] action error", error);
    setActionStatus(`Action refusée : ${formatSupabaseError(error)}`);
  } finally {
    actionModalConfirm.disabled = false;
  }
});

actionModalClose?.addEventListener("click", closeActionModal);
actionModalCancel?.addEventListener("click", closeActionModal);
actionModal?.addEventListener("click", (event) => {
  if (event.target === actionModal) closeActionModal();
});

window.addEventListener("hashchange", () => {
  const route = (window.location.hash || "#dashboard").replace("#", "");
  if (!adminShell.classList.contains("is-hidden")) setRoute(route);
});

function refreshLogsFilter() {
  const search = document.querySelector('[data-search="logs"]');
  const targetFilter = document.querySelector('[data-filter="logs"]');
  const actionFilter = document.querySelector('[data-filter-action="logs"]');
  const adminFilter = document.querySelector('[data-filter-admin="logs"]');
  const fromFilter = document.querySelector('[data-filter-from="logs"]');
  const toFilter = document.querySelector('[data-filter-to="logs"]');

  const q = (search?.value || "").trim().toLowerCase();
  const targetType = targetFilter?.value || "all";
  const actionPrefix = actionFilter?.value || "all";
  const adminId = adminFilter?.value || "all";
  const from = fromFilter?.value ? new Date(`${fromFilter.value}T00:00:00`) : null;
  const to = toFilter?.value ? new Date(`${toFilter.value}T23:59:59`) : null;

  const list = state.logs.filter((log) => {
    const enriched = { ...log, admin_name: adminLabel(log.admin_id) };
    const matchesText = !q || JSON.stringify(enriched).toLowerCase().includes(q);
    const matchesTarget = targetType === "all" || log.target_type === targetType;
    const matchesAction = actionPrefix === "all" || (log.action_type || "").startsWith(actionPrefix);
    const matchesAdmin = adminId === "all" || log.admin_id === adminId;
    const created = new Date(log.created_at);
    const matchesFrom = !from || created >= from;
    const matchesTo = !to || created <= to;
    return matchesText && matchesTarget && matchesAction && matchesAdmin && matchesFrom && matchesTo;
  });
  state.logsFiltered = list;
  renderLogs(list);
}

function applyLogsFilter() {
  const search = document.querySelector('[data-search="logs"]');
  const targetFilter = document.querySelector('[data-filter="logs"]');
  const actionFilter = document.querySelector('[data-filter-action="logs"]');
  const adminFilter = document.querySelector('[data-filter-admin="logs"]');
  const fromFilter = document.querySelector('[data-filter-from="logs"]');
  const toFilter = document.querySelector('[data-filter-to="logs"]');

  const run = () => refreshLogsFilter();

  [search, targetFilter, actionFilter, adminFilter, fromFilter, toFilter].forEach((el) => {
    el?.addEventListener("input", run);
    el?.addEventListener("change", run);
  });
  run();
}

applyFilter("schools", () => schoolsList(), renderSchools);
applyFilter("users", () => state.users, renderUsers);
applyFilter("tutorRequests", () => state.tutorRequests, renderTutorRequests);
applyFilter("payments", () => billingRows(), renderPayments);
applyLogsFilter();
applyFilter("store", () => state.storeSubscriptions, renderStoreRequests);
renderRoles();

(async function boot() {
  if (!requireSupabase()) return;

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showPasswordReset();
      return;
    }

    if (event === "SIGNED_IN" && session?.user && !adminShell.classList.contains("is-hidden")) {
      await enterAdmin(session.user);
    }
  });

  const { data } = await supabaseClient.auth.getSession();
  const recoveryHint = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
  if (recoveryHint) {
    showPasswordReset();
    return;
  }

  if (data.session?.user) {
    await enterAdmin(data.session.user);
  }
})();
