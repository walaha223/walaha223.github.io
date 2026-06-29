/**
 * WalahaStore — catalogue et abonnements modules (PWE).
 */
(function () {
  'use strict';

  const { escapeHtml, normalize, $ } = window.PweUtils;

  const STORE_STATUS_LABELS = {
    available: 'Disponible',
    beta: 'Bêta',
    coming_soon: 'Bientôt',
    quote: 'Sur devis',
    premium_reserved: 'Premium',
    active: 'Actif',
    requested: 'En attente',
    approved: 'Approuvé',
    suspended: 'Suspendu',
  };

  let storeRequestModuleId = null;
  let storeDetailModuleId = null;
  let storeFilterCategory = 'all';
  const storeCache = { modules: null, subs: null };
  let openModalFn = () => {};

  function init({ openModal }) {
    openModalFn = openModal || openModalFn;
  }

  function storeBadge(status) {
    const label = STORE_STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ');
    return `<span class="badge badge-${status}">${escapeHtml(label)}</span>`;
  }

  function storeModuleIcon(m) {
    return m?.icon || 'i-grid';
  }

  function storeSubsByModule() {
    const subByModule = {};
    (storeCache.subs || []).forEach((s) => {
      subByModule[s.module_id] = s;
    });
    return subByModule;
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

  function storeCanRequest(m, subStatus) {
    return (
      ['available', 'beta'].includes(m.status) &&
      !['requested', 'approved', 'active'].includes(subStatus)
    );
  }

  function storeCard(m, sub, { compact = false } = {}) {
    const subStatus = sub?.status;
    const canRequest = storeCanRequest(m, subStatus);
    const isActive = subStatus === 'active';
    const features = Array.isArray(m.features) ? m.features.slice(0, compact ? 2 : 3) : [];
    const icon = storeModuleIcon(m);
    return `
      <article class="store-card${isActive ? ' store-card--active' : ''}${m.featured ? ' store-card--featured' : ''}" data-module-id="${m.id}">
        <div class="store-card-top">
          <span class="store-card-icon" aria-hidden="true"><svg><use href="#${icon}"></use></svg></span>
          <div class="store-card-head">
            <h3>${escapeHtml(m.name)}</h3>
            ${storeBadge(isActive ? 'active' : m.status)}
          </div>
        </div>
        <p class="store-card-cat">${escapeHtml(m.category || '')}</p>
        <p class="store-card-desc">${escapeHtml(m.description || '')}</p>
        ${features.length ? `<ul class="store-card-features">${features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
        <div class="store-card-foot">
          <span class="store-price">${escapeHtml(storePriceLabel(m))}</span>
          <div class="store-card-actions">
            <button type="button" class="btn ghost-btn store-detail-btn" data-action="store-detail" data-id="${m.id}">Détails</button>
            <button type="button" class="btn ${canRequest ? 'primary-action' : 'secondary-btn'}" data-action="store-request" data-id="${m.id}"${canRequest ? '' : ' disabled'}>${escapeHtml(storeCtaLabel(m, subStatus))}</button>
          </div>
        </div>
      </article>`;
  }

  function getStoreFilteredModules() {
    const modules = storeCache.modules || [];
    const searchEl = document.querySelector('[data-search="store"]');
    const q = normalize(searchEl?.value || '');
    const cat = storeFilterCategory;
    return modules.filter((m) => {
      const matchCat = cat === 'all' || m.category === cat;
      if (!q) return matchCat;
      const hay = normalize(`${m.name} ${m.description || ''} ${m.category || ''} ${(m.features || []).join(' ')}`);
      return matchCat && hay.includes(q);
    });
  }

  function renderStoreStats() {
    const el = $('#storeStats');
    if (!el) return;
    const modules = storeCache.modules || [];
    const subs = storeCache.subs || [];
    const active = subs.filter((s) => s.status === 'active').length;
    const pending = subs.filter((s) => ['requested', 'approved'].includes(s.status)).length;
    el.innerHTML = `
      <div class="store-stat">
        <span class="store-stat-value">${modules.length}</span>
        <span class="store-stat-label">Modules catalogue</span>
      </div>
      <div class="store-stat store-stat--active">
        <span class="store-stat-value">${active}</span>
        <span class="store-stat-label">Actifs</span>
      </div>
      <div class="store-stat store-stat--pending">
        <span class="store-stat-value">${pending}</span>
        <span class="store-stat-label">En attente</span>
      </div>
      <div class="store-stat store-stat--info">
        <span class="store-stat-value">${modules.filter((m) => ['available', 'beta'].includes(m.status)).length}</span>
        <span class="store-stat-label">Disponibles</span>
      </div>`;
  }

  function renderStoreCategoryChips() {
    const el = $('#storeCategoryChips');
    if (!el) return;
    const modules = storeCache.modules || [];
    const cats = ['all', ...new Set(modules.map((m) => m.category).filter(Boolean))];
    const labels = { all: 'Tous' };
    el.innerHTML = cats.map((cat) => {
      const label = labels[cat] || cat;
      const active = storeFilterCategory === cat ? ' is-active' : '';
      return `<button type="button" class="store-chip${active}" data-store-cat="${escapeHtml(cat)}" role="tab" aria-selected="${storeFilterCategory === cat}">${escapeHtml(label)}</button>`;
    }).join('');
  }

  function renderStoreFeatured() {
    const wrap = $('#storeFeatured');
    const grid = $('#storeFeaturedGrid');
    if (!wrap || !grid) return;
    const subByModule = storeSubsByModule();
    const featured = (storeCache.modules || []).filter((m) => m.featured);
    if (!featured.length) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    grid.innerHTML = featured.map((m) => storeCard(m, subByModule[m.id], { compact: true })).join('');
  }

  function renderStoreCatalog() {
    const grid = $('#storeCatalog');
    if (!grid) return;
    const subByModule = storeSubsByModule();
    const filtered = getStoreFilteredModules();
    const countEl = $('#storeCatalogCount');
    if (countEl) {
      countEl.textContent = filtered.length === 1
        ? '1 module affiché'
        : `${filtered.length} modules affichés`;
    }
    grid.innerHTML = filtered.length === 0
      ? `<p class="store-empty">Aucun module ne correspond à votre recherche.</p>`
      : filtered.map((m) => storeCard(m, subByModule[m.id])).join('');
  }

  function openStoreDetail(moduleId) {
    const m = (storeCache.modules || []).find((mod) => mod.id === moduleId);
    if (!m) return;
    storeDetailModuleId = moduleId;
    const sub = storeSubsByModule()[moduleId];
    const subStatus = sub?.status;
    const iconEl = document.getElementById('storeDetailIcon');
    if (iconEl) iconEl.innerHTML = `<svg aria-hidden="true"><use href="#${storeModuleIcon(m)}"></use></svg>`;
    const setText = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text || '—';
    };
    setText('storeDetailName', m.name);
    setText('storeDetailCategory', m.category);
    setText('storeDetailPrice', storePriceLabel(m));
    setText('storeDetailDesc', m.description);
    setText('storeDetailObjective', m.objective || m.description);
    const featEl = document.getElementById('storeDetailFeatures');
    const features = Array.isArray(m.features) ? m.features : [];
    if (featEl) {
      featEl.innerHTML = features.length
        ? features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')
        : '<li>Fonctionnalités détaillées sur demande.</li>';
    }
    const metaEl = document.getElementById('storeDetailMeta');
    if (metaEl) {
      metaEl.innerHTML = `
        <span>${storeBadge(m.status)}</span>
        ${sub ? storeBadge(subStatus) : ''}
        <span class="store-detail-code">Code : <code>${escapeHtml(m.code || '—')}</code></span>`;
    }
    const reqBtn = document.getElementById('storeDetailRequestBtn');
    const canRequest = storeCanRequest(m, subStatus);
    if (reqBtn) {
      reqBtn.disabled = !canRequest;
      reqBtn.innerHTML = `<span class="btn-ico"><svg aria-hidden="true"><use href="#i-plus"></use></svg></span> ${escapeHtml(storeCtaLabel(m, subStatus))}`;
    }
    openModalFn('modalStoreDetail');
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
        ? active.map((s) => `<li class="store-sub-item"><span>${escapeHtml(nameOf(s.module_id))}</span>${storeBadge(s.status)}</li>`).join('')
        : '<li class="store-sub-empty">Aucun module actif pour le moment.</li>';
    }
    const pendingEl = $('#storePending');
    if (pendingEl) {
      pendingEl.innerHTML = pending.length
        ? pending.map((s) => `<li class="store-sub-item"><span>${escapeHtml(nameOf(s.module_id))}</span>${storeBadge(s.status)}</li>`).join('')
        : '<li class="store-sub-empty">Aucune demande en attente.</li>';
    }
  }

  async function render(session) {
    const [modules, subs] = await Promise.all([
      window.PweApi.fetchStoreModules(),
      window.PweApi.fetchStoreSubscriptions(session.schoolId),
    ]);
    storeCache.modules = modules;
    storeCache.subs = subs;
    renderStoreStats();
    renderStoreCategoryChips();
    renderStoreFeatured();
    renderStoreCatalog();
    renderStoreSubs();
  }

  function handleClick(e, { closeModals }) {
    const detailBtn = e.target.closest('[data-action="store-detail"]');
    if (detailBtn) {
      openStoreDetail(detailBtn.dataset.id);
      return true;
    }
    const chip = e.target.closest('[data-store-cat]');
    if (chip) {
      storeFilterCategory = chip.dataset.storeCat || 'all';
      renderStoreCategoryChips();
      renderStoreCatalog();
      return true;
    }
    const fromDetail = e.target.closest('[data-action="store-request-from-detail"]');
    if (fromDetail && !fromDetail.disabled && storeDetailModuleId) {
      storeRequestModuleId = storeDetailModuleId;
      const module = (storeCache.modules || []).find((m) => m.id === storeRequestModuleId);
      const nameEl = document.getElementById('storeRequestModuleName');
      if (nameEl) nameEl.textContent = module?.name || 'ce module';
      closeModals?.();
      openModalFn('modalStoreRequest');
      return true;
    }
    const btn = e.target.closest('[data-action="store-request"]');
    if (btn && !btn.disabled) {
      storeRequestModuleId = btn.dataset.id;
      const module = (storeCache.modules || []).find((m) => m.id === storeRequestModuleId);
      const nameEl = document.getElementById('storeRequestModuleName');
      if (nameEl) nameEl.textContent = module?.name || 'ce module';
      openModalFn('modalStoreRequest');
      return true;
    }
    return false;
  }

  function invalidateCache() {
    storeCache.subs = null;
  }

  window.PweStore = {
    init,
    render,
    renderCatalog: renderStoreCatalog,
    handleClick,
    getRequestModuleId: () => storeRequestModuleId,
    invalidateCache,
  };
})();
