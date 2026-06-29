/**
 * Renderers PWE — vues (dashboard, listes, messages, etc.).
 */
(function () {
  'use strict';

  const { escapeHtml, badge, genderLabel, $, $$ } = window.PweUtils;
  const { ROLE_LABELS, canWriteRoute } = window.PwePermissions;

  const state = {
    navigate: () => {},
    dispatchAction: () => {},
    ensureSchoolCache: () => {},
    ensureSchoolProfile: async () => ({}),
    applySchoolBranding: () => {},
    syncThemeControls: () => {},
    filterRows: () => [],
    rowActions: () => '—',
    getSession: () => null,
    listCache: {},
    selectedMessageId: null,
    homeworkCache: null,
    correspondenceCache: null,
    BUILD: '20260623-37',
  };

  function init(c) {
    Object.assign(state, c);
    if (c.getListCache) state.listCache = c.getListCache();
    if (c.getSelectedMessageId && c.setSelectedMessageId) {
      state.getSelectedMessageId = c.getSelectedMessageId;
      state.setSelectedMessageId = c.setSelectedMessageId;
    }
  }

  const getMsgId = () =>
    state.getSelectedMessageId ? state.getSelectedMessageId() : state.selectedMessageId;
  const setMsgId = (v) => {
    if (state.setSelectedMessageId) state.setSelectedMessageId(v);
    else state.selectedMessageId = v;
  };

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

  function formatMoney(amount) {
    return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
  }

  async function renderDashboard(session) {
    state.ensureSchoolCache(session.schoolId);
    const profile = await state.ensureSchoolProfile(session);
    const dash = await window.PweApi.fetchDashboard(session.schoolId);
    const roleLabel = ROLE_LABELS[session.role] || session.role;

    const greeting = $('#dashboardGreeting');
    if (greeting) greeting.textContent = dashboardGreeting();

    const heroTitle = $('#dashboardHeroTitle');
    if (heroTitle) heroTitle.textContent = profile.name || 'Votre école';

    const heroSub = $('#dashboardHeroSub');
    if (heroSub) {
      const multi = (session.schools || []).length > 1;
      const schoolHint = multi ? `École active ${profile.code || '—'} · ` : '';
      heroSub.textContent = `${schoolHint}Pilotage ${roleLabel.toLowerCase()} — année ${profile.academicYear || '2025-2026'}`;
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
        el.addEventListener('click', () => state.navigate(el.getAttribute('data-dash-route')));
      });
    }

    const stats = [
      {
        key: 'students',
        value: dash.studentsCount,
        label: 'Élèves inscrits',
        hint: 'Effectif actif',
      },
      {
        key: 'classes',
        value: dash.classesCount,
        label: 'Classes actives',
        hint: 'Organisation',
      },
      {
        key: 'staff',
        value: dash.teachersCount,
        label: 'Personnel actif',
        hint: 'Équipe',
      },
      {
        key: 'reports',
        value: dash.reportsPending,
        label: 'Bulletins en attente',
        hint: 'À publier',
      },
      {
        key: 'fees',
        value: dash.feesUnpaid,
        label: 'Frais à relancer',
        hint: 'Impayés / partiels',
      },
      {
        key: 'parents',
        value: dash.parentsLinked,
        label: 'Parents liés',
        hint: 'Comptes connectés',
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
        </button>`;
      })
      .join('');

    $('#dashboardStats').querySelectorAll('[data-dash-route]').forEach((el) => {
      el.addEventListener('click', () => state.navigate(el.getAttribute('data-dash-route')));
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
              const route = t.route || inferTodoRoute(t.text);
              const actionAttr = t.action ? ` data-action="${t.action}"` : '';
              return `
              <li>
                <button type="button" class="dash-todo-item" data-dash-route="${route}"${actionAttr}>
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

    $('#todoList').querySelectorAll('.dash-todo-item').forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.getAttribute('data-action');
        const route = el.getAttribute('data-dash-route');
        if (action) state.dispatchAction(action);
        if (route) state.navigate(route);
      });
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
            state.dispatchAction(action);
            return;
          }
          const r = b.getAttribute('data-qa-route');
          if (r) state.navigate(r);
        });
      });
    }

    await window.PweOnboarding.render(session, profile, {
      navigate,
      dispatchAction,
    });
  }

  async function renderProfile(session) {
    const s = await state.ensureSchoolProfile(session);
    state.applySchoolBranding(s);

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
    if (!state.listCache.classes) {
      state.listCache.classes = await window.PweApi.fetchClasses(session.schoolId);
    }
    const rows = state.filterRows(state.listCache.classes, 'classes', 'classes', [
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
                <td>${state.rowActions(c.id, 'class', { allowDelete: true })}</td>
              </tr>`
            )
            .join('');
  }

  async function renderStudents(session) {
    if (!state.listCache.students) {
      state.listCache.students = await window.PweApi.fetchStudents(session.schoolId);
    }
    const rows = state.filterRows(state.listCache.students, 'students', 'students', [
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
                <td>${s.genderDisplay || genderLabel(s.gender) || '—'}</td>
                <td><span class="parent-count-pill">${s.parents || 0}</span></td>
                <td>${badge(s.status)}</td>
                <td>${state.rowActions(s.id, 'student')}</td>
              </tr>`
            )
            .join('');
  }

  async function renderStatistics(session) {
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
    if (!state.listCache.teachers) {
      state.listCache.teachers = await window.PweApi.fetchTeachers(session.schoolId);
    }
    const rows = state.filterRows(state.listCache.teachers, 'teachers', 'teachers', [
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
    if (!state.listCache.reports) {
      state.listCache.reports = await window.PweApi.fetchReports(session.schoolId);
    }
    const rows = state.filterRows(state.listCache.reports, 'reports', 'reports', [
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
    if (!state.listCache.fees) {
      state.listCache.fees = await window.PweApi.fetchFees(session.schoolId);
    }
    const rows = state.filterRows(state.listCache.fees, 'fees', 'fees', ['student', 'class']);
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
    setMsgId(null);
    $('#messagesPreviewEmpty')?.classList.remove('hidden');
    $('#messagesPreviewCard')?.classList.add('hidden');
    $$('#messagesList .messages-item').forEach((el) => el.classList.remove('active'));
  }

  async function showMessagePreview(message) {
    if (!message) {
      clearMessagePreview();
      return;
    }
    setMsgId(message.id);
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
    const threadEl = $('#messagesPreviewThread');
    const replyBtn = $('#messagesReplyBtn');
    const session = state.getSession();
    const canReply = session && canWriteRoute(session.role, 'messages');
    if (replyBtn) replyBtn.classList.toggle('hidden', !canReply);
    if (threadEl) {
      threadEl.innerHTML = '<p class="messages-thread-empty">Chargement des réponses…</p>';
      try {
        const replies = await window.PweApi.fetchAnnouncementReplies(message.id);
        threadEl.innerHTML = replies.length
          ? replies.map((r) => `
              <article class="messages-reply messages-reply--${r.authorKind === 'parent' ? 'parent' : 'school'}">
                <div class="messages-reply-head">
                  <span class="messages-reply-author">${escapeHtml(r.authorName)}</span>
                  <time>${escapeHtml(r.date)}</time>
                </div>
                <div class="messages-reply-body">${escapeHtml(r.body)}</div>
              </article>`).join('')
          : '<p class="messages-thread-empty">Aucune réponse pour le moment.</p>';
      } catch {
        threadEl.innerHTML = '<p class="messages-thread-empty">Impossible de charger les réponses.</p>';
      }
    }
  }

  async function renderMessages(session) {
    if (!state.listCache.messages) {
      state.listCache.messages = await window.PweApi.fetchMessages(session.schoolId);
    }
    const all = (state.listCache.messages || []).map((m, i) => ({
      ...m,
      id: m.id || `msg-${i}`,
    }));
    state.listCache.messages = all;

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
          <button type="button" class="messages-item${m.unread ? ' messages-item--unread' : ''}${getMsgId() === m.id ? ' active' : ''}"
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

    if (!getMsgId() || !rows.some((m) => m.id === getMsgId())) {
      await showMessagePreview(rows[0]);
    } else {
      await showMessagePreview(all.find((m) => m.id === getMsgId()));
    }
  }

  async function renderSettings(session) {
    const profile = await state.ensureSchoolProfile(session);
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
    set('settingsBuild', state.BUILD);

    const pill = $('#settingsDataPill');
    if (pill) {
      pill.textContent = isDemo ? 'Démo' : 'Live';
      pill.classList.toggle('settings-pill--demo', isDemo);
      pill.classList.toggle('settings-pill--live', !isDemo);
    }

    state.syncThemeControls();
  }

  async function renderStore(session) {
    return window.PweStore.render(session);
  }

  async function renderHomework(session) {
    const active = await window.PweApi.isModuleActive(session.schoolId, 'homework');
    $('#homeworkLocked')?.classList.toggle('hidden', active);
    $('#homeworkContent')?.classList.toggle('hidden', !active);
    $('#homeworkAddBtn')?.classList.toggle('hidden', !active);
    if (!active) return;

    const list = await window.PweApi.fetchHomework(session.schoolId);
    state.homeworkCache = list;
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

  const CORR_TYPE_LABEL = { observation: 'Observation', positive: 'Remarque positive', incident: 'Incident' };

  async function renderCorrespondence(session) {
    const active = await window.PweApi.isModuleActive(session.schoolId, 'correspondence');
    $('#corrLocked')?.classList.toggle('hidden', active);
    $('#corrContent')?.classList.toggle('hidden', !active);
    $('#corrAddBtn')?.classList.toggle('hidden', !active);
    if (!active) return;

    const list = await window.PweApi.fetchCorrespondence(session.schoolId);
    state.correspondenceCache = list;
    const rows = list.filter((c) => c.status !== 'archived');
    $('#corrTable').innerHTML = rows.length === 0
      ? `<tr class="empty-row"><td colspan="6">Aucune entrée. Cliquez sur « Nouvelle entrée ».</td></tr>`
      : rows.map((c) => `
          <tr>
            <td><strong>${escapeHtml(c.student)}</strong></td>
            <td><span class="badge badge-${c.type}">${escapeHtml(CORR_TYPE_LABEL[c.type] || c.type)}</span></td>
            <td>${escapeHtml(c.subject)}</td>
            <td>${escapeHtml(c.content)}</td>
            <td>${c.parentAck ? '<span class="corr-ack">Lu</span>' : '<span class="corr-noack">Non lu</span>'}</td>
            <td>
              <div class="row-actions">
                <button type="button" class="row-action-btn" data-action="archive-correspondence" data-id="${c.id}" title="Archiver" aria-label="Archiver">
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
    correspondence: renderCorrespondence,
    store: renderStore,
    settings: renderSettings,
  };

  window.PweRenderers = { init, RENDERERS, dashboardGreeting };
})();
