/**
 * FLAGGED — Admin Logic (Supabase)
 *
 * Handles the editorial admin panel: login via Supabase Auth,
 * approve/reject submissions, edit entries, and manage the archive.
 *
 * @module admin
 */

let currentView = 'pending';
let _adminSb = null;

function getAdminSupabase() {
  if (_adminSb) return _adminSb;
  if (typeof window.supabase !== 'undefined' && SUPABASE_CONFIG) {
    _adminSb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return _adminSb;
  }
  return null;
}

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {};

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
   Auth
   ======================================================================== */

async function checkAuth() {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { data: { session } } = await sb.auth.getSession();
  return !!session;
}

async function loginAdmin(email, password) {
  const sb = getAdminSupabase();
  if (!sb) return { error: 'Supabase not configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message || null };
}

async function logoutAdmin() {
  const sb = getAdminSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

/* ========================================================================
   Render Pending
   ======================================================================== */

async function renderPending() {
  if (!dom.pendingList || !dom.pendingEmpty) return;
  dom.pendingList.innerHTML = '';

  const pending = await fetchPendingSubmissions();
  if (pending.length === 0) { dom.pendingEmpty.style.display = 'block'; return; }
  dom.pendingEmpty.style.display = 'none';

  pending.forEach((sub) => {
    const item = document.createElement('div');
    item.className = 'admin-pending-item';
    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;flex-wrap:wrap;">
        <h4>${escapeHtml(sub.name)}</h4>
        <button class="admin-btn edit-submission-btn" data-id="${escapeHtml(sub.id)}" style="font-size:0.72rem;">Edit</button>
      </div>
      <p><strong>Type:</strong> ${escapeHtml(sub.type)} | <strong>Date:</strong> ${sub.date}</p>
      <p><strong>Genres:</strong> ${sub.genres.map(escapeHtml).join(', ')}</p>
      <p><strong>Summary:</strong> ${escapeHtml(sub.summary)}</p>
      <p><strong>Sources:</strong> ${sub.sources.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`).join(', ')}</p>
      ${sub.submitterNote ? `<p><strong>Admin note:</strong> ${escapeHtml(sub.submitterNote)}</p>` : ''}
      ${renderAdminImages(sub, escapeHtml(sub.name))}
      <p><strong>Submitted:</strong> ${new Date(sub.submittedAt).toLocaleString()}</p>
      <div class="admin-actions">
        <button class="admin-btn approve" data-id="${escapeHtml(sub.id)}">✓ Approve</button>
        <button class="admin-btn reject" data-id="${escapeHtml(sub.id)}">✗ Reject</button>
      </div>
    `;

    item.querySelector('.approve').addEventListener('click', async () => {
      const btn = item.querySelector('.approve');
      setLoading(btn, true, '✓ Approve');
      const result = await approveSubmission(sub.id);
      if (result) {
        showToast('Submission approved and published.');
        renderPending();
      } else {
        showToast('Failed to approve submission.', 'error');
        setLoading(btn, false, '✓ Approve');
      }
    });

    item.querySelector('.reject').addEventListener('click', async () => {
      const confirmed = await showConfirmModal('Reject this submission? This will permanently delete it.', 'Reject', 'Cancel');
      if (!confirmed) return;
      const ok = await rejectSubmission(sub.id);
      if (ok) {
        showToast('Submission rejected and removed.');
        renderPending();
      } else {
        showToast('Failed to reject submission.', 'error');
      }
    });

    item.querySelector('.edit-submission-btn')?.addEventListener('click', () => {
      showEditModal(sub, true);
    });

    dom.pendingList.appendChild(item);
  });
}

/* ========================================================================
   Render Approved
   ======================================================================== */

async function renderApproved() {
  if (!dom.approvedList || !dom.approvedEmpty) return;
  dom.approvedList.innerHTML = '';

  const allEntries = await getAllEntries();
  const userEntries = allEntries.filter(e => !e.id.startsWith('hev-') && !e.id.startsWith('los-'));

  if (userEntries.length === 0) { dom.approvedEmpty.style.display = 'block'; return; }
  dom.approvedEmpty.style.display = 'none';

  userEntries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'admin-pending-item';
    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;flex-wrap:wrap;">
        <h4>${escapeHtml(entry.name)}</h4>
        <button class="admin-btn edit-entry-btn" data-id="${escapeHtml(entry.id)}" style="font-size:0.72rem;">Edit</button>
      </div>
      <p><strong>Type:</strong> ${escapeHtml(entry.type)} | <strong>Date:</strong> ${formatDate(entry.date)} | <span class="status-badge ${entry.status}" style="display:inline-block;">${capitalize(entry.status)}</span></p>
      <p><strong>Genres:</strong> ${entry.genres.map(escapeHtml).join(', ')}</p>
      <p><strong>Summary:</strong> ${escapeHtml(entry.summary)}</p>
      <p><strong>Sources:</strong> ${entry.sources.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`).join(', ')}</p>
      ${renderAdminImages(entry, escapeHtml(entry.name))}
      <div class="admin-actions">
        <button class="admin-btn reject" data-id="${escapeHtml(entry.id)}">Remove</button>
      </div>
    `;

    item.querySelector('.reject').addEventListener('click', async () => {
      const confirmed = await showConfirmModal(`Remove "${entry.name}" from the archive? This cannot be undone.`, 'Remove', 'Cancel');
      if (!confirmed) return;
      const ok = await deleteEntry(entry.id);
      if (ok) {
        showToast('Entry removed from archive.');
        renderApproved();
      } else {
        showToast('Failed to remove entry.', 'error');
      }
    });

    item.querySelector('.edit-entry-btn')?.addEventListener('click', () => {
      showEditModal(entry, false);
    });

    dom.approvedList.appendChild(item);
  });
}

/* ========================================================================
   Edit Modal
   ======================================================================== */

function showEditModal(item, isPending) {
  const backdrop = document.createElement('div');
  backdrop.className = 'confirm-backdrop';
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.style.maxWidth = '600px';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const statuses = ['allegation', 'confirmed', 'resolved', 'disputed'];
  const outcomes = ['ongoing', 'apology', 'silence', 'legal', 'cleared'];
  const genres = getAllGenres();

  modal.innerHTML = `
    <h3 style="font-family:var(--font-heading);margin-bottom:1rem;text-transform:uppercase;">Edit: ${escapeHtml(item.name)}</h3>
    <form id="edit-form">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="edit-name" value="${escapeHtml(item.name)}" required>
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="edit-type">
          <option value="artist" ${item.type === 'artist' ? 'selected' : ''}>Artist</option>
          <option value="band" ${item.type === 'band' ? 'selected' : ''}>Band</option>
          <option value="member" ${item.type === 'member' ? 'selected' : ''}>Member</option>
        </select>
      </div>
      <div class="form-group">
        <label>Genres</label>
        <select id="edit-genres" multiple size="4">
          ${genres.map(g => `<option value="${g}" ${(item.genres || []).includes(g) ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="edit-date" value="${item.date}" required>
      </div>
      <div class="form-group">
        <label>Summary</label>
        <textarea id="edit-summary" rows="4" required>${escapeHtml(item.summary)}</textarea>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="edit-status">${statuses.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${capitalize(s)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Outcome</label>
        <select id="edit-outcome">${outcomes.map(o => `<option value="${o}" ${item.outcome === o ? 'selected' : ''}>${capitalize(o)}</option>`).join('')}</select>
      </div>
      <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;">
        <button type="button" class="admin-btn" id="edit-cancel">Cancel</button>
        <button type="submit" class="admin-btn approve">Save Changes</button>
      </div>
    </form>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('confirm-open'));

  modal.querySelector('#edit-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

  modal.querySelector('#edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectGenres = [...modal.querySelector('#edit-genres').selectedOptions].map(o => o.value);
    const updates = {
      name: modal.querySelector('#edit-name').value.trim(),
      type: modal.querySelector('#edit-type').value,
      genres: selectGenres,
      date: modal.querySelector('#edit-date').value,
      summary: modal.querySelector('#edit-summary').value.trim(),
      status: modal.querySelector('#edit-status').value,
      outcome: modal.querySelector('#edit-outcome').value
    };

    let ok;
    if (isPending) {
      ok = await updatePendingSubmission(item.id, updates);
    } else {
      ok = await updateEntry(item.id, updates);
    }

    if (ok) {
      showToast('Changes saved.');
      backdrop.remove();
      if (currentView === 'pending') renderPending();
      else renderApproved();
    } else {
      showToast('Failed to save changes.', 'error');
    }
  });
}

function getAllGenres() {
  if (typeof window.fullEntries !== 'undefined' && window.fullEntries.length > 0) {
    const set = new Set();
    window.fullEntries.forEach(e => e.genres.forEach(g => set.add(g)));
    return [...set].sort();
  }
  return [...GENRE_LIST];
}

/* ========================================================================
   View Switching
   ======================================================================== */

function switchAdminView(view) {
  currentView = view;
  dom.pendingPanel.style.display = view === 'pending' ? 'block' : 'none';
  dom.approvedPanel.style.display = view === 'approved' ? 'block' : 'none';

  $$('.nav-btn[data-view]').forEach(btn => {
    const isActive = btn.dataset.view === view;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  if (view === 'pending') renderPending();
  else renderApproved();
}

/* ========================================================================
   Init
   ======================================================================== */

async function init() {
  initDomRefs();

  const isAuth = await checkAuth();
  document.body.style.display = '';

  if (!isAuth) {
    document.body.innerHTML = `
      <div class="hero" style="min-height:100vh;display:flex;align-items:center;justify-content:center;">
        <div class="container" style="max-width:400px;">
          <h1 style="font-size:1.5rem;margin-bottom:1.5rem;">Admin Login</h1>
          <form id="admin-login-form">
            <div class="form-group">
              <label for="admin-email">Email</label>
              <input type="email" id="admin-email" placeholder="admin@example.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label for="admin-password">Password</label>
              <input type="password" id="admin-password" placeholder="Enter password" required autocomplete="current-password">
            </div>
            <button type="submit" class="submit-btn" id="admin-login-btn">Sign In</button>
            <p id="admin-login-error" style="color:var(--color-confirmed);margin-top:0.75rem;display:none;"></p>
            <p style="margin-top:1rem;text-align:center;font-size:0.8rem;"><a href="index.html">&larr; Back to archive</a></p>
          </form>
        </div>
      </div>
    `;

    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const btn = document.getElementById('admin-login-btn');
        const errorEl = document.getElementById('admin-login-error');
        setLoading(btn, true, 'Sign In');
        const result = await loginAdmin(email, password);
        if (result.error) {
          errorEl.textContent = result.error;
          errorEl.style.display = 'block';
          setLoading(btn, false, 'Sign In');
        } else {
          window.location.reload();
        }
      });
    }
    return;
  }

  // User is authenticated — set up the full admin UI
  $$('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchAdminView(btn.dataset.view);
      if (dom.mainNav) dom.mainNav.classList.remove('open');
    });
  });

  if (dom.hamburger && dom.mainNav) {
    dom.hamburger.addEventListener('click', () => {
      const isOpen = dom.mainNav.classList.toggle('open');
      dom.hamburger.setAttribute('aria-expanded', isOpen);
    });

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

  // Logout button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logoutAdmin();
      window.location.reload();
    });
  }

  // Export button
  const exportBtn = document.getElementById('admin-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const allEntries = await getAllEntries();
      const blob = new Blob([JSON.stringify(allEntries, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flagged-archive-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Archive exported as JSON.');
    });
  }

  switchAdminView('pending');
}

document.addEventListener('DOMContentLoaded', init);
