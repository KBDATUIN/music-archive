/**
 * FLAGGED — Application Logic
 *
 * Refactored to use Supabase backend with all improvements:
 * - Submission button protection
 * - Inline form validation
 * - Toast notifications
 * - Pagination
 * - Multi-user comments & likes
 * - Timeline view fix
 * - Modal accessibility fix
 * - Report & moderation
 * - Live preview
 * - Proper admin auth
 *
 * @module script
 */

/* ========================================================================
   State
   ======================================================================== */

let fullEntries = [];
let filteredEntries = [];

const filters = {
  search: '',
  genres: [],
  status: [],
  yearStart: null,
  yearEnd: null
};

let currentView = 'grid';
let currentModalEntry = null;
let searchDebounce = null;
let sortBy = 'date-desc';
let pendingImageData = null;
let reportEntryId = null;

/* ========================================================================
   DOM References
   ======================================================================== */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {};

function initDomRefs() {
  dom.gridPanel = $('#grid-panel');
  dom.archiveGrid = $('#archive-grid');
  dom.adminPanel = $('#admin-panel');
  dom.timelineView = $('#timeline-view');
  dom.statsPanel = $('#stats-panel');
  dom.submissionForm = $('#submission-form');
  dom.searchInput = $('#search-input');
  dom.genreChips = $('#genre-chips');
  dom.statusFilters = $('#status-filters');
  dom.yearFrom = $('#year-from');
  dom.yearTo = $('#year-to');
  dom.sortSelect = $('#sort-select');
  dom.resultCount = $('#result-count');
  dom.filterCountBadge = $('#filter-count-badge');
  dom.clearAllBtn = $('#clear-all-btn');
  dom.viewTabs = $('#view-tabs');
  dom.modal = $('#entry-modal');
  dom.modalBackdrop = $('#modal-backdrop');
  dom.modalContent = $('#modal-content');
  dom.hamburger = $('#hamburger-btn');
  dom.mainNav = $('#main-nav');
  dom.emptyState = { style: {} };
  dom.formElement = $('#submit-entry-form');
  dom.warningBanner = $('#warning-banner');
  dom.warningText = $('#warning-text');
  dom.submitConfirm = $('#submit-confirmation');
  dom.charCount = $('#char-count');
  dom.summaryInput = $('#entry-summary');
  dom.sourceContainer = $('#source-urls');
  dom.addSourceBtn = $('#add-source-btn');
  dom.publicFigureCheck = $('#public-figure-check');
  dom.submitterNote = $('#submitter-note');
  dom.submitBtn = $('#submit-btn');
  dom.genreSelect = $('#entry-genres');
  dom.formGenreChips = $('#form-genre-chips');
  dom.selectedGenreTags = $('#selected-genre-tags');
  dom.imageInput = $('#entry-image-input');
  dom.imagesPreviewGrid = $('#images-preview-grid');
  dom.uploadedImages = [];
}

/* ========================================================================
   Data Loading
   ======================================================================== */

async function loadAllEntries() {
  return await getAllEntries();
}

async function loadFilteredEntries() {
  const params = {
    search: filters.search,
    genres: filters.genres,
    status: filters.status,
    yearStart: filters.yearStart,
    yearEnd: filters.yearEnd,
    sortDir: sortBy === 'date-asc' ? 'asc' : 'desc'
  };
  filteredEntries = await getAllEntries(params);
  return filteredEntries;
}

/* ========================================================================
   Sorting
   ======================================================================== */

