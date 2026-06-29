/**
 * Modales PWE — ouverture/fermeture et préremplissage des formulaires.
 */
(function () {
  'use strict';

  const { $, formatGender } = window.PweUtils;

  let ensureSchoolProfile = async () => ({});

  const PARENT_RELATIONSHIP_LABELS = {
    mother: 'Mère',
    father: 'Père',
    guardian: 'Tuteur / Responsable',
    other: 'Autre',
  };

  function init({ ensureSchoolProfile: ensureProfile }) {
    if (ensureProfile) ensureSchoolProfile = ensureProfile;
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    window.PWE_DIAG = window.PWE_DIAG || {};
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

  async function fillStudentClassesSelect(session) {
    const sel = document.getElementById('studentClassSelect');
    if (!sel) return;

    const keep =
      sel.querySelector('option[value=""]')?.outerHTML ||
      '<option value="">— Non assigné —</option>';
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
    const keep =
      sel.querySelector('option[value=""]')?.outerHTML ||
      '<option value="">— Choisir —</option>';
    const students = await window.PweApi.fetchStudentsForSelect(session.schoolId);
    sel.innerHTML =
      keep + students.map((s) => `<option value="${s.id}">${s.label}</option>`).join('');
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
    const keep =
      sel.querySelector('option[value=""]')?.outerHTML ||
      '<option value="">— Non assigné —</option>';
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
    form.firstName.value =
      student.firstName || student.name?.split(' ')[0] || '';
    form.lastName.value = student.lastName || '';
    form.gender.value = formatGender(student.gender) || '';
    form.studentCode.value =
      student.code && student.code !== '—' ? student.code : '';
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
        list.innerHTML =
          '<li class="parent-link-empty">Aucun parent lié pour le moment.</li>';
        return;
      }

      list.innerHTML = parents
        .map((parent) => {
          const rel =
            PARENT_RELATIONSHIP_LABELS[parent.relationship] ||
            parent.relationship ||
            '—';
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

  window.PweModals = {
    init,
    openModal,
    closeModals,
    fillStudentClassesSelect,
    fillStudentSelect,
    fillEditProfileForm,
    fillFeeModalSelects,
    fillEditStudentClassesSelect,
    fillEditClassForm,
    fillEditStudentForm,
    renderStudentParentLinks,
    openLinkStudentParentModal,
  };
})();
