/**
 * Couche données PWE — Supabase (production) ou démo locale explicite (?demo=1).
 */
(function () {
  'use strict';

  let client = null;
  let mode = 'unconfigured'; // 'supabase' | 'demo' | 'unconfigured'

  function isDemoMode() {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('demo') === '1') {
      sessionStorage.setItem('pwe_demo', '1');
      return true;
    }
    // Ne pas rester bloqué en démo après un test ?demo=1 dans le même onglet
    sessionStorage.removeItem('pwe_demo');
    localStorage.removeItem('pwe_demo');
    if (window.PWE_SUPABASE?.demo === true) return true;
    return false;
  }

  function isConfigured() {
    const cfg = window.PWE_SUPABASE;
    return Boolean(
      cfg?.url &&
        cfg?.anonKey &&
        cfg.anonKey !== 'your-publishable-or-anon-key'
    );
  }

  function getConfigError() {
    if (isDemoMode()) return null;
    if (!window.supabase?.createClient) {
      return 'Service d’authentification non chargé.';
    }
    if (!isConfigured()) {
      return 'Configuration du portail manquante.';
    }
    return null;
  }

  function init() {
    if (isDemoMode()) {
      client = null;
      mode = 'demo';
      return mode;
    }

    if (!isConfigured() || !window.supabase?.createClient) {
      client = null;
      mode = 'unconfigured';
      return mode;
    }

    client = window.supabase.createClient(
      window.PWE_SUPABASE.url,
      window.PWE_SUPABASE.anonKey
    );
    mode = 'supabase';
    return mode;
  }

  function getMode() {
    return mode;
  }

  function isDemo() {
    return mode === 'demo';
  }

  function getClient() {
    return client;
  }

  function requireClient() {
    if (mode === 'demo') {
      throw new Error('Action indisponible en démo locale.');
    }
    if (!client) {
      throw new Error(getConfigError() || 'Portail non configuré.');
    }
    return client;
  }

  async function restoreAuthSession() {
    if (mode !== 'supabase') return null;

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;

    // Supabase hydrate parfois la session après le premier getSession() au rechargement
    return new Promise((resolve) => {
      let done = false;
      const finish = (session) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        subscription?.unsubscribe();
        resolve(session || null);
      };

      const timer = setTimeout(() => finish(null), 3000);
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') finish(session);
        if (event === 'SIGNED_IN' && session) finish(session);
      });
      const subscription = data?.subscription;
    });
  }

  function bindAuthListener(onSignedOut) {
    if (mode !== 'supabase' || !client) return;
    client.auth.onAuthStateChange((event, authSession) => {
      if (event === 'SIGNED_OUT') onSignedOut?.();
    });
  }

  async function fetchUserProfile() {
    if (mode === 'demo') {
      return {
        avatarUrl: null,
        displayName: window.PWE_MOCK.staffSession?.name || null,
      };
    }

    const c = requireClient();
    const { data: authData, error: authErr } = await c.auth.getUser();
    if (authErr || !authData?.user) return null;

    const user = authData.user;
    const meta = user.user_metadata || {};
    const { data, error } = await c
      .from('users')
      .select('avatar_url, display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error && !error.message?.includes('does not exist')) {
      console.warn('[PWE] fetchUserProfile', error.message);
    }

    return {
      userId: user.id,
      avatarUrl: data?.avatar_url || meta.avatar_url || meta.picture || null,
      displayName: data?.display_name || meta.full_name || meta.name || null,
    };
  }

  async function fetchStaffSession() {
    if (mode === 'demo') {
      const school = getDemoSchool();
      const cred = window.PWE_MOCK.staffSession || {};
      return {
        role: school.role || cred.role || 'school_owner',
        school: {
          id: school.id,
          name: school.name,
          public_code: school.code,
          city: school.city,
          commune: school.commune,
          academic_year: school.academicYear,
          portal_status: school.portalStatus || school.status,
          logo_url: school.logoUrl || null,
          director_name: school.director,
          promoter_name: school.promoter,
        },
      };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_get_staff_session');
    if (error) throw error;
    return data;
  }

  function normalizeSchoolListItem(row) {
    return {
      id: row.id,
      code: row.public_code,
      name: row.name,
      city: row.city || '—',
      commune: row.commune || '',
      schoolType: row.school_type,
      portalStatus: row.portal_status,
      logoUrl: row.logo_url || null,
      academicYear: row.academic_year || '2025-2026',
      role: row.role || 'school_staff',
      isActive: Boolean(row.is_active),
      isOwner: Boolean(row.is_owner),
    };
  }

  function getDemoSchool() {
    const schools = window.PWE_MOCK.schools || [];
    const saved = localStorage.getItem('pwe_active_school_id');
    const base = schools.find((s) => s.id === saved) || schools[0] || window.PWE_MOCK.school;
    const overrides = getDemoSchoolOverrides(base.id);
    return { ...base, ...overrides };
  }

  function getDemoSchoolBundle(schoolId) {
    const id = schoolId || getDemoSchool().id;
    return window.PWE_MOCK.schoolData?.[id] || window.PWE_MOCK.schoolData?.['sch-faso-kanu'] || {};
  }

  const DEMO_SCHOOL_OVERRIDES_KEY = 'pwe_demo_school_overrides';

  function getDemoSchoolOverrides(schoolId) {
    try {
      const all = JSON.parse(localStorage.getItem(DEMO_SCHOOL_OVERRIDES_KEY) || '{}');
      return all[schoolId] || {};
    } catch {
      return {};
    }
  }

  function saveDemoSchoolOverrides(schoolId, patch) {
    const all = JSON.parse(localStorage.getItem(DEMO_SCHOOL_OVERRIDES_KEY) || '{}');
    all[schoolId] = { ...(all[schoolId] || {}), ...patch };
    localStorage.setItem(DEMO_SCHOOL_OVERRIDES_KEY, JSON.stringify(all));
    const school = (window.PWE_MOCK.schools || []).find((s) => s.id === schoolId);
    if (school) Object.assign(school, patch);
  }

  async function fetchUserSchools() {
    if (mode === 'demo') {
      const activeId = getDemoSchool().id;
      return (window.PWE_MOCK.schools || []).map((s) => {
        const overrides = getDemoSchoolOverrides(s.id);
        return {
          id: s.id,
          code: s.code,
          name: overrides.name || s.name,
          city: overrides.city || s.city,
          commune: overrides.commune || s.commune,
          portalStatus: s.status || s.portalStatus,
          logoUrl: overrides.logoUrl ?? s.logoUrl ?? null,
          academicYear: overrides.academicYear || s.academicYear,
          role: s.role || 'school_owner',
          isActive: s.id === activeId,
          isOwner: true,
        };
      });
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_list_user_schools');
    if (error) throw error;
    return (data || []).map(normalizeSchoolListItem);
  }

  async function setActiveSchool(schoolId) {
    if (!schoolId) return { ok: false, error: 'École invalide.' };
    if (mode === 'demo') {
      const schools = window.PWE_MOCK.schools || [];
      const school = schools.find((s) => s.id === schoolId);
      if (!school) return { ok: false, error: 'École introuvable.' };
      localStorage.setItem('pwe_active_school_id', schoolId);
      const cred = window.PWE_MOCK.staffSession || {};
      return {
        ok: true,
        staffSession: {
          role: school.role || cred.role || 'school_owner',
          school: {
            id: school.id,
            name: school.name,
            public_code: school.code,
            city: school.city,
            commune: school.commune,
            academic_year: school.academicYear,
            portal_status: school.portalStatus || school.status,
            logo_url: school.logoUrl || null,
            director_name: school.director,
            promoter_name: school.promoter,
          },
        },
      };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_set_active_school', { p_school_id: schoolId });
    if (error) return { ok: false, error: error.message || 'Changement d’école impossible.' };
    return { ok: true, staffSession: data };
  }

  async function loginSupabase(email, password) {
    const c = requireClient();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const schools = await fetchUserSchools();
    if (!schools.length) {
      await c.auth.signOut();
      throw new Error(
        "Compte sans accès PWE. L'école doit être validée (WAC) et votre utilisateur ajouté dans school_staff."
      );
    }

    const savedSchoolId = localStorage.getItem('pwe_active_school_id');
    const initialSchool =
      schools.find((s) => s.id === savedSchoolId) || schools.find((s) => s.isActive) || schools[0];
    const activate = await setActiveSchool(initialSchool.id);
    if (!activate.ok) {
      await c.auth.signOut();
      throw new Error(activate.error || 'Impossible de sélectionner l’école active.');
    }

    const staffSession = activate.staffSession || (await fetchStaffSession());
    if (!staffSession) {
      await c.auth.signOut();
      throw new Error(
        "Compte sans accès PWE. L'école doit être validée (WAC) et votre utilisateur ajouté dans school_staff."
      );
    }

    const userProfile = await fetchUserProfile();
    localStorage.setItem('pwe_active_school_id', staffSession.school.id);

    return {
      email: data.user.email,
      userId: data.user.id,
      name: userProfile?.displayName || staffSession.school?.director_name || data.user.email,
      avatarUrl: userProfile?.avatarUrl || null,
      role: staffSession.role,
      schoolId: staffSession.school.id,
      staffSession,
      schools: await fetchUserSchools(),
    };
  }

  async function logoutSupabase() {
    if (client) await client.auth.signOut();
  }

  async function countRows(table, schoolId, extraFilter) {
    const c = requireClient();
    let q = c.from(table).select('id', { count: 'exact', head: true }).eq('school_id', schoolId);
    if (extraFilter) q = extraFilter(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  async function fetchDashboard(schoolId) {
    if (mode === 'demo') {
      const school = schoolId
        ? { ...((window.PWE_MOCK.schools || []).find((s) => s.id === schoolId) || getDemoSchool()), ...getDemoSchoolOverrides(schoolId) }
        : getDemoSchool();
      const bundle = getDemoSchoolBundle(school.id);
      const dashboard = bundle.dashboard || {};
      return {
        studentsCount: school.studentsCount,
        classesCount: school.classesCount,
        teachersCount: school.teachersCount,
        reportsPending: dashboard.reportsPending,
        feesUnpaid: dashboard.feesUnpaid,
        parentsLinked: school.parentsLinked,
        activity: bundle.activity || [],
        todos: [
          { text: `${dashboard.reportsPending || 0} bulletins à valider`, time: 'Bulletins' },
          { text: `${dashboard.feesUnpaid || 0} frais en retard`, time: 'Finances' },
          { text: `${dashboard.recentMessages || 0} messages récents`, time: 'Communication' },
          { text: `${dashboard.needsOpen || 0} demandes ouvertes`, time: 'Administration' },
        ],
      };
    }

    const [
      studentsCount,
      classesCount,
      staffCount,
      reportsPending,
      feesUnpaid,
    ] = await Promise.all([
      countRows('school_students', schoolId, (q) => q.eq('status', 'active')),
      countRows('school_classes', schoolId, (q) => q.eq('status', 'active')),
      countRows('school_staff', schoolId, (q) => q.eq('status', 'active')),
      countRows('school_reports', schoolId, (q) => q.in('status', ['draft', 'ready'])),
      countRows('school_fees', schoolId, (q) => q.in('status', ['unpaid', 'partial', 'overdue'])),
    ]);

    return {
      studentsCount,
      classesCount,
      teachersCount: staffCount,
      reportsPending,
      feesUnpaid,
      parentsLinked: 0,
      activity: [
        { text: `${reportsPending} bulletins en cours`, time: "Aujourd'hui" },
        { text: `${feesUnpaid} frais à relancer`, time: 'Finances' },
      ],
      todos: [
        { text: `${reportsPending} bulletins à valider`, time: 'Bulletins' },
        { text: `${feesUnpaid} frais en retard`, time: 'Finances' },
      ],
    };
  }

  async function fetchSchoolProfile(staffSession) {
    if (mode === 'demo') return getDemoSchool();

    const s = staffSession.school;
    return {
      code: s.public_code,
      name: s.name,
      city: s.city,
      commune: s.commune,
      address: s.address,
      phone: s.phone,
      email: s.email,
      director: s.director_name,
      promoter: s.promoter_name,
      academicYear: s.academic_year || '2025-2026',
      status: s.portal_status,
      logoUrl: s.logo_url || null,
      description: s.description || `${s.school_type || 'École'} — ${s.city || 'Mali'}`,
    };
  }

  async function updateSchoolProfile(fields) {
    if (mode === 'demo') {
      const school = getDemoSchool();
      const patch = {
        name: fields.name != null ? String(fields.name).trim() : undefined,
        city: fields.city != null ? String(fields.city).trim() : undefined,
        phone: fields.phone != null ? String(fields.phone).trim() : undefined,
        email: fields.email != null ? String(fields.email).trim() : undefined,
        commune: fields.commune != null ? String(fields.commune).trim() : undefined,
        address: fields.address != null ? String(fields.address).trim() : undefined,
        director: fields.director != null ? String(fields.director).trim() : undefined,
        promoter: fields.promoter != null ? String(fields.promoter).trim() : undefined,
        academicYear: fields.academicYear != null ? String(fields.academicYear).trim() : undefined,
        description: fields.description != null ? String(fields.description) : undefined,
        logoUrl: fields.logoUrl != null ? String(fields.logoUrl).trim() || null : undefined,
      };
      Object.keys(patch).forEach((k) => {
        if (patch[k] === undefined) delete patch[k];
      });
      if (!patch.name) return { ok: false, error: 'Le nom de l’établissement est requis.' };
      saveDemoSchoolOverrides(school.id, patch);
      return { ok: true, data: { school_id: school.id } };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_update_school_profile', {
      p_name: fields.name ?? null,
      p_city: fields.city ?? null,
      p_phone: fields.phone ?? null,
      p_address: fields.address ?? null,
      p_commune: fields.commune ?? null,
      p_contact_email: fields.email ?? null,
      p_director_name: fields.director ?? null,
      p_promoter_name: fields.promoter ?? null,
      p_description: fields.description ?? null,
      p_academic_year: fields.academicYear ?? null,
      p_logo_url: fields.logoUrl ?? null,
    });

    if (error) return { ok: false, error: error.message || 'Mise à jour impossible.' };
    return { ok: true, data };
  }

  async function fetchClasses(schoolId) {
    if (mode === 'demo') return getDemoSchoolBundle(schoolId).classes || [];

    const c = requireClient();
    const { data, error } = await c
      .from('school_classes')
      .select('id, name, level, academic_year, status, class_master_user_id')
      .eq('school_id', schoolId)
      .order('name');

    if (error) throw error;

    return Promise.all(
      (data || []).map(async (row) => {
        const { count } = await c
          .from('school_students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', row.id)
          .eq('status', 'active');
        return {
          id: row.id,
          name: row.name,
          level: row.level || '—',
          year: row.academic_year || '—',
          master: row.class_master_user_id ? 'Assigné' : '—',
          students: count ?? 0,
          status: row.status,
        };
      })
    );
  }

  async function fetchStudents(schoolId) {
    if (mode === 'demo') {
      const bundle = getDemoSchoolBundle(schoolId);
      const links = getDemoStudentParentLinks(schoolId);
      const counts = {};
      links.forEach((l) => {
        counts[l.studentId] = (counts[l.studentId] || 0) + 1;
      });
      return (bundle.students || []).map((s) => ({
        ...s,
        parents: counts[s.id] ?? s.parents ?? 0,
      }));
    }

    const c = requireClient();
    const { data, error } = await c
      .from('school_students')
      .select(
        'id, first_name, last_name, class_id, student_code, gender, status, school_classes(name)'
      )
      .eq('school_id', schoolId)
      .order('last_name');

    if (error) throw error;

    let parentCounts = {};
    try {
      const { data: links, error: linksErr } = await c
        .from('school_student_parents')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('status', 'active');
      if (!linksErr && links) {
        links.forEach((l) => {
          parentCounts[l.student_id] = (parentCounts[l.student_id] || 0) + 1;
        });
      }
    } catch {
      /* table absente avant migration */
    }

    return (data || []).map((s) => ({
      id: s.id,
      classId: s.class_id,
      firstName: s.first_name,
      lastName: s.last_name || '',
      name: `${s.first_name} ${s.last_name || ''}`.trim(),
      class: s.school_classes?.name || '—',
      code: s.student_code || '—',
      gender: s.gender || '—',
      status: s.status,
      parents: parentCounts[s.id] || 0,
    }));
  }

  const DEMO_PARENT_LINKS_KEY = 'pwe_demo_student_parent_links';

  function getAllDemoStudentParentLinksRaw() {
    try {
      const raw = localStorage.getItem(DEMO_PARENT_LINKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function collectDefaultDemoParentLinks() {
    const out = [];
    Object.values(window.PWE_MOCK.schoolData || {}).forEach((bundle) => {
      (bundle.studentParentLinks || []).forEach((l) => out.push({ ...l }));
    });
    return out;
  }

  function findDemoSchoolIdForStudent(studentId) {
    for (const [id, bundle] of Object.entries(window.PWE_MOCK.schoolData || {})) {
      if ((bundle.students || []).some((s) => s.id === studentId)) return id;
    }
    return getDemoSchool().id;
  }

  function getDemoStudentParentLinks(schoolId) {
    const bundle = getDemoSchoolBundle(schoolId);
    const studentIds = new Set((bundle.students || []).map((s) => s.id));
    const stored = getAllDemoStudentParentLinksRaw();
    if (stored) {
      return stored.filter((l) => studentIds.has(l.studentId));
    }
    return (bundle.studentParentLinks || []).map((l) => ({ ...l }));
  }

  function saveDemoStudentParentLinksForSchool(schoolId, schoolLinks) {
    const bundle = getDemoSchoolBundle(schoolId);
    const studentIds = new Set((bundle.students || []).map((s) => s.id));
    const stored = getAllDemoStudentParentLinksRaw();
    const base = stored || collectDefaultDemoParentLinks();
    const other = base.filter((l) => !studentIds.has(l.studentId));
    localStorage.setItem(DEMO_PARENT_LINKS_KEY, JSON.stringify([...other, ...schoolLinks]));
  }

  async function fetchStudentParents(studentId) {
    if (mode === 'demo') {
      const schoolId = findDemoSchoolIdForStudent(studentId);
      return getDemoStudentParentLinks(schoolId)
        .filter((l) => l.studentId === studentId)
        .map((l) => ({
          id: l.id,
          parentCode: l.parentCode,
          parentName: l.parentName,
          relationship: l.relationship || 'guardian',
        }));
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_list_student_parents', {
      p_student_id: studentId,
    });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      parentCode: row.parent_code,
      parentName: row.parent_name,
      relationship: row.relationship || 'guardian',
    }));
  }

  async function linkStudentParent({ studentId, parentCode, relationship }) {
    const code = String(parentCode || '')
      .trim()
      .toUpperCase();
    if (!code) return { ok: false, error: 'Code PAR- requis.' };
    if (!code.startsWith('PAR-')) {
      return { ok: false, error: 'Utilisez un code parent PAR- (profil WalahaTracker).' };
    }

    if (mode === 'demo') {
      const directory = window.PWE_MOCK.parentDirectory || [];
      const parent = directory.find((p) => p.code.toUpperCase() === code);
      if (!parent) {
        return {
          ok: false,
          error: 'Code PAR- introuvable en démo. Essayez PAR-DIALLO-F-12003 ou PAR-TRAORE-A-12001.',
        };
      }
      const schoolId = findDemoSchoolIdForStudent(studentId);
      const links = getDemoStudentParentLinks(schoolId);
      if (links.some((l) => l.studentId === studentId && l.parentCode.toUpperCase() === code)) {
        return { ok: false, error: 'Ce parent est déjà lié à cet élève.' };
      }
      const link = {
        id: `spl-demo-${Date.now()}`,
        studentId,
        parentCode: parent.code,
        parentName: parent.name,
        relationship: relationship || 'guardian',
      };
      saveDemoStudentParentLinksForSchool(schoolId, [...links, link]);
      return { ok: true, data: link };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_link_student_parent', {
      p_student_id: studentId,
      p_parent_code: code,
      p_relationship: relationship || 'guardian',
    });
    if (error) return { ok: false, error: error.message || 'Liaison impossible.' };
    return { ok: true, data };
  }

  async function unlinkStudentParent(linkId) {
    if (!linkId) return { ok: false, error: 'Lien invalide.' };

    if (mode === 'demo') {
      const stored = getAllDemoStudentParentLinksRaw() || collectDefaultDemoParentLinks();
      const target = stored.find((l) => l.id === linkId);
      if (!target) return { ok: false, error: 'Lien introuvable.' };
      const schoolId = findDemoSchoolIdForStudent(target.studentId);
      const links = getDemoStudentParentLinks(schoolId).filter((l) => l.id !== linkId);
      saveDemoStudentParentLinksForSchool(schoolId, links);
      return { ok: true };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_unlink_student_parent', {
      p_link_id: linkId,
    });
    if (error) return { ok: false, error: error.message || 'Suppression impossible.' };
    return { ok: true, data };
  }

  async function updateClass({ classId, name, level, academicYear, status }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_update_class', {
      p_class_id: classId,
      p_name: name ?? null,
      p_level: level ?? null,
      p_academic_year: academicYear ?? null,
      p_status: status ?? null,
    });

    if (error) return { ok: false, error: error.message || 'Mise à jour impossible.' };
    return { ok: true, data };
  }

  async function archiveClass(classId) {
    return updateClass({ classId, status: 'archived' });
  }

  async function deleteClass(classId, schoolId) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();

    async function deleteClassDirect() {
      let q = c
        .from('school_students')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('status', 'active');
      if (schoolId) q = q.eq('school_id', schoolId);

      const { count, error: countErr } = await q;
      if (countErr) return { ok: false, error: countErr.message };

      if ((count ?? 0) > 0) {
        return {
          ok: false,
          error: `Impossible de supprimer : ${count} élève(s) actif(s) encore dans cette classe. Réaffectez-les ou archivez la classe.`,
        };
      }

      let del = c.from('school_classes').delete().eq('id', classId);
      if (schoolId) del = del.eq('school_id', schoolId);
      const { error: delErr } = await del;
      if (delErr) return { ok: false, error: delErr.message };
      return { ok: true, data: { class_id: classId } };
    }

    const { data, error } = await c.rpc('pwe_delete_class', {
      p_class_id: classId,
    });

    if (!error) return { ok: true, data };

    const msg = error.message || '';
    if (
      msg.includes('Could not find the function') ||
      msg.includes('PGRST202') ||
      msg.includes('schema cache')
    ) {
      return deleteClassDirect();
    }

    return { ok: false, error: msg || 'Suppression impossible.' };
  }

  async function updateStudent({
    studentId,
    firstName,
    lastName,
    classId,
    gender,
    studentCode,
    status,
    clearClass,
  }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_update_student', {
      p_student_id: studentId,
      p_first_name: firstName ?? null,
      p_last_name: lastName ?? null,
      p_class_id: classId || null,
      p_gender: gender || null,
      p_student_code: studentCode ?? null,
      p_status: status ?? null,
      p_clear_class: Boolean(clearClass),
    });

    if (error) return { ok: false, error: error.message || 'Mise à jour impossible.' };
    return { ok: true, data };
  }

  async function archiveStudent(studentId) {
    return updateStudent({ studentId, status: 'archived' });
  }

  async function fetchStatistics(schoolId) {
    if (mode === 'demo') return getDemoSchoolBundle(schoolId).statistics || {};

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_get_school_statistics');
    if (error) throw error;
    return data;
  }

  async function fetchTeachers(schoolId) {
    if (mode === 'demo') return getDemoSchoolBundle(schoolId).teachers || [];

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_list_school_staff');
    if (error) throw error;

    return (data || []).map((t) => ({
      name: t.name || t.email || '—',
      subject: t.walaha_code || t.email || '—',
      code: t.walaha_code || '—',
      role: t.role,
      classes: '—',
      status: t.status,
    }));
  }

  async function inviteStaff({ memberCode, role }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const code = String(memberCode || '').trim().toUpperCase();
    if (!code) {
      return { ok: false, error: 'Code Walaha requis (ENS-… ou PAR-…).' };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_invite_school_staff_by_code', {
      p_code: code,
      p_role: role,
    });

    if (error) {
      const msg = error.message || '';
      if (
        msg.includes('Could not find the function') ||
        msg.includes('PGRST202') ||
        msg.includes('schema cache')
      ) {
        return inviteStaffByCodeDirect(c, code, role);
      }
      return { ok: false, error: msg || 'Liaison impossible.' };
    }
    return { ok: true, data };
  }

  async function inviteStaffByCodeDirect(c, code, role) {
    let userId = null;
    let publicCode = code;
    let fullName = null;

    if (code.startsWith('ENS-')) {
      const { data, error } = await c
        .from('canonical_teachers')
        .select('user_id, public_code, full_name')
        .eq('public_code', code)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) return { ok: false, error: error.message };
      if (!data) return { ok: false, error: 'Code ENS- introuvable.' };
      userId = data.user_id;
      publicCode = data.public_code;
      fullName = data.full_name;
    } else if (code.startsWith('PAR-')) {
      const { data, error } = await c
        .from('canonical_parents')
        .select('user_id, public_code, full_name')
        .eq('public_code', code)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) return { ok: false, error: error.message };
      if (!data) return { ok: false, error: 'Code PAR- introuvable.' };
      userId = data.user_id;
      publicCode = data.public_code;
      fullName = data.full_name;
    } else {
      return { ok: false, error: 'Code non reconnu — utilisez ENS- ou PAR-.' };
    }

    if (!userId) {
      return {
        ok: false,
        error: `Profil ${publicCode} sans compte Walaha. Demandez au membre de se connecter dans l'app.`,
      };
    }

    const { data: staffSession, error: sessErr } = await c.rpc('pwe_get_staff_session');
    if (sessErr) return { ok: false, error: sessErr.message };
    const schoolId = staffSession?.school?.id;
    if (!schoolId) return { ok: false, error: 'Session école introuvable.' };

    const { error: insErr } = await c.from('school_staff').upsert(
      { school_id: schoolId, user_id: userId, role, status: 'active' },
      { onConflict: 'school_id,user_id' }
    );
    if (insErr) return { ok: false, error: insErr.message };
    return { ok: true, data: { public_code: publicCode, name: fullName, role } };
  }

  async function fetchReports(schoolId) {
    if (mode === 'demo') return getDemoSchoolBundle(schoolId).reports || [];

    const c = requireClient();
    const { data, error } = await c
      .from('school_reports')
      .select(
        'id, average, status, period, academic_year, school_students(first_name, last_name), school_classes(name)'
      )
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((r) => ({
      id: r.id,
      student: r.school_students
        ? `${r.school_students.first_name} ${r.school_students.last_name || ''}`.trim()
        : '—',
      class: r.school_classes?.name || '—',
      term: `${r.period || ''} ${r.academic_year || ''}`.trim(),
      period: r.period,
      academicYear: r.academic_year,
      average: r.average != null ? String(r.average).replace('.', ',') : '—',
      status: r.status === 'ready' ? 'pending' : r.status,
    }));
  }

  async function createReport({ studentId, period, academicYear, average, appreciation, status }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_create_report', {
      p_student_id: studentId,
      p_period: String(period || '').trim(),
      p_academic_year: String(academicYear || '').trim() || null,
      p_average: average != null && average !== '' ? Number(average) : null,
      p_appreciation: appreciation || null,
      p_status: status || 'draft',
    });

    if (error) return { ok: false, error: error.message || 'Création bulletin impossible.' };
    return { ok: true, data };
  }

  async function publishReports({ period, academicYear } = {}) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_publish_reports', {
      p_period: period ? String(period).trim() : null,
      p_academic_year: academicYear ? String(academicYear).trim() : null,
    });

    if (error) return { ok: false, error: error.message || 'Publication impossible.' };
    return { ok: true, count: data?.published_count ?? 0, data };
  }

  async function fetchFees(schoolId) {
    if (mode === 'demo') return getDemoSchoolBundle(schoolId).fees || [];

    const c = requireClient();
    const { data, error } = await c
      .from('school_fees')
      .select(
        'id, amount, due_date, status, student_id, school_students(first_name, last_name), school_classes(name)'
      )
      .eq('school_id', schoolId)
      .order('due_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((f) => ({
      id: f.id,
      studentId: f.student_id,
      student: f.school_students
        ? `${f.school_students.first_name} ${f.school_students.last_name || ''}`.trim()
        : '—',
      class: f.school_classes?.name || '—',
      amount: Number(f.amount).toLocaleString('fr-FR'),
      amountRaw: Number(f.amount),
      due: f.due_date ? new Date(f.due_date).toLocaleDateString('fr-FR') : '—',
      status: f.status,
    }));
  }

  async function fetchUnpaidFees(schoolId) {
    if (mode === 'demo') {
      return (getDemoSchoolBundle(schoolId).fees || [])
        .filter((f) => ['unpaid', 'partial', 'overdue'].includes(f.status))
        .map((f, i) => ({
          feeId: `demo-fee-${i}`,
          studentId: `demo-stu-${i}`,
          label: `${f.student} — ${f.amount} FCFA (${f.status})`,
          amount: Number(String(f.amount).replace(/\s/g, '')),
          status: f.status,
        }));
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_list_unpaid_fees');
    if (error) throw error;

    return (data || []).map((f) => ({
      feeId: f.fee_id,
      studentId: f.student_id,
      label: `${f.first_name} ${f.last_name || ''} — ${Number(f.amount).toLocaleString('fr-FR')} FCFA (${f.status})`.trim(),
      amount: Number(f.amount),
      status: f.status,
    }));
  }

  async function recordFeePayment({ feeId, studentId, amount, feeType, status }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_record_fee_payment', {
      p_fee_id: feeId || null,
      p_student_id: studentId || null,
      p_amount: amount != null && amount !== '' ? Number(amount) : null,
      p_fee_type: feeType || 'scolarite',
      p_due_date: null,
      p_status: status || 'paid',
    });

    if (error) return { ok: false, error: error.message || 'Paiement impossible.' };
    return { ok: true, data };
  }

  async function fetchMessages(schoolId) {
    if (mode === 'demo') return getDemoSchoolBundle(schoolId).messages || [];

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_list_announcements');
    if (error) throw error;

    return (data || []).map((m, i) => ({
      id: m.id || `msg-${i}`,
      from: m.author_name || 'École',
      subject: m.subject,
      date: m.created_at
        ? new Date(m.created_at).toLocaleDateString('fr-FR')
        : '—',
      unread: false,
      body: m.body,
      audience: m.audience,
    }));
  }

  async function createAnnouncement({ subject, body, audience }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const { data, error } = await c.rpc('pwe_create_announcement', {
      p_subject: String(subject || '').trim(),
      p_body: String(body || '').trim(),
      p_audience: audience || 'all_parents',
      p_class_id: null,
    });

    if (error) return { ok: false, error: error.message || 'Envoi impossible.' };
    return { ok: true, data };
  }

  async function fetchStudentsForSelect(schoolId) {
    if (mode === 'demo') {
      return (getDemoSchoolBundle(schoolId).students || []).map((s) => ({
        id: s.id,
        label: s.name,
      }));
    }

    const c = requireClient();
    const { data, error } = await c
      .from('school_students')
      .select('id, first_name, last_name, student_code')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .order('last_name');

    if (error) throw error;

    return (data || []).map((s) => ({
      id: s.id,
      label: `${s.first_name} ${s.last_name || ''}${s.student_code ? ` (${s.student_code})` : ''}`.trim(),
    }));
  }

  async function createClass({ schoolId, name, level, academicYear }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const payload = {
      school_id: schoolId,
      name: String(name || '').trim(),
      level: String(level || '').trim() || null,
      academic_year: String(academicYear || '').trim() || null,
      status: 'active',
    };

    if (!payload.name) return { ok: false, error: 'Nom de classe requis.' };

    const { data, error } = await c
      .from('school_classes')
      .insert(payload)
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message || 'Erreur création classe.' };
    return { ok: true, id: data?.id };
  }

  async function createStudent({
    schoolId,
    classId,
    firstName,
    lastName,
    gender,
    studentCode,
  }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }

    const c = requireClient();
    const payload = {
      school_id: schoolId,
      class_id: classId || null,
      first_name: String(firstName || '').trim(),
      last_name: String(lastName || '').trim() || null,
      gender: gender || null,
      student_code: String(studentCode || '').trim() || null,
      status: 'active',
    };

    if (!payload.first_name) return { ok: false, error: 'Prénom requis.' };

    const { data, error } = await c
      .from('school_students')
      .insert(payload)
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message || 'Erreur inscription élève.' };
    return { ok: true, id: data?.id };
  }

  const DEMO_STORE_MODULES = [
    { id: 'mod-homework', code: 'homework', name: 'Devoirs et exercices numériques', category: 'Pédagogie', description: 'Devoirs et exercices liés aux classes de l’école, avec suivi des rendus.', pricing_type: 'annual', price_amount: 50000, status: 'available' },
    { id: 'mod-exam', code: 'exam_prep', name: 'Préparation DEF / Baccalauréat', category: 'Pédagogie', description: 'Espace de préparation aux examens propre à l’école.', pricing_type: 'per_student', price_amount: 1000, status: 'available' },
    { id: 'mod-corr', code: 'correspondence', name: 'Carnet de correspondance enrichi', category: 'Communication', description: 'Suivi structuré des remarques, observations et accusés de lecture parents.', pricing_type: 'annual', price_amount: 30000, status: 'available' },
    { id: 'mod-rdv', code: 'parent_meetings', name: 'Rendez-vous parents-professeurs', category: 'Communication', description: 'Créneaux, demandes, validations et rappels de rencontres.', pricing_type: 'annual', price_amount: 25000, status: 'available' },
    { id: 'mod-disc', code: 'discipline', name: 'Suivi disciplinaire et comportement', category: 'Administration', description: 'Observations, avertissements, sanctions et progrès par période.', pricing_type: 'annual', price_amount: 30000, status: 'available' },
    { id: 'mod-portal', code: 'school_portal_custom', name: 'Portail Web École personnalisé', category: 'Premium', description: 'Mini-site professionnel : page publique, branding, contact, préinscription.', pricing_type: 'annual', price_amount: 75000, status: 'beta' },
    { id: 'mod-analytics', code: 'advanced_analytics', name: 'Statistiques avancées et analytics', category: 'Pilotage', description: 'Analyses détaillées : résultats, présences, paiements, engagement, exports.', pricing_type: 'annual', price_amount: 40000, status: 'available' },
  ];

  async function fetchStoreModules() {
    if (mode === 'demo') return DEMO_STORE_MODULES.map((m) => ({ ...m }));

    const c = requireClient();
    const { data, error } = await c
      .from('store_modules')
      .select('id, code, name, category, description, objective, pricing_type, price_amount, status, requires_validation, sort_order')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function fetchStoreSubscriptions(schoolId) {
    if (mode === 'demo') return [];

    const c = requireClient();
    const { data, error } = await c
      .from('store_subscriptions')
      .select('id, module_id, status, price_agreed, note, decision_note, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function requestModuleActivation({ moduleId, schoolId, note }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : la demande d’activation nécessite Supabase.' };
    }
    if (!moduleId || !schoolId) return { ok: false, error: 'Module ou école invalide.' };

    const c = requireClient();
    const { data: auth } = await c.auth.getUser();
    const { data, error } = await c
      .from('store_subscriptions')
      .insert({
        module_id: moduleId,
        school_id: schoolId,
        requested_by: auth?.user?.id || null,
        status: 'requested',
        note: note ? String(note).trim() || null : null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Vous avez déjà une demande ou un abonnement pour ce module.' };
      }
      return { ok: false, error: error.message || 'Demande impossible.' };
    }
    return { ok: true, id: data?.id };
  }

  async function submitCustomModuleRequest({ schoolId, title, description }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : la demande sur devis nécessite Supabase.' };
    }
    const cleanTitle = String(title || '').trim();
    if (!schoolId || !cleanTitle) return { ok: false, error: 'Titre de la demande requis.' };

    const c = requireClient();
    const { data: auth } = await c.auth.getUser();
    const { data, error } = await c
      .from('store_custom_requests')
      .insert({
        school_id: schoolId,
        requested_by: auth?.user?.id || null,
        title: cleanTitle,
        description: description ? String(description).trim() || null : null,
        status: 'open',
      })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message || 'Demande impossible.' };
    return { ok: true, id: data?.id };
  }

  async function isModuleActive(schoolId, code) {
    if (mode === 'demo') return true;
    if (!schoolId || !code) return false;
    const c = requireClient();
    const { data: mod } = await c
      .from('store_modules')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!mod) return false;
    const { count } = await c
      .from('store_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('module_id', mod.id)
      .eq('status', 'active');
    return (count ?? 0) > 0;
  }

  const DEMO_HOMEWORK = [
    { id: 'hw-1', subject: 'Mathématiques', title: 'Exercices fractions p.42', instructions: 'Faire les exercices 1 à 6, montrer les calculs.', due: '30/06/2026', dueDate: '2026-06-30', status: 'active', class: '6ème A' },
    { id: 'hw-2', subject: 'Français', title: 'Rédaction : mon village', instructions: 'Texte de 15 lignes minimum.', due: '28/06/2026', dueDate: '2026-06-28', status: 'active', class: '5ème B' },
  ];

  async function fetchHomework(schoolId) {
    if (mode === 'demo') return DEMO_HOMEWORK.map((h) => ({ ...h }));

    const c = requireClient();
    const { data, error } = await c
      .from('school_homework')
      .select('id, subject, title, instructions, due_date, status, class_id, school_classes(name)')
      .eq('school_id', schoolId)
      .order('due_date', { ascending: false });
    if (error) throw error;

    return (data || []).map((h) => ({
      id: h.id,
      subject: h.subject || '—',
      title: h.title,
      instructions: h.instructions || '',
      due: h.due_date ? new Date(h.due_date).toLocaleDateString('fr-FR') : '—',
      dueDate: h.due_date,
      status: h.status,
      classId: h.class_id,
      class: h.school_classes?.name || 'Toutes classes',
    }));
  }

  async function createHomework({ schoolId, classId, subject, title, instructions, dueDate }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return { ok: false, error: 'Titre du devoir requis.' };

    const c = requireClient();
    const { data: auth } = await c.auth.getUser();
    const { data, error } = await c
      .from('school_homework')
      .insert({
        school_id: schoolId,
        class_id: classId || null,
        subject: String(subject || '').trim() || null,
        title: cleanTitle,
        instructions: String(instructions || '').trim() || null,
        due_date: dueDate || null,
        status: 'active',
        created_by: auth?.user?.id || null,
      })
      .select('id')
      .single();

    if (error) {
      if ((error.message || '').toLowerCase().includes('row-level security')) {
        return { ok: false, error: 'Module Devoirs non activé pour votre école (WalahaStore).' };
      }
      return { ok: false, error: error.message || 'Création impossible.' };
    }
    return { ok: true, id: data?.id };
  }

  async function archiveHomework(id) {
    if (mode === 'demo') return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    if (!id) return { ok: false, error: 'Devoir invalide.' };
    const c = requireClient();
    const { error } = await c.from('school_homework').update({ status: 'archived' }).eq('id', id);
    if (error) return { ok: false, error: error.message || 'Archivage impossible.' };
    return { ok: true };
  }

  async function fetchHomeworkSubmissions(homeworkId) {
    if (mode === 'demo') return {};
    const c = requireClient();
    const { data, error } = await c
      .from('school_homework_submissions')
      .select('student_id, status, grade, feedback')
      .eq('homework_id', homeworkId);
    if (error) throw error;
    const map = {};
    (data || []).forEach((s) => {
      map[s.student_id] = { status: s.status, grade: s.grade, feedback: s.feedback };
    });
    return map;
  }

  async function saveHomeworkSubmissions({ homeworkId, schoolId, entries }) {
    if (mode === 'demo') {
      return { ok: false, error: 'Démo locale : pas d’écriture en base.' };
    }
    if (!homeworkId || !schoolId || !(entries && entries.length)) {
      return { ok: false, error: 'Rien à enregistrer.' };
    }
    const c = requireClient();
    const rows = entries.map((e) => ({
      homework_id: homeworkId,
      student_id: e.studentId,
      school_id: schoolId,
      status: e.status || 'assigned',
      grade: e.grade != null && e.grade !== '' ? Number(e.grade) : null,
      feedback: e.feedback ? String(e.feedback).trim() || null : null,
    }));
    const { error } = await c
      .from('school_homework_submissions')
      .upsert(rows, { onConflict: 'homework_id,student_id' });
    if (error) {
      if ((error.message || '').toLowerCase().includes('row-level security')) {
        return { ok: false, error: 'Module Devoirs non activé pour votre école.' };
      }
      return { ok: false, error: error.message || 'Enregistrement impossible.' };
    }
    return { ok: true };
  }

  window.PweApi = {
    init,
    fetchStoreModules,
    fetchStoreSubscriptions,
    requestModuleActivation,
    submitCustomModuleRequest,
    isModuleActive,
    fetchHomework,
    createHomework,
    archiveHomework,
    fetchHomeworkSubmissions,
    saveHomeworkSubmissions,
    getMode,
    isDemo,
    isDemoMode,
    getConfigError,
    getClient,
    restoreAuthSession,
    bindAuthListener,
    fetchStaffSession,
    fetchUserSchools,
    setActiveSchool,
    fetchUserProfile,
    loginSupabase,
    logoutSupabase,
    fetchDashboard,
    fetchSchoolProfile,
    fetchClasses,
    fetchStudents,
    fetchStudentParents,
    linkStudentParent,
    unlinkStudentParent,
    fetchTeachers,
    inviteStaff,
    fetchReports,
    fetchFees,
    fetchMessages,
    createClass,
    createStudent,
    updateSchoolProfile,
    createReport,
    publishReports,
    fetchUnpaidFees,
    recordFeePayment,
    createAnnouncement,
    fetchStudentsForSelect,
    updateClass,
    archiveClass,
    deleteClass,
    updateStudent,
    archiveStudent,
    fetchStatistics,
  };
})();
