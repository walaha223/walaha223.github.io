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
  games: [],
  reports: [],
  payments: [],
  logs: [],
  members: [],
  userModeration: [],
  storeModules: [],
  storeSubscriptions: [],
  storeCustom: [],
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
  return `<span class="status ${safe}">${safe.replaceAll("_", " ")}</span>`;
}

function rowBtn(act, id, label, variant = "") {
  return `<button type="button" class="row-action ${variant}" data-act="${act}" data-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
}

function rowBtns(buttons) {
  return `<div class="row-actions">${buttons.filter(Boolean).join("")}</div>`;
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}"><small>${message}</small></td></tr>`;
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

function paymentAmount(students, unit = 5000) {
  return `${Number(students * unit).toLocaleString("fr-FR")} FCFA`;
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

const EXPORTS = {
  users: () => ({
    name: "walaha-utilisateurs.csv",
    rows: state.users.map((u) => ({ id: u.id, nom: u.display_name || "", email: u.email, langue: u.preferred_language || "", statut: moderationStatusFor(u.id), cree_le: u.created_at }))
  }),
  payments: () => ({
    name: "walaha-paiements.csv",
    rows: state.payments.map((p) => ({ ecole: p.school_name, annee: p.academic_year, eleves_factures: p.billed_students, montant_par_eleve_xof: p.amount_per_student_xof, statut: p.status }))
  }),
  reports: () => ({
    name: "walaha-signalements.csv",
    rows: state.reports.map((r) => ({ motif: r.reason, cible_type: r.target_type, cible_id: r.target_id, priorite: r.priority, statut: r.status }))
  }),
  logs: () => ({
    name: "walaha-audit.csv",
    rows: state.logs.map((l) => ({ action: l.action_type, cible_type: l.target_type, cible_id: l.target_id, admin_id: l.admin_id, motif: l.reason, date: l.created_at }))
  }),
  storeRequests: () => ({
    name: "walaha-store-activations.csv",
    rows: state.storeSubscriptions.map((s) => ({
      module: storeModuleById(s.module_id)?.name || s.module_id,
      ecole: state.schools.find((x) => x.id === s.school_id)?.name || s.school_id,
      statut: s.status,
      prix_convenu: s.price_agreed ?? "",
      note: s.note || "",
      decision: s.decision_note || ""
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
  "payment.confirm": {
    eyebrow: "Paiement", label: "Confirmer le paiement", confirmLabel: "Confirmer", reasonLabel: "Note interne (optionnel)",
    entity: (id) => state.payments.find((p) => p.id === id),
    description: (e) => `Confirmer le paiement de ${text(e.school_name)} pour ${text(e.academic_year)}.`,
    details: (e) => [["École", e.school_name], ["Année", e.academic_year], ["Élèves facturés", e.billed_students], ["Montant", paymentAmount(e.billed_students || 0, e.amount_per_student_xof || 5000)]],
    run: async (e, reason) => {
      const patch = { status: "paid", confirmed_by: state.authUserId, confirmed_at: new Date().toISOString(), internal_note: reason || null };
      await updateRow("school_digital_payments", e.id, patch);
      await recordAudit({ action_type: "PAYMENT_CONFIRMED", target_type: "school_digital_payment", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "payment.view": {
    eyebrow: "Paiement", label: "Détail du paiement", view: true,
    entity: (id) => state.payments.find((p) => p.id === id),
    details: (e) => [["École", e.school_name], ["Année", e.academic_year], ["Montant", paymentAmount(e.billed_students || 0, e.amount_per_student_xof || 5000)], ["Statut", e.status]]
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
    eyebrow: "Compte", label: "Détail de l'utilisateur", view: true,
    entity: (id) => state.users.find((u) => u.id === id),
    details: (e) => [["Nom", e.display_name || "Sans nom"], ["Email", e.email], ["Langue", e.preferred_language || "fr"], ["Créé le", new Date(e.created_at).toLocaleDateString("fr-FR")]]
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
    }
  },
  "school.view": {
    eyebrow: "Demande d'école", label: "Détail de la demande", view: true,
    entity: (id) => state.schoolRequests.find((s) => s.id === id),
    details: (e) => [["École", e.name], ["Code ECO-", e.public_code || "non attribué"], ["Type", e.school_type], ["Ville", e.city], ["Commune", e.commune], ["Contact", e.phone || e.email], ["Statut", e.status], ["Note", e.internal_note || "-"]]
  },
  "school.viewOfficial": {
    eyebrow: "École officielle", label: "Détail de l'école", view: true,
    entity: (id) => state.schools.find((s) => s.id === id),
    details: (e) => [["École", e.name], ["Code ECO-", e.public_code], ["Type", e.school_type], ["Ville", e.city], ["Créée le", new Date(e.created_at).toLocaleDateString("fr-FR")]]
  },
  "tutor.view": {
    eyebrow: "Répétiteur", label: "Détail du répétiteur", view: true,
    entity: (id) => state.tutors.find((t) => t.id === id),
    details: (e) => [["Nom", e.full_name], ["Code", e.public_code], ["Matières", Array.isArray(e.subjects) ? e.subjects.join(", ") : "-"], ["Téléphone", e.phone], ["Email", e.email]]
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
      { name: "objective", label: "Objectif pédagogique", type: "textarea", required: true }
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
      { name: "category", label: "Catégorie", type: "select", options: ["Pédagogie", "Communication", "Administration", "Finance", "Premium", "Pilotage", "Visibilité", "Services scolaires"], value: "Premium" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "objective", label: "Objectif", type: "textarea" },
      { name: "pricing_type", label: "Tarification", type: "select", options: [["annual", "Annuel"], ["monthly", "Mensuel"], ["per_student", "Par élève"], ["per_school", "Par école"], ["one_time", "Paiement unique"], ["included", "Inclus"], ["quote", "Sur devis"]], value: "annual" },
      { name: "price_amount", label: "Prix (FCFA, vide si sur devis)", type: "number" },
      { name: "status", label: "Statut", type: "select", options: [["available", "Disponible"], ["beta", "Bêta"], ["coming_soon", "Bientôt"], ["quote", "Sur devis"], ["premium_reserved", "Réservé premium"], ["disabled", "Désactivé"]], value: "available" }
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
  "module.view": {
    eyebrow: "WalahaStore", label: "Détail du module", view: true,
    entity: (id) => storeModuleById(id),
    details: (e) => [["Module", e.name], ["Code", e.code], ["Catégorie", e.category], ["Tarif", modulePriceLabel(e)], ["Validation requise", e.requires_validation ? "Oui" : "Non"], ["Statut", e.status], ["Objectif", e.objective || "-"]]
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
    description: (e) => `Approuver l'activation de « ${text(storeModuleById(e.module_id)?.name)} ». L'école pourra confirmer le paiement.`,
    run: async (e, reason) => {
      const module = storeModuleById(e.module_id);
      const patch = { status: "approved", price_agreed: e.price_agreed ?? module?.price_amount ?? null, decided_by: state.authUserId, decided_at: new Date().toISOString(), decision_note: reason || null };
      await updateRow("store_subscriptions", e.id, patch);
      await recordAudit({ action_type: "STORE_REQUEST_APPROVED", target_type: "store_subscription", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
    }
  },
  "store.activate": {
    eyebrow: "Activation", label: "Activer le module", confirmLabel: "Activer", reasonLabel: "Note (optionnel)",
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    description: (e) => `Activer « ${text(storeModuleById(e.module_id)?.name)} » pour cette école.`,
    run: async (e, reason) => {
      const patch = { status: "active", activated_at: new Date().toISOString(), decided_by: state.authUserId };
      await updateRow("store_subscriptions", e.id, patch);
      await recordAudit({ action_type: "STORE_MODULE_ACTIVATED", target_type: "store_subscription", target_id: e.id, reason, old_data: { status: e.status }, new_data: patch });
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
    eyebrow: "Activation", label: "Détail de la demande", view: true,
    entity: (id) => state.storeSubscriptions.find((s) => s.id === id),
    details: (e) => [["Module", storeModuleById(e.module_id)?.name || e.module_id], ["École", state.schools.find((s) => s.id === e.school_id)?.name || e.school_id], ["Statut", e.status], ["Prix convenu", e.price_agreed != null ? `${e.price_agreed} FCFA` : "-"], ["Note demande", e.note || "-"], ["Décision", e.decision_note || "-"]]
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
    ? def.details(entity).map(([key, value]) => `<div class="detail-row"><span>${escapeHtml(key)}</span><strong>${text(value)}</strong></div>`).join("")
    : "";

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
}

function showLogin() {
  adminShell.classList.add("is-hidden");
  loginView.classList.remove("is-hidden");
}

async function loadData() {
  const [
    schoolsResult,
    schoolRequestsResult,
    usersResult,
    tutorsResult,
    gamesResult,
    reportsResult,
    paymentsResult,
    logsResult,
    membersResult,
    moderationResult,
    storeModulesResult,
    storeSubsResult,
    storeCustomResult
  ] = await Promise.all([
    queryTable("canonical_schools", "id, public_code, name, school_type, city, created_at, deleted_at", { order: { column: "created_at" } }),
    queryTable("school_requests", "id, name, school_type, city, commune, phone, email, promoter_name, director_name, status, public_code, internal_note, requested_by, created_at", { order: { column: "created_at" } }),
    queryTable("users", "id, email, display_name, preferred_language, created_at, deleted_at", { order: { column: "created_at" } }),
    queryTable("canonical_tutors", "id, public_code, full_name, email, phone, subjects, created_at, deleted_at", { order: { column: "created_at" } }),
    queryTable("educational_activities", "id, title, short_description, activity_type, domains, age_min, age_max, difficulty, validation_status, visibility, created_at, deleted_at", { order: { column: "created_at" } }),
    queryTable("moderation_reports", "id, target_type, target_id, reason, status, priority, assigned_admin_id, created_at", { order: { column: "created_at" } }),
    queryTable("school_digital_payments", "id, school_name, academic_year, billed_students, amount_per_student_xof, status, created_at", { order: { column: "created_at" } }),
    queryTable("admin_audit_logs", "id, action_type, target_type, target_id, reason, created_at, admin_id", { order: { column: "created_at" }, limit: 50 }),
    queryTable("admin_members", "id, user_id, role, status, created_at", { order: { column: "created_at" } }),
    queryTable("user_moderation", "user_id, status, reason, updated_at"),
    queryTable("store_modules", "id, code, name, category, description, objective, pricing_type, price_amount, price_currency, status, requires_validation, sort_order, created_at, deleted_at", { order: { column: "sort_order", ascending: true } }),
    queryTable("store_subscriptions", "id, module_id, school_id, requested_by, status, price_agreed, note, decision_note, created_at", { order: { column: "created_at" } }),
    queryTable("store_custom_requests", "id, school_id, requested_by, title, description, status, internal_note, created_at", { order: { column: "created_at" } })
  ]);

  state.schools = schoolsResult.data.filter((item) => !item.deleted_at);
  state.schoolRequests = schoolRequestsResult.data;
  state.users = usersResult.data.filter((item) => !item.deleted_at);
  state.tutors = tutorsResult.data.filter((item) => !item.deleted_at);
  state.games = gamesResult.data.filter((item) => !item.deleted_at);
  state.reports = reportsResult.data;
  state.payments = paymentsResult.data;
  state.logs = logsResult.data;
  state.members = membersResult.data;
  state.userModeration = moderationResult.data;
  state.storeModules = storeModulesResult.data.filter((item) => !item.deleted_at);
  state.storeSubscriptions = storeSubsResult.data;
  state.storeCustom = storeCustomResult.data;

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
    ["school_requests", schoolRequestsResult.error],
    ["moderation_reports", reportsResult.error],
    ["school_digital_payments", paymentsResult.error],
    ["admin_audit_logs", logsResult.error]
  ].filter(([, error]) => error);

  if (missing.length) {
    console.warn("[WAC] Tables WAC a verifier:", missing.map(([name]) => name).join(", "));
  }
}

function renderMetrics() {
  const c = state.counts || {};
  const pendingReports = state.reports.filter((report) => ["open", "in_review", "escalated"].includes(report.status)).length;
  // Compte exact si disponible, sinon repli sur les lignes chargées.
  const pick = (exact, fallback) => (typeof exact === "number" ? exact : fallback);
  const fmt = (value) => Number(value || 0).toLocaleString("fr-FR");
  const cards = document.querySelectorAll(".metric-card");
  const values = [
    ["Ecoles officielles", fmt(pick(c.schools, state.schools.length)), "Registre ECO-"],
    ["Eleves canoniques", fmt(pick(c.students, 0)), "Profils ELV-"],
    ["Utilisateurs", fmt(pick(c.users, state.users.length)), "Comptes app"],
    ["Signalements ouverts", fmt(pick(c.reportsPending, pendingReports)), "Moderation WAC"],
    ["Repetiteurs", fmt(pick(c.tutors, state.tutors.length)), "Profils REP-"],
    ["Suivi paiements", fmt(pick(c.payments, state.payments.length)), "Dossiers financiers"]
  ];

  cards.forEach((card, index) => {
    const value = values[index];
    if (!value) return;
    card.innerHTML = `<span>${value[0]}</span><strong>${value[1]}</strong><small>${value[2]}</small>`;
  });
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

function moderationStatusFor(userId) {
  return state.userModeration.find((m) => m.user_id === userId)?.status || "active";
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

function renderPayments() {
  renderTable("paymentsTable", state.payments.map((payment) => `
    <tr>
      <td><strong>${text(payment.school_name)}</strong></td>
      <td>${text(payment.academic_year)}</td>
      <td>${Number(payment.billed_students || 0).toLocaleString("fr-FR")}</td>
      <td>${paymentAmount(payment.billed_students || 0, payment.amount_per_student_xof || 5000)}</td>
      <td>${statusBadge(payment.status)}</td>
      <td>${payment.status === "paid"
        ? rowBtn("payment.view", payment.id, "Voir")
        : rowBtn("payment.confirm", payment.id, "Confirmer", "go")}</td>
    </tr>
  `), 6, "Aucun paiement WAC. Creez des lignes dans school_digital_payments.");
}

function renderLogs(list = state.logs) {
  renderTable("logsTable", list.map((log) => `
    <tr>
      <td><strong>${text(log.action_type)}</strong></td>
      <td>${text(log.target_type)}<small>${text(log.target_id)}</small></td>
      <td>${text(log.admin_id)}</td>
      <td>${text(log.reason)}</td>
      <td>${new Date(log.created_at).toLocaleString("fr-FR")}</td>
    </tr>
  `), 5, "Aucun audit log WAC.");
}

function renderDashboard() {
  const queue = document.getElementById("validationQueue");
  if (queue) {
    const pendingReports = state.reports.filter((report) => ["open", "in_review", "escalated"].includes(report.status)).length;
    const pendingSchools = state.schoolRequests.filter((r) => ["pending_review", "verified"].includes(r.status)).length;
    queue.innerHTML = [
      [`${pendingSchools} demandes d'ecole`, "A valider (creation ECO-)", "schools"],
      [`${state.tutors.length} repetiteurs`, "Profils REP- a superviser", "tutors"],
      [`${pendingReports} signalements`, "Cas ouverts a traiter", "reports"],
      [`${state.payments.length} paiements`, "Suivi finance WAC", "payments"]
    ].map(([title, subtitle, route]) => `
      <div class="queue-item"><div><strong>${title}</strong><span>${subtitle}</span></div><button type="button" class="row-action" data-route="${route}">Ouvrir</button></div>
    `).join("");
  }

  const activity = document.getElementById("recentActivity");
  if (activity) {
    activity.innerHTML = state.logs.length ? state.logs.slice(0, 5).map((log) => `
      <div class="activity-item"><div><strong>${text(log.action_type)}</strong><span>${text(log.target_type)} · ${new Date(log.created_at).toLocaleString("fr-FR")}</span></div></div>
    `).join("") : `<div class="activity-item"><div><strong>Aucun log</strong><span>admin_audit_logs est vide ou non lisible.</span></div></div>`;
  }
}

function renderRoles() {
  const target = document.getElementById("rolesList");
  if (!target) return;
  target.innerHTML = roles.map(([role, description]) => `
    <div class="role-item"><div><strong>${role}</strong><span>${description}</span></div>${statusBadge("active")}</div>
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
  renderStoreRequests();
  renderStoreCustom();
}

function renderStoreMetrics() {
  const target = document.getElementById("storeMetrics");
  if (!target) return;
  const active = state.storeSubscriptions.filter((s) => s.status === "active");
  const pending = state.storeSubscriptions.filter((s) => ["requested", "approved"].includes(s.status));
  const revenue = active.reduce((sum, s) => {
    const price = s.price_agreed != null ? Number(s.price_agreed) : (storeModuleById(s.module_id)?.price_amount || 0);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);
  const cards = [
    ["Modules actifs", active.length.toLocaleString("fr-FR"), "Abonnements école"],
    ["Revenu estimé", `${revenue.toLocaleString("fr-FR")} FCFA`, "Modules actifs"],
    ["Demandes en attente", (pending.length + state.storeCustom.filter((c) => ["open", "in_review"].includes(c.status)).length).toLocaleString("fr-FR"), "Activations + devis"]
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
        <td>${text(req.requested_by)}</td>
        <td>${statusBadge(req.status)}</td>
        <td>${storeCustomActions(req)}</td>
      </tr>
    `;
  }), 5, "Aucune demande de module personnalisé.");
}

function storeRequestActions(sub) {
  if (sub.status === "requested") {
    return rowBtns([rowBtn("store.approve", sub.id, "Approuver", "go"), rowBtn("store.reject", sub.id, "Refuser", "danger")]);
  }
  if (sub.status === "approved") {
    return rowBtns([rowBtn("store.activate", sub.id, "Activer", "go"), rowBtn("store.reject", sub.id, "Refuser", "danger")]);
  }
  if (sub.status === "active") {
    return rowBtns([rowBtn("store.view", sub.id, "Voir"), rowBtn("store.suspend", sub.id, "Suspendre", "danger")]);
  }
  return rowBtn("store.view", sub.id, "Voir");
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
        <td>${statusBadge(sub.status)}</td>
        <td>${storeRequestActions(sub)}</td>
      </tr>
    `;
  }), 6, "Aucune demande d'activation.");
}

function renderAll() {
  renderMetrics();
  renderDashboard();
  renderSchools();
  renderUsers();
  renderTutors();
  renderGames();
  renderReports();
  renderPayments();
  renderLogs();
  renderRoles();
  renderMembers();
  renderStore();
}

function setRoute(route) {
  const view = document.getElementById(`view-${route}`);
  if (!view) return;

  views.forEach((item) => item.classList.toggle("is-active", item === view));
  routeLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.route === route));
  pageTitle.textContent = view.dataset.title || "Walaha Admin Center";
  window.location.hash = route;
  sidebar.classList.remove("is-open");
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

document.addEventListener("click", (event) => {
  const exportButton = event.target.closest("[data-export]");
  if (exportButton) {
    const dataset = EXPORTS[exportButton.dataset.export]?.();
    if (dataset) exportCsv(dataset.name, dataset.rows);
    return;
  }

  const routeButton = event.target.closest("[data-route]");
  if (routeButton && routeButton.dataset.route) {
    event.preventDefault();
    setRoute(routeButton.dataset.route);
    return;
  }

  const actionButtonEl = event.target.closest("[data-act]");
  if (actionButtonEl) {
    openActionModal(actionButtonEl.dataset.act, actionButtonEl.dataset.id);
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

applyFilter("schools", () => schoolsList(), renderSchools);
applyFilter("users", () => state.users, renderUsers);
applyFilter("logs", () => state.logs, renderLogs);
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