function sortEntries(entries) {
  const sorted = [...entries];
  switch (sortBy) {
    case 'date-desc': sorted.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
    case 'date-asc': sorted.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
    case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
    default: sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return sorted;
}

/* ========================================================================
   Utilities
   ======================================================================== */

function statusTooltip(status) {
  const tips = {
    allegation: 'Publicly reported — not independently verified',
    confirmed: 'Verified through multiple independent sources',
    resolved: 'Acknowledged and addressed',
    disputed: 'Contested by the subject'
  };
  return tips[status] || '';
}

function generateRandomName() {
  const prefixes = ['Anonymous', 'Secret', 'Ghost', 'Void', 'Null', 'Xero', 'Echo', 'Neon', 'Dark', 'Shadow', 'Cyber', 'Pixel', 'Lunar', 'Solar', 'Night', 'Storm', 'Frost', 'Ember', 'Blaze', 'Knight', 'Crimson', 'Obsidian', 'Phantom', 'Rogue', 'Chaos', 'Static', 'Raven', 'Viper', 'Wraith', 'Blitz', 'Drift', 'Flux', 'Grim', 'Hex', 'Jade', 'Karma', 'Myth', 'Nova', 'Onyx', 'Prism', 'Quantum', 'Radix', 'Sable', 'Toxin', 'Ultra', 'Venom', 'Zen'];
  const stems = ['wolf', 'fox', 'crow', 'hawk', 'fire', 'ice', 'rain', 'void', 'echo', 'storm', 'blade', 'core', 'dust', 'fang', 'claw', 'moon', 'star', 'wave', 'haze', 'mist', 'blur', 'rush', 'tide', 'howl', 'roar', 'hum', 'beat', 'pulse', 'scream', 'whisper', 'drone', 'glow', 'dark', 'light', 'night', 'shadow', 'phantom', 'ghost', 'hymn', 'verse', 'ash', 'bane', 'bolt', 'brim', 'crypt', 'curse', 'dawn', 'dusk', 'fade', 'fear', 'flare', 'forge', 'fuse', 'gaze', 'glim', 'gore', 'grit', 'growl', 'hiss', 'hollow', 'hunt', 'jolt', 'lash', 'mark', 'mirage', 'murk', 'oath', 'plague', 'rage', 'reck', 'rift', 'sage', 'scorn', 'shard', 'shock', 'skull', 'snare', 'soar', 'spark', 'spire', 'surge', 'swarm', 'thorn', 'trace', 'tremor', 'vapor', 'vex', 'warp'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const stem = stems[Math.floor(Math.random() * stems.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${prefix}${stem}${num}`;
}

function getMyDisplayName() {
  let name = localStorage.getItem('amca_display_name');
  if (!name) {
    name = generateRandomName();
    localStorage.setItem('amca_display_name', name);
  }
  return name;
}

function getSessionId() {
  let id = localStorage.getItem('amca_user_id');
  if (!id) {
    id = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('amca_user_id', id);
  }
  return id;
}

function getYear(isoString) {
  return new Date(isoString).getFullYear();
}

function filtersToQuery() {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.genres.length) params.set('genre', filters.genres.join(','));
  if (filters.status.length) params.set('status', filters.status.join(','));
  if (filters.yearStart) params.set('yearFrom', filters.yearStart);
  if (filters.yearEnd) params.set('yearTo', filters.yearEnd);
  return params.toString();
}

function applyFiltersFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('search')) filters.search = params.get('search');
  if (params.has('genre')) filters.genres = params.get('genre').split(',').filter(Boolean);
  if (params.has('status')) filters.status = params.get('status').split(',').filter(Boolean);
  if (params.has('yearFrom')) filters.yearStart = parseInt(params.get('yearFrom'), 10) || null;
  if (params.has('yearTo')) filters.yearEnd = parseInt(params.get('yearTo'), 10) || null;
}

function syncUrlWithFilters() {
  const query = filtersToQuery();
  const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

function getAllGenres() {
  const set = new Set();
  fullEntries.forEach(e => e.genres.forEach(g => set.add(g)));
  return [...set].sort();
}

function getYearRange() {
  let min = Infinity, max = -Infinity;
  fullEntries.forEach(e => {
    const y = getYear(e.date);
    if (y < min) min = y;
    if (y > max) max = y;
  });
  return { min, max };
}

/* ========================================================================
   Admin Auth (Supabase)
   ======================================================================== */

let adminSession = null;

async function checkAdminAuth() {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: { session } } = await sb.auth.getSession();
  adminSession = session;
  return !!session;
}

async function loginAdmin(email, password) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase not configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) adminSession = data.session;
  return { error: error?.message || null };
}

async function logoutAdmin() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  adminSession = null;
}

/* ========================================================================
   Filtering
   ======================================================================== */

async function applyFilters() {
  await loadFilteredEntries();
  renderView();
  updateFilterBadge();
  updateResultCount();
  updateSearchAndChips();
  updateStatusChips();
  syncUrlWithFilters();
}

function updateStatusChips() {
  if (!dom.statusFilters) return;
  const counts = {};
  fullEntries.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
  dom.statusFilters.innerHTML = '';
  ['allegation', 'confirmed', 'resolved', 'disputed'].forEach(status => {
    const chip = document.createElement('button');
    chip.className = 'status-chip';
    chip.dataset.status = status;
    const count = counts[status] || 0;
    chip.innerHTML = `${capitalize(status)} <span class="status-count">${count}</span>`;
    chip.setAttribute('aria-label', `Filter by status: ${status} (${count} entries)`);
    chip.classList.toggle('active', filters.status.includes(status));
    chip.addEventListener('click', () => {
      const idx = filters.status.indexOf(status);
      if (idx > -1) filters.status.splice(idx, 1);
      else filters.status.push(status);
      applyFilters();
    });
    dom.statusFilters.appendChild(chip);
  });
}

function updateResultCount() {
  if (!dom.resultCount) return;
  const total = fullEntries.length;
  const shown = filteredEntries.length;
  if (shown === total) {
    dom.resultCount.textContent = `${total} entr${total === 1 ? 'y' : 'ies'}`;
  } else {
    dom.resultCount.textContent = `Showing ${shown} of ${total} entr${total === 1 ? 'y' : 'ies'}`;
  }
}

function updateSearchAndChips() {
  if (dom.searchInput) dom.searchInput.value = filters.search;
  if (dom.statusFilters) {
    $$('.status-chip', dom.statusFilters).forEach(chip => {
      chip.classList.toggle('active', filters.status.includes(chip.dataset.status));
    });
  }
  if (dom.yearFrom && dom.yearFrom.value !== String(filters.yearStart || '')) {
    dom.yearFrom.value = filters.yearStart || '';
  }
  if (dom.yearTo && dom.yearTo.value !== String(filters.yearEnd || '')) {
    dom.yearTo.value = filters.yearEnd || '';
  }
}

function updateFilterBadge() {
  const count = filters.genres.length + filters.status.length + (filters.search ? 1 : 0) +
    (filters.yearStart || filters.yearEnd ? 1 : 0);
  const badge = dom.filterCountBadge;
  if (badge) {
    const countEl = badge.querySelector('.count');
    if (count > 0) {
      countEl.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function clearAllFilters() {
  filters.search = '';
  filters.genres = [];
  filters.status = [];
  filters.yearStart = null;
  filters.yearEnd = null;
  if (dom.yearFrom) dom.yearFrom.value = '';
  if (dom.yearTo) dom.yearTo.value = '';
  dom.searchInput.value = '';
  applyFilters();
}

/* ========================================================================
   Rendering — Grid View
   ======================================================================== */

function renderGrid() {
  if (!dom.archiveGrid) return;
  dom.archiveGrid.innerHTML = '';

  if (filteredEntries.length === 0) {
    dom.archiveGrid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <h3>No flagged artists found</h3>
        <p>Try adjusting your filters, search query, or clear all filters to browse the full archive.</p>
      </div>`;
    return;
  }

  filteredEntries.forEach((entry, i) => {
    const card = createEntryCard(entry);
    card.style.animationDelay = `${i * 40}ms`;
    dom.archiveGrid.appendChild(card);
  });
}

function createEntryCard(entry) {
  const card = document.createElement('article');
  card.className = 'entry-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details about ${entry.name}`);
  card.dataset.entryId = entry.id;
  card.dataset.status = entry.status;

  const cardImages = entry.imageUrls && entry.imageUrls.length > 0
    ? entry.imageUrls
    : entry.imageUrl ? [entry.imageUrl] : [];

  if (cardImages.length > 0) {
    const isRevealed = sessionStorage.getItem(`img-${entry.id}`) === 'revealed';
    const wrapper = document.createElement('div');
    wrapper.className = 'entry-card-image-wrapper';
    const img = document.createElement('img');
    img.src = cardImages[0];
    img.alt = `Reference photo of ${entry.name} — click to view`;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (isRevealed) img.classList.add('revealed');
    wrapper.appendChild(img);

    if (cardImages.length > 1) {
      const countBadge = document.createElement('span');
      countBadge.className = 'blur-hint';
      countBadge.textContent = isRevealed ? `${cardImages.length} images` : `+${cardImages.length - 1} more`;
      wrapper.appendChild(countBadge);
    } else {
      const hint = document.createElement('span');
      hint.className = 'blur-hint';
      hint.textContent = isRevealed ? '' : 'Click to reveal';
      wrapper.appendChild(hint);
    }

    card.appendChild(wrapper);

    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      const revealed = sessionStorage.getItem(`img-${entry.id}`) === 'revealed';
      if (!revealed) {
        sessionStorage.setItem(`img-${entry.id}`, 'revealed');
        img.classList.add('revealed');
      }
    });
  }

  const header = document.createElement('div');
  header.className = 'entry-card-header';
  header.innerHTML = `
    <h3 class="entry-card-name">${escapeHtml(entry.name)}</h3>
    <span class="entry-card-date">${formatDate(entry.date)}</span>
  `;
  card.appendChild(header);

  const summaryEl = document.createElement('p');
  summaryEl.className = 'entry-card-summary';
  const firstSentence = entry.summary.split('.')[0] + '.';
  summaryEl.textContent = firstSentence;
  card.appendChild(summaryEl);

  const footer = document.createElement('div');
  footer.className = 'entry-card-footer';
  const badge = document.createElement('span');
  badge.className = `status-badge ${entry.status}`;
  badge.textContent = capitalize(entry.status);
  badge.setAttribute('title', statusTooltip(entry.status));
  footer.appendChild(badge);
  const srcCount = document.createElement('span');
  srcCount.className = 'entry-card-source-count';
  srcCount.textContent = `${entry.sources.length} source${entry.sources.length !== 1 ? 's' : ''}`;
  footer.appendChild(srcCount);
  const viewLabel = document.createElement('span');
  viewLabel.className = 'entry-card-view-link';
  viewLabel.textContent = 'View details →';
  footer.appendChild(viewLabel);
  card.appendChild(footer);

  card.addEventListener('click', () => openModal(entry));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(entry);
    }
  });

  return card;
}

/* ========================================================================
   Rendering — Timeline View (fixed with .timeline wrapper)
   ======================================================================== */

