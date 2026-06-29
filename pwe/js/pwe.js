(function () {
  'use strict';

  const SESSION_KEY = 'pwe_session';
  const THEME_KEY = 'pwe_theme';
  const SIDEBAR_KEY = 'pwe_sidebar';
  const PROFILE_MODE_KEY = 'pwe_profile_mode';
  const ACTIVE_SCHOOL_KEY = 'pwe_active_school_id';
  const BUILD = '20260623-37';

  const {
    escapeHtml, normalize, badge, formatGender, genderLabel, $, $$,
  } = window.PweUtils;
  const {
    ROLE_LABELS, canViewRoute, canWriteRoute, canPerform, filterNavSections, roleHint,
  } = window.PwePermissions;
  const {
    ROUTES, ROUTE_SECTIONS, getCurrentRoute, resolveRoute,
  } = window.PweRouter;

  const openModal = (id) => window.PweModals.openModal(id);
  const closeModals = () => window.PweModals.closeModals();
  const fillStudentClassesSelect = (s) => window.PweModals.fillStudentClassesSelect(s);
  const fillStudentSelect = (id, s) => window.PweModals.fillStudentSelect(id, s);
  const fillEditProfileForm = (s) => window.PweModals.fillEditProfileForm(s);
  const fillFeeModalSelects = (s) => window.PweModals.fillFeeModalSelects(s);
  const fillEditStudentClassesSelect = (s, c) => window.PweModals.fillEditStudentClassesSelect(s, c);
  const fillEditClassForm = (c) => window.PweModals.fillEditClassForm(c);
  const fillEditStudentForm = (s, st) => window.PweModals.fillEditStudentForm(s, st);
  const renderStudentParentLinks = (id) => window.PweModals.renderStudentParentLinks(id);
  const openLinkStudentParentModal = (st) => window.PweModals.openLinkStudentParentModal(st);
  const getRenderers = () => window.PweRenderers.RENDERERS;
  const dashboardGreeting = () => window.PweRenderers.dashboardGreeting();



  let schoolSwitcherOpen = false;

  const SCHOOL_DRAWER_NAV = {
    promoter: [
      {
        section: 'Pilotage',
        items: [
          { route: 'dashboard', label: 'Tableau de bord', icon: 'i-dashboard' },
          { route: 'statistics', label: 'Statistiques', icon: 'i-chart' },
          { route: 'profile', label: 'Profil école', icon: 'i-building' },
        ],
      },
      {
        section: 'Scolarité',
        items: [
          { route: 'classes', label: 'Cours / Classes', icon: 'i-grid' },
          { route: 'students', label: 'Élèves', icon: 'i-users' },
          { route: 'teachers', label: 'Personnel', icon: 'i-user-check' },
          { route: 'reports', label: 'Bulletins', icon: 'i-file-text' },
          { route: 'homework', label: 'Devoirs', icon: 'i-edit' },
          { route: 'correspondence', label: 'Carnet', icon: 'i-mail' },
        ],
      },
      {
        section: 'Administration',
        items: [
          { route: 'fees', label: 'Frais scolaires', icon: 'i-credit-card' },
          { route: 'messages', label: 'Messages', icon: 'i-mail' },
          { route: 'store', label: 'WalahaStore', icon: 'i-plus' },
          { route: 'settings', label: 'Paramètres', icon: 'i-settings' },
        ],
      },
    ],
    parents: [
      {
        section: 'Espace parents',
        items: [
          { href: '../#parents', label: 'WalahaTracker Parents', icon: 'i-users', external: true },
          { href: '../#apercu', label: 'Télécharger l’app', icon: 'i-upload', external: true },
        ],
      },
      {
        section: 'Suivi scolaire',
        items: [
          { href: '../#parents', label: 'Bulletins', icon: 'i-file-text', external: true, tag: 'App' },
          { href: '../#parents', label: 'Frais scolaires', icon: 'i-credit-card', external: true, tag: 'App' },
          { href: '../#parents', label: 'Messages école', icon: 'i-mail', external: true, tag: 'App' },
        ],
      },
      {
        section: 'Accompagnement',
        items: [
          { href: '../#nouveautes', label: 'Walaha IA', icon: 'i-book', external: true },
          { href: '../#nouveautes', label: 'WalahaPlay', icon: 'i-chart', external: true },
        ],
      },
    ],
  };

  let schoolDrawerOpen = false;
  let homeworkCache = null;
  let trackHomeworkId = null;
  let correspondenceCache = null;

  let lastActionAt = 0;

  function updateLoginUi(mode) {
    const hint = $('#loginModeHint');
    const demoHint = $('#demoLoginHint');
    if (mode === 'supabase') {
      if (hint) hint.textContent = 'Connexion avec votre compte école.';
      demoHint?.classList.add('hidden');
    } else if (mode === 'demo') {
      if (hint) hint.textContent = 'Démo locale — données fictives, pas d’écriture en base.';
      demoHint?.classList.remove('hidden');
    } else {
      const err = window.PweApi.getConfigError() || 'Portail non configuré.';
      if (hint) hint.textContent = err;
      demoHint?.classList.add('hidden');
      if (loginError) {
        loginError.textContent = err;
        loginError.classList.remove('hidden');
      }
    }
  }

  function ensureSchoolCache(schoolId) {
    if (listCacheSchoolId !== schoolId) {
      listCache = {};
      listCacheSchoolId = schoolId;
      schoolProfile = null;
      selectedMessageId = null;
      homeworkCache = null;
      correspondenceCache = null;
      window.PweStore?.invalidateCache?.();
    }
  }

  function applyNavPermissions(session) {
    if (!session) return;
    const role = session.role;
    $$('.nav-link[data-route]').forEach((link) => {
      const route = link.dataset.route;
      const allowed = canViewRoute(role, route);
      link.classList.toggle('hidden', !allowed);
      link.classList.toggle('is-restricted', !allowed);
      link.setAttribute('aria-hidden', allowed ? 'false' : 'true');
    });
    const actionRoutes = {
      'add-class': 'classes',
      'edit-class': 'classes',
      'archive-class': 'classes',
      'delete-class': 'classes',
      'add-student': 'students',
      'edit-student': 'students',
      'archive-student': 'students',
      'add-report': 'reports',
      'publish-reports': 'reports',
      'record-fee-payment': 'fees',
      'compose-message': 'messages',
      'reply-message': 'messages',
      'store-custom-request': 'store',
      'store-request': 'store',
      'homework-add': 'homework',
    };
    $$('[data-action]').forEach((el) => {
      const route = actionRoutes[el.dataset.action];
      if (!route) return;
      const writable = canWriteRoute(role, route);
      el.classList.toggle('hidden', !writable);
      if (el.tagName === 'BUTTON') el.disabled = !writable;
    });
    $$('[data-require-write]').forEach((el) => {
      const route = el.dataset.requireWrite || getCurrentRoute();
      const writable = canWriteRoute(role, route);
      el.classList.toggle('hidden', !writable);
      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
        el.disabled = !writable;
      }
    });
  }

  function requireWritableMode(routeOrAction) {
    const mode = window.PweApi.getMode();
    if (window.PweApi.isDemo()) {
      safeToast(
        'Mode démo',
        'Les créations sont désactivées. Ouvrez /pwe/ sans ?demo=1 et connectez-vous avec votre compte.'
      );
      return false;
    }
    if (mode === 'unconfigured') {
      safeToast('Configuration requise', window.PweApi.getConfigError() || 'Configuration manquante.');
      return false;
    }
    const session = getSession();
    if (!session) return false;
    const actionRoutes = {
      'compose-message': 'messages',
      'reply-message': 'messages',
      'manage_store': 'store',
    };
    const route = actionRoutes[routeOrAction] || routeOrAction || getCurrentRoute();
    if (route && ROUTES.includes(route) && !canWriteRoute(session.role, route)) {
      safeToast('Accès limité', roleHint(session.role) || 'Votre rôle ne permet pas cette modification.');
      return false;
    }
    if (['send_messages', 'manage_store'].includes(routeOrAction) && !canPerform(session.role, routeOrAction)) {
      safeToast('Accès limité', roleHint(session.role) || 'Action non autorisée pour votre rôle.');
      return false;
    }
    return true;
  }

  function isStudentParentWriteAllowed() {
    const mode = window.PweApi.getMode();
    if (mode === 'demo') return true;
    if (mode === 'unconfigured') return false;
    return mode === 'supabase';
  }

  function isSchoolProfileWriteAllowed() {
    const mode = window.PweApi.getMode();
    if (mode === 'demo') return true;
    if (mode === 'unconfigured') return false;
    return mode === 'supabase';
  }

  function dispatchAction(action, ctx = {}) {
    const now = Date.now();
    if (now - lastActionAt < 150) return;
    lastActionAt = now;
    handleAction(action, ctx);
  }

  let listCacheSchoolId = null;
  const appShell = $('#appShell');
  const loginForm = $('#loginForm');
  const loginError = $('#loginError');

  let listCache = {};
  let schoolProfile = null;
  let cmdkOpen = false;
  let userMenuOpen = false;

  function getSchoolMonogram(name) {
    const parts = (name || 'WE').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name || 'WE').slice(0, 2).toUpperCase();
  }

  function updateSearchKbd() {
    const kbd = document.querySelector('.app-header-search-kbd');
    if (!kbd) return;
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');
    kbd.textContent = isMac ? '⌘K' : 'Ctrl K';
  }

  function syncAppHeaderProfileMode(mode = getProfileMode()) {
    const pill = $('#topbarProfileMode');
    const label = $('#topbarProfileModeLabel');
    const icon = pill?.querySelector('use');
    if (!pill || !label) return;
    const isParents = mode === 'parents';
    label.textContent = isParents ? 'Parents' : 'Promoteur';
    pill.setAttribute('data-mode', mode);
    if (icon) icon.setAttribute('href', isParents ? '#i-users' : '#i-building');
  }

  function applySchoolLogo(logoUrl, schoolName, imgId, fallbackId) {
    const img = $(imgId);
    const fallback = $(fallbackId);
    if (!fallback) return;
    fallback.textContent = getSchoolMonogram(schoolName);
    if (!img) return;
    if (logoUrl) {
      img.src = logoUrl;
      img.alt = schoolName ? `Logo ${schoolName}` : 'Logo école';
      img.classList.remove('hidden');
      fallback.classList.add('hidden');
      img.onerror = () => {
        img.classList.add('hidden');
        fallback.classList.remove('hidden');
      };
    } else {
      img.removeAttribute('src');
      img.classList.add('hidden');
      fallback.classList.remove('hidden');
    }
  }

  function applySchoolBranding(profile) {
    const name = profile?.name || '—';
    const logoUrl = profile?.logoUrl || null;
    applySchoolLogo(logoUrl, name, '#sidebarSchoolLogoImg', '#sidebarSchoolMark');
    applySchoolLogo(logoUrl, name, '#topbarSchoolLogoImg', '#topbarSchoolMark');
    applySchoolLogo(logoUrl, name, '#drawerSchoolLogoImg', '#drawerSchoolMark');
    applySchoolLogo(logoUrl, name, '#profileSchoolLogoImg', '#profileSchoolMark');
  }

  function applyUserAvatar(avatarUrl, name, email) {
    const img = $('#userAvatarImg');
    const initials = $('#userAvatarInitials');
    if (!initials) return;
    initials.textContent = getInitials(name, email);
    if (!img) return;
    if (avatarUrl) {
      img.src = avatarUrl;
      img.classList.remove('hidden');
      initials.classList.add('hidden');
      img.onerror = () => {
        img.classList.add('hidden');
        initials.classList.remove('hidden');
      };
    } else {
      img.removeAttribute('src');
      img.classList.add('hidden');
      initials.classList.remove('hidden');
    }
  }

  function getTopbarYear() {
    const el = document.getElementById('topbarYear');
    if (!el) return '2025-2026';
    const span = el.querySelector('span:last-child');
    return (span?.textContent || el.textContent || '2025-2026').trim();
  }

  function getInitials(name, email) {
    const src = (name || email || '?').trim();
    if (!src) return '?';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (src.includes('@')) return src[0].toUpperCase();
    return src.slice(0, 2).toUpperCase();
  }

  function schoolStatusLabel(status) {
    const map = {
      active: 'Actif',
      verified: 'Validée',
      pending: 'En attente',
      draft: 'Brouillon',
      suspended: 'Suspendue',
      inactive: 'Inactif',
    };
    return map[status] || status || '—';
  }

  function applySchoolStatusPill(status) {
    const el = $('#ctxSchoolStatus');
    const textEl = $('#ctxSchoolStatusText');
    if (!el || !textEl) return;
    el.className = 'topbar-chip topbar-chip--status';
    if (status) el.classList.add(`topbar-chip--status-${status}`);
    textEl.textContent = schoolStatusLabel(status);
  }

  function setUserMenuOpen(open) {
    userMenuOpen = Boolean(open);
    const panel = $('#userMenuPanel');
    const btn = $('#userMenuBtn');
    panel?.classList.toggle('hidden', !userMenuOpen);
    btn?.setAttribute('aria-expanded', userMenuOpen ? 'true' : 'false');
    if (userMenuOpen) setSchoolSwitcherOpen(false);
  }

  function setSchoolSwitcherOpen(open) {
    schoolSwitcherOpen = Boolean(open);
    const panel = $('#schoolSwitcherPanel');
    const btn = $('#schoolSwitcherBtn');
    panel?.classList.toggle('hidden', !schoolSwitcherOpen);
    btn?.setAttribute('aria-expanded', schoolSwitcherOpen ? 'true' : 'false');
    if (schoolSwitcherOpen) setUserMenuOpen(false);
  }

  function renderSchoolSwitcher(schools, activeSchoolId) {
    const wrap = $('#schoolSwitcher');
    const btn = $('#schoolSwitcherBtn');
    const list = $('#schoolSwitcherList');
    const countEl = $('#schoolSwitcherCount');
    if (!wrap || !btn || !list) return;

    const items = schools || [];
    const multi = items.length > 1;
    btn.classList.toggle('hidden', !multi);
    if (!multi) {
      setSchoolSwitcherOpen(false);
      return;
    }

    if (countEl) countEl.textContent = String(items.length);

    list.innerHTML = items
      .map((school) => {
        const active = school.id === activeSchoolId || school.isActive;
        const monogram = getSchoolMonogram(school.name);
        const logo = school.logoUrl
          ? `<img class="school-switcher-logo" src="${school.logoUrl}" alt="" />`
          : `<span class="school-switcher-mark">${monogram}</span>`;
        return `
          <li>
            <button type="button" class="school-switcher-item${active ? ' active' : ''}"
              data-school-id="${school.id}" role="option" aria-selected="${active ? 'true' : 'false'}">
              ${logo}
              <span class="school-switcher-item-copy">
                <strong>${school.name}</strong>
                <span>${school.code || '—'} · ${school.city || '—'}</span>
              </span>
              ${active ? '<span class="school-switcher-active-tag">Active</span>' : ''}
            </button>
          </li>`;
      })
      .join('');

    list.querySelectorAll('[data-school-id]').forEach((el) => {
      el.addEventListener('click', () => {
        switchSchool(el.getAttribute('data-school-id'));
      });
    });
  }

  async function switchSchool(schoolId) {
    const session = getSession();
    if (!session || !schoolId || session.schoolId === schoolId) {
      setSchoolSwitcherOpen(false);
      return;
    }

    const result = await window.PweApi.setActiveSchool(schoolId);
    if (!result.ok) {
      safeToast('Changement impossible', result.error || 'Erreur.');
      return;
    }

    localStorage.setItem(ACTIVE_SCHOOL_KEY, schoolId);
    ensureSchoolCache(schoolId);

    const staffSession = result.staffSession || (await window.PweApi.fetchStaffSession());
    const schools = await window.PweApi.fetchUserSchools();

    const next = {
      ...session,
      schoolId,
      role: staffSession?.role || session.role,
      staffSession,
      schools,
    };
    setSession(next);
    setSchoolSwitcherOpen(false);
    await updateChrome(next);
    await navigate('dashboard');
    safeToast('École active', staffSession?.school?.name || '—');
  }

  function toggleUserMenu() {
    setUserMenuOpen(!userMenuOpen);
  }

  function getProfileMode() {
    const stored = localStorage.getItem(PROFILE_MODE_KEY);
    return stored === 'parents' ? 'parents' : 'promoter';
  }

  function setProfileMode(mode) {
    const next = mode === 'parents' ? 'parents' : 'promoter';
    localStorage.setItem(PROFILE_MODE_KEY, next);
    return next;
  }

  function syncSchoolDrawerTabs(mode) {
    $$('.school-profile-tab').forEach((tab) => {
      const active = tab.dataset.profileMode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function syncSchoolDrawerNavActive(route) {
    $$('#schoolDrawerNav [data-route]').forEach((link) => {
      link.classList.toggle('active', link.dataset.route === route);
    });
  }

  function renderSchoolDrawerNav(mode, role = getSession()?.role) {
    const nav = $('#schoolDrawerNav');
    if (!nav) return;

    let sections = SCHOOL_DRAWER_NAV[mode] || SCHOOL_DRAWER_NAV.promoter;
    if (mode === 'promoter' && role) {
      sections = filterNavSections(role, sections);
    }
    nav.innerHTML = sections
      .map(
        (section) => `
        <div class="school-drawer-section">
          <p class="school-drawer-section-label">${section.section}</p>
          ${section.items
            .map((item) => {
              if (item.route) {
                return `
                  <button type="button" class="school-drawer-link" data-route="${item.route}">
                    <svg aria-hidden="true"><use href="#${item.icon}"></use></svg>
                    <span>${item.label}</span>
                  </button>`;
              }
              const extraClass = item.external ? ' school-drawer-link--external' : '';
              const tag = item.tag
                ? `<span class="school-drawer-link-tag">${item.tag}</span>`
                : '';
              return `
                <a class="school-drawer-link${extraClass}" href="${item.href}"${
                  item.external ? ' target="_blank" rel="noopener noreferrer"' : ''
                } data-school-drawer-close>
                  <svg aria-hidden="true"><use href="#${item.icon}"></use></svg>
                  <span>${item.label}</span>
                  ${tag}
                </a>`;
            })
            .join('')}
        </div>`
      )
      .join('');

    $$('#schoolDrawerNav [data-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigate(btn.dataset.route);
        closeSchoolDrawer();
      });
    });

    $$('#schoolDrawerNav [data-school-drawer-close]').forEach((el) => {
      el.addEventListener('click', () => closeSchoolDrawer());
    });

    const route = (location.hash || '#dashboard').slice(1);
    syncSchoolDrawerNavActive(route);
  }

  function renderSchoolDrawer(session, profile = schoolProfile) {
    if (!session) return;

    const schoolName = profile?.name || session.staffSession?.school?.name || '—';
    const schoolCode = profile?.code || '—';

    const nameEl = $('#drawerSchoolName');
    const codeEl = $('#drawerSchoolCode');
    if (nameEl) nameEl.textContent = schoolName;
    if (codeEl) codeEl.textContent = schoolCode;

    const mode = getProfileMode();
    syncSchoolDrawerTabs(mode);
    renderSchoolDrawerNav(mode, session.role);
    syncAppHeaderProfileMode(mode);
  }

  function setSchoolDrawerOpen(open) {
    schoolDrawerOpen = Boolean(open);
    const drawer = $('#schoolDrawer');
    const toggle = $('#menuToggle');
    drawer?.classList.toggle('is-open', schoolDrawerOpen);
    drawer?.classList.toggle('hidden', !schoolDrawerOpen && !getSession());
    document.body.classList.toggle('school-drawer-open', schoolDrawerOpen);
    toggle?.setAttribute('aria-expanded', schoolDrawerOpen ? 'true' : 'false');
    if (schoolDrawerOpen) setUserMenuOpen(false);
  }

  function openSchoolDrawer() {
    const session = getSession();
    if (!session) return;
    renderSchoolDrawer(session);
    setSchoolDrawerOpen(true);
  }

  function closeSchoolDrawer() {
    setSchoolDrawerOpen(false);
  }

  function toggleSchoolDrawer() {
    if (schoolDrawerOpen) closeSchoolDrawer();
    else openSchoolDrawer();
  }

  async function updateUnreadBadge(session) {
    try {
      if (!listCache.messages) {
        listCache.messages = await window.PweApi.fetchMessages(session.schoolId);
      }
      const unread = (listCache.messages || []).filter((m) => m.unread).length;
      const badge = $('#topbarUnreadBadge');
      if (!badge) return;
      if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
      const sideBadge = $('#sidebarMessagesBadge');
      if (sideBadge) {
        if (unread > 0) {
          sideBadge.textContent = unread > 9 ? '9+' : String(unread);
          sideBadge.classList.remove('hidden');
        } else {
          sideBadge.classList.add('hidden');
        }
      }
    } catch {
      /* badge optionnel */
    }
  }

  function updateTopbarRoute(route) {
    const view = $(`#view-${route}`);
    const title = view?.dataset.title || route;
    const section = ROUTE_SECTIONS[route] || 'Pilotage';
    const breadcrumb = $('#breadcrumbCurrent');
    if (breadcrumb) breadcrumb.textContent = title;

    const sectionTag = $('#topbarSectionTag');
    if (sectionTag) {
      sectionTag.textContent = section;
      sectionTag.setAttribute('data-section', section);
    }

    const sub = $('#topbarSub');
    const quick = $('#topbarQuickActions');
    if (route === 'dashboard' && sub && quick) {
      sub.classList.remove('hidden');
      quick.innerHTML = `
        <button type="button" class="topbar-quick-btn topbar-quick-btn--primary" data-action="add-student">
          <svg aria-hidden="true"><use href="#i-users"></use></svg>
          Inscrire élève
        </button>
        <button type="button" class="topbar-quick-btn" data-action="add-class">
          <svg aria-hidden="true"><use href="#i-grid"></use></svg>
          Nouvelle classe
        </button>
        <button type="button" class="topbar-quick-btn" data-action="publish-reports">
          <svg aria-hidden="true"><use href="#i-upload"></use></svg>
          Publier bulletins
        </button>
        <button type="button" class="topbar-quick-btn" data-action="compose-message">
          <svg aria-hidden="true"><use href="#i-compose"></use></svg>
          Message parents
        </button>`;
    } else {
      sub?.classList.add('hidden');
      if (quick) quick.innerHTML = '';
    }
  }

  async function refreshCurrentView() {
    const session = getSession();
    if (!session) return;
    listCache = {};
    schoolProfile = null;
    const btn = $('#refreshBtn');
    btn?.classList.add('is-spinning');
    try {
      await updateChrome(session);
      const route = (location.hash || '#dashboard').slice(1);
      await navigate(route);
      safeToast('Actualisé', 'Les données ont été rechargées.');
    } finally {
      btn?.classList.remove('is-spinning');
    }
  }

  async function doLogout() {
    setUserMenuOpen(false);
    closeSchoolDrawer();
    if (window.PweApi.getClient()) {
      await window.PweApi.logoutSupabase();
    }
    clearSession();
    showLogin();
    location.hash = '';
  }


  // Diagnostics (utile quand un bouton "ne réagit pas")
  window.PWE_DIAG = {
    build: BUILD,
    lastClick: null,
    lastError: null,
  };

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(data) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    listCache = {};
    listCacheSchoolId = null;
    schoolProfile = null;
    window.PweStore?.invalidateCache?.();
  }

  function rowActions(id, type, extra = {}) {
    if (!id) return '—';
    const session = getSession();
    const routeMap = { class: 'classes', student: 'students' };
    const route = routeMap[type];
    if (session && route && !canWriteRoute(session.role, route)) {
      return '<span class="row-actions-muted" title="Lecture seule">—</span>';
    }
    const deleteBtn =
      extra.allowDelete && type === 'class'
        ? `
        <button type="button" class="row-action-btn row-action-btn--danger" data-action="delete-class" data-id="${id}" title="Supprimer" aria-label="Supprimer">
          <svg aria-hidden="true" width="14" height="14"><use href="#i-trash"></use></svg>
        </button>`
        : '';
    const linkParentsBtn =
      type === 'student'
        ? `
        <button type="button" class="row-action-btn row-action-btn--accent" data-action="link-student-parent" data-id="${id}" title="Lier des parents" aria-label="Lier des parents">
          <svg aria-hidden="true" width="14" height="14"><use href="#i-users"></use></svg>
        </button>`
        : '';
    return `
      <div class="row-actions">
        ${linkParentsBtn}
        <button type="button" class="row-action-btn" data-action="edit-${type}" data-id="${id}" title="Modifier" aria-label="Modifier">
          <svg aria-hidden="true" width="14" height="14"><use href="#i-edit"></use></svg>
        </button>
        <button type="button" class="row-action-btn" data-action="archive-${type}" data-id="${id}" title="Archiver" aria-label="Archiver">
          <svg aria-hidden="true" width="14" height="14"><use href="#i-archive"></use></svg>
        </button>${deleteBtn}
      </div>`;
  }


  function clearPweUrlParams() {
    if (!location.search) return;
    const hash = location.hash || '';
    history.replaceState(null, '', `${location.pathname}${hash}`);
  }

  function filterRows(rows, searchKey, filterKey, searchFields) {
    const searchEl = document.querySelector(`[data-search="${searchKey}"]`);
    const filterEl = document.querySelector(`[data-filter="${searchKey}"]`);
    const q = normalize(searchEl?.value || '');
    const f = filterEl?.value || 'all';

    return (rows || []).filter((row) => {
      const matchFilter = f === 'all' || row.status === f;
      if (!q) return matchFilter;
      const hay = searchFields.map((k) => normalize(String(row[k] || ''))).join(' ');
      return matchFilter && hay.includes(q);
    });
  }

  function showLoadError(message) {
    const el = $('#pageTitle');
    if (el) el.textContent = 'Erreur de chargement';
    console.error(message);
  }

  function showToast(title, desc, timeoutMs = 2600) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `
      <div class="toast-title">${title}</div>
      ${desc ? `<div class="toast-desc">${desc}</div>` : ''}`;
    document.body.appendChild(el);

    // Trigger transition
    requestAnimationFrame(() => el.classList.add('show'));

    window.setTimeout(() => {
      el.classList.remove('show');
      window.setTimeout(() => el.remove(), 220);
    }, timeoutMs);
  }

  function safeToast(title, desc) {
    try {
      showToast(title, desc);
    } catch {
      // Si le toast plante, au moins un fallback
      alert(`${title}\n\n${desc || ''}`); // eslint-disable-line no-alert
    }
  }

  window.addEventListener('error', (e) => {
    const msg = e?.message || 'Erreur JavaScript';
    window.PWE_DIAG.lastError = msg;
    safeToast('Erreur JS', msg);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e?.reason?.message || String(e?.reason || 'Promise rejetée');
    window.PWE_DIAG.lastError = msg;
    safeToast('Erreur JS', msg);
  });

  let selectedMessageId = null;

  function syncThemeControls() {
    const t = document.documentElement.getAttribute('data-theme') || 'light';
    const themeBtn = $('#themeBtn');
    if (themeBtn) {
      const use = themeBtn.querySelector('use');
      if (use) use.setAttribute('href', t === 'dark' ? '#i-sun' : '#i-moon');
    }
    const settingsThemeBtn = $('#settingsThemeBtn');
    if (settingsThemeBtn) {
      settingsThemeBtn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      settingsThemeBtn.textContent = t === 'dark' ? 'Activé' : 'Basculer';
    }
  }

  function setTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
    syncThemeControls();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function setSidebarCollapsed(collapsed) {
    const on = Boolean(collapsed);
    document.body.classList.toggle('sidebar-collapsed', on);
    localStorage.setItem(SIDEBAR_KEY, on ? '1' : '0');
  }

  function toggleSidebar() {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  }

  function cmdkItems(session) {
    return [
      { title: 'Tableau de bord', sub: 'KPIs, activité, actions rapides', tag: 'Page', route: 'dashboard' },
      { title: 'Statistiques', sub: 'Effectifs, bulletins, finances', tag: 'Page', route: 'statistics' },
      { title: 'Profil école', sub: 'Informations et statut', tag: 'Page', route: 'profile' },
      { title: 'Classes', sub: 'Organisation pédagogique', tag: 'Page', route: 'classes' },
      { title: 'Élèves', sub: 'Inscriptions et listes', tag: 'Page', route: 'students' },
      { title: 'Personnel', sub: 'Enseignants & staff', tag: 'Page', route: 'teachers' },
      { title: 'Bulletins', sub: 'Préparation & publication', tag: 'Page', route: 'reports' },
      { title: 'Frais scolaires', sub: 'Paiements & relances', tag: 'Page', route: 'fees' },
      { title: 'Messages', sub: 'Communication parents', tag: 'Page', route: 'messages' },
      { title: 'Paramètres', sub: 'Sécurité & rôle', tag: 'Page', route: 'settings' },
      { title: 'Basculer le thème', sub: 'Clair / Sombre', tag: 'Action', action: 'theme' },
      { title: 'Réduire le menu', sub: 'Sidebar compacte', tag: 'Action', action: 'sidebar' },
      { title: 'Déconnexion', sub: session?.email || '', tag: 'Action', action: 'logout' },
    ];
  }

  function openCmdk() {
    const el = $('#cmdk');
    if (!el) return;
    setUserMenuOpen(false);
    el.classList.remove('hidden');
    cmdkOpen = true;
    renderCmdk();
    const input = $('#cmdkInput');
    if (input) input.focus();
  }

  function closeCmdk() {
    const el = $('#cmdk');
    if (!el) return;
    el.classList.add('hidden');
    cmdkOpen = false;
  }

  function renderCmdk() {
    const session = getSession();
    const input = $('#cmdkInput');
    const list = $('#cmdkList');
    if (!list) return;
    const q = (input?.value || '').trim().toLowerCase();
    const items = cmdkItems(session).filter((x) => {
      if (!q) return true;
      return (x.title + ' ' + (x.sub || '') + ' ' + (x.tag || '')).toLowerCase().includes(q);
    });

    list.innerHTML = items
      .map(
        (x) => `
        <div class="cmdk-item" role="button" tabindex="0"
          ${x.route ? `data-cmdk-route="${x.route}"` : ''}
          ${x.action ? `data-cmdk-action="${x.action}"` : ''}>
          <div class="cmdk-main">
            <div class="cmdk-title">${x.title}</div>
            <div class="cmdk-sub">${x.sub || ''}</div>
          </div>
          <div class="cmdk-tag">${x.tag}</div>
        </div>`
      )
      .join('');
  }


  async function refreshClasses(session) {
    listCache.classes = null;
    listCache.classes = await window.PweApi.fetchClasses(session.schoolId);
    await getRenderers().classes(session);
  }

  async function refreshStudents(session) {
    listCache.students = null;
    listCache.students = await window.PweApi.fetchStudents(session.schoolId);
    await getRenderers().students(session);
  }

  async function refreshTeachers(session) {
    listCache.teachers = null;
    listCache.teachers = await window.PweApi.fetchTeachers(session.schoolId);
    await getRenderers().teachers(session);
  }

  async function refreshReports(session) {
    listCache.reports = null;
    await getRenderers().reports(session);
  }

  async function refreshFees(session) {
    listCache.fees = null;
    await getRenderers().fees(session);
  }

  async function refreshMessages() {
    const session = getSession();
    if (!session) return;
    listCache.messages = null;
    await getRenderers().messages(session);
  }

  function invalidateSchoolProfile() {
    schoolProfile = null;
  }


  function findClassById(id) {
    return (listCache.classes || []).find((c) => c.id === id);
  }

  function findStudentById(id) {
    return (listCache.students || []).find((s) => s.id === id);
  }

  async function ensureSchoolProfile(session) {
    if (schoolProfile) return schoolProfile;
    schoolProfile = await window.PweApi.fetchSchoolProfile(session.staffSession);
    return schoolProfile;
  }



  async function updateChrome(session) {
    const profile = await ensureSchoolProfile(session);
    const roleLabel = ROLE_LABELS[session.role] || session.role;
    const schoolName = profile.name || '—';
    const schoolCode = profile.code || '—';

    let avatarUrl = session.avatarUrl || null;
    if (!avatarUrl && window.PweApi.fetchUserProfile) {
      try {
        const userProfile = await window.PweApi.fetchUserProfile();
        avatarUrl = userProfile?.avatarUrl || null;
        if (userProfile?.userId && !session.userId) {
          session.userId = userProfile.userId;
          setSession(session);
        }
      } catch {
        /* avatar optionnel */
      }
    }

    $('#sidebarSchoolName').textContent = schoolName;
    $('#sidebarUser').textContent = schoolCode;
    applySchoolBranding(profile);

    const greetingEl = $('#appHeaderGreeting');
    if (greetingEl) greetingEl.textContent = dashboardGreeting();

    $('#topbarSchoolName').textContent = schoolName;

    const yearEl = $('#topbarYear');
    const yearText = yearEl?.querySelector('span:last-child');
    if (yearText) yearText.textContent = profile.academicYear || '2025-2026';

    $('#topbarUserName').textContent = schoolName;
    $('#topbarRole').textContent = roleLabel;
    const roleMobile = $('#topbarRoleMobile');
    if (roleMobile) roleMobile.textContent = roleLabel;
    const hint = roleHint(session.role);
    const hintEl = $('#topbarRoleHint');
    if (hintEl) {
      hintEl.textContent = hint || '';
      hintEl.classList.toggle('hidden', !hint);
    }
    $('#userMenuName').textContent = `${schoolName} ${roleLabel}`;
    const codeEl = $('#userMenuCode');
    if (codeEl) codeEl.textContent = schoolCode;

    applyUserAvatar(
      avatarUrl,
      session.staffSession?.school?.director_name ||
        session.staffSession?.school?.promoter_name ||
        session.name,
      session.email
    );

    const modeBadge = $('#dataModeBadge');
    if (modeBadge) {
      modeBadge.classList.toggle('hidden', !window.PweApi.isDemo());
    }

    await updateUnreadBadge(session);
    renderSchoolDrawer(session, profile);
    syncAppHeaderProfileMode();

    let schools = session.schools;
    if ((!schools || !schools.length) && window.PweApi.fetchUserSchools) {
      try {
        schools = await window.PweApi.fetchUserSchools();
        session.schools = schools;
        setSession(session);
      } catch {
        schools = [];
      }
    }
    renderSchoolSwitcher(schools, session.schoolId);
    applyNavPermissions(session);
  }

  async function navigate(route) {
    const session = getSession();
    if (!session) return;

    ensureSchoolCache(session.schoolId);
    const requested = ROUTES.includes(route) ? route : 'dashboard';
    const r = resolveRoute(requested, session.role);
    if (r !== requested) {
      safeToast('Accès limité', roleHint(session.role) || 'Cette section n’est pas disponible pour votre rôle.');
    }

    $$('.view').forEach((v) => v.classList.remove('active'));
    const view = $(`#view-${r}`);
    if (view) {
      view.classList.add('active');
      $('#pageTitle').textContent = view.dataset.title || r;
    }

    updateTopbarRoute(r);
    setUserMenuOpen(false);
    setSchoolSwitcherOpen(false);
    if (r !== 'messages') selectedMessageId = null;

    $$('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.route === r);
    });
    syncSchoolDrawerNavActive(r);

    try {
      if (getRenderers()[r]) await getRenderers()[r](session);
    } catch (err) {
      showLoadError(err);
      loginError.textContent = err.message || 'Erreur de chargement des données.';
      loginError.classList.remove('hidden');
    }

    applyNavPermissions(session);

    if (location.hash !== `#${r}`) {
      history.replaceState(null, '', `#${r}`);
    }

    document.body.classList.remove('sidebar-open');
    closeSchoolDrawer();
  }

  async function showApp(session) {
    loginScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    loginError.classList.add('hidden');
    $('#schoolDrawer')?.classList.remove('hidden');
    await updateChrome(session);
    const route = (location.hash || '#dashboard').slice(1);
    await navigate(route);
  }

  function showLogin() {
    appShell.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginError.classList.add('hidden');
    closeSchoolDrawer();
    $('#schoolDrawer')?.classList.add('hidden');
  }

  function attemptLoginMock(email, password) {
    const mock = window.PWE_MOCK;
    const schools = mock.schools?.length ? mock.schools : [mock.school];
    const savedId = localStorage.getItem(ACTIVE_SCHOOL_KEY);
    const school = schools.find((s) => s.id === savedId) || schools[0];

    if (school.status !== 'active' && school.status !== 'verified') {
      return { ok: false, error: 'École non validée ou suspendue. Contactez la Walaha Team.' };
    }

    const cred = mock.staffSession;
    if (normalize(email) !== normalize(cred.email) || password !== cred.password) {
      return {
        ok: false,
        error:
          "Identifiants incorrects ou compte absent de school_staff. L'accès est accordé uniquement après validation WAC.",
      };
    }

    localStorage.setItem(ACTIVE_SCHOOL_KEY, school.id);

    return {
      ok: true,
      session: {
        email: cred.email,
        name: cred.name,
        role: school.role || cred.role,
        schoolId: school.id,
        schools: schools.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          city: s.city,
          logoUrl: s.logoUrl || null,
          role: s.role || cred.role,
          isActive: s.id === school.id,
        })),
        staffSession: {
          role: school.role || cred.role,
          school: {
            id: school.id,
            name: school.name,
            public_code: school.code,
          },
        },
      },
    };
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    loginError.classList.add('hidden');

    try {
      let session;
      const mode = window.PweApi.getMode();

      if (mode === 'unconfigured') {
        loginError.textContent = window.PweApi.getConfigError() || 'Portail non configuré.';
        loginError.classList.remove('hidden');
        return;
      }

      if (mode === 'demo') {
        const result = attemptLoginMock(email, password);
        if (!result.ok) {
          loginError.textContent = result.error;
          loginError.classList.remove('hidden');
          return;
        }
        session = result.session;
      } else {
        session = await window.PweApi.loginSupabase(email, password);
      }

      setSession(session);
      await showApp(session);
    } catch (err) {
      loginError.textContent = err.message || 'Connexion impossible.';
      loginError.classList.remove('hidden');
    }
  });

  $('#logoutBtn').addEventListener('click', () => doLogout());

  $('#themeBtn')?.addEventListener('click', () => toggleTheme());
  $('#settingsThemeBtn')?.addEventListener('click', () => toggleTheme());
  $('#collapseSidebarBtn')?.addEventListener('click', () => toggleSidebar());
  $('#commandBtn')?.addEventListener('click', () => openCmdk());
  $('#refreshBtn')?.addEventListener('click', () => refreshCurrentView());
  $('#topbarMessagesBtn')?.addEventListener('click', () => navigate('messages'));
  $('#userMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleUserMenu();
  });

  $('#schoolSwitcherBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setSchoolSwitcherOpen(!schoolSwitcherOpen);
  });

  $$('[data-user-menu]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-user-menu');
      setUserMenuOpen(false);
      if (action === 'profile') navigate('profile');
      else if (action === 'settings') navigate('settings');
      else if (action === 'logout') doLogout();
    });
  });

  $$('.breadcrumb-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('data-breadcrumb') || 'dashboard');
    });
  });

  document.addEventListener('click', (e) => {
    if (userMenuOpen && !e.target?.closest?.('#userMenu')) {
      setUserMenuOpen(false);
    }
    if (schoolSwitcherOpen && !e.target?.closest?.('#schoolSwitcher')) {
      setSchoolSwitcherOpen(false);
    }
  });

  $('#menuToggle')?.addEventListener('click', () => {
    toggleSchoolDrawer();
  });

  $('#schoolDrawerClose')?.addEventListener('click', () => closeSchoolDrawer());
  $('#schoolDrawerBackdrop')?.addEventListener('click', () => closeSchoolDrawer());
  $('#drawerLogoutBtn')?.addEventListener('click', () => {
    closeSchoolDrawer();
    doLogout();
  });

  $$('.school-profile-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = setProfileMode(tab.dataset.profileMode);
      syncSchoolDrawerTabs(mode);
      renderSchoolDrawerNav(mode, getSession()?.role);
      syncAppHeaderProfileMode(mode);
    });
  });

  $('#topbarProfileMode')?.addEventListener('click', () => {
    openSchoolDrawer();
  });

  $$('[data-school-drawer-close]').forEach((el) => {
    el.addEventListener('click', () => closeSchoolDrawer());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && schoolDrawerOpen) closeSchoolDrawer();
  });

  $('#sidebarOverlay').addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });

  $$('[data-search], [data-filter]').forEach((el) => {
    el.addEventListener('input', () => {
      const route = (location.hash || '#dashboard').slice(1);
      if (getRenderers()[route]) navigate(route);
    });
    el.addEventListener('change', () => {
      const route = (location.hash || '#dashboard').slice(1);
      if (getRenderers()[route]) navigate(route);
    });
  });

  window.addEventListener('hashchange', () => {
    if (!getSession()) return;
    const route = (location.hash || '#dashboard').slice(1);
    navigate(route);
  });

  $$('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.route);
    });
  });

  function findActionElement(start) {
    let el = start;
    // Support clic sur <use> / <svg> : remonte dans les parents.
    while (el && el !== document && el !== document.documentElement) {
      if (el.getAttribute && el.getAttribute('data-action')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function handleAction(action, ctx = {}) {
    window.PWE_DIAG.lastAction = action;
    window.PWE_DIAG.lastActionCtx = ctx;
    if (action === 'edit-school-profile') {
      if (!requireWritableMode()) return;
      const session = getSession();
      if (!session) return;
      fillEditProfileForm(session);
      openModal('modalEditProfile');
      return;
    }

    if (action === 'add-class') {
      if (!requireWritableMode()) return;
      openModal('modalAddClass');
      // Préremplir l'année scolaire si vide
      const form = document.getElementById('addClassForm');
      const y = form?.querySelector?.('input[name="academicYear"]');
      const topYear = getTopbarYear();
      if (y && !y.value && topYear && topYear !== '—') y.value = topYear;
      return;
    }

    if (action === 'add-student') {
      if (!requireWritableMode()) return;
      fillStudentClassesSelect(getSession());
      openModal('modalAddStudent');
      return;
    }

    if (action === 'invite-staff') {
      if (!requireWritableMode()) return;
      openModal('modalInviteStaff');
      return;
    }

    if (action === 'publish-reports') {
      if (!requireWritableMode()) return;
      const form = document.getElementById('publishReportsForm');
      const topYear = getTopbarYear();
      if (form?.academicYear && !form.academicYear.value && topYear && topYear !== '—') {
        form.academicYear.value = topYear;
      }
      openModal('modalPublishReports');
      return;
    }

    if (action === 'add-report') {
      if (!requireWritableMode()) return;
      const session = getSession();
      if (!session) return;
      fillStudentSelect('reportStudentSelect', session);
      const form = document.getElementById('addReportForm');
      const topYear = getTopbarYear();
      if (form?.academicYear && !form.academicYear.value && topYear && topYear !== '—') {
        form.academicYear.value = topYear;
      }
      const gradesList = document.getElementById('reportGradesList');
      if (gradesList && gradesList.childElementCount === 0) {
        gradesList.appendChild(makeGradeRow());
      }
      openModal('modalAddReport');
      return;
    }

    if (action === 'record-fee-payment') {
      if (!requireWritableMode()) return;
      const session = getSession();
      if (!session) return;
      fillFeeModalSelects(session);
      openModal('modalRecordFee');
      return;
    }

    if (action === 'compose-message') {
      if (!requireWritableMode('send_messages')) return;
      openModal('modalComposeMessage');
      return;
    }

    if (action === 'reply-message') {
      if (!requireWritableMode('send_messages')) return;
      const msg = (listCache.messages || []).find((m) => m.id === selectedMessageId);
      if (!msg?.id) {
        safeToast('Sélectionnez un message', 'Choisissez une annonce dans la liste.');
        return;
      }
      const idInput = document.getElementById('replyAnnouncementId');
      const sub = document.getElementById('replyMessageSubtitle');
      if (idInput) idInput.value = msg.id;
      if (sub) sub.textContent = `Réponse à : ${msg.subject || 'ce message'}`;
      openModal('modalReplyMessage');
      return;
    }

    if (action === 'edit-class') {
      if (!requireWritableMode()) return;
      const cls = findClassById(ctx.id);
      if (!cls) {
        safeToast('Classe introuvable', 'Rechargez la page.');
        return;
      }
      fillEditClassForm(cls);
      openModal('modalEditClass');
      return;
    }

    if (action === 'archive-class') {
      if (!requireWritableMode()) return;
      const session = getSession();
      const cls = findClassById(ctx.id);
      if (!session || !cls) return;
      if (!window.confirm(`Archiver la classe « ${cls.name} » ?`)) return;
      window.PweApi.archiveClass(cls.id).then(async (result) => {
        if (!result.ok) {
          safeToast('Archivage impossible', result.error || 'Erreur.');
          return;
        }
        safeToast('Classe archivée', `${cls.name} est maintenant archivée.`);
        await refreshClasses(session);
      });
      return;
    }

    if (action === 'delete-class') {
      if (!requireWritableMode()) return;
      const session = getSession();
      const cls = findClassById(ctx.id);
      if (!session || !cls) return;
      const hint =
        cls.students > 0
          ? `\n\nAttention : ${cls.students} élève(s) actif(s) — la suppression sera refusée. Archivez la classe ou réaffectez les élèves.`
          : '';
      if (!window.confirm(`Supprimer définitivement la classe « ${cls.name} » ?${hint}`)) return;
      window.PweApi.deleteClass(cls.id, session.schoolId).then(async (result) => {
        if (!result.ok) {
          safeToast('Suppression impossible', result.error || 'Erreur.');
          return;
        }
        safeToast('Classe supprimée', `${cls.name} a été retirée de la liste.`);
        await refreshClasses(session);
      });
      return;
    }

    if (action === 'link-student-parent') {
      const student = findStudentById(ctx.id);
      if (!student) {
        safeToast('Élève introuvable', 'Rechargez la page.');
        return;
      }
      openLinkStudentParentModal(student);
      return;
    }

    if (action === 'unlink-student-parent') {
      if (!isStudentParentWriteAllowed()) {
        requireWritableMode();
        return;
      }
      const session = getSession();
      const studentId = $('#linkStudentParentId')?.value;
      if (!session || !studentId || !ctx.id) return;
      if (!window.confirm('Retirer ce parent de la fiche élève ?')) return;

      window.PweApi.unlinkStudentParent(ctx.id).then(async (result) => {
        if (!result.ok) {
          safeToast('Suppression impossible', result.error || 'Erreur.');
          return;
        }
        safeToast('Parent retiré', 'Le lien a été supprimé.');
        await renderStudentParentLinks(studentId);
        await refreshStudents(session);
      });
      return;
    }

    if (action === 'edit-student') {
      if (!requireWritableMode()) return;
      const session = getSession();
      const student = findStudentById(ctx.id);
      if (!session || !student) {
        safeToast('Élève introuvable', 'Rechargez la page.');
        return;
      }
      fillEditStudentForm(session, student);
      openModal('modalEditStudent');
      return;
    }

    if (action === 'archive-student') {
      if (!requireWritableMode()) return;
      const session = getSession();
      const student = findStudentById(ctx.id);
      if (!session || !student) return;
      if (!window.confirm(`Archiver l'élève « ${student.name} » ?`)) return;
      window.PweApi.archiveStudent(student.id).then(async (result) => {
        if (!result.ok) {
          safeToast('Archivage impossible', result.error || 'Erreur.');
          return;
        }
        safeToast('Élève archivé', `${student.name} est maintenant archivé.`);
        await refreshStudents(session);
      });
      return;
    }

    // Si on tombe ici : action inconnue => debug
    safeToast('Action inconnue', `data-action="${action}" n’est pas géré.`);
  }

  function bindActionButtons() {
    const delegatedActions = new Set([
      'archive-correspondence',
      'archive-homework',
      'homework-track',
      'store-custom-request',
      'store-detail',
      'store-request',
      'store-request-from-detail',
    ]);

    document.addEventListener('click', (e) => {
      window.PWE_DIAG.lastClick = {
        t: Date.now(),
        tag: e?.target?.tagName,
        id: e?.target?.id,
        cls: e?.target?.className,
      };
      const btn = findActionElement(e.target);
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (delegatedActions.has(action)) return;
      e.preventDefault();
      dispatchAction(action, {
        id: btn.getAttribute('data-id'),
      });
    });
  }

  function bindModalForms() {
    const forms = [
      { id: 'addClassForm', submitLabel: 'Création…' },
      { id: 'addStudentForm', submitLabel: 'Inscription…' },
      { id: 'inviteStaffForm', submitLabel: 'Liaison…' },
      { id: 'editProfileForm', submitLabel: 'Enregistrement…' },
      { id: 'publishReportsForm', submitLabel: 'Publication…' },
      { id: 'addReportForm', submitLabel: 'Création…' },
      { id: 'recordFeeForm', submitLabel: 'Enregistrement…' },
      { id: 'composeMessageForm', submitLabel: 'Envoi…' },
      { id: 'editClassForm', submitLabel: 'Enregistrement…' },
      { id: 'editStudentForm', submitLabel: 'Enregistrement…' },
      { id: 'linkStudentParentForm', submitLabel: 'Liaison…' },
    ];

    forms.forEach(({ id, submitLabel }) => {
      const form = document.getElementById(id);
      if (!form) return;

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn?.disabled) return;
      });

      form.querySelectorAll('button[type="submit"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          if (!form.reportValidity()) {
            e.preventDefault();
            safeToast('Champs requis', 'Merci de compléter les champs obligatoires.');
          }
        });
      });

      form._pweSubmitLabel = submitLabel;
    });
  }

  function setFormBusy(form, busy) {
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) {
      if (!btn.dataset.pweHtml) btn.dataset.pweHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = form._pweSubmitLabel || 'Envoi…';
    } else {
      btn.disabled = false;
      if (btn.dataset.pweHtml) {
        btn.innerHTML = btn.dataset.pweHtml;
        delete btn.dataset.pweHtml;
      }
    }
  }

  bindActionButtons();
  bindModalForms();

  // Command palette interactions
  document.addEventListener('click', (e) => {
    if (!cmdkOpen) return;
    if (e.target?.closest?.('[data-cmdk-close]')) closeCmdk();

    const item = e.target?.closest?.('.cmdk-item');
    if (!item) return;
    const route = item.getAttribute('data-cmdk-route');
    const action = item.getAttribute('data-cmdk-action');
    if (route) {
      closeCmdk();
      navigate(route);
      return;
    }
    if (action === 'theme') {
      toggleTheme();
      renderCmdk();
      return;
    }
    if (action === 'sidebar') {
      toggleSidebar();
      renderCmdk();
      return;
    }
    if (action === 'logout') {
      closeCmdk();
      $('#logoutBtn')?.click();
    }
  });

  $('#cmdkInput')?.addEventListener('input', () => renderCmdk());
  document.addEventListener('keydown', (e) => {
    const key = e.key?.toLowerCase?.();
    const k = (e.ctrlKey || e.metaKey) && key === 'k';
    if (k) {
      e.preventDefault();
      if (cmdkOpen) closeCmdk();
      else openCmdk();
    }
    if (cmdkOpen && key === 'escape') closeCmdk();
    if (userMenuOpen && key === 'escape') setUserMenuOpen(false);
    if (schoolSwitcherOpen && key === 'escape') setSchoolSwitcherOpen(false);
  });

  // Modal close — backdrop uniquement, ou boutons explicites
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t?.classList?.contains('modal-backdrop')) {
      closeModals();
      return;
    }
    if (t?.closest?.('[data-modal-close]')) closeModals();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('modal-open')) {
      closeModals();
    }
  });

  // Forms
  document.getElementById('addClassForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.createClass({
        schoolId: session.schoolId,
        name: fd.get('name'),
        level: fd.get('level'),
        academicYear: fd.get('academicYear'),
      });
      if (!result.ok) {
        safeToast('Création impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      clearPweUrlParams();
      safeToast('Classe créée', 'La classe est disponible dans la liste.');
      await refreshClasses(session);
      navigate('classes');
    } finally {
      setFormBusy(form, false);
    }
  });

  // Feedback si le navigateur bloque le submit (required/invalid)
  document.getElementById('addClassForm')?.addEventListener(
    'invalid',
    (e) => {
      e.preventDefault();
      safeToast('Champs requis', 'Merci de renseigner au minimum le nom de la classe.');
    },
    true
  );

  document.getElementById('addStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.createStudent({
        schoolId: session.schoolId,
        classId: fd.get('classId') || null,
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        gender: fd.get('gender') || null,
        studentCode: fd.get('studentCode') || null,
      });
      if (!result.ok) {
        safeToast('Inscription impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      clearPweUrlParams();
      safeToast('Élève inscrit', 'L’élève est disponible dans la liste.');
      await refreshStudents(session);
      navigate('students');
    } finally {
      setFormBusy(form, false);
    }
  });

  // Devoirs — ouvrir le formulaire (avec la liste des classes).
  document.getElementById('homeworkAddBtn')?.addEventListener('click', async () => {
    const session = getSession();
    if (!session) return;
    if (!listCache.classes) {
      listCache.classes = await window.PweApi.fetchClasses(session.schoolId);
    }
    const sel = document.getElementById('homeworkClassSelect');
    if (sel) {
      sel.innerHTML =
        '<option value="">Toutes les classes</option>' +
        (listCache.classes || []).map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    }
    openModal('modalAddHomework');
  });

  document.getElementById('addHomeworkForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.createHomework({
        schoolId: session.schoolId,
        classId: fd.get('classId'),
        subject: fd.get('subject'),
        title: fd.get('title'),
        instructions: fd.get('instructions'),
        dueDate: fd.get('dueDate'),
      });
      if (!result.ok) {
        safeToast('Création impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      safeToast('Devoir créé', 'Le devoir a été ajouté pour votre école.');
      await getRenderers().homework(session);
    } finally {
      setFormBusy(form, false);
    }
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="archive-homework"]');
    if (!btn) return;
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const result = await window.PweApi.archiveHomework(btn.dataset.id, session.schoolId);
    if (!result.ok) {
      safeToast('Archivage impossible', result.error || 'Erreur.');
      return;
    }
    safeToast('Devoir archivé', null);
    await getRenderers().homework(session);
  });

  // Devoirs — ouverture du suivi des élèves.
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="homework-track"]');
    if (!btn) return;
    const session = getSession();
    if (!session) return;
    trackHomeworkId = btn.dataset.id;
    const hw = (homeworkCache || []).find((h) => h.id === trackHomeworkId);
    const titleEl = document.getElementById('homeworkTrackTitle');
    if (titleEl) titleEl.textContent = hw?.title || 'Suivi des élèves';
    const body = document.getElementById('homeworkTrackBody');
    if (body) body.innerHTML = '<p class="store-sub-empty">Chargement…</p>';
    openModal('modalHomeworkTrack');
    try {
      if (!listCache.students) {
        listCache.students = await window.PweApi.fetchStudents(session.schoolId);
      }
      const students = (listCache.students || []).filter(
        (s) => s.status === 'active' && (!hw?.classId || s.classId === hw.classId)
      );
      const subs = await window.PweApi.fetchHomeworkSubmissions(trackHomeworkId);
      if (body) {
        body.innerHTML = students.length === 0
          ? '<p class="store-sub-empty">Aucun élève actif dans cette classe.</p>'
          : students.map((s) => {
              const sub = subs[s.id] || {};
              const st = sub.status || 'assigned';
              const opt = (v, l) => `<option value="${v}"${st === v ? ' selected' : ''}>${l}</option>`;
              return `
                <div class="hw-track-row" data-student-id="${s.id}">
                  <div class="hw-track-name">${escapeHtml(s.name)}</div>
                  <select class="hw-track-status" aria-label="Statut">${opt('assigned', 'À faire')}${opt('submitted', 'Rendu')}${opt('corrected', 'Corrigé')}</select>
                  <input class="hw-track-grade" type="number" step="0.25" min="0" max="20" placeholder="Note" value="${sub.grade != null ? sub.grade : ''}" aria-label="Note" />
                  <input class="hw-track-feedback" type="text" placeholder="Commentaire" value="${escapeHtml(sub.feedback || '')}" aria-label="Commentaire" />
                </div>`;
            }).join('');
      }
    } catch (err) {
      if (body) body.innerHTML = `<p class="store-sub-empty">Erreur de chargement. ${escapeHtml(err?.message || '')}</p>`;
    }
  });

  document.getElementById('homeworkTrackForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    try {
      const entries = Array.from(document.querySelectorAll('#homeworkTrackBody .hw-track-row')).map((row) => ({
        studentId: row.dataset.studentId,
        status: row.querySelector('.hw-track-status').value,
        grade: row.querySelector('.hw-track-grade').value,
        feedback: row.querySelector('.hw-track-feedback').value,
      }));
      if (entries.length === 0) {
        closeModals();
        return;
      }
      const result = await window.PweApi.saveHomeworkSubmissions({
        homeworkId: trackHomeworkId,
        schoolId: session.schoolId,
        entries,
      });
      if (!result.ok) {
        safeToast('Enregistrement impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      safeToast('Suivi enregistré', 'Le suivi des élèves a été mis à jour.');
    } finally {
      setFormBusy(form, false);
    }
  });

  // Carnet de correspondance — créer / archiver.
  document.getElementById('corrAddBtn')?.addEventListener('click', async () => {
    if (!requireWritableMode('correspondence')) return;
    const session = getSession();
    if (!session) return;
    const sel = document.getElementById('corrStudentSelect');
    if (sel) {
      const students = await window.PweApi.fetchStudentsForSelect(session.schoolId);
      sel.innerHTML =
        '<option value="">Choisir un élève…</option>' +
        (students || []).map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('');
    }
    openModal('modalAddCorrespondence');
  });

  document.getElementById('addCorrespondenceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.createCorrespondence({
        schoolId: session.schoolId,
        studentId: fd.get('studentId'),
        entryType: fd.get('entryType'),
        subject: fd.get('subject'),
        content: fd.get('content'),
        period: fd.get('period'),
      });
      if (!result.ok) {
        safeToast('Création impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      safeToast('Entrée ajoutée', 'L’entrée du carnet a été enregistrée.');
      await getRenderers().correspondence(session);
    } finally {
      setFormBusy(form, false);
    }
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="archive-correspondence"]');
    if (!btn) return;
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const result = await window.PweApi.archiveCorrespondence(btn.dataset.id, session.schoolId);
    if (!result.ok) {
      safeToast('Archivage impossible', result.error || 'Erreur.');
      return;
    }
    safeToast('Entrée archivée', null);
    await getRenderers().correspondence(session);
  });

  // WalahaStore — délégué au module pwe-store.js
  document.addEventListener('click', (e) => {
    if (window.PweStore.handleClick(e, { closeModals })) return;
    if (e.target.closest('[data-action="store-custom-request"]')) {
      if (!requireWritableMode('manage_store')) return;
      openModal('modalCustomRequest');
    }
  });

  document.querySelector('[data-search="store"]')?.addEventListener('input', () => {
    window.PweStore.renderCatalog();
  });

  document.getElementById('customRequestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode('manage_store')) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.submitCustomModuleRequest({
        schoolId: session.schoolId,
        title: fd.get('title'),
        description: fd.get('description'),
      });
      if (!result.ok) {
        safeToast('Demande impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      safeToast('Demande envoyée', 'La Walaha Team étudiera votre besoin sur mesure.');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('storeRequestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode('manage_store')) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    try {
      const result = await window.PweApi.requestModuleActivation({
        moduleId: window.PweStore.getRequestModuleId(),
        schoolId: session.schoolId,
        note: new FormData(form).get('note'),
      });
      if (!result.ok) {
        safeToast("Demande impossible", result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      safeToast('Demande envoyée', "La Walaha Team va étudier votre demande d'activation.");
      window.PweStore.invalidateCache();
      await getRenderers().store(session);
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('replyMessageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode('send_messages')) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.createAnnouncementReply({
        announcementId: fd.get('announcementId'),
        body: fd.get('body'),
      });
      if (!result.ok) {
        safeToast('Réponse impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      safeToast('Réponse envoyée', 'Le fil de discussion a été mis à jour.');
      const msg = (listCache.messages || []).find((m) => m.id === selectedMessageId);
      if (msg) await showMessagePreview(msg);
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('inviteStaffForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.inviteStaff({
        memberCode: fd.get('memberCode'),
        role: fd.get('role'),
      });
      if (!result.ok) {
        safeToast('Liaison impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      const code = result.data?.public_code || fd.get('memberCode');
      const who = result.data?.name || code;
      safeToast('Membre lié', `${who} (${code}) a accès au PWE pour votre école.`);
      await refreshTeachers(session);
      navigate('teachers');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('inviteStaffForm')?.addEventListener(
    'invalid',
    (e) => {
      e.preventDefault();
      safeToast('Champs requis', 'Merci de renseigner le code Walaha et le rôle.');
    },
    true
  );

  document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isSchoolProfileWriteAllowed()) {
      requireWritableMode();
      return;
    }
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.updateSchoolProfile({
        name: fd.get('name'),
        city: fd.get('city'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        commune: fd.get('commune'),
        address: fd.get('address'),
        director: fd.get('director'),
        promoter: fd.get('promoter'),
        academicYear: fd.get('academicYear'),
        description: fd.get('description'),
      });
      if (!result.ok) {
        safeToast('Mise à jour impossible', result.error || 'Erreur.');
        return;
      }
      invalidateSchoolProfile();
      listCache = {};
      const staffSession = await window.PweApi.fetchStaffSession();
      if (staffSession) {
        session.staffSession = staffSession;
      }
      try {
        session.schools = await window.PweApi.fetchUserSchools();
      } catch {
        /* liste écoles optionnelle */
      }
      setSession(session);
      closeModals();
      safeToast('Profil mis à jour', 'Les informations de l’école ont été enregistrées.');
      await updateChrome(session);
      navigate('profile');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('publishReportsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.publishReports({
        period: fd.get('period') || null,
        academicYear: fd.get('academicYear') || null,
      });
      if (!result.ok) {
        safeToast('Publication impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      const n = result.count ?? 0;
      safeToast(
        n > 0 ? 'Bulletins publiés' : 'Aucun bulletin à publier',
        n > 0 ? `${n} bulletin(s) passé(s) au statut publié.` : 'Aucun brouillon ou bulletin prêt ne correspond aux filtres.'
      );
      await refreshReports(session);
      navigate('reports');
    } finally {
      setFormBusy(form, false);
    }
  });

  function makeGradeRow() {
    const row = document.createElement('div');
    row.className = 'report-grade-row';
    row.innerHTML = [
      '<input class="grade-subject" placeholder="Matière" aria-label="Matière" />',
      '<input class="grade-value" type="number" step="0.01" min="0" max="20" placeholder="Note /20" aria-label="Note" />',
      '<input class="grade-coef" type="number" step="0.5" min="0" placeholder="Coef" aria-label="Coefficient" />',
      '<button type="button" class="icon-btn grade-remove" aria-label="Retirer la matière">×</button>',
    ].join('');
    row.querySelector('.grade-remove')?.addEventListener('click', () => row.remove());
    return row;
  }

  function resetReportGrades() {
    const list = document.getElementById('reportGradesList');
    if (list) list.replaceChildren();
  }

  function readReportGrades() {
    const list = document.getElementById('reportGradesList');
    if (!list) return [];
    return [...list.querySelectorAll('.report-grade-row')]
      .map((row) => ({
        subject: row.querySelector('.grade-subject')?.value || '',
        grade: row.querySelector('.grade-value')?.value || '',
        coefficient: row.querySelector('.grade-coef')?.value || '',
      }))
      .filter((g) => g.subject.trim() !== '');
  }

  document.getElementById('reportAddGradeBtn')?.addEventListener('click', () => {
    document.getElementById('reportGradesList')?.appendChild(makeGradeRow());
  });

  document.getElementById('addReportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.createReport({
        studentId: fd.get('studentId'),
        period: fd.get('period'),
        academicYear: fd.get('academicYear'),
        average: fd.get('average'),
        appreciation: fd.get('appreciation'),
        status: fd.get('status'),
        grades: readReportGrades(),
      });
      if (!result.ok) {
        safeToast('Création impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      resetReportGrades();
      safeToast('Bulletin créé', 'Le bulletin apparaît dans la liste.');
      await refreshReports(session);
      navigate('reports');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('recordFeeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    const feeId = fd.get('feeId');
    try {
      const result = await window.PweApi.recordFeePayment({
        feeId: feeId || null,
        studentId: feeId ? null : fd.get('studentId') || null,
        amount: feeId ? null : fd.get('amount'),
        status: fd.get('status'),
      });
      if (!result.ok) {
        safeToast('Paiement impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      safeToast('Paiement enregistré', 'La ligne de frais a été mise à jour.');
      await refreshFees(session);
      navigate('fees');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('composeMessageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode('send_messages')) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.createAnnouncement({
        subject: fd.get('subject'),
        body: fd.get('body'),
        audience: fd.get('audience'),
      });
      if (!result.ok) {
        safeToast('Envoi impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
      safeToast('Message envoyé', 'L’annonce est visible dans la liste des messages.');
      await refreshMessages();
      navigate('messages');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('editClassForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.updateClass({
        classId: fd.get('classId'),
        name: fd.get('name'),
        level: fd.get('level'),
        academicYear: fd.get('academicYear'),
        status: fd.get('status'),
      });
      if (!result.ok) {
        safeToast('Mise à jour impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      safeToast('Classe mise à jour', 'Les modifications ont été enregistrées.');
      await refreshClasses(session);
      navigate('classes');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('editStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    const classId = fd.get('classId');
    try {
      const result = await window.PweApi.updateStudent({
        studentId: fd.get('studentId'),
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        classId: classId || null,
        clearClass: !classId,
        gender: fd.get('gender') || null,
        studentCode: fd.get('studentCode'),
        status: fd.get('status'),
      });
      if (!result.ok) {
        safeToast('Mise à jour impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      safeToast('Élève mis à jour', 'La fiche a été enregistrée.');
      await refreshStudents(session);
      navigate('students');
    } finally {
      setFormBusy(form, false);
    }
  });

  document.getElementById('linkStudentParentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isStudentParentWriteAllowed()) {
      requireWritableMode();
      return;
    }
    const session = getSession();
    const studentId = $('#linkStudentParentId')?.value;
    if (!session || !studentId) return;

    const form = e.target;
    setFormBusy(form, true);
    const fd = new FormData(form);
    try {
      const result = await window.PweApi.linkStudentParent({
        studentId,
        parentCode: fd.get('parentCode'),
        relationship: fd.get('relationship') || 'guardian',
      });
      if (!result.ok) {
        safeToast('Liaison impossible', result.error || 'Erreur.');
        return;
      }
      form.querySelector('[name="parentCode"]').value = '';
      safeToast('Parent lié', result.data?.parent_name || result.data?.parentName || 'Profil ajouté.');
      await renderStudentParentLinks(studentId);
      await refreshStudents(session);
    } finally {
      setFormBusy(form, false);
    }
  });

  async function restoreSupabaseApp() {
    const authSession = await window.PweApi.restoreAuthSession();
    if (!authSession) return false;

    const cached = getSession();
    try {
      const staffSession = await window.PweApi.fetchStaffSession();
      if (staffSession) {
        const userProfile = await window.PweApi.fetchUserProfile();
        let schools = [];
        try {
          schools = await window.PweApi.fetchUserSchools();
        } catch (schoolsErr) {
          console.warn('[PWE] fetch user schools failed', schoolsErr);
        }
        const session = {
          email: authSession.user.email,
          userId: authSession.user.id,
          name: userProfile?.displayName || staffSession.school?.director_name || authSession.user.email,
          avatarUrl: userProfile?.avatarUrl || null,
          role: staffSession.role,
          schoolId: staffSession.school.id,
          staffSession,
          schools,
        };
        localStorage.setItem(ACTIVE_SCHOOL_KEY, staffSession.school.id);
        setSession(session);
        await showApp(session);
        return true;
      }
    } catch (err) {
      console.warn('[PWE] refresh staff session failed', err);
      if (cached?.schoolId && cached.email === authSession.user.email) {
        setSession(cached);
        await showApp(cached);
        safeToast(
          'Connexion instable',
          'Session conservée. Si les données semblent anciennes, rechargez la page.'
        );
        return true;
      }
    }

    await window.PweApi.logoutSupabase();
    clearSession();
    return false;
  }

  async function bootstrap() {
    // Theme + sidebar preferences
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    setTheme(savedTheme);
    const savedSidebar = localStorage.getItem(SIDEBAR_KEY) === '1';
    setSidebarCollapsed(savedSidebar);
    updateSearchKbd();

    const mode = window.PweApi.init();
    window.PweModals.init({ ensureSchoolProfile });
    window.PweRenderers.init({
      navigate,
      dispatchAction,
      ensureSchoolCache,
      ensureSchoolProfile,
      applySchoolBranding,
      syncThemeControls,
      filterRows,
      rowActions,
      getSession,
      getListCache: () => listCache,
      getSelectedMessageId: () => selectedMessageId,
      setSelectedMessageId: (v) => {
        selectedMessageId = v;
      },
      BUILD,
    });
    window.PweStore.init({ openModal });
    console.info(`[PWE] build=${BUILD} mode=${mode}`);
    updateLoginUi(mode);

    window.PweApi.bindAuthListener?.(() => {
      clearSession();
      showLogin();
      location.hash = '';
    });

    async function tryCreateClassFromUrl() {
      // Support automation via URL :
      // /pwe/?name=6eme+Annee+B&level=6&academicYear=2025-2026#classes
      // Optionnel : &create=1 (sinon, on pré-remplit seulement le modal)
      const session = getSession();
      if (!session) return;

      const route = (location.hash || '#dashboard').slice(1);
      if (route !== 'classes') return;

      const params = new URLSearchParams(location.search || '');
      const name = (params.get('name') || '').trim();
      const level = (params.get('level') || '').trim();
      const academicYear = (params.get('academicYear') || '').trim();
      const shouldCreate = params.get('create') === '1';

      if (!name && !level && !academicYear) return;
      if (!requireWritableMode()) return;

      // Pré-remplir le formulaire
      const form = document.getElementById('addClassForm');
      if (form) {
        const n = form.querySelector('input[name="name"]');
        const l = form.querySelector('input[name="level"]');
        const y = form.querySelector('input[name="academicYear"]');
        if (n && name) n.value = name;
        if (l && level) l.value = level;
        if (y && academicYear) y.value = academicYear;
      }

      if (!shouldCreate) {
        openModal('modalAddClass');
        safeToast('Pré-rempli', 'Clique “Créer la classe” pour valider (ajoute &create=1 pour auto-créer).');
        return;
      }

      const result = await window.PweApi.createClass({
        schoolId: session.schoolId,
        name,
        level,
        academicYear,
      });

      if (!result.ok) {
        safeToast('Création impossible', result.error || 'Erreur.');
        return;
      }

      safeToast('Classe créée', 'Créée via URL et ajoutée à la liste.');
      await refreshClasses(session);
      clearPweUrlParams();
    }

    async function tryCreateStudentFromUrl() {
      const session = getSession();
      if (!session) return;

      const route = (location.hash || '#dashboard').slice(1);
      if (route !== 'students') return;

      const params = new URLSearchParams(location.search || '');
      const firstName = (params.get('firstName') || '').trim();
      const lastName = (params.get('lastName') || '').trim();
      const classId = (params.get('classId') || '').trim();
      const gender = (params.get('gender') || '').trim();
      const studentCode = (params.get('studentCode') || '').trim();
      const shouldCreate = params.get('create') === '1';

      if (!firstName && !lastName && !classId) return;
      if (!requireWritableMode()) return;

      const form = document.getElementById('addStudentForm');
      if (form) {
        if (firstName) form.firstName.value = firstName;
        if (lastName) form.lastName.value = lastName;
        if (gender) form.gender.value = gender;
        if (studentCode) form.studentCode.value = studentCode;
        await fillStudentClassesSelect(session);
        if (classId && form.classId) form.classId.value = classId;
      }

      if (!shouldCreate) {
        openModal('modalAddStudent');
        safeToast('Pré-rempli', 'Clique « Inscrire » pour valider (ajoute &create=1 pour auto-inscrire).');
        return;
      }

      const result = await window.PweApi.createStudent({
        schoolId: session.schoolId,
        classId: classId || null,
        firstName,
        lastName,
        gender: gender || null,
        studentCode: studentCode || null,
      });

      if (!result.ok) {
        safeToast('Inscription impossible', result.error || 'Erreur.');
        return;
      }

      safeToast('Élève inscrit', 'Inscrit via URL et ajouté à la liste.');
      await refreshStudents(session);
      clearPweUrlParams();
    }

    if (mode === 'demo') {
      const session = getSession();
      if (session) {
        await showApp(session);
        return;
      }
      showLogin();
      return;
    }

    if (mode === 'unconfigured') {
      showLogin();
      return;
    }

    if (mode === 'supabase') {
      const restored = await restoreSupabaseApp();
      if (restored) {
        await tryCreateClassFromUrl();
        await tryCreateStudentFromUrl();
        return;
      }
    }

    showLogin();
  }

  bootstrap();
})();
