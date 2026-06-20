/**
 * FLAGGED — Shared Utilities
 *
 * Utility functions shared between index.html and admin.html.
 * Includes escaping, formatting, toast notifications, inline validation,
 * loading states, and confirmation modals.
 *
 * @module utils
 */

const GENRE_LIST = [
  'R&B', 'alternative', 'emo', 'hardcore', 'hip hop', 'indie',
  'metal', 'nu metal', 'oi', 'post-rock', 'punk', 'rap',
  'rap metal', 'screamo', 'underground rap'
];

/* ========================================================================
   String Utilities
   ======================================================================== */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isValidImageDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  return /^data:image\/(jpeg|png|gif|webp|bmp|svg\+xml);base64,/.test(dataUrl);
}

/* ========================================================================
   Toast Notification System
   ======================================================================== */

function showToast(message, type = 'success', duration = 3500) {
  const existing = document.querySelector('.toast-container');
  let container = existing;
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  const icons = {
    success: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    setTimeout(() => { if (!toast.isConnected) return; toast.remove(); }, 400);
  }, duration);
}

/* ========================================================================
   Loading State Helpers
   ======================================================================== */

function setLoading(button, isLoading, originalText) {
  if (isLoading) {
    button.dataset.originalText = originalText || button.textContent;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Processing...';
    button.classList.add('btn-loading');
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || originalText || 'Submit';
    button.classList.remove('btn-loading');
  }
}

/* ========================================================================
   Inline Form Validation
   ======================================================================== */

function showFieldError(input, message) {
  clearFieldError(input);
  const errorEl = document.createElement('span');
  errorEl.className = 'field-error';
  errorEl.textContent = message;
  errorEl.setAttribute('role', 'alert');
  input.classList.add('field-invalid');
  input.setAttribute('aria-invalid', 'true');
  input.parentNode.appendChild(errorEl);
}

function clearFieldError(input) {
  input.classList.remove('field-invalid');
  input.removeAttribute('aria-invalid');
  const existing = input.parentNode.querySelector('.field-error');
  if (existing) existing.remove();
}

function clearAllFieldErrors(container) {
  container.querySelectorAll('.field-invalid').forEach(el => {
    el.classList.remove('field-invalid');
    el.removeAttribute('aria-invalid');
  });
  container.querySelectorAll('.field-error').forEach(el => el.remove());
}

/* ========================================================================
   Confirmation Modal
   ======================================================================== */

function showConfirmModal(message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <p class="confirm-message">${escapeHtml(message)}</p>
      <div class="confirm-actions">
        <button class="admin-btn confirm-cancel">${cancelLabel}</button>
        <button class="admin-btn confirm-ok" style="border-color:var(--color-confirmed);color:var(--color-confirmed);">${confirmLabel}</button>
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => backdrop.classList.add('confirm-open'));

    const close = (result) => {
      backdrop.classList.remove('confirm-open');
      backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
      setTimeout(() => { if (backdrop.isConnected) backdrop.remove(); }, 300);
      resolve(result);
    };

    modal.querySelector('.confirm-ok').addEventListener('click', () => close(true));
    modal.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    modal.querySelector('.confirm-ok').focus();
  });
}

/* ========================================================================
   Admin Image Rendering
   ======================================================================== */

function renderAdminImages(entry, altName) {
  const urls = entry.imageUrls && entry.imageUrls.length > 0
    ? entry.imageUrls
    : entry.imageUrl ? [entry.imageUrl] : [];

  if (urls.length === 0) {
    return '<p><em>No reference images provided.</em></p>';
  }

  const safeAlt = escapeHtml(altName);
  const label = urls.length === 1
    ? '<p><strong>Reference image:</strong></p>'
    : `<p><strong>Reference images (${urls.length}):</strong></p>`;

  const gallery = urls.map((url, i) => {
    const safeUrl = escapeHtml(url);
    return `<img class="admin-image-thumb" src="${safeUrl}" alt="${safeAlt} — reference image ${i + 1}" loading="lazy">`;
  }).join('');

  return `${label}<div class="admin-image-gallery">${gallery}</div>`;
}

/* ========================================================================
   Cookie / LocalStorage Consent Banner
   ======================================================================== */

function initCookieConsent() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  if (localStorage.getItem('amca_cookie_consent') === 'accepted') {
    banner.remove();
    return;
  }

  // Show banner with a small delay so it doesn't flash on fast loads
  requestAnimationFrame(() => {
    banner.classList.add('visible');
  });

  const acceptBtn = document.getElementById('cookie-accept-btn');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('amca_cookie_consent', 'accepted');
      banner.classList.remove('visible');
      banner.addEventListener('transitionend', () => banner.remove(), { once: true });
    });
  }
}

document.addEventListener('DOMContentLoaded', initCookieConsent);
