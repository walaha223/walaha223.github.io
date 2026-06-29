/**
 * Guide première connexion PWE — profil → classes → élèves → parents PAR-.
 */
(function () {
  'use strict';

  const { escapeHtml, $ } = window.PweUtils;
  const DISMISS_KEY = 'pwe_onboarding_dismiss';

  const STEPS = [
    {
      id: 'profile',
      label: 'Compléter le profil école',
      hint: 'Téléphone, adresse, directeur',
      route: 'profile',
      action: 'edit-school-profile',
    },
    {
      id: 'classes',
      label: 'Créer une première classe',
      hint: 'Organisation scolaire',
      route: 'classes',
      action: 'add-class',
    },
    {
      id: 'students',
      label: 'Inscrire des élèves',
      hint: 'Prénom, nom, classe',
      route: 'students',
      action: 'add-student',
    },
    {
      id: 'parents',
      label: 'Lier des parents (code PAR-)',
      hint: 'Depuis la fiche élève',
      route: 'students',
      action: null,
    },
  ];

  function dismissKey(schoolId) {
    return `${DISMISS_KEY}_${schoolId}`;
  }

  function isDismissed(schoolId) {
    try {
      return localStorage.getItem(dismissKey(schoolId)) === '1';
    } catch {
      return false;
    }
  }

  function dismiss(schoolId) {
    try {
      localStorage.setItem(dismissKey(schoolId), '1');
    } catch {
      /* ignore */
    }
  }

  async function evaluateSteps(session, profile) {
    const api = window.PweApi;
    const [classes, students] = await Promise.all([
      api.fetchClasses(session.schoolId),
      api.fetchStudents(session.schoolId),
    ]);
    const activeClasses = (classes || []).filter((c) => c.status === 'active');
    const activeStudents = (students || []).filter((s) => s.status === 'active');
    const studentsWithParents = activeStudents.filter((s) => (s.parents || 0) > 0);

    const profileOk = Boolean(
      profile?.phone && profile?.address && (profile?.director || profile?.promoter)
    );

    return STEPS.map((step) => {
      let done = false;
      if (step.id === 'profile') done = profileOk;
      if (step.id === 'classes') done = activeClasses.length > 0;
      if (step.id === 'students') done = activeStudents.length > 0;
      if (step.id === 'parents') {
        done = activeStudents.length > 0 && studentsWithParents.length > 0;
      }
      return { ...step, done };
    });
  }

  function renderPanel(steps, { onNavigate, onAction, onDismiss }) {
    const panel = $('#onboardingPanel');
    if (!panel) return;
    const doneCount = steps.filter((s) => s.done).length;
    if (doneCount === steps.length) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    const pct = Math.round((doneCount / steps.length) * 100);
    const progress = $('#onboardingProgress');
    if (progress) {
      progress.style.width = `${pct}%`;
      progress.setAttribute('aria-valuenow', String(pct));
    }
    const countEl = $('#onboardingStepCount');
    if (countEl) countEl.textContent = `${doneCount}/${steps.length}`;

    const list = $('#onboardingSteps');
    if (!list) return;
    list.innerHTML = steps
      .map((step, i) => {
        const state = step.done ? 'done' : (steps.slice(0, i).every((s) => s.done) ? 'current' : 'pending');
        return `
          <li class="onboarding-step onboarding-step--${state}">
            <span class="onboarding-step-marker" aria-hidden="true">${step.done ? '✓' : i + 1}</span>
            <div class="onboarding-step-copy">
              <strong>${escapeHtml(step.label)}</strong>
              <span>${escapeHtml(step.hint)}</span>
            </div>
            ${step.done ? '' : `
              <button type="button" class="btn secondary-btn btn-sm onboarding-step-cta"
                data-onboarding-route="${step.route}"${step.action ? ` data-onboarding-action="${step.action}"` : ''}>
                ${step.id === 'parents' ? 'Voir les élèves' : 'Commencer'}
              </button>`}
          </li>`;
      })
      .join('');

    list.querySelectorAll('[data-onboarding-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.onboardingRoute;
        const action = btn.dataset.onboardingAction;
        if (action && onAction) onAction(action);
        if (route && onNavigate) onNavigate(route);
      });
    });

    $('#onboardingDismissBtn')?.addEventListener('click', () => {
      onDismiss?.();
      panel.classList.add('hidden');
    }, { once: true });
  }

  async function render(session, profile, { navigate, dispatchAction }) {
    if (!session?.schoolId) return;
    const role = session.role;
    if (!['school_owner', 'school_director', 'school_secretary'].includes(role)) {
      $('#onboardingPanel')?.classList.add('hidden');
      return;
    }
    if (isDismissed(session.schoolId)) {
      $('#onboardingPanel')?.classList.add('hidden');
      return;
    }
    const steps = await evaluateSteps(session, profile);
    renderPanel(steps, {
      onNavigate: (route) => navigate?.(route),
      onAction: (action) => dispatchAction?.(action),
      onDismiss: () => dismiss(session.schoolId),
    });
  }

  function buildTodos(steps) {
    return steps
      .filter((s) => !s.done)
      .map((s) => ({
        text: s.label,
        time: 'Démarrage',
        route: s.route,
        action: s.action,
      }));
  }

  window.PweOnboarding = {
    STEPS,
    evaluateSteps,
    render,
    buildTodos,
    dismiss,
    isDismissed,
  };
})();