function renderTimeline() {
  if (!dom.timelineView) return;
  dom.timelineView.innerHTML = '';

  if (filteredEntries.length === 0) {
    dom.timelineView.innerHTML = `
      <div class="empty-state" style="display:block;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <h3>No flagged artists found</h3>
        <p>Try adjusting your filters, search query, or clear all filters to browse the full archive.</p>
      </div>`;
    return;
  }

  // Wrap timeline in .timeline class so the CSS connector line renders
  const timelineWrapper = document.createElement('div');
  timelineWrapper.className = 'timeline';

  const grouped = {};
  filteredEntries.forEach(entry => {
    const y = getYear(entry.date);
    if (!grouped[y]) grouped[y] = [];
    grouped[y].push(entry);
  });

  const years = Object.keys(grouped).sort((a, b) => b - a);

  years.forEach(year => {
    const yearSection = document.createElement('div');
    yearSection.className = 'timeline-year';
    const header = document.createElement('h3');
    header.className = 'timeline-year-header';
    header.textContent = year;
    yearSection.appendChild(header);

    grouped[year].forEach((entry, ei) => {
      const item = document.createElement('div');
      item.style.animationDelay = `${ei * 60}ms`;
      item.className = `timeline-entry ${entry.status}`;
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `View details about ${entry.name}`);
      item.dataset.entryId = entry.id;
      item.innerHTML = `
        <div class="timeline-entry-header">
          <span class="timeline-entry-name">${escapeHtml(entry.name)}</span>
          <span class="timeline-entry-date">${formatDate(entry.date)}</span>
        </div>
        <p class="timeline-entry-summary">${escapeHtml(entry.summary.split('.')[0] + '.')}</p>
        <div class="timeline-entry-genres">
          ${entry.genres.map(g => `<span class="entry-card-genre-tag">${escapeHtml(g)}</span>`).join('')}
        </div>
        <span class="status-badge ${entry.status}" style="margin-top:0.5rem;display:inline-block;">${capitalize(entry.status)}</span>
      `;
      item.addEventListener('click', () => openModal(entry));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(entry); }
      });
      yearSection.appendChild(item);
    });

    timelineWrapper.appendChild(yearSection);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entryObs => {
        if (entryObs.isIntersecting) {
          entryObs.target.classList.add('visible');
          observer.unobserve(entryObs.target);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(yearSection);
  });

  dom.timelineView.appendChild(timelineWrapper);
}

/* ========================================================================
   Rendering — Statistics
   ======================================================================== */

function renderStats() {
  if (!dom.statsPanel) return;

  if (fullEntries.length === 0) {
    dom.statsPanel.innerHTML = `
      <h2>Statistics</h2>
      <div class="empty-state" style="display:block;margin-top:2rem;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <h3>No data to chart</h3>
        <p>Statistics will appear once entries are submitted and approved.</p>
      </div>`;
    return;
  }

  dom.statsPanel.innerHTML = '<h2>Statistics</h2><div class="stats-grid"><div class="stats-group"><h3>By Genre</h3><div class="bar-chart" id="genre-stats-chart"></div></div><div class="stats-group"><h3>By Year</h3><div class="bar-chart" id="year-stats-chart"></div></div><div class="stats-group"><h3>By Status</h3><div class="bar-chart" id="status-stats-chart"></div></div></div>';

  const genreCounts = {};
  fullEntries.forEach(e => { e.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }); });
  const genreMax = Math.max(...Object.values(genreCounts), 1);
  const genreChart = dom.statsPanel.querySelector('#genre-stats-chart');
  if (genreChart) {
    genreChart.innerHTML = '';
    Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).forEach(([genre, count]) => {
      genreChart.appendChild(createBarRow(genre, count, genreMax, 'genre-fill'));
    });
  }

  const yearCounts = {};
  fullEntries.forEach(e => { const y = getYear(e.date); yearCounts[y] = (yearCounts[y] || 0) + 1; });
  const yearMax = Math.max(...Object.values(yearCounts), 1);
  const yearChart = dom.statsPanel.querySelector('#year-stats-chart');
  if (yearChart) {
    yearChart.innerHTML = '';
    Object.entries(yearCounts).sort((a, b) => b[0] - a[0]).forEach(([year, count]) => {
      yearChart.appendChild(createBarRow(year, count, yearMax, 'year-fill'));
    });
  }

  const statusCounts = {};
  fullEntries.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });
  const statusMax = Math.max(...Object.values(statusCounts), 1);
  const statusChart = dom.statsPanel.querySelector('#status-stats-chart');
  if (statusChart) {
    statusChart.innerHTML = '';
    ['allegation', 'confirmed', 'resolved', 'disputed'].forEach(s => {
      if (statusCounts[s]) statusChart.appendChild(createBarRow(capitalize(s), statusCounts[s], statusMax, `status-fill ${s}`));
    });
  }
}

function createBarRow(label, count, max, fillClass) {
  const pct = (count / max) * 100;
  const row = document.createElement('div');
  row.className = 'bar-row';
  row.innerHTML = `<span class="bar-label">${escapeHtml(label)}</span><div class="bar-track"><div class="bar-fill ${fillClass}" style="width:${pct}%"></div></div><span class="bar-count">${count}</span>`;
  return row;
}

/* ========================================================================
   Admin Panel (Supabase Auth)
   ======================================================================== */

