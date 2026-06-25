(function () {
  'use strict';

  const SESSION_KEY = 'pwe_session';
  const THEME_KEY = 'pwe_theme';
  const SIDEBAR_KEY = 'pwe_sidebar';
  const PROFILE_MODE_KEY = 'pwe_profile_mode';
  const ACTIVE_SCHOOL_KEY = 'pwe_active_school_id';
  const BUILD = '20260623-33';

  const PARENT_RELATIONSHIP_LABELS = {
    mother: 'Mère',
    father: 'Père',
    guardian: 'Tuteur / Responsable',
    other: 'Autre',
  };

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
  let storeRequestModuleId = null;
  const storeCache = { modules: null, subs: null };
  let homeworkCache = null;
  let trackHomeworkId = null;

  const DASH_STAT_META = {
    students: { icon: 'i-users', tone: 'teal', route: 'students' },
    classes: { icon: 'i-grid', tone: 'amber', route: 'classes' },
    staff: { icon: 'i-user-check', tone: 'slate', route: 'teachers' },
    reports: { icon: 'i-file-text', tone: 'ocre', route: 'reports' },
    fees: { icon: 'i-credit-card', tone: 'rose', route: 'fees' },
    parents: { icon: 'i-mail', tone: 'teal', route: 'messages' },
  };

  function dashboardGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  function inferTodoRoute(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('bulletin')) return 'reports';
    if (t.includes('frais') || t.includes('paiement')) return 'fees';
    if (t.includes('message') || t.includes('parent')) return 'messages';
    if (t.includes('classe')) return 'classes';
    if (t.includes('élève') || t.includes('eleve')) return 'students';
    return 'dashboard';
  }

  function inferFeedIcon(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('bulletin')) return 'i-file-text';
    if (t.includes('frais') || t.includes('finance')) return 'i-credit-card';
    if (t.includes('message')) return 'i-mail';
    if (t.includes('classe')) return 'i-grid';
    return 'i-chart';
  }
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

  function requireWritableMode() {
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
  const ROUTE_SECTIONS = {
    dashboard: 'Pilotage',
    statistics: 'Pilotage',
    profile: 'Pilotage',
    classes: 'Scolarité',
    students: 'Scolarité',
    teachers: 'Scolarité',
    reports: 'Scolarité',
    fees: 'Administration',
    messages: 'Administration',
    settings: 'Administration',
  };

  const ROUTES = [
    'dashboard',
    'statistics',
    'profile',
    'classes',
    'students',
    'teachers',
    'reports',
    'homework',
    'fees',
    'messages',
    'store',
    'settings',
  ];

  const ROLE_LABELS = {
    school_owner: 'Promoteur',
    school_director: 'Directeur',
    school_secretary: 'Secrétaire',
    school_accountant: 'Comptable',
    teacher: 'Enseignant',
    class_master: 'Maître de classe',
    school_staff: 'Personnel',
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const loginScreen = $('#loginScreen');
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
    listCache = {};
    schoolProfile = null;
    selectedMessageId = null;

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

  function renderSchoolDrawerNav(mode) {
    const nav = $('#schoolDrawerNav');
    if (!nav) return;

    const sections = SCHOOL_DRAWER_NAV[mode] || SCHOOL_DRAWER_NAV.promoter;
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
    renderSchoolDrawerNav(mode);
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

  function sparkline(values) {
    const w = 86;
    const h = 22;
    const pad = 2;
    const v = (values || []).slice(0, 12);
    if (v.length < 2) return '';

    const min = Math.min(...v);
    const max = Math.max(...v);
    const range = Math.max(1e-9, max - min);

    const dx = (w - pad * 2) / (v.length - 1);
    const pts = v
      .map((x, i) => {
        const px = pad + i * dx;
        const py = pad + (1 - (x - min) / range) * (h - pad * 2);
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(' ');

    const last = pts.split(' ').at(-1);
    return `
      <svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Tendance">
        <polyline class="spark-line" points="${pts}" />
        <circle class="spark-dot" cx="${last.split(',')[0]}" cy="${last.split(',')[1]}" r="1.6" />
      </svg>`;
  }

  function stableTrend(seed, scale = 1) {
    // Petit générateur déterministe (pas d'aléatoire global) pour un rendu stable.
    let s = Math.max(1, Number(seed) || 1);
    const out = [];
    for (let i = 0; i < 10; i++) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280; // 0..1
      out.push((0.6 + r * 0.8) * scale);
    }
    return out;
  }

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
    schoolProfile = null;
  }

  function badge(status) {
    return `<span class="badge badge-${status}">${String(status).replace('_', ' ')}</span>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function rowActions(id, type, extra = {}) {
    if (!id) return '—';
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

  function formatMoney(amount) {
    return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
  }

  function clearPweUrlParams() {
    if (!location.search) return;
    const hash = location.hash || '';
    history.replaceState(null, '', `${location.pathname}${hash}`);
  }

  function normalize(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
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

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    window.PWE_DIAG.lastModal = id;
    document.body.classList.add('modal-open');
    const first = el.querySelector(
      '.modal-body input, .modal-body select, .modal-body textarea'
    );
    if (first) window.setTimeout(() => first.focus(), 0);
  }

  function closeModals() {
    document.querySelectorAll('.modal').forEach((m) => {
      m.classList.add('hidden');
      m.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
  }

  async function refreshClasses(session) {
    listCache.classes = null;
    listCache.classes = await window.PweApi.fetchClasses(session.schoolId);
    await renderClasses(session);
  }

  async function refreshStudents(session) {
    listCache.students = null;
    listCache.students = await window.PweApi.fetchStudents(session.schoolId);
    await renderStudents(session);
  }

  async function refreshTeachers(session) {
    listCache.teachers = null;
    listCache.teachers = await window.PweApi.fetchTeachers(session.schoolId);
    await renderTeachers(session);
  }

  async function refreshReports(session) {
    listCache.reports = null;
    await renderReports(session);
  }

  async function refreshFees(session) {
    listCache.fees = null;
    await renderFees(session);
  }

  async function refreshMessages() {
    listCache.messages = null;
    await renderMessages();
  }

  function invalidateSchoolProfile() {
    schoolProfile = null;
  }

  async function fillStudentClassesSelect(session) {
    const sel = document.getElementById('studentClassSelect');
    if (!sel) return;

    const keep = sel.querySelector('option[value=""]')?.outerHTML || '<option value="">— Non assigné —</option>';
    sel.innerHTML = keep;

    const classes = await window.PweApi.fetchClasses(session.schoolId);
    classes
      .filter((c) => c.status === 'active')
      .forEach((c) => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        sel.appendChild(o);
      });
  }

  async function fillStudentSelect(selectId, session) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const keep = sel.querySelector('option[value=""]')?.outerHTML || '<option value="">— Choisir —</option>';
    const students = await window.PweApi.fetchStudentsForSelect(session.schoolId);
    sel.innerHTML = keep + students.map((s) => `<option value="${s.id}">${s.label}</option>`).join('');
  }

  async function fillEditProfileForm(session) {
    const s = await ensureSchoolProfile(session);
    const form = document.getElementById('editProfileForm');
    if (!form) return;
    if (form.schoolCode) form.schoolCode.value = s.code || '—';
    if (form.name) form.name.value = s.name || '';
    if (form.city) form.city.value = s.city || '';
    form.phone.value = s.phone || '';
    form.email.value = s.email || '';
    form.commune.value = s.commune || '';
    form.address.value = s.address || '';
    form.director.value = s.director || '';
    if (form.promoter) form.promoter.value = s.promoter || '';
    form.academicYear.value = s.academicYear || '';
    form.description.value = s.description || '';
  }

  async function fillFeeModalSelects(session) {
    const feeSel = document.getElementById('feeSelect');
    if (!feeSel) return;

    const unpaid = await window.PweApi.fetchUnpaidFees(session.schoolId);
    feeSel.innerHTML =
      '<option value="">— Nouvelle ligne —</option>' +
      unpaid.map((f) => `<option value="${f.feeId}">${f.label}</option>`).join('');

    await fillStudentSelect('feeStudentSelect', session);
  }

  async function fillEditStudentClassesSelect(session, selectedClassId) {
    const sel = document.getElementById('editStudentClassSelect');
    if (!sel) return;
    const keep = sel.querySelector('option[value=""]')?.outerHTML || '<option value="">— Non assigné —</option>';
    sel.innerHTML = keep;

    if (window.PweApi.getMode() === 'supabase') {
      const client = window.PweApi.getClient();
      const { data } = await client
        .from('school_classes')
        .select('id, name, status')
        .eq('school_id', session.schoolId)
        .order('name');
      (data || [])
        .filter((c) => c.status === 'active')
        .forEach((c) => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = c.name;
          sel.appendChild(o);
        });
    } else {
      const classes = await window.PweApi.fetchClasses(session.schoolId);
      classes
        .filter((c) => c.status === 'active')
        .forEach((c) => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = c.name;
          sel.appendChild(o);
        });
    }

    if (selectedClassId) sel.value = selectedClassId;
  }

  function fillEditClassForm(cls) {
    const form = document.getElementById('editClassForm');
    if (!form || !cls) return;
    form.classId.value = cls.id || '';
    form.name.value = cls.name || '';
    form.level.value = cls.level && cls.level !== '—' ? cls.level : '';
    form.academicYear.value = cls.year && cls.year !== '—' ? cls.year : '';
    form.status.value = cls.status || 'active';
  }

  async function fillEditStudentForm(session, student) {
    const form = document.getElementById('editStudentForm');
    if (!form || !student) return;
    form.studentId.value = student.id || '';
    form.firstName.value = student.firstName || student.name?.split(' ')[0] || '';
    form.lastName.value = student.lastName || '';
    form.gender.value = student.gender && student.gender !== '—' ? student.gender : '';
    form.studentCode.value = student.code && student.code !== '—' ? student.code : '';
    form.status.value = student.status || 'active';
    await fillEditStudentClassesSelect(session, student.classId || '');
  }

  async function renderStudentParentLinks(studentId) {
    const list = $('#linkStudentParentList');
    if (!list) return;

    list.innerHTML = '<li class="parent-link-empty">Chargement…</li>';
    try {
      const parents = await window.PweApi.fetchStudentParents(studentId);
      if (!parents.length) {
        list.innerHTML = '<li class="parent-link-empty">Aucun parent lié pour le moment.</li>';
        return;
      }

      list.innerHTML = parents
        .map((parent) => {
          const rel = PARENT_RELATIONSHIP_LABELS[parent.relationship] || parent.relationship || '—';
          return `
            <li class="parent-link-item">
              <div class="parent-link-item-copy">
                <strong>${parent.parentName || '—'}</strong>
                <span><code>${parent.parentCode || '—'}</code> · ${rel}</span>
              </div>
              <button type="button" class="btn secondary-btn btn-sm parent-link-remove"
                data-action="unlink-student-parent" data-id="${parent.id}" title="Retirer ce parent">
                Retirer
              </button>
            </li>`;
        })
        .join('');
    } catch (err) {
      list.innerHTML = `<li class="parent-link-empty">Impossible de charger les parents.${err?.message ? ` (${err.message})` : ''}</li>`;
    }
  }

  async function openLinkStudentParentModal(student) {
    const idInput = $('#linkStudentParentId');
    if (idInput) idInput.value = student.id;

    const sub = $('#linkStudentParentSubtitle');
    if (sub) {
      sub.innerHTML = `Élève : <strong>${student.name}</strong> — liez un ou plusieurs profils parent <code>PAR-…</code>.`;
    }

    const form = document.getElementById('linkStudentParentForm');
    if (form) {
      form.reset();
      const rel = form.querySelector('[name="relationship"]');
      if (rel) rel.value = 'guardian';
    }

    await renderStudentParentLinks(student.id);
    openModal('modalLinkStudentParent');
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

  async function renderDashboard(session) {
    const profile = await ensureSchoolProfile(session);
    const dash = await window.PweApi.fetchDashboard(session.schoolId);
    const roleLabel = ROLE_LABELS[session.role] || session.role;

    const greeting = $('#dashboardGreeting');
    if (greeting) greeting.textContent = dashboardGreeting();

    const heroTitle = $('#dashboardHeroTitle');
    if (heroTitle) heroTitle.textContent = profile.name || 'Votre école';

    const heroSub = $('#dashboardHeroSub');
    if (heroSub) {
      heroSub.textContent = `Pilotage ${roleLabel.toLowerCase()} — année ${profile.academicYear || '2025-2026'}`;
    }

    const heroChips = $('#dashboardHeroChips');
    if (heroChips) {
      heroChips.innerHTML = `
        <span class="dash-hero-chip">
          <svg aria-hidden="true"><use href="#i-calendar"></use></svg>
          ${profile.academicYear || '2025-2026'}
        </span>
        <span class="dash-hero-chip dash-hero-chip--code">
          <svg aria-hidden="true"><use href="#i-building"></use></svg>
          ${profile.code || '—'}
        </span>
        <span class="dash-hero-chip dash-hero-chip--link" data-dash-route="statistics">
          <svg aria-hidden="true"><use href="#i-chart"></use></svg>
          Voir les statistiques
        </span>`;
      heroChips.querySelectorAll('[data-dash-route]').forEach((el) => {
        el.addEventListener('click', () => navigate(el.getAttribute('data-dash-route')));
      });
    }

    const stats = [
      {
        key: 'students',
        value: dash.studentsCount,
        label: 'Élèves inscrits',
        hint: 'Effectif actif',
        trend: stableTrend(dash.studentsCount, 1),
      },
      {
        key: 'classes',
        value: dash.classesCount,
        label: 'Classes actives',
        hint: 'Organisation',
        trend: stableTrend(dash.classesCount, 1),
      },
      {
        key: 'staff',
        value: dash.teachersCount,
        label: 'Personnel actif',
        hint: 'Équipe',
        trend: stableTrend(dash.teachersCount, 1),
      },
      {
        key: 'reports',
        value: dash.reportsPending,
        label: 'Bulletins en attente',
        hint: 'À publier',
        trend: stableTrend(dash.reportsPending + 3, 1),
      },
      {
        key: 'fees',
        value: dash.feesUnpaid,
        label: 'Frais à relancer',
        hint: 'Impayés / partiels',
        trend: stableTrend(dash.feesUnpaid + 5, 1),
      },
      {
        key: 'parents',
        value: dash.parentsLinked,
        label: 'Parents liés',
        hint: 'Comptes connectés',
        trend: stableTrend(dash.parentsLinked + 7, 1),
      },
    ];

    $('#dashboardStats').innerHTML = stats
      .map((s) => {
        const meta = DASH_STAT_META[s.key] || { icon: 'i-chart', tone: 'teal', route: 'dashboard' };
        return `
        <button type="button" class="stat-card stat-card--${meta.tone}" data-dash-route="${meta.route}">
          <div class="stat-card-icon" aria-hidden="true">
            <svg><use href="#${meta.icon}"></use></svg>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">${s.value}</div>
            <div class="stat-card-label">${s.label}</div>
            <div class="stat-card-hint">${s.hint}</div>
          </div>
          <div class="stat-card-spark">${sparkline(s.trend)}</div>
        </button>`;
      })
      .join('');

    $('#dashboardStats').querySelectorAll('[data-dash-route]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-dash-route')));
    });

    const activity = dash.activity || [];
    $('#activityList').innerHTML =
      activity.length === 0
        ? `<li class="dash-empty">Aucune activité récente pour le moment.</li>`
        : activity
            .map(
              (a) => `
              <li class="dash-feed-item">
                <span class="dash-feed-icon">
                  <svg aria-hidden="true"><use href="#${inferFeedIcon(a.text)}"></use></svg>
                </span>
                <div class="dash-feed-copy">
                  <span class="dash-feed-text">${a.text}</span>
                  <span class="dash-feed-time">${a.time}</span>
                </div>
              </li>`
            )
            .join('');

    const todos = dash.todos || [];
    const todoCount = $('#dashboardTodoCount');
    if (todoCount) todoCount.textContent = String(todos.length);

    $('#todoList').innerHTML =
      todos.length === 0
        ? `<li class="dash-empty">Rien en attente — bon travail.</li>`
        : todos
            .map((t) => {
              const route = inferTodoRoute(t.text);
              return `
              <li>
                <button type="button" class="dash-todo-item" data-dash-route="${route}">
                  <span class="dash-todo-dot" aria-hidden="true"></span>
                  <span class="dash-todo-copy">
                    <span class="dash-todo-text">${t.text}</span>
                    <span class="dash-todo-tag">${t.time}</span>
                  </span>
                  <svg class="dash-todo-arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.7a1 1 0 0 0-1.41.04Z" fill="currentColor"/></svg>
                </button>
              </li>`;
            })
            .join('');

    $('#todoList').querySelectorAll('[data-dash-route]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-dash-route')));
    });

    const qa = [
      {
        title: 'Inscrire un élève',
        desc: 'Ajouter et affecter à une classe',
        kpi: `${dash.studentsCount} élèves`,
        route: 'students',
        icon: 'i-users',
        primary: true,
        action: 'add-student',
      },
      {
        title: 'Créer une classe',
        desc: 'Organiser les effectifs',
        kpi: `${dash.classesCount} classes`,
        route: 'classes',
        icon: 'i-grid',
        action: 'add-class',
      },
      {
        title: 'Publier des bulletins',
        desc: 'Finaliser le trimestre',
        kpi: `${dash.reportsPending} en attente`,
        route: 'reports',
        icon: 'i-upload',
        action: 'publish-reports',
      },
      {
        title: 'Message aux parents',
        desc: 'Annonce ou communication',
        kpi: 'Communication',
        route: 'messages',
        icon: 'i-compose',
        action: 'compose-message',
      },
    ];

    const qaEl = $('#quickActions');
    if (qaEl) {
      qaEl.innerHTML = qa
        .map(
          (x) => `
          <button type="button" class="dash-action-btn${x.primary ? ' dash-action-btn--primary' : ''}"
            data-qa-route="${x.route}"${x.action ? ` data-action="${x.action}"` : ''}>
            <span class="dash-action-icon">
              <svg aria-hidden="true"><use href="#${x.icon}"></use></svg>
            </span>
            <span class="dash-action-copy">
              <span class="dash-action-title">${x.title}</span>
              <span class="dash-action-desc">${x.desc}</span>
            </span>
            <span class="dash-action-kpi">${x.kpi}</span>
          </button>`
        )
        .join('');

      qaEl.querySelectorAll('[data-qa-route]').forEach((b) => {
        b.addEventListener('click', (e) => {
          const action = b.getAttribute('data-action');
          if (action) {
            dispatchAction(action);
            return;
          }
          const r = b.getAttribute('data-qa-route');
          if (r) navigate(r);
        });
      });
    }
  }

  async function renderProfile(session) {
    const s = await ensureSchoolProfile(session);
    applySchoolBranding(s);

    const heroTitle = $('#profileHeroTitle');
    if (heroTitle) heroTitle.textContent = s.name || '—';
    const heroSub = $('#profileHeroSub');
    if (heroSub) {
      heroSub.textContent = [s.city, s.code].filter(Boolean).join(' · ') || '—';
    }

    const fields = [
      ['Nom', s.name],
      ['Ville', s.city],
      ['Commune', s.commune],
      ['Adresse', s.address],
      ['Téléphone', s.phone],
      ['Email', s.email],
      ['Code école', s.code],
      ['Directeur', s.director],
      ['Promoteur', s.promoter],
      ['Année scolaire', s.academicYear],
      ['Statut', s.status],
      ['Description', s.description],
    ];

    $('#profileGrid').innerHTML = fields
      .map(
        ([label, val]) => `
        <div class="profile-field panel">
          <label>${label}</label>
          <p>${val || '—'}</p>
        </div>`
      )
      .join('');
  }

  async function renderClasses(session) {
    if (!listCache.classes) {
      listCache.classes = await window.PweApi.fetchClasses(session.schoolId);
    }
    const rows = filterRows(listCache.classes, 'classes', 'classes', [
      'name',
      'level',
      'master',
    ]);
    $('#classesTable').innerHTML =
      rows.length === 0
        ? `<tr class="empty-row"><td colspan="7">Aucune classe ne correspond à vos filtres.</td></tr>`
        : rows
            .map(
              (c) => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.level}</td>
                <td>${c.year}</td>
                <td>${c.master}</td>
                <td>${c.students}</td>
                <td>${badge(c.status)}</td>
                <td>${rowActions(c.id, 'class', { allowDelete: true })}</td>
              </tr>`
            )
            .join('');
  }

  async function renderStudents(session) {
    if (!listCache.students) {
      listCache.students = await window.PweApi.fetchStudents(session.schoolId);
    }
    const rows = filterRows(listCache.students, 'students', 'students', [
      'name',
      'class',
      'code',
    ]);
    $('#studentsTable').innerHTML =
      rows.length === 0
        ? `<tr class="empty-row"><td colspan="7">Aucun élève ne correspond à vos filtres.</td></tr>`
        : rows
            .map(
              (s) => `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.class}</td>
                <td><code>${s.code}</code></td>
                <td>${s.gender}</td>
                <td><span class="parent-count-pill">${s.parents || 0}</span></td>
                <td>${badge(s.status)}</td>
                <td>${rowActions(s.id, 'student')}</td>
              </tr>`
            )
            .join('');
  }

  async function renderStatistics() {
    const s = await window.PweApi.fetchStatistics(session.schoolId);
    const pct = Math.round((Number(s.report_publish_rate) || 0) * 100);

    const overview = [
      { value: s.students_active ?? 0, label: 'Élèves actifs', hint: `${s.students_archived ?? 0} archivés / transférés` },
      { value: s.classes_active ?? 0, label: 'Classes actives', hint: `${s.classes_archived ?? 0} archivées` },
      { value: s.reports_published ?? 0, label: 'Bulletins publiés', hint: `${s.reports_pending ?? 0} en attente` },
      { value: s.fees_unpaid ?? 0, label: 'Frais impayés', hint: formatMoney(s.fees_unpaid_amount) },
      { value: s.announcements_count ?? 0, label: 'Messages envoyés', hint: 'Annonces PWE' },
      { value: `${pct}%`, label: 'Taux publication', hint: `${s.reports_total ?? 0} bulletins au total` },
    ];

    $('#statsOverview').innerHTML = overview
      .map(
        (item) => `
        <div class="stat-card">
          <div class="stat-top">
            <div>
              <div class="value">${item.value}</div>
              <div class="label">${item.label}</div>
              <div class="stat-hint">${item.hint}</div>
            </div>
          </div>
        </div>`
      )
      .join('');

    const byClass = s.students_by_class || [];
    $('#statsByClassTable').innerHTML =
      byClass.length === 0
        ? `<tr class="empty-row"><td colspan="3">Aucune classe active.</td></tr>`
        : byClass
            .map(
              (r) => `
              <tr>
                <td><strong>${r.class_name}</strong></td>
                <td>${r.level || '—'}</td>
                <td>${r.student_count}</td>
              </tr>`
            )
            .join('');

    const avgs = s.class_averages || [];
    $('#statsAveragesTable').innerHTML =
      avgs.length === 0
        ? `<tr class="empty-row"><td colspan="3">Pas encore de moyennes publiées.</td></tr>`
        : avgs
            .map(
              (r) => `
              <tr>
                <td><strong>${r.class_name}</strong></td>
                <td>${String(r.avg_average).replace('.', ',')}</td>
                <td>${r.report_count}</td>
              </tr>`
            )
            .join('');

    const paidAmt = formatMoney(s.fees_paid_amount);
    const unpaidAmt = formatMoney(s.fees_unpaid_amount);
    $('#statsReportProgress').innerHTML = `
      <div class="progress-meta">
        <span>${s.reports_published ?? 0} publiés / ${s.reports_total ?? 0} total</span>
        <span>${pct}%</span>
      </div>
      <div class="progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="progress-foot">
        <span>Frais payés : <strong>${paidAmt}</strong> (${s.fees_paid ?? 0} lignes)</span>
        <span>Impayés : <strong>${unpaidAmt}</strong> (${s.fees_unpaid ?? 0} lignes)</span>
      </div>`;
  }

  async function renderTeachers(session) {
    if (!listCache.teachers) {
      listCache.teachers = await window.PweApi.fetchTeachers(session.schoolId);
    }
    const rows = filterRows(listCache.teachers, 'teachers', 'teachers', [
      'name',
      'code',
      'subject',
      'role',
    ]);
    $('#teachersTable').innerHTML =
      rows.length === 0
        ? `<tr class="empty-row"><td colspan="5">Aucun membre actif trouvé.</td></tr>`
        : rows
            .map(
              (t) => `
              <tr>
                <td><strong>${t.name}</strong></td>
                <td><code>${t.code || t.subject}</code></td>
                <td>${ROLE_LABELS[t.role] || t.role}</td>
                <td>${t.classes}</td>
                <td>${badge(t.status)}</td>
              </tr>`
            )
            .join('');
  }

  async function renderReports(session) {
    if (!listCache.reports) {
      listCache.reports = await window.PweApi.fetchReports(session.schoolId);
    }
    const rows = filterRows(listCache.reports, 'reports', 'reports', [
      'student',
      'class',
      'term',
    ]);
    $('#reportsTable').innerHTML =
      rows.length === 0
        ? `<tr class="empty-row"><td colspan="5">Aucun bulletin ne correspond à vos filtres.</td></tr>`
        : rows
            .map(
              (r) => `
              <tr>
                <td><strong>${r.student}</strong></td>
                <td>${r.class}</td>
                <td>${r.term}</td>
                <td>${r.average}</td>
                <td>${badge(r.status)}</td>
              </tr>`
            )
            .join('');
  }

  async function renderFees(session) {
    if (!listCache.fees) {
      listCache.fees = await window.PweApi.fetchFees(session.schoolId);
    }
    const rows = filterRows(listCache.fees, 'fees', 'fees', ['student', 'class']);
    $('#feesTable').innerHTML =
      rows.length === 0
        ? `<tr class="empty-row"><td colspan="5">Aucune ligne de frais ne correspond à vos filtres.</td></tr>`
        : rows
            .map(
              (f) => `
              <tr>
                <td><strong>${f.student}</strong></td>
                <td>${f.class}</td>
                <td>${f.amount}</td>
                <td>${f.due}</td>
                <td>${badge(f.status)}</td>
              </tr>`
            )
            .join('');
  }

  function messageInitials(from) {
    const parts = String(from || '')
      .replace(/^(parent|walaha)\s*—\s*/i, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (parts[0] || 'M').slice(0, 2).toUpperCase();
  }

  function audienceLabel(audience) {
    if (!audience) return 'Annonce générale';
    if (audience === 'all_parents') return 'Tous les parents';
    return String(audience);
  }

  function filterMessages(rows) {
    const q = ($('#messagesSearch')?.value || '').trim().toLowerCase();
    const f = $('#messagesFilter')?.value || 'all';
    return (rows || []).filter((m) => {
      if (f === 'unread' && !m.unread) return false;
      if (f === 'read' && m.unread) return false;
      if (!q) return true;
      const hay = `${m.from || ''} ${m.subject || ''} ${m.body || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function clearMessagePreview() {
    selectedMessageId = null;
    $('#messagesPreviewEmpty')?.classList.remove('hidden');
    $('#messagesPreviewCard')?.classList.add('hidden');
    $$('#messagesList .messages-item').forEach((el) => el.classList.remove('active'));
  }

  function showMessagePreview(message) {
    if (!message) {
      clearMessagePreview();
      return;
    }
    selectedMessageId = message.id;
    $$('#messagesList .messages-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.messageId === String(message.id));
    });
    $('#messagesPreviewEmpty')?.classList.add('hidden');
    const card = $('#messagesPreviewCard');
    card?.classList.remove('hidden');
    const fromEl = $('#messagesPreviewFrom');
    if (fromEl) fromEl.textContent = message.from || '—';
    const subjectEl = $('#messagesPreviewSubject');
    if (subjectEl) subjectEl.textContent = message.subject || '—';
    const dateEl = $('#messagesPreviewDate');
    if (dateEl) dateEl.textContent = message.date || '—';
    const metaEl = $('#messagesPreviewMeta');
    if (metaEl) {
      metaEl.innerHTML = `
        <span class="messages-preview-chip">${message.unread ? 'Non lu' : 'Lu'}</span>
        <span class="messages-preview-chip">${audienceLabel(message.audience)}</span>`;
    }
    const bodyEl = $('#messagesPreviewBody');
    if (bodyEl) {
      bodyEl.textContent =
        message.body || 'Aucun contenu détaillé pour ce message.';
    }
  }

  async function renderMessages() {
    if (!listCache.messages) {
      listCache.messages = await window.PweApi.fetchMessages(session.schoolId);
    }
    const all = (listCache.messages || []).map((m, i) => ({
      ...m,
      id: m.id || `msg-${i}`,
    }));
    listCache.messages = all;

    const rows = filterMessages(all);
    const unread = all.filter((m) => m.unread).length;
    const read = all.length - unread;

    const statsEl = $('#messagesStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <article class="messages-stat messages-stat--total">
          <span class="messages-stat-value">${all.length}</span>
          <span class="messages-stat-label">Total</span>
        </article>
        <article class="messages-stat messages-stat--unread">
          <span class="messages-stat-value">${unread}</span>
          <span class="messages-stat-label">Non lus</span>
        </article>
        <article class="messages-stat messages-stat--read">
          <span class="messages-stat-value">${read}</span>
          <span class="messages-stat-label">Lus</span>
        </article>`;
    }

    const list = $('#messagesList');
    if (!list) return;

    if (!rows.length) {
      list.innerHTML = `<li class="messages-empty">Aucun message ne correspond à votre recherche.</li>`;
      clearMessagePreview();
      return;
    }

    list.innerHTML = rows
      .map(
        (m) => `
        <li>
          <button type="button" class="messages-item${m.unread ? ' messages-item--unread' : ''}${selectedMessageId === m.id ? ' active' : ''}"
            data-message-id="${m.id}">
            <span class="messages-item-avatar" aria-hidden="true">${messageInitials(m.from)}</span>
            <span class="messages-item-copy">
              <span class="messages-item-top">
                <strong class="messages-item-from">${m.from}</strong>
                <time class="messages-item-date">${m.date}</time>
              </span>
              <span class="messages-item-subject">${m.subject}</span>
              <span class="messages-item-snippet">${m.body || ''}</span>
            </span>
            ${m.unread ? '<span class="messages-item-dot" aria-label="Non lu"></span>' : ''}
          </button>
        </li>`
      )
      .join('');

    list.querySelectorAll('[data-message-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const msg = all.find((m) => String(m.id) === btn.dataset.messageId);
        showMessagePreview(msg);
      });
    });

    if (!selectedMessageId || !rows.some((m) => m.id === selectedMessageId)) {
      showMessagePreview(rows[0]);
    } else {
      showMessagePreview(all.find((m) => m.id === selectedMessageId));
    }
  }

  async function renderSettings(session) {
    const profile = await ensureSchoolProfile(session);
    const roleLabel = ROLE_LABELS[session.role] || session.role;
    const isDemo = window.PweApi.isDemo();

    const set = (id, text) => {
      const el = $(`#${id}`);
      if (el) el.textContent = text;
    };

    set('settingsSchoolName', profile.name || '—');
    set('settingsSchoolCode', profile.code || '—');
    set('settingsRole', roleLabel);
    set('settingsYear', profile.academicYear || '2025-2026');
    set('settingsDataMode', isDemo ? 'Démo locale — données fictives' : 'Production — connecté à Supabase');
    set('settingsBuild', BUILD);

    const pill = $('#settingsDataPill');
    if (pill) {
      pill.textContent = isDemo ? 'Démo' : 'Live';
      pill.classList.toggle('settings-pill--demo', isDemo);
      pill.classList.toggle('settings-pill--live', !isDemo);
    }

    syncThemeControls();
  }

  function storePriceLabel(m) {
    const amount = m.price_amount != null ? Number(m.price_amount).toLocaleString('fr-FR') : null;
    switch (m.pricing_type) {
      case 'included': return 'Inclus';
      case 'quote': return 'Sur devis';
      case 'annual': return amount ? `${amount} FCFA / an` : 'Annuel';
      case 'monthly': return amount ? `${amount} FCFA / mois` : 'Mensuel';
      case 'per_student': return amount ? `${amount} FCFA / élève` : 'Par élève';
      case 'per_school': return amount ? `${amount} FCFA / école` : 'Par école';
      case 'one_time': return amount ? `${amount} FCFA (unique)` : 'Paiement unique';
      default: return amount ? `${amount} FCFA` : '—';
    }
  }

  function storeCtaLabel(m, subStatus) {
    if (subStatus === 'active') return 'Module actif';
    if (subStatus === 'requested') return 'Demande envoyée';
    if (subStatus === 'approved') return 'En attente de paiement';
    if (subStatus === 'suspended') return 'Suspendu';
    if (m.status === 'coming_soon') return 'Bientôt disponible';
    if (m.status === 'quote') return 'Sur devis';
    if (m.status === 'premium_reserved') return 'Réservé';
    return "Demander l'activation";
  }

  function storeCard(m, sub) {
    const subStatus = sub?.status;
    const canRequest =
      ['available', 'beta'].includes(m.status) &&
      !['requested', 'approved', 'active'].includes(subStatus);
    return `
      <article class="store-card">
        <div class="store-card-head">
          <h3>${escapeHtml(m.name)}</h3>
          ${badge(m.status)}
        </div>
        <p class="store-card-cat">${escapeHtml(m.category || '')}</p>
        <p class="store-card-desc">${escapeHtml(m.description || '')}</p>
        <div class="store-card-foot">
          <span class="store-price">${escapeHtml(storePriceLabel(m))}</span>
          <button type="button" class="btn ${canRequest ? 'primary-action' : 'secondary-btn'}" data-action="store-request" data-id="${m.id}"${canRequest ? '' : ' disabled'}>${escapeHtml(storeCtaLabel(m, subStatus))}</button>
        </div>
      </article>`;
  }

  function renderStoreCatalog() {
    const grid = $('#storeCatalog');
    if (!grid) return;
    const modules = storeCache.modules || [];
    const subByModule = {};
    (storeCache.subs || []).forEach((s) => {
      subByModule[s.module_id] = s;
    });

    const searchEl = document.querySelector('[data-search="store"]');
    const catEl = document.querySelector('[data-filter="store"]');
    const q = normalize(searchEl?.value || '');
    const cat = catEl?.value || 'all';

    const filtered = modules.filter((m) => {
      const matchCat = cat === 'all' || m.category === cat;
      if (!q) return matchCat;
      const hay = normalize(`${m.name} ${m.description || ''} ${m.category || ''}`);
      return matchCat && hay.includes(q);
    });

    grid.innerHTML = filtered.length === 0
      ? `<p class="store-empty">Aucun module ne correspond à votre recherche.</p>`
      : filtered.map((m) => storeCard(m, subByModule[m.id])).join('');
  }

  function renderStoreSubs() {
    const modules = storeCache.modules || [];
    const nameOf = (id) => modules.find((m) => m.id === id)?.name || '—';
    const subs = storeCache.subs || [];
    const active = subs.filter((s) => s.status === 'active');
    const pending = subs.filter((s) => ['requested', 'approved'].includes(s.status));

    const activeEl = $('#storeActive');
    if (activeEl) {
      activeEl.innerHTML = active.length
        ? active.map((s) => `<li class="store-sub-item"><span>${escapeHtml(nameOf(s.module_id))}</span>${badge(s.status)}</li>`).join('')
        : '<li class="store-sub-empty">Aucun module actif pour le moment.</li>';
    }
    const pendingEl = $('#storePending');
    if (pendingEl) {
      pendingEl.innerHTML = pending.length
        ? pending.map((s) => `<li class="store-sub-item"><span>${escapeHtml(nameOf(s.module_id))}</span>${badge(s.status)}</li>`).join('')
        : '<li class="store-sub-empty">Aucune demande en attente.</li>';
    }
  }

  async function renderStore(session) {
    const [modules, subs] = await Promise.all([
      window.PweApi.fetchStoreModules(),
      window.PweApi.fetchStoreSubscriptions(session.schoolId),
    ]);
    storeCache.modules = modules;
    storeCache.subs = subs;
    renderStoreCatalog();
    renderStoreSubs();
  }

  async function renderHomework(session) {
    const active = await window.PweApi.isModuleActive(session.schoolId, 'homework');
    $('#homeworkLocked')?.classList.toggle('hidden', active);
    $('#homeworkContent')?.classList.toggle('hidden', !active);
    $('#homeworkAddBtn')?.classList.toggle('hidden', !active);
    if (!active) return;

    const list = await window.PweApi.fetchHomework(session.schoolId);
    homeworkCache = list;
    const rows = list.filter((h) => h.status !== 'archived');
    $('#homeworkTable').innerHTML = rows.length === 0
      ? `<tr class="empty-row"><td colspan="5">Aucun devoir actif. Cliquez sur « Ajouter un devoir ».</td></tr>`
      : rows.map((h) => `
          <tr>
            <td><strong>${escapeHtml(h.title)}</strong>${h.instructions ? `<div class="hw-instr">${escapeHtml(h.instructions)}</div>` : ''}</td>
            <td>${escapeHtml(h.subject)}</td>
            <td>${escapeHtml(h.class)}</td>
            <td>${escapeHtml(h.due)}</td>
            <td>
              <div class="row-actions">
                <button type="button" class="row-action-btn row-action-btn--accent" data-action="homework-track" data-id="${h.id}" title="Suivi des élèves" aria-label="Suivi des élèves">
                  <svg aria-hidden="true" width="14" height="14"><use href="#i-users"></use></svg>
                </button>
                <button type="button" class="row-action-btn" data-action="archive-homework" data-id="${h.id}" title="Archiver" aria-label="Archiver">
                  <svg aria-hidden="true" width="14" height="14"><use href="#i-archive"></use></svg>
                </button>
              </div>
            </td>
          </tr>`).join('');
  }

  const RENDERERS = {
    dashboard: renderDashboard,
    statistics: renderStatistics,
    profile: renderProfile,
    classes: renderClasses,
    students: renderStudents,
    teachers: renderTeachers,
    reports: renderReports,
    fees: renderFees,
    messages: renderMessages,
    homework: renderHomework,
    store: renderStore,
    settings: renderSettings,
  };

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
  }

  async function navigate(route) {
    const session = getSession();
    if (!session) return;

    const r = ROUTES.includes(route) ? route : 'dashboard';

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
      if (RENDERERS[r]) await RENDERERS[r](session);
    } catch (err) {
      showLoadError(err);
      loginError.textContent = err.message || 'Erreur de chargement des données.';
      loginError.classList.remove('hidden');
    }

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
      renderSchoolDrawerNav(mode);
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
      if (RENDERERS[route]) navigate(route);
    });
    el.addEventListener('change', () => {
      const route = (location.hash || '#dashboard').slice(1);
      if (RENDERERS[route]) navigate(route);
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
      if (!requireWritableMode()) return;
      openModal('modalComposeMessage');
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
    document.addEventListener('click', (e) => {
      window.PWE_DIAG.lastClick = {
        t: Date.now(),
        tag: e?.target?.tagName,
        id: e?.target?.id,
        cls: e?.target?.className,
      };
      const btn = findActionElement(e.target);
      if (!btn) return;
      e.preventDefault();
      dispatchAction(btn.getAttribute('data-action'), {
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
      await renderHomework(session);
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
    const result = await window.PweApi.archiveHomework(btn.dataset.id);
    if (!result.ok) {
      safeToast('Archivage impossible', result.error || 'Erreur.');
      return;
    }
    safeToast('Devoir archivé', null);
    await renderHomework(session);
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

  // WalahaStore — ouverture de la demande d'activation.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="store-request"]');
    if (!btn || btn.disabled) return;
    storeRequestModuleId = btn.dataset.id;
    const module = (storeCache.modules || []).find((m) => m.id === storeRequestModuleId);
    const nameEl = document.getElementById('storeRequestModuleName');
    if (nameEl) nameEl.textContent = module?.name || 'ce module';
    openModal('modalStoreRequest');
  });

  document.querySelector('[data-search="store"]')?.addEventListener('input', renderStoreCatalog);
  document.querySelector('[data-filter="store"]')?.addEventListener('change', renderStoreCatalog);

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="store-custom-request"]')) {
      openModal('modalCustomRequest');
    }
  });

  document.getElementById('customRequestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireWritableMode()) return;
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
    if (!requireWritableMode()) return;
    const session = getSession();
    if (!session) return;
    const form = e.target;
    setFormBusy(form, true);
    try {
      const result = await window.PweApi.requestModuleActivation({
        moduleId: storeRequestModuleId,
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
      storeCache.subs = null;
      await renderStore(session);
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
      });
      if (!result.ok) {
        safeToast('Création impossible', result.error || 'Erreur.');
        return;
      }
      closeModals();
      form.reset();
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
    if (!requireWritableMode()) return;
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
