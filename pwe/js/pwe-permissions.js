/**
 * Matrice des permissions PWE — alignée sur portail_ecoles.md §8.
 */
(function () {
  'use strict';

  const ROLE_LABELS = {
    school_owner: 'Promoteur',
    school_director: 'Directeur',
    school_secretary: 'Secrétaire',
    school_accountant: 'Comptable',
    teacher: 'Enseignant',
    class_master: 'Maître de classe',
    school_staff: 'Personnel',
  };

  /** Niveaux : full | read | none */
  const MATRIX = {
    school_owner: {
      dashboard: 'full', statistics: 'full', profile: 'full', classes: 'full', students: 'full',
      teachers: 'full', reports: 'full', homework: 'full', correspondence: 'full',
      fees: 'full', messages: 'full', store: 'full', settings: 'full',
    },
    school_director: {
      dashboard: 'full', statistics: 'full', profile: 'full', classes: 'full', students: 'full',
      teachers: 'full', reports: 'full', homework: 'full', correspondence: 'full',
      fees: 'full', messages: 'full', store: 'full', settings: 'full',
    },
    school_secretary: {
      dashboard: 'full', statistics: 'full', profile: 'read', classes: 'full', students: 'full',
      teachers: 'read', reports: 'full', homework: 'full', correspondence: 'full',
      fees: 'read', messages: 'full', store: 'none', settings: 'read',
    },
    school_accountant: {
      dashboard: 'read', statistics: 'full', profile: 'none', classes: 'none', students: 'none',
      teachers: 'none', reports: 'none', homework: 'none', correspondence: 'none',
      fees: 'full', messages: 'full', store: 'none', settings: 'none',
    },
    teacher: {
      dashboard: 'read', statistics: 'read', profile: 'none', classes: 'none', students: 'read',
      teachers: 'none', reports: 'full', homework: 'full', correspondence: 'read',
      fees: 'none', messages: 'full', store: 'none', settings: 'none',
    },
    class_master: {
      dashboard: 'read', statistics: 'read', profile: 'none', classes: 'read', students: 'full',
      teachers: 'none', reports: 'full', homework: 'full', correspondence: 'full',
      fees: 'none', messages: 'full', store: 'none', settings: 'none',
    },
    school_staff: {
      dashboard: 'read', statistics: 'read', profile: 'none', classes: 'read', students: 'read',
      teachers: 'none', reports: 'read', homework: 'read', correspondence: 'read',
      fees: 'none', messages: 'full', store: 'none', settings: 'none',
    },
  };

  const WRITE_ACTIONS = {
    edit_profile: ['profile'],
    manage_classes: ['classes'],
    manage_students: ['students'],
    manage_teachers: ['teachers'],
    manage_reports: ['reports', 'homework', 'correspondence'],
    manage_fees: ['fees'],
    send_messages: ['messages'],
    manage_store: ['store'],
    manage_settings: ['settings'],
  };

  function normalizeRole(role) {
    const r = String(role || 'school_staff');
    return MATRIX[r] ? r : 'school_staff';
  }

  function accessLevel(role, route) {
    const row = MATRIX[normalizeRole(role)] || MATRIX.school_staff;
    return row[route] || 'none';
  }

  function canViewRoute(role, route) {
    return accessLevel(role, route) !== 'none';
  }

  function canWriteRoute(role, route) {
    return accessLevel(role, route) === 'full';
  }

  function canPerform(role, action) {
    const routes = WRITE_ACTIONS[action];
    if (!routes) return true;
    return routes.some((route) => canWriteRoute(role, route));
  }

  function filterNavItems(role, items) {
    return items.filter((item) => {
      if (item.href) return true;
      return item.route ? canViewRoute(role, item.route) : true;
    });
  }

  function filterNavSections(role, sections) {
    return sections
      .map((section) => ({
        ...section,
        items: filterNavItems(role, section.items || []),
      }))
      .filter((section) => (section.items || []).length > 0);
  }

  function roleHint(role) {
    const r = normalizeRole(role);
    if (r === 'teacher' || r === 'class_master') {
      return 'Vue limitée à votre périmètre pédagogique.';
    }
    if (r === 'school_accountant') {
      return 'Accès orienté frais scolaires et messages.';
    }
    if (r === 'school_secretary') {
      return 'Gestion scolaire et communication — pas WalahaStore.';
    }
    return '';
  }

  window.PwePermissions = {
    ROLE_LABELS,
    MATRIX,
    normalizeRole,
    accessLevel,
    canViewRoute,
    canWriteRoute,
    canPerform,
    filterNavItems,
    filterNavSections,
    roleHint,
  };
})();
