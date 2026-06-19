/**
 * FLAGGED — Admin Logic
 *
 * Handles the editorial admin panel (admin.html): listing pending submissions,
 * approving (moving to approvedSubmissions in localStorage), rejecting
 * (removing from pending), and viewing already approved entries.
 *
 * This file is separate from script.js and only loaded on admin.html.
 *
 * @module admin
 */

/* ========================================================================
   State
   ======================================================================== */

/** @type {string} Current admin view: 'pending' or 'approved'. */
let currentView = 'pending';

/* ========================================================================
   DOM References
   ======================================================================== */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {};

/**
 * Initializes all DOM references for the admin page.
 */
function initDomRefs() {
  dom.pendingPanel = $('#pending-panel');
  dom.approvedPanel = $('#approved-panel');
  dom.pendingList = $('#pending-list');
  dom.pendingEmpty = $('#pending-empty');
  dom.approvedList = $('#approved-list');
  dom.approvedEmpty = $('#approved-empty');
  dom.hamburger = $('#hamburger-btn');
  dom.mainNav = $('#main-nav');
}

/* ========================================================================
   Authentication — Simple Password Gate
   ======================================================================== */

/**
 * The admin panel password. Change this to a strong, unique password before
 * deploying to any shared or public environment.
 *
 * SECURITY NOTE: This is client-side authentication, which any determined
 * user can bypass by inspecting the source code or disabling JavaScript.
 * For production use, this should be replaced with a proper server-side
 * authentication system (see architecture note above).
 */
const ADMIN_PASSWORD = 'admin123';

/** @type {number} Failed authentication attempts in this session. */
let authAttempts = 0;

/** @type {number} Maximum failed attempts before lockout. */
const MAX_AUTH_ATTEMPTS = 3;

/**
 * Checks if the user is authenticated for this browser session.
 * Authentication state is stored in sessionStorage and cleared when
 * the browser tab is closed.
 * @returns {boolean} Whether the user is authenticated.
 */
function isAuthenticated() {
  return sessionStorage.getItem('amca_admin_auth') === 'true';
}

/**
 * Prompts the user for the admin password and validates it.
 * On success, stores auth state in sessionStorage and returns true.
 * On failure, increments the attempt counter and locks out after 3 tries.
 * @returns {boolean} Whether authentication was successful.
 */
function promptForPassword() {
  if (authAttempts >= MAX_AUTH_ATTEMPTS) {
    alert('Too many failed attempts. Reload the page to try again.');
    return false;
  }

  const entered = prompt('Enter admin password:');
  if (entered === null) {
    // User cancelled — redirect back to the main archive
    window.location.href = 'index.html';
    return false;
  }

  if (entered === ADMIN_PASSWORD) {
    sessionStorage.setItem('amca_admin_auth', 'true');
    return true;
  }

  authAttempts++;
  const remaining = MAX_AUTH_ATTEMPTS - authAttempts;
  const msg = remaining > 0
    ? `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
    : 'Incorrect password. No attempts remaining. Reload the page to try again.';
  alert(msg);
  return promptForPassword();
}

/* ========================================================================
   Rendering — Pending Submissions
   ======================================================================== */

/**
 * Renders the list of pending submissions from localStorage with
 * approve/reject buttons.
 */
function renderPending() {
  if (!dom.pendingList || !dom.pendingEmpty) return;

  let pending = [];
  try {
    const raw = localStorage.getItem('pendingSubmissions');
    pending = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(pending)) pending = [];
  } catch (e) {
    console.warn('Failed to parse pendingSubmissions from localStorage. Resetting.');
    localStorage.removeItem('pendingSubmissions');
    pending = [];
  }

  dom.pendingList.innerHTML = '';

  if (pending.length === 0) {
    dom.pendingEmpty.style.display = 'block';
    return;
  }

  dom.pendingEmpty.style.display = 'none';

  pending.forEach((sub, index) => {
    const item = document.createElement('div');
    item.className = 'admin-pending-item';
    item.innerHTML = `
      <h4>${escapeHtml(sub.name)}</h4>
      <p><strong>Type:</strong> ${escapeHtml(sub.type)} | <strong>Date:</strong> ${sub.date}</p>
      <p><strong>Genres:</strong> ${sub.genres.map(escapeHtml).join(', ')}</p>
      <p><strong>Summary:</strong> ${escapeHtml(sub.summary)}</p>
      <p><strong>Sources:</strong>
        ${sub.sources.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`).join(', ')}
      </p>
      ${sub.submitterNote ? `<p><strong>Submitter note:</strong> ${escapeHtml(sub.submitterNote)}</p>` : ''}
      ${renderAdminImages(sub, escapeHtml(sub.name))}
      <p><strong>Submitted:</strong> ${new Date(sub.submittedAt).toLocaleString()}</p>
      <div class="admin-actions">
        <button class="admin-btn approve" data-index="${index}">✓ Approve</button>
        <button class="admin-btn reject" data-index="${index}">✗ Reject</button>
      </div>
    `;

    // [ETHICS] Approval moves the entry from pendingSubmissions to approvedSubmissions
    // in localStorage. The submitter's note and timestamp are stripped.
    // The entry will appear on the public archive (index.html) immediately
    // because it reads approvedSubmissions on load.
    item.querySelector('.approve').addEventListener('click', () => {
      // Collect all images from either imageUrls[] or legacy imageUrl
      const imgUrls = sub.imageUrls && sub.imageUrls.length > 0
        ? [...sub.imageUrls]
        : sub.imageUrl ? [sub.imageUrl] : [];

      const newEntry = {
        id: sub.id.replace('pending-', 'entry-'),
        name: sub.name,
        type: sub.type,
        genres: sub.genres,
        date: sub.date,
        summary: sub.summary,
        status: sub.status || 'allegation',
        outcome: sub.outcome || 'ongoing',
        sources: sub.sources,
        imageUrls: imgUrls,
        imageUrl: imgUrls.length > 0 ? imgUrls[0] : null
      };

      // Add to approvedSubmissions in localStorage
      const approved = JSON.parse(localStorage.getItem('approvedSubmissions') || '[]');
      approved.unshift(newEntry);
      localStorage.setItem('approvedSubmissions', JSON.stringify(approved));

      // Remove from pendingSubmissions
      pending.splice(index, 1);
      localStorage.setItem('pendingSubmissions', JSON.stringify(pending));

      renderPending();
    });

    item.querySelector('.reject').addEventListener('click', () => {
      pending.splice(index, 1);
      localStorage.setItem('pendingSubmissions', JSON.stringify(pending));
      renderPending();
    });

    dom.pendingList.appendChild(item);
  });
}

