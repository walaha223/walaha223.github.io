/**
 * Utilitaires partagés — Portail Web Écoles (PWE).
 */
(function () {
  'use strict';

  const GENDER_LABELS = { M: 'Garçon', F: 'Fille' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function badge(status) {
    return `<span class="badge badge-${status}">${escapeHtml(String(status).replace(/_/g, ' '))}</span>`;
  }

  function formatGender(value) {
    const v = String(value || '').toUpperCase();
    if (v === 'M' || v === 'MALE') return 'M';
    if (v === 'F' || v === 'FEMALE' || v === 'FEMININ') return 'F';
    return '';
  }

  function genderLabel(value) {
    const code = formatGender(value);
    return code ? (GENDER_LABELS[code] || code) : '—';
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  window.PweUtils = {
    escapeHtml,
    normalize,
    badge,
    formatGender,
    genderLabel,
    GENDER_LABELS,
    $,
    $$,
  };
})();