async function renderAdmin() {
  if (!dom.adminPanel) return;
  const isAuth = await checkAdminAuth();

  if (!isAuth) {
    dom.adminPanel.innerHTML = `
      <h2 style="margin-bottom:1rem;">Editorial Dashboard</h2>
      <div class="admin-empty" style="max-width:400px;margin:0 auto;">
        <p style="margin-bottom:1.5rem;">Sign in with your admin account to manage submissions.</p>
        <form id="admin-login-form" style="text-align:left;">
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
        </form>
      </div>
    `;

    const loginForm = dom.adminPanel.querySelector('#admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = dom.adminPanel.querySelector('#admin-email').value;
        const password = dom.adminPanel.querySelector('#admin-password').value;
        const btn = dom.adminPanel.querySelector('#admin-login-btn');
        const errorEl = dom.adminPanel.querySelector('#admin-login-error');
        setLoading(btn, true, 'Sign In');
        const result = await loginAdmin(email, password);
        if (result.error) {
          errorEl.textContent = result.error;
          errorEl.style.display = 'block';
          setLoading(btn, false, 'Sign In');
        } else {
          renderAdmin();
        }
      });
    }
    return;
  }

  dom.adminPanel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.5rem;">
      <h2 style="margin:0;">Editorial Dashboard</h2>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <span style="font-size:0.8rem;color:var(--color-text-muted);">${adminSession?.user?.email || 'Admin'}</span>
        <button class="admin-btn" id="admin-export-btn" style="font-size:0.78rem;">Export JSON</button>
        <button class="admin-btn" id="admin-logout-btn" style="font-size:0.78rem;">Sign Out</button>
      </div>
    </div>
    <div class="view-tabs" style="margin:0 0 1rem;border:none;padding:0;overflow:visible;">
      <button class="view-tab active" data-admin-view="pending" style="margin:0;">Pending</button>
      <button class="view-tab" data-admin-view="approved" style="margin:0;">Approved</button>
    </div>
    <div id="admin-pending-section">
      <div class="admin-pending-list" id="admin-pending-list"></div>
      <div class="admin-empty" id="admin-pending-empty"><p>No pending submissions.</p></div>
    </div>
    <div id="admin-approved-section" style="display:none">
      <div class="admin-pending-list" id="admin-approved-list"></div>
      <div class="admin-empty" id="admin-approved-empty"><p>No approved submissions yet.</p></div>
    </div>
  `;

  dom.adminPanel.querySelector('#admin-logout-btn').addEventListener('click', async () => {
    await logoutAdmin();
    renderAdmin();
  });

  dom.adminPanel.querySelector('#admin-export-btn').addEventListener('click', async () => {
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

  dom.adminPanel.querySelectorAll('[data-admin-view]').forEach(tab => {
    tab.addEventListener('click', () => {
      dom.adminPanel.querySelectorAll('[data-admin-view]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.adminView;
      document.getElementById('admin-pending-section').style.display = view === 'pending' ? 'block' : 'none';
      document.getElementById('admin-approved-section').style.display = view === 'approved' ? 'block' : 'none';
      if (view === 'pending') renderPendingAdmin();
      else renderApprovedAdmin();
    });
  });

  renderPendingAdmin();
}

async function renderPendingAdmin() {
  const list = document.getElementById('admin-pending-list');
  const empty = document.getElementById('admin-pending-empty');
  if (!list || !empty) return;
  list.innerHTML = '';

  const pending = await fetchPendingSubmissions();
  if (pending.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

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
      ${sub.submitterNote ? `<p><strong>Submitter note:</strong> ${escapeHtml(sub.submitterNote)}</p>` : ''}
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
        renderPendingAdmin();
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
        renderPendingAdmin();
      } else {
        showToast('Failed to reject submission.', 'error');
      }
    });

    item.querySelector('.edit-submission-btn')?.addEventListener('click', () => {
      showEditModal(sub, true);
    });

    list.appendChild(item);
  });
}

async function renderApprovedAdmin() {
  const list = document.getElementById('admin-approved-list');
  const empty = document.getElementById('admin-approved-empty');
  if (!list || !empty) return;
  list.innerHTML = '';

  const allEntries = await getAllEntries();
  const approved = allEntries.filter(e => !e.id.startsWith('hev-') && !e.id.startsWith('los-')); // exclude hardcoded for demo, use a flag instead
  const userEntries = allEntries.filter(e => !e.isHardcoded);

  if (userEntries.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

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
        renderApprovedAdmin();
      } else {
        showToast('Failed to remove entry.', 'error');
      }
    });

    item.querySelector('.edit-entry-btn')?.addEventListener('click', () => {
      showEditModal(entry, false);
    });

    list.appendChild(item);
  });
}

/* ========================================================================
   Edit Modal (Admin feature)
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
  const statusOpts = statuses.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${capitalize(s)}</option>`).join('');
  const outcomeOpts = outcomes.map(o => `<option value="${o}" ${item.outcome === o ? 'selected' : ''}>${capitalize(o)}</option>`).join('');
  const genreOpts = getAllGenres().map(g => `<option value="${g}" ${item.genres.includes(g) ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');

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
        <select id="edit-genres" multiple size="4">${genreOpts}</select>
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
        <select id="edit-status">${statusOpts}</select>
      </div>
      <div class="form-group">
        <label>Outcome</label>
        <select id="edit-outcome">${outcomeOpts}</select>
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
      ok = await rejectSubmission(item.id);
    } else {
      ok = await updateEntry(item.id, updates);
    }

    if (ok) {
      showToast('Changes saved.');
      backdrop.remove();
      if (isPending) renderPendingAdmin();
      else renderApprovedAdmin();
    } else {
      showToast('Failed to save changes.', 'error');
    }
  });
}

/* ========================================================================
   View Rendering Dispatch
   ======================================================================== */

function renderView() {
  dom.gridPanel.style.display = 'none';
  dom.timelineView.style.display = 'none';
  dom.statsPanel.style.display = 'none';
  dom.submissionForm.style.display = 'none';
  dom.adminPanel.style.display = 'none';

  const filtersSection = document.querySelector('.filters-section');
  if (filtersSection) {
    filtersSection.style.display = (currentView === 'grid' || currentView === 'timeline') ? '' : 'none';
  }

  switch (currentView) {
    case 'grid': dom.gridPanel.style.display = 'block'; renderGrid(); break;
    case 'timeline': dom.timelineView.style.display = 'block'; renderTimeline(); break;
    case 'stats': dom.statsPanel.style.display = 'block'; renderStats(); break;
    case 'admin': dom.adminPanel.style.display = 'block'; renderAdmin(); break;
    case 'submit': dom.submissionForm.style.display = 'block'; break;
    default: dom.gridPanel.style.display = 'block'; renderGrid();
  }
}

/* ========================================================================
   Engagement — Comments & Likes (Supabase)
   ======================================================================== */

async function getEntryEngagementLocal(entryId) {
  return await getEntryEngagement(entryId);
}

async function getUserEngagementLocal(entryId) {
  return await getUserEngagement(entryId, getSessionId());
}

async function toggleEntryEngagementLocal(entryId, type) {
  return await toggleEntryEngagement(entryId, getSessionId(), type);
}

async function buildEngagementHtml(entry) {
  const engagement = await getEntryEngagementLocal(entry.id);
  const userEng = await getUserEngagementLocal(entry.id);
  const allComments = await fetchComments(entry.id);
  const allReplies = await fetchAllReplies(entry.id);

  const replyMap = {};
  allReplies.forEach(r => {
    if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
    replyMap[r.parent_id].push(r);
  });

  const sessionId = getSessionId();

  function renderReactions(item) {
    const itemLikes = allReplies.filter(r => r.parent_id === item.id && r.likes?.includes(sessionId)).length;
    const itemDislikes = allReplies.filter(r => r.parent_id === item.id && r.dislikes?.includes(sessionId)).length;
    return '';
  }

  async function renderCommentHtml(comment) {
    const reactions = await fetchCommentReactions(comment.id);
    const liked = reactions?.liked || false;
    const disliked = reactions?.disliked || false;
    const likeCount = reactions?.likes || 0;
    const dislikeCount = reactions?.dislikes || 0;
    const isOwner = comment.session_id === sessionId;

    let repliesHtml = '';
    const replies = replyMap[comment.id] || [];
    for (const reply of replies) {
      repliesHtml += await renderReplyHtml(reply, 1);
    }

    return `
      <div class="comment-item">
        <div class="comment-item-inner">
          <div class="comment-meta">
            <span class="comment-name">${escapeHtml(comment.name)}</span>
            <span class="comment-time">${formatDate(comment.timestamp)}</span>
          </div>
          <p class="comment-text">${escapeHtml(comment.text)}</p>
          ${comment.image_url ? `<div class="comment-attached-image"><img src="${escapeHtml(comment.image_url)}" alt="Attached image" loading="lazy"></div>` : ''}
          <div class="comment-reactions">
            <button class="comment-like-btn ${liked ? 'active' : ''}" data-comment-id="${escapeHtml(comment.id)}" data-reaction="like">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="reaction-count">${likeCount}</span>
            </button>
            <button class="comment-dislike-btn ${disliked ? 'active' : ''}" data-comment-id="${escapeHtml(comment.id)}" data-reaction="dislike">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="reaction-count">${dislikeCount}</span>
            </button>
            <button class="comment-reply-btn" data-comment-id="${escapeHtml(comment.id)}">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Reply
            </button>
            ${isOwner ? `<button class="comment-delete-btn" data-comment-id="${escapeHtml(comment.id)}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
          </div>
          ${repliesHtml}
          <div class="comment-reply-form-wrapper" data-parent-id="${escapeHtml(comment.id)}" style="display:none">
            <form class="comment-reply-form">
              <textarea class="reply-text-input" placeholder="Write a reply…" rows="2" required></textarea>
              <div class="reply-form-actions">
                <button type="submit" class="reply-submit-btn">Reply</button>
                <button type="button" class="reply-cancel-btn">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  async function renderReplyHtml(reply, depth) {
    const reactions = await fetchCommentReactions(reply.id);
    const liked = reactions?.liked || false;
    const disliked = reactions?.disliked || false;
    const isOwner = reply.session_id === sessionId;
    const indent = Math.min(depth, 3);

    return `
      <div class="comment-reply depth-${indent}">
        <div class="comment-item-inner">
          <div class="comment-meta">
            <span class="comment-name">${escapeHtml(reply.name)}</span>
            <span class="comment-time">${formatDate(reply.timestamp)}</span>
          </div>
          <p class="comment-text">${escapeHtml(reply.text)}</p>
          ${reply.image_url ? `<div class="comment-attached-image"><img src="${escapeHtml(reply.image_url)}" alt="Attached image" loading="lazy"></div>` : ''}
          <div class="comment-reactions">
            <button class="comment-like-btn ${liked ? 'active' : ''}" data-comment-id="${escapeHtml(reply.id)}" data-reaction="like">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="reaction-count">${reactions?.likes || 0}</span>
            </button>
            <button class="comment-dislike-btn ${disliked ? 'active' : ''}" data-comment-id="${escapeHtml(reply.id)}" data-reaction="dislike">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="reaction-count">${reactions?.dislikes || 0}</span>
            </button>
            ${isOwner ? `<button class="comment-delete-btn" data-comment-id="${escapeHtml(reply.id)}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  let commentsHtml = '';
  if (allComments.length > 0) {
    for (const comment of allComments) {
      commentsHtml += await renderCommentHtml(comment);
    }
  } else {
    commentsHtml = '<p class="comments-empty">No messages yet. Be the first to share your thoughts.</p>';
  }

  const heartIcon = userEng.liked
    ? `<svg class="like-icon liked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/></svg>`
    : `<svg class="like-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

  const thumbIcon = userEng.disliked
    ? `<svg class="dislike-icon disliked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="currentColor"/></svg>`
    : `<svg class="dislike-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

  return `
    <div class="engagement-section">
      <div class="engagement-header">
        <button class="like-button ${userEng.liked ? 'liked' : ''}" data-entry-id="${escapeHtml(entry.id)}" aria-label="${userEng.liked ? 'Unlike' : 'Like'} this entry">
          ${heartIcon}
          <span class="like-count">${engagement.likes}</span>
        </button>
        <button class="dislike-button ${userEng.disliked ? 'disliked' : ''}" data-entry-id="${escapeHtml(entry.id)}" aria-label="${userEng.disliked ? 'Remove dislike' : 'Dislike'} this entry">
          ${thumbIcon}
          <span class="dislike-count">${engagement.dislikes}</span>
        </button>
        <span class="engagement-label">Support &amp; Solidarity</span>
      </div>

      <div class="comments-section">
        <div class="comments-list" data-entry-id="${escapeHtml(entry.id)}">
          ${commentsHtml}
        </div>

        <form class="comment-form" data-entry-id="${escapeHtml(entry.id)}">
          <div class="comment-form-header">
            <span class="comment-form-name-hint">Commenting as <strong>${escapeHtml(getMyDisplayName())}</strong></span>
          </div>
          <div class="comment-form-row">
            <textarea class="comment-text-input" placeholder="Share your thoughts, show support for those affected…" rows="2" required></textarea>
          </div>
          <button type="submit" class="comment-submit-btn">Post Message</button>
        </form>
      </div>
    </div>
  `;
}

async function fetchCommentReactions(commentId) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: likes } = await sb.from('comment_reactions')
    .select('session_id', { count: 'exact' }).eq('comment_id', commentId).eq('type', 'like');
  const { data: dislikes } = await sb.from('comment_reactions')
    .select('session_id', { count: 'exact' }).eq('comment_id', commentId).eq('type', 'dislike');
  const { data: userReactions } = await sb.from('comment_reactions')
    .select('type').eq('comment_id', commentId).eq('session_id', getSessionId());
  return {
    liked: userReactions?.some(r => r.type === 'like') || false,
    disliked: userReactions?.some(r => r.type === 'dislike') || false,
    likes: likes?.length || 0,
    dislikes: dislikes?.length || 0
  };
}

async function initEngagement(entry) {
  const likeBtn = dom.modalContent.querySelector('.like-button');
  if (likeBtn) {
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await toggleEntryEngagementLocal(entry.id, 'like');
      if (result) {
        const icon = likeBtn.querySelector('.like-icon');
        const count = likeBtn.querySelector('.like-count');
        likeBtn.classList.toggle('liked', result.liked);
        likeBtn.setAttribute('aria-label', result.liked ? 'Unlike this entry' : 'Like this entry');
        const newSvg = result.liked
          ? `<svg class="like-icon liked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/></svg>`
          : `<svg class="like-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
        icon.outerHTML = newSvg;
        count.textContent = result.likes;
      }
    });
  }

  const dislikeBtn = dom.modalContent.querySelector('.dislike-button');
  if (dislikeBtn) {
    dislikeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await toggleEntryEngagementLocal(entry.id, 'dislike');
      if (result) {
        const icon = dislikeBtn.querySelector('.dislike-icon');
        const count = dislikeBtn.querySelector('.dislike-count');
        dislikeBtn.classList.toggle('disliked', result.disliked);
        dislikeBtn.setAttribute('aria-label', result.disliked ? 'Remove dislike' : 'Dislike this entry');
        const newSvg = result.disliked
          ? `<svg class="dislike-icon disliked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="currentColor"/></svg>`
          : `<svg class="dislike-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
        icon.outerHTML = newSvg;
        count.textContent = result.dislikes;
      }
    });
  }

  // Comment form
  const commentForm = dom.modalContent.querySelector('.comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textInput = commentForm.querySelector('.comment-text-input');
      const text = textInput.value.trim();
      if (text.length < 2) { textInput.focus(); return; }

      const newComment = await addComment(entry.id, null, text, getMyDisplayName(), getSessionId(), null);
      if (newComment) {
        textInput.value = '';
        showToast('Comment posted.');
        const engagementSection = dom.modalContent.querySelector('.engagement-section');
        if (engagementSection) {
          engagementSection.outerHTML = await buildEngagementHtml(entry);
          initEngagement(entry);
        }
      } else {
        showToast('Failed to post comment.', 'error');
      }
    });
  }

  // Delegated events
  const commentsList = dom.modalContent.querySelector('.comments-list');
  if (commentsList) {
    commentsList.addEventListener('click', async (e) => {
      // Comment reactions
      const reactionBtn = e.target.closest('[data-reaction]');
      if (reactionBtn) {
        e.stopPropagation();
        const commentId = reactionBtn.dataset.commentId;
        const reactionType = reactionBtn.dataset.reaction;
        const result = await toggleCommentReaction(commentId, getSessionId(), reactionType);
        if (result) {
          const parent = reactionBtn.closest('.comment-reactions');
          if (parent) {
            const likeBtn = parent.querySelector('.comment-like-btn');
            const dislikeBtn = parent.querySelector('.comment-dislike-btn');
            if (likeBtn) {
              likeBtn.classList.toggle('active', result.liked);
              likeBtn.querySelector('.reaction-count').textContent = result.likes;
            }
            if (dislikeBtn) {
              dislikeBtn.classList.toggle('active', result.disliked);
              dislikeBtn.querySelector('.reaction-count').textContent = result.dislikes;
            }
          }
        }
        return;
      }

      // Reply button
      const replyBtn = e.target.closest('.comment-reply-btn');
      if (replyBtn) {
        e.stopPropagation();
        const commentId = replyBtn.dataset.commentId;
        const wrapper = dom.modalContent.querySelector(`.comment-reply-form-wrapper[data-parent-id="${commentId}"]`);
        if (wrapper) {
          dom.modalContent.querySelectorAll('.comment-reply-form-wrapper').forEach(w => {
            if (w !== wrapper) w.style.display = 'none';
          });
          wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
          if (wrapper.style.display === 'block') wrapper.querySelector('.reply-text-input').focus();
        }
        return;
      }

      // Delete button
      const deleteBtn = e.target.closest('.comment-delete-btn');
      if (deleteBtn) {
        e.stopPropagation();
        const commentId = deleteBtn.dataset.commentId;
        const confirmed = await showConfirmModal('Delete this comment?', 'Delete', 'Cancel');
        if (!confirmed) return;
        const deleted = await deleteComment(commentId, getSessionId());
        if (deleted) {
          showToast('Comment deleted.');
          const engagementSection = dom.modalContent.querySelector('.engagement-section');
          if (engagementSection) {
            engagementSection.outerHTML = await buildEngagementHtml(entry);
            initEngagement(entry);
          }
        } else {
          showToast('Failed to delete comment.', 'error');
        }
        return;
      }
    });

    // Reply form submissions
    commentsList.addEventListener('submit', async (e) => {
      const replyForm = e.target.closest('.comment-reply-form');
      if (replyForm) {
        e.preventDefault();
        const wrapper = replyForm.closest('.comment-reply-form-wrapper');
        if (!wrapper) return;
        const parentCommentId = wrapper.dataset.parentId;
        const textInput = replyForm.querySelector('.reply-text-input');
        const text = textInput.value.trim();
        if (text.length < 2) { textInput.focus(); return; }

        const reply = await addComment(entry.id, parentCommentId, text, getMyDisplayName(), getSessionId(), null);
        if (reply) {
          textInput.value = '';
          wrapper.style.display = 'none';
          showToast('Reply posted.');
          const engagementSection = dom.modalContent.querySelector('.engagement-section');
          if (engagementSection) {
            engagementSection.outerHTML = await buildEngagementHtml(entry);
            initEngagement(entry);
          }
        } else {
          showToast('Failed to post reply.', 'error');
        }
      }
    });
  }

  // Cancel reply buttons
  dom.modalContent.querySelectorAll('.reply-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.comment-reply-form-wrapper');
      if (wrapper) {
        wrapper.style.display = 'none';
        wrapper.querySelector('.reply-text-input').value = '';
      }
    });
  });
}

/* ========================================================================
   Modal
   ======================================================================== */

async function openModal(entry) {
  currentModalEntry = entry;
  dom.modalContent.classList.remove('closing');
  dom.modalContent.innerHTML = '';

  const statusLabels = { allegation: 'Allegation', confirmed: 'Confirmed', resolved: 'Resolved', disputed: 'Disputed' };
  const outcomeLabels = { apology: 'Apology issued', silence: 'No public response', legal: 'Legal action', cleared: 'Cleared', ongoing: 'Ongoing' };
  const statusExplanations = { allegation: 'Publicly reported claim — not yet independently verified', confirmed: 'Verified through multiple independent sources', resolved: 'Acknowledged and addressed — apology, settlement, or legal resolution', disputed: 'Publicly contested by the subject — conflicting accounts exist' };

  const sourcesHtml = entry.sources.map(s =>
    `<li class="modal-source-item"><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>`
  ).join('');

  dom.modal.setAttribute('aria-label', `${entry.name} — controversy details`);

  const modalImages = entry.imageUrls && entry.imageUrls.length > 0
    ? entry.imageUrls
    : entry.imageUrl ? [entry.imageUrl] : [];

  const imagesHtml = modalImages.length > 0
    ? `<div class="modal-label">Evidence Images (${modalImages.length})</div>
       <div class="modal-image-gallery">
        ${modalImages.map((url, i) =>
          `<img src="${escapeHtml(url)}" alt="Evidence image ${i + 1} of ${escapeHtml(entry.name)}" loading="lazy" decoding="async">`
        ).join('')}
       </div>`
    : '';

  dom.modalContent.innerHTML = `
    <button class="modal-close" id="modal-close-inner" aria-label="Close modal">&times;</button>
    <h2 class="modal-name" id="modal-entry-name">${escapeHtml(entry.name)}</h2>
    <div class="modal-meta">
      <span class="status-badge ${entry.status}">${statusLabels[entry.status] || capitalize(entry.status)}</span>
      <span class="modal-date">${formatDate(entry.date)}</span>
    </div>
    ${imagesHtml}
    <p class="modal-summary">${escapeHtml(entry.summary)}</p>
    <div class="modal-details-grid">
      <div class="modal-status">
        <span class="modal-label">Status</span>
        <span>${statusLabels[entry.status] || capitalize(entry.status)}</span>
        <span class="modal-status-note">${statusExplanations[entry.status] || ''}</span>
      </div>
      <div class="modal-outcome">
        <span class="modal-label">Outcome</span>
        <span>${outcomeLabels[entry.outcome] || capitalize(entry.outcome)}</span>
      </div>
    </div>
    <div class="modal-sources">
      <h4>Sources</h4>
      <ul class="modal-sources-list">${sourcesHtml}</ul>
    </div>

    <div id="modal-engagement-placeholder"></div>

    <div class="modal-footer-actions">
      <button class="copy-link-btn" data-entry-id="${escapeHtml(entry.id)}" aria-label="Copy link to this entry">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Copy link
      </button>
      <button class="report-btn" data-entry-id="${escapeHtml(entry.id)}" aria-label="Report this entry">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        Report
      </button>
    </div>
  `;

  // Load engagement (comments + likes) asynchronously
  const placeholder = dom.modalContent.querySelector('#modal-engagement-placeholder');
  if (placeholder) {
    placeholder.outerHTML = '<div class="engagement-loading" style="text-align:center;padding:1rem;color:var(--color-text-muted);">Loading comments...</div>';
    const engagementHtml = await buildEngagementHtml(entry);
    const loadingEl = dom.modalContent.querySelector('.engagement-loading');
    if (loadingEl) loadingEl.outerHTML = engagementHtml;
    initEngagement(entry);
  }

  // Click to reveal images
  dom.modalContent.querySelectorAll('.modal-image-gallery img').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      img.classList.add('revealed');
    });
  });

  dom.modal.classList.add('open');
  dom.modalBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';

  const closeBtn = dom.modalContent.querySelector('#modal-close-inner');
  if (closeBtn) closeBtn.focus();

  const closeModal = () => {
    const content = dom.modalContent;
    content.classList.add('closing');
    const onAnimationEnd = () => {
      dom.modal.classList.remove('open');
      dom.modalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
      content.classList.remove('closing');
      const card = document.querySelector(`[data-entry-id="${entry.id}"]`);
      if (card) card.focus();
      content.removeEventListener('animationend', onAnimationEnd);
    };
    content.addEventListener('animationend', onAnimationEnd, { once: true });
    setTimeout(() => {
      if (content.classList.contains('closing')) {
        dom.modal.classList.remove('open');
        dom.modalBackdrop.classList.remove('open');
        document.body.style.overflow = '';
        content.classList.remove('closing');
        const card = document.querySelector(`[data-entry-id="${entry.id}"]`);
        if (card) card.focus();
      }
    }, 250);
  };

  // Copy link
  const copyLinkBtn = dom.modalContent.querySelector('.copy-link-btn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyEntryLink(entry.id);
    });
  }

  // Report button
  const reportBtn = dom.modalContent.querySelector('.report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showReportModal(entry);
    });
  }

  if (closeBtn) closeBtn.onclick = closeModal;
  dom.modalBackdrop.onclick = closeModal;

  // Escape key + focus trap (dynamic, re-queries elements on each Tab)
  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKeydown);
    }
    if (e.key === 'Tab') {
      const focusable = dom.modalContent.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  };
  document.addEventListener('keydown', onKeydown);
}

/* ========================================================================
   Report Modal
   ======================================================================== */

function showReportModal(entry) {
  const backdrop = document.createElement('div');
  backdrop.className = 'confirm-backdrop';
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.style.maxWidth = '450px';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <h3 style="font-family:var(--font-heading);margin-bottom:0.75rem;text-transform:uppercase;">Report Entry</h3>
    <p style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:1rem;">Why are you flagging <strong>${escapeHtml(entry.name)}</strong>?</p>
    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem;">
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;">
        <input type="radio" name="report-type" value="incorrect_info" checked> Incorrect or misleading information
      </label>
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;">
        <input type="radio" name="report-type" value="abuse"> Harassment or abusive content
      </label>
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;">
        <input type="radio" name="report-type" value="duplicate"> Duplicate entry
      </label>
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;">
        <input type="radio" name="report-type" value="other"> Other
      </label>
    </div>
    <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
      <button class="admin-btn" id="report-cancel">Cancel</button>
      <button class="admin-btn approve" id="report-submit">Submit Report</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('confirm-open'));

  modal.querySelector('#report-cancel').addEventListener('click', () => backdrop.remove());
  modal.querySelector('#report-submit').addEventListener('click', async () => {
    const selected = modal.querySelector('input[name="report-type"]:checked');
    if (!selected) return;
    const ok = await submitReport(entry.id, selected.value, '', getSessionId());
    if (ok) {
      showToast('Report submitted. Thank you for helping keep the archive accurate.');
      backdrop.remove();
    } else {
      showToast('Failed to submit report.', 'error');
    }
  });
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
}

/* ========================================================================
   Scroll-to-Top
   ======================================================================== */

function initScrollToTop() {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        btn.classList.toggle('visible', window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  if (window.scrollY > 400) btn.classList.add('visible');
}

function copyEntryLink(entryId) {
  const url = `${window.location.origin}${window.location.pathname}#entry-${entryId}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = dom.modalContent.querySelector('.copy-link-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      btn.style.borderColor = 'var(--color-resolved)';
      btn.style.color = 'var(--color-resolved)';
      setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = ''; btn.style.color = ''; }, 2000);
    }
  }).catch(() => {});
}

