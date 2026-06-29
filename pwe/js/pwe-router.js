/**
 * Routage PWE — routes, garde d'accès par rôle.
 */
(function () {
  'use strict';

  const ROUTES = [
    'dashboard',
    'statistics',
    'profile',
    'classes',
    'students',
    'teachers',
    'reports',
    'homework',
    'correspondence',
    'fees',
    'messages',
    'store',
    'settings',
  ];

  const ROUTE_SECTIONS = {
    dashboard: 'Pilotage',
    statistics: 'Pilotage',
    profile: 'Pilotage',
    classes: 'Scolarité',
    students: 'Scolarité',
    teachers: 'Scolarité',
    reports: 'Scolarité',
    homework: 'Scolarité',
    correspondence: 'Scolarité',
    fees: 'Administration',
    messages: 'Administration',
    store: 'Administration',
    settings: 'Administration',
  };

  function getCurrentRoute() {
    const hash = (location.hash || '#dashboard').slice(1);
    return ROUTES.includes(hash) ? hash : 'dashboard';
  }

  function resolveRoute(route, role) {
    const { canViewRoute } = window.PwePermissions;
    let r = ROUTES.includes(route) ? route : 'dashboard';
    if (!canViewRoute(role, r)) {
      r = ROUTES.find((rt) => canViewRoute(role, rt)) || 'dashboard';
    }
    return r;
  }

  window.PweRouter = {
    ROUTES,
    ROUTE_SECTIONS,
    getCurrentRoute,
    resolveRoute,
  };
})();