/* ========================================================================
   Rendering — Approved Submissions
   ======================================================================== */

/**
 * Renders the list of already approved submissions from localStorage.
 * Shows a summary for each, with a delete button to remove if needed.
 */
function renderApproved() {
  if (!dom.approvedList || !dom.approvedEmpty) return;

  let approved = [];
  try {
    const raw = localStorage.getItem('approvedSubmissions');
    approved = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(approved)) approved = [];
  } catch (e) {
    console.warn('Failed to parse approvedSubmissions from localStorage. Resetting.');
    localStorage.removeItem('approvedSubmissions');
    approved = [];
  }

  dom.approvedList.innerHTML = '';

  if (approved.length === 0) {
    dom.approvedEmpty.style.display = 'block';
    return;
  }

  dom.approvedEmpty.style.display = 'none';

  approved.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'admin-pending-item';
    item.innerHTML = `
      <h4>${escapeHtml(entry.name)}</h4>
      <p>
        <strong>Type:</strong> ${escapeHtml(entry.type)} |
        <strong>Date:</strong> ${formatDate(entry.date)} |
        <span class="status-badge ${entry.status}" style="display:inline-block;">${capitalize(entry.status)}</span>
      </p>
      <p><strong>Genres:</strong> ${entry.genres.map(escapeHtml).join(', ')}</p>
      <p><strong>Summary:</strong> ${escapeHtml(entry.summary)}</p>
      <p><strong>Sources:</strong>
        ${entry.sources.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`).join(', ')}
      </p>
      ${renderAdminImages(entry, escapeHtml(entry.name))}
      <div class="admin-actions">
        <button class="admin-btn reject" data-index="${index}">Remove</button>
      </div>
    `;

    item.querySelector('.reject').addEventListener('click', () => {
      approved.splice(index, 1);
      localStorage.setItem('approvedSubmissions', JSON.stringify(approved));
      renderApproved();
    });

    dom.approvedList.appendChild(item);
  });
}

/* ========================================================================
   View Switching
   ======================================================================== */

/**
 * Switches between the pending and approved admin views.
 * @param {string} view - 'pending' or 'approved'.
 */
function switchAdminView(view) {
  currentView = view;

  // Toggle panels
  dom.pendingPanel.style.display = view === 'pending' ? 'block' : 'none';
  dom.approvedPanel.style.display = view === 'approved' ? 'block' : 'none';

  // Update nav button active states
  $$('.nav-btn[data-view]').forEach(btn => {
    const isActive = btn.dataset.view === view;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  // Render the selected view
  if (view === 'pending') renderPending();
  else renderApproved();
}

/* ========================================================================
   Initialization
   ======================================================================== */

/**
 * Main entry point for the admin page.
 */
function init() {
  initDomRefs();

  // [SECURITY] Gate the admin panel behind a password prompt.
  // Authentication state is stored in sessionStorage and persists
  // for the current browser session (cleared when the tab closes).
  if (!isAuthenticated()) {
    if (!promptForPassword()) {
      return; // Locked out or redirected
    }
  }

  // Set up nav button listeners
  $$('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchAdminView(btn.dataset.view);
      // Close mobile nav after selecting a view
      if (dom.mainNav) dom.mainNav.classList.remove('open');
    });
  });

  // Hamburger toggle for mobile nav
  if (dom.hamburger && dom.mainNav) {
    dom.hamburger.addEventListener('click', () => {
      const isOpen = dom.mainNav.classList.toggle('open');
      dom.hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Auto-close mobile nav when clicking outside
    document.addEventListener('click', (e) => {
      const isOpen = dom.mainNav.classList.contains('open');
      if (!isOpen) return;
      const isNavClick = dom.mainNav.contains(e.target);
      const isHamburgerClick = dom.hamburger.contains(e.target);
      if (!isNavClick && !isHamburgerClick) {
        dom.mainNav.classList.remove('open');
      }
    });
  }

  // Show pending submissions by default
  switchAdminView('pending');
}

document.addEventListener('DOMContentLoaded', init);