function checkHashForEntry() {
  const hash = window.location.hash;
  if (!hash.startsWith('#entry-')) return;
  const entryId = hash.replace('#entry-', '');
  const entry = fullEntries.find(e => e.id === entryId);
  if (entry) setTimeout(() => openModal(entry), 300);
}

/* ========================================================================
   View Tabs
   ======================================================================== */

function switchView(view) {
  currentView = view;
  $$('.view-tab', dom.viewTabs).forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
    tab.setAttribute('aria-selected', tab.dataset.view === view ? 'true' : 'false');
  });
  $$('.nav-btn').forEach(btn => {
    if (btn.dataset.view === view) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  if (dom.mainNav) dom.mainNav.classList.remove('open');
  renderView();
}

/* ========================================================================
   Submission Form
   ======================================================================== */

const PII_PATTERNS = {
  phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  address: /\b\d{1,5}\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)\b/i
};

function scanForPII(text) {
  // Exclude dates (formats like YYYY-MM-DD) from phone detection
  const datePattern = /\d{4}-\d{2}-\d{2}/g;
  const cleaned = text.replace(datePattern, '');
  const found = { phone: false, email: false, address: false };
  if (PII_PATTERNS.phone.test(cleaned)) found.phone = true;
  if (PII_PATTERNS.email.test(text)) found.email = true;
  if (PII_PATTERNS.address.test(text)) found.address = true;
  const types = [];
  if (found.phone) types.push('phone number(s)');
  if (found.email) types.push('email address(es)');
  if (found.address) types.push('physical address(es)');
  return { found: types.length > 0, types };
}

function processImageFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM; }
          else { width = Math.round((width / height) * MAX_DIM); height = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function initSubmissionForm() {
  if (!dom.formElement) return;

  async function handleImageUpload() {
    const files = dom.imageInput.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`"${file.name}" is larger than 10MB. Skipping.`, 'warning');
        continue;
      }
      const dataUrl = await processImageFile(file);
      if (!dataUrl || !isValidImageDataUrl(dataUrl)) continue;
      dom.uploadedImages.push(dataUrl);
      addImagePreviewThumb(dataUrl, dom.uploadedImages.length - 1);
    }
    dom.imageInput.value = '';
  }

  function addImagePreviewThumb(dataUrl, index) {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.dataset.imgIndex = index;
    item.innerHTML = `<img src="${dataUrl}" alt="Reference image ${index + 1}" loading="lazy"><button type="button" class="remove-image-btn" aria-label="Remove image ${index + 1}">&times;</button>`;
    item.querySelector('.remove-image-btn').addEventListener('click', () => {
      const idx = parseInt(item.dataset.imgIndex, 10);
      dom.uploadedImages.splice(idx, 1);
      rebuildPreviewGrid();
    });
    dom.imagesPreviewGrid.appendChild(item);
  }

  function rebuildPreviewGrid() {
    dom.imagesPreviewGrid.innerHTML = '';
    dom.uploadedImages.forEach((dataUrl, i) => addImagePreviewThumb(dataUrl, i));
  }

  dom.imageInput.addEventListener('change', handleImageUpload);

  // Genre picker
  const selectedGenres = [];

  function updateGenreTags() {
    dom.selectedGenreTags.innerHTML = selectedGenres.map((g, i) =>
      `<span class="genre-tag">${escapeHtml(g)}<button type="button" class="genre-tag-remove" data-index="${i}" aria-label="Remove genre ${escapeHtml(g)}">&times;</button></span>`
    ).join('');
    dom.selectedGenreTags.querySelectorAll('.genre-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        selectedGenres.splice(idx, 1);
        updateGenreTags();
        syncChips();
        updateHiddenInput();
      });
    });
  }

  function syncChips() {
    dom.formGenreChips.querySelectorAll('.genre-chip').forEach(chip => {
      chip.classList.toggle('active', selectedGenres.includes(chip.dataset.genre));
    });
  }

  function updateHiddenInput() {
    dom.genreSelect.value = selectedGenres.join(',');
  }

  function addGenre(genre) {
    const g = genre.trim().toLowerCase();
    if (!g || selectedGenres.includes(g)) return;
    selectedGenres.push(g);
    updateGenreTags();
    syncChips();
    updateHiddenInput();
  }

  GENRE_LIST.forEach(genre => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'genre-chip';
    chip.dataset.genre = genre;
    chip.textContent = genre;
    chip.addEventListener('click', () => {
      if (selectedGenres.includes(genre)) {
        const idx = selectedGenres.indexOf(genre);
        selectedGenres.splice(idx, 1);
      } else {
        selectedGenres.push(genre);
      }
      updateGenreTags();
      syncChips();
      updateHiddenInput();
    });
    dom.formGenreChips.appendChild(chip);
  });

  // "+ Add custom" chip
  const customChip = document.createElement('button');
  customChip.type = 'button';
  customChip.className = 'genre-chip add-custom-chip';
  customChip.textContent = '+ Add custom';
  customChip.addEventListener('click', () => {
    const custom = prompt('Enter a custom genre:');
    if (custom) addGenre(custom);
  });
  dom.formGenreChips.appendChild(customChip);

  dom.summaryInput.addEventListener('input', () => {
    const len = dom.summaryInput.value.length;
    dom.charCount.textContent = `${len} / 50 min`;
    dom.charCount.className = 'char-count' + (len >= 50 ? ' valid' : '') + (len > 0 && len < 50 ? ' invalid' : '');
  });

  dom.addSourceBtn.addEventListener('click', () => {
    const group = document.createElement('div');
    group.className = 'source-url-group';
    const sourceCount = $$('.source-url', dom.formElement).length + 1;
    group.innerHTML = `<input type="url" class="source-url" placeholder="https://example.com/article" aria-label="Source URL ${sourceCount}" required><button type="button" class="remove-source" aria-label="Remove source ${sourceCount}">&times;</button>`;
    group.querySelector('.remove-source').addEventListener('click', () => group.remove());
    dom.sourceContainer.insertBefore(group, dom.addSourceBtn);
  });

  const scanFields = () => {
    const allText = [dom.summaryInput.value, dom.submitterNote.value, ...$$('.source-url', dom.formElement).map(el => el.value)].join(' ');
    const result = scanForPII(allText);
    if (result.found) {
      dom.warningText.innerHTML = `<strong>Warning:</strong> Your submission appears to contain ${result.types.join(', ')}. For privacy and safety, please remove any personal contact information before submitting.`;
      dom.warningBanner.classList.add('visible');
    } else {
      dom.warningBanner.classList.remove('visible');
    }
  };

  dom.summaryInput.addEventListener('input', scanFields);
  dom.submitterNote.addEventListener('input', scanFields);
  dom.sourceContainer.addEventListener('input', (e) => { if (e.target.classList.contains('source-url')) scanFields(); });

  // Inline validation for the form
  dom.formElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllFieldErrors(dom.formElement);
    let hasError = false;

    const name = dom.formElement.querySelector('#entry-name').value.trim();
    if (!name) { showFieldError(dom.formElement.querySelector('#entry-name'), 'Artist/band name is required.'); hasError = true; }

    const type = dom.formElement.querySelector('#entry-type').value;
    if (!type) { showFieldError(dom.formElement.querySelector('#entry-type'), 'Please select a type.'); hasError = true; }

    const formGenres = selectedGenres;
    if (formGenres.length === 0) { showFieldError($('#genre-picker'), 'Please select or add at least one genre.'); hasError = true; }

    const date = dom.formElement.querySelector('#entry-date').value;
    if (!date) { showFieldError(dom.formElement.querySelector('#entry-date'), 'Date is required.'); hasError = true; }

    const summary = dom.summaryInput.value.trim();
    if (summary.length < 50) { showFieldError(dom.summaryInput, `Summary must be at least 50 characters (${summary.length}/50).`); hasError = true; }

    const sources = $$('.source-url', dom.formElement).map(el => el.value.trim()).filter(v => v.length > 0);
    if (sources.length === 0) {
      const firstSource = dom.formElement.querySelector('.source-url');
      showFieldError(firstSource, 'At least one source URL is required.');
      hasError = true;
    }

    if (!dom.publicFigureCheck.checked) {
      showToast('You must confirm the subject is a public figure.', 'warning');
      hasError = true;
    }

    const allText = [summary, dom.submitterNote.value, ...sources].join(' ');
    const piiResult = scanForPII(allText);
    if (piiResult.found) {
      dom.warningBanner.classList.add('visible');
      dom.warningText.innerHTML = `<strong>Submission blocked:</strong> Your submission contains ${piiResult.types.join(', ')}. Please remove this information to proceed.`;
      hasError = true;
    }

    if (hasError) {
      showToast('Please fix the errors before submitting.', 'error');
      return;
    }

    // Submit
    setLoading(dom.submitBtn, true, 'Submit for Review');

    const submission = {
      id: `pending-${Date.now()}`,
      name: name,
      type: type,
      genres: selectedGenres,
      date: date,
      summary: summary,
      status: 'allegation',
      outcome: 'ongoing',
      sources: sources.map(url => {
        try { return { label: new URL(url).hostname, url }; }
        catch (e) { return { label: url, url }; }
      }),
      imageUrls: dom.uploadedImages.length > 0 ? [...dom.uploadedImages] : [],
      imageUrl: dom.uploadedImages.length > 0 ? dom.uploadedImages[0] : null,
      submittedAt: new Date().toISOString(),
      submitterNote: dom.submitterNote.value.trim()
    };

    // Upload images to Supabase Storage if configured
    const uploadedUrls = [];
    for (const dataUrl of dom.uploadedImages) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `image-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadImage(file);
      if (url) uploadedUrls.push(url);
    }
    if (uploadedUrls.length > 0) {
      submission.imageUrls = uploadedUrls;
      submission.imageUrl = uploadedUrls[0];
    }

    const result = await submitPendingSubmission(submission);

    dom.uploadedImages = [];
    dom.imagesPreviewGrid.innerHTML = '';
    dom.formElement.reset();
    dom.charCount.textContent = '0 characters';

    if (result) {
      selectedGenres.length = 0;
      updateGenreTags();
      syncChips();
      updateHiddenInput();
      setLoading(dom.submitBtn, false, 'Submit for Review');
      dom.formElement.style.display = 'none';
      dom.submitConfirm.classList.add('visible');
      dom.submitConfirm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Submission received! It will be reviewed by the editorial team.');
    } else {
      setLoading(dom.submitBtn, false, 'Submit for Review');
      showToast('Failed to submit. Please check your Supabase configuration.', 'error');
    }
  });
}

/* ========================================================================
   Navigation
   ======================================================================== */

function initNavigation() {
  $$('.view-tab', dom.viewTabs).forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) switchView(view);
      dom.mainNav.classList.remove('open');
    });
  });

  // Hamburger
  dom.hamburger.addEventListener('click', () => {
    const isOpen = dom.mainNav.classList.toggle('open');
    dom.hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Escape key closes mobile nav
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.mainNav.classList.contains('open')) {
      dom.mainNav.classList.remove('open');
      dom.hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // Auto-close mobile nav when clicking outside
  document.addEventListener('click', (e) => {
    const isOpen = dom.mainNav.classList.contains('open');
    if (!isOpen) return;
    const isNavClick = dom.mainNav.contains(e.target);
    const isHamburgerClick = dom.hamburger.contains(e.target);
    if (!isNavClick && !isHamburgerClick) {
      dom.mainNav.classList.remove('open');
      dom.hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // Search with 350ms debounce
  const searchClearBtn = document.getElementById('search-clear-btn');
  const updateSearchClearBtn = () => {
    if (searchClearBtn) searchClearBtn.style.display = dom.searchInput.value ? 'flex' : 'none';
  };

  dom.searchInput.addEventListener('input', () => {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      filters.search = dom.searchInput.value.trim();
      applyFilters();
    }, 350);
    updateSearchClearBtn();
  });

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      dom.searchInput.value = '';
      dom.searchInput.focus();
      searchClearBtn.style.display = 'none';
      if (searchDebounce) clearTimeout(searchDebounce);
      filters.search = '';
      applyFilters();
    });
  }

  window.addEventListener('beforeunload', () => {
    if (searchDebounce) { clearTimeout(searchDebounce); searchDebounce = null; }
  });

  // Sort control
  if (dom.sortSelect) {
    dom.sortSelect.value = sortBy;
    dom.sortSelect.addEventListener('change', () => { sortBy = dom.sortSelect.value; applyFilters(); });
  }

  // Status filters with counts
  updateStatusChips();

  // Year From/To dropdowns
  function populateYearSelect(sel) {
    sel.innerHTML = '<option value="">' + (sel === dom.yearFrom ? 'From' : 'To') + '</option>';
    const { min, max } = getYearRange();
    const start = isFinite(max) ? max : new Date().getFullYear();
    const end = isFinite(min) ? min : start - 5;
    for (let y = start; y >= end; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    }
  }
  populateYearSelect(dom.yearFrom);
  populateYearSelect(dom.yearTo);

  dom.yearFrom.addEventListener('change', () => {
    filters.yearStart = dom.yearFrom.value ? parseInt(dom.yearFrom.value, 10) : null;
    if (dom.yearFrom.value && dom.yearTo.value && parseInt(dom.yearFrom.value) > parseInt(dom.yearTo.value)) {
      dom.yearTo.value = dom.yearFrom.value;
      filters.yearEnd = parseInt(dom.yearFrom.value);
    }
    applyFilters();
  });
  dom.yearTo.addEventListener('change', () => {
    filters.yearEnd = dom.yearTo.value ? parseInt(dom.yearTo.value, 10) : null;
    if (dom.yearFrom.value && dom.yearTo.value && parseInt(dom.yearFrom.value) > parseInt(dom.yearTo.value)) {
      dom.yearFrom.value = dom.yearTo.value;
      filters.yearStart = parseInt(dom.yearTo.value);
    }
    applyFilters();
  });

  dom.clearAllBtn.addEventListener('click', clearAllFilters);

}

/* ========================================================================
   Initialization
   ======================================================================== */

async function init() {
  initDomRefs();

  // Load entries from Supabase
  fullEntries = await getAllEntries();

  initNavigation();
  initSubmissionForm();
  initScrollToTop();

  applyFiltersFromQuery();
  filteredEntries = sortEntries(fullEntries);
  renderView();
  updateFilterBadge();
  updateSearchAndChips();
  syncUrlWithFilters();
  checkHashForEntry();

  window.addEventListener('hashchange', checkHashForEntry);

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin') === '1') {
    switchView('admin');
  }
}

document.addEventListener('DOMContentLoaded', init);
