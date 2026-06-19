/**
 * FLAGGED — Application Logic
 *
 * Handles rendering, filtering, search, modal display, timeline view,
 * submission management, statistics, URL parameter synchronization, and
 * ethical guardrails.
 *
 * This file is used by index.html (public-facing archive).
 *
 * @module script
 */

/* ========================================================================
   State
   ======================================================================== */

/**
 * The combined dataset: hardcoded ENTRIES + approved submissions from localStorage.
 * Approved submissions persist across sessions via localStorage.
 * @type {Array}
 */
let fullEntries = [];

/** @type {Array} The current active view of entries after filtering. */
let filteredEntries = [];

/** @type {Object} Current filter state. */
const filters = {
  search: '',
  genres: [],
  status: [],
  yearEnd: new Date().getFullYear()
};

/** @type {string} Current active view tab. */
let currentView = 'grid';

/** @type {Object|null} Currently open modal entry reference. */
let currentModalEntry = null;

/** @type {number|null} Debounce timer reference for search input. */
let searchDebounce = null;

/** @type {string} Current sort order. */
let sortBy = 'date-desc';

/* ========================================================================
   DOM References
   ======================================================================== */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {};

/**
 * Initializes all DOM references used throughout the application.
 * Called once on DOMContentLoaded.
 */
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
  dom.yearSlider = $('#year-slider');
  dom.yearDisplay = $('#year-display');
  dom.filterCountBadge = $('#filter-count-badge');
  dom.clearAllBtn = $('#clear-all-btn');
  dom.viewTabs = $('#view-tabs');
  dom.modal = $('#entry-modal');
  dom.modalBackdrop = $('#modal-backdrop');
  dom.modalContent = $('#modal-content');
  dom.hamburger = $('#hamburger-btn');
  dom.mainNav = $('#main-nav');
  dom.emptyState = $('#empty-state');
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
  dom.imageInput = $('#entry-image-input');
  dom.imagesPreviewGrid = $('#images-preview-grid');
  /** @type {string[]} Stores the base64 data URLs of uploaded images. */
  dom.uploadedImages = [];
}

/* ========================================================================
   Data Loading — Approved Submissions
   ======================================================================== */

/**
 * Loads approved submissions from localStorage and merges them with the
 * hardcoded ENTRIES array. Approved submissions are stored under the
 * 'approvedSubmissions' key and are moved there from 'pendingSubmissions'
 * when an admin approves them in admin.html.
 *
 * This ensures that approved entries persist across sessions.
 *
 * @returns {Array} The combined array of all entries.
 */
function loadAllEntries() {
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
  // Merge approved submissions after the hardcoded entries
  return [...ENTRIES, ...approved];
}

/* ========================================================================
   Sorting
   ======================================================================== */

/**
 * Sorts the given entries array based on the current sortBy value.
 * @param {Array} entries - Array of entry objects.
 * @returns {Array} Sorted copy of the array.
 */
function sortEntries(entries) {
  const sorted = [...entries];
  switch (sortBy) {
    case 'date-desc':
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    default:
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return sorted;
}

/* ========================================================================
   Utilities
   ======================================================================== */

/**
 * Returns a human-readable tooltip explaining what each status means.
 * @param {string} status - Entry status (allegation, confirmed, resolved, disputed).
 * @returns {string} Tooltip text.
 */
function statusTooltip(status) {
  const tips = {
    allegation: 'Publicly reported — not independently verified',
    confirmed: 'Verified through multiple independent sources',
    resolved: 'Acknowledged and addressed',
    disputed: 'Contested by the subject'
  };
  return tips[status] || '';
}

/**
 * Generates a random anonymous display name for commenters.
 * Produces a no-space gamertag-style name like "NeonEcho742" or "DarkStorm519".
 * @returns {string} A random username string.
 */
function generateRandomName() {
  const prefixes = [
    'Anonymous', 'Secret', 'Ghost', 'Void', 'Null', 'Xero', 'Echo',
    'Neon', 'Dark', 'Shadow', 'Cyber', 'Pixel', 'Lunar', 'Solar',
    'Night', 'Storm', 'Frost', 'Ember', 'Blaze', 'Knight',
    'Crimson', 'Obsidian', 'Phantom', 'Rogue', 'Chaos', 'Static',
    'Raven', 'Viper', 'Wraith', 'Blitz', 'Drift', 'Flux', 'Grim',
    'Hex', 'Jade', 'Karma', 'Myth', 'Nova', 'Onyx', 'Prism',
    'Quantum', 'Radix', 'Sable', 'Toxin', 'Ultra', 'Venom', 'Zen'
  ];
  const stems = [
    'wolf', 'fox', 'crow', 'hawk', 'fire', 'ice', 'rain', 'void',
    'echo', 'storm', 'blade', 'core', 'dust', 'fang', 'claw', 'moon',
    'star', 'wave', 'haze', 'mist', 'blur', 'rush', 'tide', 'howl',
    'roar', 'hum', 'beat', 'pulse', 'scream', 'whisper', 'drone', 'glow',
    'dark', 'light', 'night', 'shadow', 'phantom', 'ghost', 'hymn', 'verse',
    'ash', 'bane', 'bolt', 'brim', 'crypt', 'curse', 'dawn', 'dusk',
    'fade', 'fear', 'flare', 'forge', 'fuse', 'gaze', 'glim', 'gore',
    'grit', 'growl', 'hiss', 'hollow', 'hunt', 'jolt', 'lash', 'mark',
    'mirage', 'murk', 'oath', 'plague', 'rage', 'reck', 'rift', 'sage',
    'scorn', 'shard', 'shock', 'skull', 'snare', 'soar', 'spark', 'spire',
    'surge', 'swarm', 'thorn', 'trace', 'tremor', 'vapor', 'vex', 'warp'
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const stem = stems[Math.floor(Math.random() * stems.length)];
  const num = Math.floor(Math.random() * 900) + 100; // 100–999
  return `${prefix}${stem}${num}`;
}

/**
 * Gets or generates a stable random name for the current user.
 * Persisted in localStorage so the name stays the same across visits.
 * @returns {string} A stable random name.
 */
function getMyDisplayName() {
  let name = localStorage.getItem('amca_display_name');
  if (!name) {
    name = generateRandomName();
    localStorage.setItem('amca_display_name', name);
  }
  return name;
}

/**
 * Gets or creates a unique user ID stored in localStorage.
 * This ID is used to track comment ownership and reactions,
 * and persists across browser sessions so users can always
 * delete their own comments.
 * @returns {string} A unique persistent user ID.
 */
function getSessionId() {
  let id = localStorage.getItem('amca_user_id');
  if (!id) {
    id = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('amca_user_id', id);
  }
  return id;
}

/**
 * Gets the set of comment IDs owned by the current user.
 * Persisted in localStorage so ownership is remembered across visits.
 * @returns {string[]} Array of comment ID strings.
 */
function getMyCommentIds() {
  try {
    const raw = localStorage.getItem('amca_my_comments');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Adds a comment ID to the current user's owned comments list.
 * @param {string} commentId - The comment ID to track.
 */
function addMyCommentId(commentId) {
  const ids = getMyCommentIds();
  if (!ids.includes(commentId)) {
    ids.push(commentId);
    localStorage.setItem('amca_my_comments', JSON.stringify(ids));
  }
}

/**
 * Checks whether the current session owns a comment.
 * @param {string} commentId - The comment ID to check.
 * @returns {boolean}
 */
function isMyComment(commentId) {
  return getMyCommentIds().includes(commentId);
}

/**
 * Extracts the year from an ISO date string.
 * @param {string} isoString - ISO 8601 date string.
 * @returns {number} The year.
 */
function getYear(isoString) {
  return new Date(isoString).getFullYear();
}

/**
 * Serializes the current filter state into URL search parameters.
 * @returns {string} Query string (e.g., "?genre=hardcore&status=resolved").
 */
function filtersToQuery() {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.genres.length) params.set('genre', filters.genres.join(','));
  if (filters.status.length) params.set('status', filters.status.join(','));
  if (filters.yearEnd < new Date().getFullYear()) params.set('year', filters.yearEnd);
  return params.toString();
}

/**
 * Reads filter state from URL search parameters and applies it.
 */
function applyFiltersFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('search')) filters.search = params.get('search');
  if (params.has('genre')) filters.genres = params.get('genre').split(',').filter(Boolean);
  if (params.has('status')) filters.status = params.get('status').split(',').filter(Boolean);
  if (params.has('year')) filters.yearEnd = parseInt(params.get('year'), 10) || new Date().getFullYear();
}

/**
 * Updates the browser URL with current filter state without reloading.
 */
function syncUrlWithFilters() {
  const query = filtersToQuery();
  const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Collects all unique genres from the full dataset, sorted alphabetically.
 * Includes both hardcoded ENTRIES and approved submissions from localStorage.
 * @returns {string[]} Sorted genre list.
 */
function getAllGenres() {
  const set = new Set();
  fullEntries.forEach(e => e.genres.forEach(g => set.add(g)));
  return [...set].sort();
}

/**
 * Gets the minimum and maximum years from the full dataset.
 * @returns {{ min: number, max: number }} Year range.
 */
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
   Admin — Password & Auth
   ======================================================================== */

/**
 * The admin panel password. Change this before deploying.
 * SECURITY NOTE: This is client-side auth — any determined user can bypass
 * it via DevTools. For real security, pair this with Cloudflare Access.
 */
const ADMIN_PASSWORD = 'admin123';

/** @type {number} Failed auth attempts in this session. */
let authAttempts = 0;

/** @type {number} Max failed attempts before lockout. */
const MAX_AUTH_ATTEMPTS = 3;

/**
 * Checks if the current session is authenticated for admin.
 * Auth state stored in sessionStorage, cleared on tab close.
 * @returns {boolean}
 */
function isAuthenticated() {
  return sessionStorage.getItem('amca_admin_auth') === 'true';
}

/**
 * Prompts for the admin password. Recursive until correct or max attempts.
 * @returns {boolean} Whether auth succeeded.
 */
function promptForPassword() {
  if (authAttempts >= MAX_AUTH_ATTEMPTS) {
    alert('Too many failed attempts. Reload the page to try again.');
    return false;
  }
  const entered = prompt('Enter admin password:');
  if (entered === null) return false;
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
   Filtering Logic
   ======================================================================== */

/**
 * Applies all active filters to the fullEntries array.
 * Updates filteredEntries and triggers re-render.
 */
function applyFilters() {
  filteredEntries = fullEntries.filter(entry => {
    // Search filter (name + summary, case-insensitive)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const nameMatch = entry.name.toLowerCase().includes(q);
      const summaryMatch = entry.summary.toLowerCase().includes(q);
      if (!nameMatch && !summaryMatch) return false;
    }

    // Genre filter (entry must match at least one selected genre)
    if (filters.genres.length > 0) {
      const hasGenre = filters.genres.some(g => entry.genres.includes(g));
      if (!hasGenre) return false;
    }

    // Status filter
    if (filters.status.length > 0) {
      if (!filters.status.includes(entry.status)) return false;
    }

    // Year range
    if (getYear(entry.date) > filters.yearEnd) return false;

    return true;
  });

  // Apply sorting
  filteredEntries = sortEntries(filteredEntries);

  renderView();
  updateFilterBadge();
  updateSearchAndChips();
  syncUrlWithFilters();
}

/**
 * Updates the search input value and genre chip active states to reflect
 * the current filters object. This is called when filters are loaded from URL.
 */
function updateSearchAndChips() {
  if (dom.searchInput) dom.searchInput.value = filters.search;
  if (dom.genreChips) {
    $$('.genre-chip', dom.genreChips).forEach(chip => {
      chip.classList.toggle('active', filters.genres.includes(chip.dataset.genre));
    });
  }
  if (dom.statusFilters) {
    $$('.status-chip', dom.statusFilters).forEach(chip => {
      chip.classList.toggle('active', filters.status.includes(chip.dataset.status));
    });
  }
  if (dom.yearSlider) dom.yearSlider.value = filters.yearEnd;
  if (dom.yearDisplay) dom.yearDisplay.textContent = filters.yearEnd;
}

/**
 * Updates the entry count display.
 * Currently unused — reserved for future use.
 */
function updateEntryCount() {
  // No-op: entry count stat was removed from the hero section
}

/**
 * Updates the active filter count badge and clear-all button visibility.
 */
function updateFilterBadge() {
  const count = filters.genres.length + filters.status.length + (filters.search ? 1 : 0) +
    (filters.yearEnd < getYearRange().max ? 1 : 0);
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

/**
 * Resets all filters to their default values and re-renders.
 */
function clearAllFilters() {
  filters.search = '';
  filters.genres = [];
  filters.status = [];
  filters.yearEnd = getYearRange().max;
  applyFilters();
}

/* ========================================================================
   Rendering — Grid View
   ======================================================================== */

/**
 * Renders the currently filtered entries into the archive grid.
 * Shows the empty state if no entries match.
 */
function renderGrid() {
  if (!dom.archiveGrid) return;

  dom.archiveGrid.innerHTML = '';

  if (filteredEntries.length === 0) {
    dom.emptyState.style.display = 'block';
    dom.emptyState.querySelector('h3').textContent = 'No flagged artists found';
    dom.emptyState.querySelector('p').textContent = 'Try adjusting your filters, search query, or clear all filters to browse the full archive.';
    return;
  }

  dom.emptyState.style.display = 'none';

  filteredEntries.forEach((entry, i) => {
    const card = createEntryCard(entry);
    card.style.animationDelay = `${i * 40}ms`;
    dom.archiveGrid.appendChild(card);
  });
}

/**
 * Creates a single entry card DOM element.
 * @param {Object} entry - Entry data object.
 * @returns {HTMLElement} The card element.
 */
function createEntryCard(entry) {
  const card = document.createElement('article');
  card.className = 'entry-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details about ${entry.name}`);
  card.dataset.entryId = entry.id;
  card.dataset.status = entry.status;

  // Images (optional, blurred by default). Shows first image as thumbnail
  // with a count badge if multiple images exist.
  const cardImages = entry.imageUrls && entry.imageUrls.length > 0
    ? entry.imageUrls
    : entry.imageUrl ? [entry.imageUrl] : [];

  if (cardImages.length > 0) {
    const isRevealed = sessionStorage.getItem(`img-${entry.id}`) === 'revealed';
    const wrapper = document.createElement('div');
    wrapper.className = 'entry-card-image-wrapper';
    const img = document.createElement('img');
    img.src = cardImages[0];
    img.alt = `${entry.name} — reference image (blurred by default, click to reveal)`;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (isRevealed) img.classList.add('revealed');
    wrapper.appendChild(img);

    // Count badge if multiple images
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

  // Header: name + date
  const header = document.createElement('div');
  header.className = 'entry-card-header';
  header.innerHTML = `
    <h3 class="entry-card-name">${escapeHtml(entry.name)}</h3>
    <span class="entry-card-date">${formatDate(entry.date)}</span>
  `;
  card.appendChild(header);

  // Genres
  const genresEl = document.createElement('div');
  genresEl.className = 'entry-card-genres';
  entry.genres.forEach(g => {
    const tag = document.createElement('span');
    tag.className = 'entry-card-genre-tag';
    tag.textContent = g;
    genresEl.appendChild(tag);
  });
  card.appendChild(genresEl);

  // Summary excerpt (one sentence)
  const summaryEl = document.createElement('p');
  summaryEl.className = 'entry-card-summary';
  const firstSentence = entry.summary.split('.')[0] + '.';
  summaryEl.textContent = firstSentence;
  card.appendChild(summaryEl);

  // Footer: status badge + source count
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

  card.appendChild(footer);

  // Click / keyboard handler to open modal
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
   Rendering — Timeline View
   ======================================================================== */

/**
 * Renders filtered entries as a vertical timeline grouped by year.
 */
function renderTimeline() {
  if (!dom.timelineView) return;

  dom.timelineView.innerHTML = '';

  if (filteredEntries.length === 0) {
    dom.emptyState.style.display = 'block';
    dom.emptyState.querySelector('h3').textContent = 'No flagged artists found';
    dom.emptyState.querySelector('p').textContent = 'Try adjusting your filters, search query, or clear all filters to browse the full archive.';
    return;
  }

  dom.emptyState.style.display = 'none';

  // Group by year, sorted descending
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
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(entry);
        }
      });

      yearSection.appendChild(item);
    });

    dom.timelineView.appendChild(yearSection);

    // IntersectionObserver for scroll animation
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
}

/* ========================================================================
   Rendering — Statistics Panel
   ======================================================================== */

/**
 * Renders the statistics panel with horizontal bar charts for genre count,
 * year count, and status distribution.
 */
function renderStats() {
  if (!dom.statsPanel) return;

  // Show stats panel
  dom.statsPanel.innerHTML = '<h2>Statistics</h2><div class="stats-grid"><div class="stats-group"><h3>By Genre</h3><div class="bar-chart" id="genre-stats-chart"></div></div><div class="stats-group"><h3>By Year</h3><div class="bar-chart" id="year-stats-chart"></div></div><div class="stats-group"><h3>By Status</h3><div class="bar-chart" id="status-stats-chart"></div></div></div>';

  // Genre counts (based on all fullEntries)
  const genreCounts = {};
  fullEntries.forEach(e => {
    e.genres.forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const genreMax = Math.max(...Object.values(genreCounts), 1);

  const genreChart = dom.statsPanel.querySelector('#genre-stats-chart');
  if (genreChart) {
    genreChart.innerHTML = '';
    const sorted = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([genre, count]) => {
      genreChart.appendChild(createBarRow(genre, count, genreMax, 'genre-fill'));
    });
  }

  // Year counts
  const yearCounts = {};
  fullEntries.forEach(e => {
    const y = getYear(e.date);
    yearCounts[y] = (yearCounts[y] || 0) + 1;
  });
  const yearMax = Math.max(...Object.values(yearCounts), 1);

  const yearChart = dom.statsPanel.querySelector('#year-stats-chart');
  if (yearChart) {
    yearChart.innerHTML = '';
    Object.entries(yearCounts).sort((a, b) => b[0] - a[0]).forEach(([year, count]) => {
      yearChart.appendChild(createBarRow(year, count, yearMax, 'year-fill'));
    });
  }

  // Status counts
  const statusCounts = {};
  fullEntries.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });
  const statusMax = Math.max(...Object.values(statusCounts), 1);

  const statusChart = dom.statsPanel.querySelector('#status-stats-chart');
  if (statusChart) {
    statusChart.innerHTML = '';
    const statusOrder = ['allegation', 'confirmed', 'resolved', 'disputed'];
    statusOrder.forEach(s => {
      if (statusCounts[s]) {
        statusChart.appendChild(createBarRow(capitalize(s), statusCounts[s], statusMax, `status-fill ${s}`));
      }
    });
  }
}

/**
 * Creates a single horizontal bar row for the stats charts.
 * @param {string} label - Bar label text.
 * @param {number} count - The value for this bar.
 * @param {number} max - The maximum value across all bars (for width calculation).
 * @param {string} fillClass - CSS class for the bar fill color.
 * @returns {HTMLElement} Bar row element.
 */
function createBarRow(label, count, max, fillClass) {
  const pct = (count / max) * 100;
  const row = document.createElement('div');
  row.className = 'bar-row';
  row.innerHTML = `
    <span class="bar-label">${escapeHtml(label)}</span>
    <div class="bar-track">
      <div class="bar-fill ${fillClass}" style="width:${pct}%"></div>
    </div>
    <span class="bar-count">${count}</span>
  `;
  return row;
}

/* ========================================================================
   Rendering — Admin Panel
   ======================================================================== */

/**
 * Renders the admin panel (password gate or full dashboard).
 * Triggered via Ctrl+Shift+A or ?admin=1 URL parameter.
 */
function renderAdmin() {
  if (!dom.adminPanel) return;

  if (!isAuthenticated()) {
    dom.adminPanel.innerHTML = `
      <h2 style="margin-bottom:1rem;">Editorial Dashboard</h2>
      <div class="admin-empty">
        <p>Enter the admin password to access the editorial dashboard.</p>
        <button class="submit-btn" id="admin-auth-btn" style="max-width:200px;margin:1.5rem auto;">Enter Password</button>
      </div>
    `;
    const authBtn = dom.adminPanel.querySelector('#admin-auth-btn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        if (promptForPassword()) renderAdmin();
      });
    }
    return;
  }

  dom.adminPanel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.5rem;">
      <h2 style="margin:0;">Editorial Dashboard</h2>
      <div class="view-tabs" style="margin:0;border:none;padding:0;overflow:visible;">
        <button class="view-tab active" data-admin-view="pending" style="margin:0;">Pending</button>
        <button class="view-tab" data-admin-view="approved" style="margin:0;">Approved</button>
      </div>
    </div>
    <div id="admin-pending-section">
      <div class="admin-pending-list" id="admin-pending-list"></div>
      <div class="admin-empty" id="admin-pending-empty">
        <p>No pending submissions. When users submit entries, they will appear here.</p>
      </div>
    </div>
    <div id="admin-approved-section" style="display:none">
      <div class="admin-pending-list" id="admin-approved-list"></div>
      <div class="admin-empty" id="admin-approved-empty">
        <p>No approved submissions yet.</p>
      </div>
    </div>
  `;

  // Tab switching within admin
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

/**
 * Renders the list of pending submissions with approve/reject buttons.
 */
function renderPendingAdmin() {
  let pending = [];
  try {
    const raw = localStorage.getItem('pendingSubmissions');
    pending = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(pending)) pending = [];
  } catch (e) {
    localStorage.removeItem('pendingSubmissions');
    pending = [];
  }

  const list = document.getElementById('admin-pending-list');
  const empty = document.getElementById('admin-pending-empty');
  if (!list || !empty) return;

  list.innerHTML = '';

  if (pending.length === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

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
        <button class="admin-btn approve" data-pending-index="${index}">✓ Approve</button>
        <button class="admin-btn reject" data-pending-index="${index}">✗ Reject</button>
      </div>
    `;

    item.querySelector('.approve').addEventListener('click', () => {
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

      const approved = JSON.parse(localStorage.getItem('approvedSubmissions') || '[]');
      approved.unshift(newEntry);
      localStorage.setItem('approvedSubmissions', JSON.stringify(approved));

      pending.splice(index, 1);
      localStorage.setItem('pendingSubmissions', JSON.stringify(pending));

      renderPendingAdmin();
    });

    item.querySelector('.reject').addEventListener('click', () => {
      pending.splice(index, 1);
      localStorage.setItem('pendingSubmissions', JSON.stringify(pending));
      renderPendingAdmin();
    });

    list.appendChild(item);
  });
}

/**
 * Renders the list of already approved submissions with a remove option.
 */
function renderApprovedAdmin() {
  let approved = [];
  try {
    const raw = localStorage.getItem('approvedSubmissions');
    approved = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(approved)) approved = [];
  } catch (e) {
    localStorage.removeItem('approvedSubmissions');
    approved = [];
  }

  const list = document.getElementById('admin-approved-list');
  const empty = document.getElementById('admin-approved-empty');
  if (!list || !empty) return;

  list.innerHTML = '';

  if (approved.length === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

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
        <button class="admin-btn reject" data-approved-index="${index}">Remove</button>
      </div>
    `;

    item.querySelector('.reject').addEventListener('click', () => {
      approved.splice(index, 1);
      localStorage.setItem('approvedSubmissions', JSON.stringify(approved));
      renderApprovedAdmin();
    });

    list.appendChild(item);
  });
}

/* ========================================================================
   View Rendering Dispatch
   ======================================================================== */

/**
 * Renders the current view (grid, timeline, or stats) based on `currentView`.
 */
function renderView() {
  // Hide all panels first, then show only the active one
  dom.gridPanel.style.display = 'none';
  dom.timelineView.style.display = 'none';
  dom.statsPanel.style.display = 'none';
  dom.submissionForm.style.display = 'none';
  dom.adminPanel.style.display = 'none';

  switch (currentView) {
    case 'grid':
      dom.gridPanel.style.display = 'block';
      renderGrid();
      break;
    case 'timeline':
      dom.timelineView.style.display = 'block';
      renderTimeline();
      break;
    case 'stats':
      dom.statsPanel.style.display = 'block';
      renderStats();
      break;
    case 'admin':
      dom.adminPanel.style.display = 'block';
      renderAdmin();
      break;
    case 'submit':
      dom.submissionForm.style.display = 'block';
      break;
    default:
      dom.gridPanel.style.display = 'block';
      renderGrid();
  }
}

/* ========================================================================
   Engagement — Likes & Comments
   ======================================================================== */

/**
 * Storage keys for engagement data in localStorage.
 */
const ENGAGEMENT_KEYS = {
  likes: 'amca_entry_likes',
  likedEntries: 'amca_liked_entries',
  dislikes: 'amca_entry_dislikes',
  dislikedEntries: 'amca_disliked_entries',
  comments: 'amca_entry_comments'
};

/**
 * Safely reads a JSON value from localStorage with error handling.
 * @param {string} key - localStorage key.
 * @param {*} fallback - Default value if key is missing or corrupted.
 * @returns {*} Parsed value or fallback.
 */
function safeStorageRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`Failed to parse localStorage key "${key}". Resetting.`);
    localStorage.removeItem(key);
    return fallback;
  }
}

/**
 * Gets the total like count for a given entry.
 * @param {string} entryId - The entry ID.
 * @returns {number} Like count.
 */
function getLikeCount(entryId) {
  const likes = safeStorageRead(ENGAGEMENT_KEYS.likes, {});
  return likes[entryId] || 0;
}

/**
 * Checks whether the current user has liked a given entry.
 * @param {string} entryId - The entry ID.
 * @returns {boolean} Whether the entry is liked.
 */
function isEntryLiked(entryId) {
  const liked = safeStorageRead(ENGAGEMENT_KEYS.likedEntries, []);
  return liked.includes(entryId);
}

/**
 * Toggles the like state for a given entry on this browser.
 * Updates both the liked-entries list and the like count.
 * @param {string} entryId - The entry ID.
 * @returns {boolean} The new liked state.
 */
function toggleLike(entryId) {
  const liked = safeStorageRead(ENGAGEMENT_KEYS.likedEntries, []);
  const likes = safeStorageRead(ENGAGEMENT_KEYS.likes, {});

  const idx = liked.indexOf(entryId);
  if (idx > -1) {
    liked.splice(idx, 1);
    likes[entryId] = Math.max(0, (likes[entryId] || 1) - 1);
    if (likes[entryId] === 0) delete likes[entryId];
    localStorage.setItem(ENGAGEMENT_KEYS.likedEntries, JSON.stringify(liked));
    localStorage.setItem(ENGAGEMENT_KEYS.likes, JSON.stringify(likes));
    return false;
  } else {
    liked.push(entryId);
    likes[entryId] = (likes[entryId] || 0) + 1;
    localStorage.setItem(ENGAGEMENT_KEYS.likedEntries, JSON.stringify(liked));
    localStorage.setItem(ENGAGEMENT_KEYS.likes, JSON.stringify(likes));
    return true;
  }
}

/**
 * Gets the total dislike count for a given entry.
 * @param {string} entryId - The entry ID.
 * @returns {number} Dislike count.
 */
function getDislikeCount(entryId) {
  const dislikes = safeStorageRead(ENGAGEMENT_KEYS.dislikes, {});
  return dislikes[entryId] || 0;
}

/**
 * Checks whether the current user has disliked a given entry.
 * @param {string} entryId - The entry ID.
 * @returns {boolean} Whether the entry is disliked.
 */
function isEntryDisliked(entryId) {
  const disliked = safeStorageRead(ENGAGEMENT_KEYS.dislikedEntries, []);
  return disliked.includes(entryId);
}

/**
 * Toggles the dislike state for a given entry on this browser.
 * @param {string} entryId - The entry ID.
 * @returns {boolean} The new disliked state.
 */
function toggleDislike(entryId) {
  const disliked = safeStorageRead(ENGAGEMENT_KEYS.dislikedEntries, []);
  const dislikes = safeStorageRead(ENGAGEMENT_KEYS.dislikes, {});

  const idx = disliked.indexOf(entryId);
  if (idx > -1) {
    disliked.splice(idx, 1);
    dislikes[entryId] = Math.max(0, (dislikes[entryId] || 1) - 1);
    if (dislikes[entryId] === 0) delete dislikes[entryId];
    localStorage.setItem(ENGAGEMENT_KEYS.dislikedEntries, JSON.stringify(disliked));
    localStorage.setItem(ENGAGEMENT_KEYS.dislikes, JSON.stringify(dislikes));
    return false;
  } else {
    disliked.push(entryId);
    dislikes[entryId] = (dislikes[entryId] || 0) + 1;
    localStorage.setItem(ENGAGEMENT_KEYS.dislikedEntries, JSON.stringify(disliked));
    localStorage.setItem(ENGAGEMENT_KEYS.dislikes, JSON.stringify(dislikes));
    return true;
  }
}

/**
 * Gets all comments for a given entry, ordered by submission time (newest first).
 * @param {string} entryId - The entry ID.
 * @returns {Array} Array of comment objects { id, name, text, timestamp }.
 */
function getComments(entryId) {
  const allComments = safeStorageRead(ENGAGEMENT_KEYS.comments, {});
  const entryComments = allComments[entryId] || [];
  // Return newest first
  return [...entryComments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Adds a comment to a given entry with an auto-generated random name.
 * The commenter's session is tracked so only they can delete it.
 * @param {string} entryId - The entry ID.
 * @param {string} text - The comment text.
 * @param {string|null} imageUrl - Optional base64 image data URL.
 * @returns {Object} The new comment object.
 */
function addComment(entryId, text, imageUrl) {
  const allComments = safeStorageRead(ENGAGEMENT_KEYS.comments, {});
  if (!allComments[entryId]) allComments[entryId] = [];

  const sessionId = getSessionId();
  const comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: generateRandomName(),
    text: text.trim(),
    timestamp: new Date().toISOString(),
    sessionId: sessionId,
    likes: [],
    dislikes: [],
    replies: [],
    imageUrl: imageUrl || null
  };

  allComments[entryId].push(comment);
  localStorage.setItem(ENGAGEMENT_KEYS.comments, JSON.stringify(allComments));
  addMyCommentId(comment.id);
  return comment;
}

/**
 * Deletes a comment or reply by ID from an entry.
 * Only the original commenter (matching sessionId) can delete.
 * @param {string} entryId - The entry ID.
 * @param {string} commentId - The comment or reply ID to delete.
 * @returns {boolean} Whether the deletion was successful.
 */
function deleteComment(entryId, commentId) {
  const allComments = safeStorageRead(ENGAGEMENT_KEYS.comments, {});
  if (!allComments[entryId]) return false;

  const sessionId = getSessionId();
  let found = false;

  // Check top-level comments
  for (let i = 0; i < allComments[entryId].length; i++) {
    const c = allComments[entryId][i];
    if (c.id === commentId) {
      if (c.sessionId !== sessionId) return false;
      allComments[entryId].splice(i, 1);
      found = true;
      break;
    }
    // Check replies within this comment
    if (c.replies && c.replies.length > 0) {
      for (let j = 0; j < c.replies.length; j++) {
        if (c.replies[j].id === commentId) {
          if (c.replies[j].sessionId !== sessionId) return false;
          c.replies.splice(j, 1);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  if (found) {
    localStorage.setItem(ENGAGEMENT_KEYS.comments, JSON.stringify(allComments));
  }
  return found;
}

/**
 * Toggles a like or dislike reaction on a comment or reply.
 * Uses session IDs to prevent duplicate reactions.
 * @param {string} entryId - The entry ID.
 * @param {string} commentId - The comment or reply ID.
 * @param {'like'|'dislike'} type - The reaction type.
 * @returns {{ liked: boolean, disliked: boolean, likes: number, dislikes: number } | null} Updated reaction state or null if not found.
 */
function toggleCommentReaction(entryId, commentId, type) {
  const allComments = safeStorageRead(ENGAGEMENT_KEYS.comments, {});
  if (!allComments[entryId]) return null;

  const sessionId = getSessionId();

  // Helper to find and mutate a comment/reply
  function findAndToggle(items) {
    for (const item of items) {
      if (item.id === commentId) {
        // Initialize arrays if missing
        if (!item.likes) item.likes = [];
        if (!item.dislikes) item.dislikes = [];

        // If toggling like
        if (type === 'like') {
          const likeIdx = item.likes.indexOf(sessionId);
          if (likeIdx > -1) {
            item.likes.splice(likeIdx, 1);
          } else {
            item.likes.push(sessionId);
            // Remove dislike if present (mutually exclusive)
            const dislikeIdx = item.dislikes.indexOf(sessionId);
            if (dislikeIdx > -1) item.dislikes.splice(dislikeIdx, 1);
          }
        }

        // If toggling dislike
        if (type === 'dislike') {
          const dislikeIdx = item.dislikes.indexOf(sessionId);
          if (dislikeIdx > -1) {
            item.dislikes.splice(dislikeIdx, 1);
          } else {
            item.dislikes.push(sessionId);
            // Remove like if present (mutually exclusive)
            const likeIdx = item.likes.indexOf(sessionId);
            if (likeIdx > -1) item.likes.splice(likeIdx, 1);
          }
        }

        return {
          liked: item.likes.includes(sessionId),
          disliked: item.dislikes.includes(sessionId),
          likes: item.likes.length,
          dislikes: item.dislikes.length
        };
      }
      // Check replies
      if (item.replies && item.replies.length > 0) {
        const result = findAndToggle(item.replies);
        if (result) return result;
      }
    }
    return null;
  }

  const result = findAndToggle(allComments[entryId]);
  if (result) {
    localStorage.setItem(ENGAGEMENT_KEYS.comments, JSON.stringify(allComments));
  }
  return result;
}

/**
 * Adds a reply to a parent comment.
 * @param {string} entryId - The entry ID.
 * @param {string} parentCommentId - The parent comment ID.
 * @param {string} text - The reply text.
 * @param {string|null} imageUrl - Optional base64 image data URL.
 * @returns {Object|null} The new reply object, or null if parent not found.
 */
function addReply(entryId, parentCommentId, text, imageUrl) {
  const allComments = safeStorageRead(ENGAGEMENT_KEYS.comments, {});
  if (!allComments[entryId]) return null;

  const sessionId = getSessionId();

  for (const comment of allComments[entryId]) {
    if (comment.id === parentCommentId) {
      if (!comment.replies) comment.replies = [];
      const reply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: generateRandomName(),
        text: text.trim(),
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        likes: [],
        dislikes: [],
        imageUrl: imageUrl || null
      };
      comment.replies.push(reply);
      localStorage.setItem(ENGAGEMENT_KEYS.comments, JSON.stringify(allComments));
      addMyCommentId(reply.id);
      return reply;
    }
  }
  return null;
}

/**
 * Builds and returns the HTML for the engagement section (like button + comments).
 * @param {Object} entry - The entry data object.
 * @returns {string} HTML string for the engagement section.
 */
function buildEngagementHtml(entry) {
  const likeCount = getLikeCount(entry.id);
  const isLiked = isEntryLiked(entry.id);
  const comments = getComments(entry.id);

  const sessionId = getSessionId();

  function renderCommentReactions(item) {
    const liked = item.likes && item.likes.includes(sessionId);
    const disliked = item.dislikes && item.dislikes.includes(sessionId);
    const likeCount = (item.likes && item.likes.length) || 0;
    const dislikeCount = (item.dislikes && item.dislikes.length) || 0;
    const isOwner = item.sessionId === sessionId;

    return `
      <div class="comment-reactions">
        <button class="comment-like-btn ${liked ? 'active' : ''}" data-comment-id="${escapeHtml(item.id)}" data-reaction="like" aria-label="${liked ? 'Remove like' : 'Like'} this comment">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="reaction-count">${likeCount}</span>
        </button>
        <button class="comment-dislike-btn ${disliked ? 'active' : ''}" data-comment-id="${escapeHtml(item.id)}" data-reaction="dislike" aria-label="${disliked ? 'Remove dislike' : 'Dislike'} this comment">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="reaction-count">${dislikeCount}</span>
        </button>
        <button class="comment-reply-btn" data-comment-id="${escapeHtml(item.id)}" aria-label="Reply to this comment">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Reply
        </button>
        ${isOwner ? `<button class="comment-delete-btn" data-comment-id="${escapeHtml(item.id)}" aria-label="Delete this comment">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>` : ''}
      </div>
    `;
  }

  function renderReplies(replies, depth) {
    if (!replies || replies.length === 0) return '';
    const indent = Math.min(depth, 3); // max 3 levels of nesting
    return replies.map(r => `
      <div class="comment-reply depth-${indent}">
        <div class="comment-item-inner" style="animation-delay:0ms">
          <div class="comment-meta">
            <span class="comment-name">${escapeHtml(r.name)}</span>
            <span class="comment-time">${formatDate(r.timestamp)}</span>
          </div>
          <p class="comment-text">${escapeHtml(r.text)}</p>
          ${r.imageUrl ? `<div class="comment-attached-image"><img src="${escapeHtml(r.imageUrl)}" alt="Attached image" loading="lazy"></div>` : ''}
          ${renderCommentReactions(r)}
        </div>
        ${r.replies ? renderReplies(r.replies, depth + 1) : ''}
      </div>
    `).join('');
  }

  const commentsHtml = comments.length > 0
    ? comments.map(c => `
      <div class="comment-item">
        <div class="comment-item-inner">
          <div class="comment-meta">
            <span class="comment-name">${escapeHtml(c.name)}</span>
            <span class="comment-time">${formatDate(c.timestamp)}</span>
          </div>
          <p class="comment-text">${escapeHtml(c.text)}</p>
          ${c.imageUrl ? `<div class="comment-attached-image"><img src="${escapeHtml(c.imageUrl)}" alt="Attached image" loading="lazy"></div>` : ''}
          ${renderCommentReactions(c)}
        </div>
        ${c.replies ? renderReplies(c.replies, 1) : ''}
        <div class="comment-reply-form-wrapper" data-parent-id="${escapeHtml(c.id)}" style="display:none">
          <form class="comment-reply-form">
            <textarea class="reply-text-input" placeholder="Write a reply…" rows="2" required aria-label="Reply to this comment"></textarea>
            <div class="reply-img-row">
              <input type="file" accept="image/*" class="reply-img-input" hidden>
              <button type="button" class="reply-img-btn" aria-label="Attach a screenshot or photo" title="Attach an image">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Image</span>
              </button>
              <div class="reply-img-preview" style="display:none">
                <img src="" alt="Preview">
                <button type="button" class="reply-img-remove" aria-label="Remove attached image">&times;</button>
              </div>
            </div>
            <div class="reply-form-actions">
              <button type="submit" class="reply-submit-btn">Reply</button>
              <button type="button" class="reply-cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `).join('')
    : '<p class="comments-empty">No messages yet. Be the first to share your thoughts.</p>';

  const heartIcon = isLiked
    ? `<svg class="like-icon liked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/></svg>`
    : `<svg class="like-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

  const dislikeCount = getDislikeCount(entry.id);
  const isDisliked = isEntryDisliked(entry.id);

  const thumbIcon = isDisliked
    ? `<svg class="dislike-icon disliked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="currentColor"/></svg>`
    : `<svg class="dislike-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

  return `
    <div class="engagement-section">
      <div class="engagement-header">
        <button class="like-button ${isLiked ? 'liked' : ''}" data-entry-id="${escapeHtml(entry.id)}" aria-label="${isLiked ? 'Unlike' : 'Like'} this entry" title="Show support for awareness">
          ${heartIcon}
          <span class="like-count">${likeCount}</span>
        </button>
        <button class="dislike-button ${isDisliked ? 'disliked' : ''}" data-entry-id="${escapeHtml(entry.id)}" aria-label="${isDisliked ? 'Remove dislike' : 'Dislike'} this entry" title="Flag as concerning or unreliable">
          ${thumbIcon}
          <span class="dislike-count">${dislikeCount}</span>
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
            <textarea class="comment-text-input" placeholder="Share your thoughts, show support for those affected…" rows="2" required aria-label="Your message"></textarea>
          </div>
          <div class="comment-img-row">
            <input type="file" accept="image/*" class="comment-img-input" hidden>
            <button type="button" class="comment-img-btn" aria-label="Attach a screenshot or photo" title="Attach an image">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Add image</span>
            </button>
            <div class="comment-img-preview" style="display:none">
              <img src="" alt="Preview">
              <button type="button" class="comment-img-remove" aria-label="Remove attached image">&times;</button>
            </div>
          </div>
          <button type="submit" class="comment-submit-btn">Post Message</button>
        </form>
      </div>
    </div>
  `;
}

/**
 * Initializes engagement event listeners within the modal content.
 * Handles like button clicks and comment form submissions.
 * @param {Object} entry - The entry data object.
 */
function initEngagement(entry) {
  const likeBtn = dom.modalContent.querySelector('.like-button');
  if (likeBtn) {
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowLiked = toggleLike(entry.id);

      // Update the button visual immediately
      const icon = likeBtn.querySelector('.like-icon');
      const count = likeBtn.querySelector('.like-count');
      likeBtn.classList.toggle('liked', isNowLiked);
      likeBtn.setAttribute('aria-label', isNowLiked ? 'Unlike this entry' : 'Like this entry');

      // Replace the heart SVG
      const newSvg = isNowLiked
        ? `<svg class="like-icon liked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/></svg>`
        : `<svg class="like-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
      icon.outerHTML = newSvg;

      count.textContent = getLikeCount(entry.id);
    });
  }

  const dislikeBtn = dom.modalContent.querySelector('.dislike-button');
  if (dislikeBtn) {
    dislikeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowDisliked = toggleDislike(entry.id);

      // Update the button visual immediately
      const icon = dislikeBtn.querySelector('.dislike-icon');
      const count = dislikeBtn.querySelector('.dislike-count');
      dislikeBtn.classList.toggle('disliked', isNowDisliked);
      dislikeBtn.setAttribute('aria-label', isNowDisliked ? 'Remove dislike' : 'Dislike this entry');

      // Replace the thumbs SVG
      const newSvg = isNowDisliked
        ? `<svg class="dislike-icon disliked" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="currentColor"/></svg>`
        : `<svg class="dislike-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
      icon.outerHTML = newSvg;

      count.textContent = getDislikeCount(entry.id);
    });
  }

  // ── Comment form image upload ──
  const commentImgBtn = dom.modalContent.querySelector('.comment-img-btn');
  const commentImgInput = dom.modalContent.querySelector('.comment-img-input');
  const commentImgPreview = dom.modalContent.querySelector('.comment-img-preview');
  let commentPendingImage = null;

  if (commentImgBtn && commentImgInput) {
    commentImgBtn.addEventListener('click', () => commentImgInput.click());
    commentImgInput.addEventListener('change', async () => {
      const file = commentImgInput.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Image is larger than 5MB. Please choose a smaller file.');
        commentImgInput.value = '';
        return;
      }
      const dataUrl = await processImageFile(file);
      if (dataUrl && isValidImageDataUrl(dataUrl)) {
        commentPendingImage = dataUrl;
        const previewImg = commentImgPreview.querySelector('img');
        previewImg.src = dataUrl;
        commentImgPreview.style.display = 'flex';
        commentImgBtn.style.display = 'none';
      }
      commentImgInput.value = '';
    });
  }

  const commentImgRemove = dom.modalContent.querySelector('.comment-img-remove');
  if (commentImgRemove) {
    commentImgRemove.addEventListener('click', () => {
      commentPendingImage = null;
      commentImgPreview.style.display = 'none';
      commentImgPreview.querySelector('img').src = '';
      commentImgBtn.style.display = '';
    });
  }

  // ── Comment form submission ──
  const commentForm = dom.modalContent.querySelector('.comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const textInput = commentForm.querySelector('.comment-text-input');
      const text = textInput.value.trim();

      if (text.length < 2) {
        textInput.focus();
        return;
      }

      // Add the comment with image if present
      addComment(entry.id, text, commentPendingImage);

      // Reset form
      textInput.value = '';
      commentPendingImage = null;

      // Rebuild the entire engagement section
      const engagementSection = dom.modalContent.querySelector('.engagement-section');
      if (engagementSection) {
        engagementSection.outerHTML = buildEngagementHtml(entry);
        initEngagement(entry);
      }
    });
  }

  // ── Comment reaction buttons + reply + delete (event delegation) ──
  const commentsList = dom.modalContent.querySelector('.comments-list');
  if (commentsList) {
    // Image upload for reply forms (delegated)
    commentsList.addEventListener('click', (e) => {
      // Reply image upload button
      const replyImgBtn = e.target.closest('.reply-img-btn');
      if (replyImgBtn) {
        e.stopPropagation();
        const row = replyImgBtn.closest('.reply-img-row');
        const input = row.querySelector('.reply-img-input');
        if (input) input.click();
        return;
      }

      // Reply image remove button
      const replyImgRemove = e.target.closest('.reply-img-remove');
      if (replyImgRemove) {
        e.stopPropagation();
        const preview = replyImgRemove.closest('.reply-img-preview');
        if (preview) {
          preview.style.display = 'none';
          preview.querySelector('img').src = '';
          const row = preview.closest('.reply-img-row');
          const btn = row.querySelector('.reply-img-btn');
          if (btn) btn.style.display = '';
          // Clear stored image data from the form
          const form = row.closest('.comment-reply-form');
          if (form) form.dataset.pendingImage = '';
        }
        return;
      }

      const reactionBtn = e.target.closest('[data-reaction]');
      if (reactionBtn) {
        e.stopPropagation();
        const commentId = reactionBtn.dataset.commentId;
        const reactionType = reactionBtn.dataset.reaction;
        if (commentId && reactionType) {
          const result = toggleCommentReaction(entry.id, commentId, reactionType);
          if (result) {
            const parent = reactionBtn.closest('.comment-reactions');
            if (parent) {
              const likeBtn = parent.querySelector('.comment-like-btn');
              const dislikeBtn = parent.querySelector('.comment-dislike-btn');
              if (likeBtn) {
                likeBtn.classList.toggle('active', result.liked);
                likeBtn.querySelector('.reaction-count').textContent = result.likes;
                likeBtn.setAttribute('aria-label', result.liked ? 'Remove like' : 'Like this comment');
              }
              if (dislikeBtn) {
                dislikeBtn.classList.toggle('active', result.disliked);
                dislikeBtn.querySelector('.reaction-count').textContent = result.dislikes;
                dislikeBtn.setAttribute('aria-label', result.disliked ? 'Remove dislike' : 'Dislike this comment');
              }
            }
          }
        }
        return;
      }

      // Reply button — show the reply form
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
          if (wrapper.style.display === 'block') {
            wrapper.querySelector('.reply-text-input').focus();
          }
        }
        return;
      }

      // Delete button
      const deleteBtn = e.target.closest('.comment-delete-btn');
      if (deleteBtn) {
        e.stopPropagation();
        const commentId = deleteBtn.dataset.commentId;
        if (commentId && confirm('Delete this comment?')) {
          const deleted = deleteComment(entry.id, commentId);
          if (deleted) {
            const engagementSection = dom.modalContent.querySelector('.engagement-section');
            if (engagementSection) {
              engagementSection.outerHTML = buildEngagementHtml(entry);
              initEngagement(entry);
            }
          }
        }
        return;
      }
    });

    // File change for reply image inputs (delegated)
    commentsList.addEventListener('change', async (e) => {
      const replyImgInput = e.target.closest('.reply-img-input');
      if (!replyImgInput) return;
      const file = replyImgInput.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Image is larger than 5MB. Please choose a smaller file.');
        replyImgInput.value = '';
        return;
      }
      const dataUrl = await processImageFile(file);
      if (dataUrl && isValidImageDataUrl(dataUrl)) {
        const row = replyImgInput.closest('.reply-img-row');
        const preview = row.querySelector('.reply-img-preview');
        const btn = row.querySelector('.reply-img-btn');
        const form = row.closest('.comment-reply-form');
        preview.querySelector('img').src = dataUrl;
        preview.style.display = 'flex';
        btn.style.display = 'none';
        if (form) form.dataset.pendingImage = dataUrl;
      }
      replyImgInput.value = '';
    });

    // Reply form submission (event delegation)
    commentsList.addEventListener('submit', (e) => {
      const replyForm = e.target.closest('.comment-reply-form');
      if (replyForm) {
        e.preventDefault();
        const wrapper = replyForm.closest('.comment-reply-form-wrapper');
        if (!wrapper) return;
        const parentCommentId = wrapper.dataset.parentId;
        const textInput = replyForm.querySelector('.reply-text-input');
        const text = textInput.value.trim();
        if (text.length < 2) {
          textInput.focus();
          return;
        }
        const pendingImage = replyForm.dataset.pendingImage || null;
        addReply(entry.id, parentCommentId, text, pendingImage);
        textInput.value = '';
        replyForm.dataset.pendingImage = '';
        wrapper.style.display = 'none';

        const engagementSection = dom.modalContent.querySelector('.engagement-section');
        if (engagementSection) {
          engagementSection.outerHTML = buildEngagementHtml(entry);
          initEngagement(entry);
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
        // Reset any pending image
        const form = wrapper.querySelector('.comment-reply-form');
        if (form) {
          form.dataset.pendingImage = '';
          const preview = form.querySelector('.reply-img-preview');
          if (preview) {
            preview.style.display = 'none';
            preview.querySelector('img').src = '';
          }
          const btn = form.querySelector('.reply-img-btn');
          if (btn) btn.style.display = '';
        }
      }
    });
  });
}

/* ========================================================================
   Modal
   ======================================================================== */

/**
 * Opens the detail modal for a given entry.
 * Sets up focus trap and keyboard listeners.
 * @param {Object} entry - Entry data object to display.
 */
function openModal(entry) {
  currentModalEntry = entry;
  // Remove any stale closing animation state before rendering new content
  dom.modalContent.classList.remove('closing');
  dom.modalContent.innerHTML = '';

  const statusLabels = { allegation: 'Allegation', confirmed: 'Confirmed', resolved: 'Resolved', disputed: 'Disputed' };
  const outcomeLabels = { apology: 'Apology issued', silence: 'No public response', legal: 'Legal action', cleared: 'Cleared', ongoing: 'Ongoing' };
  const statusExplanations = { allegation: 'Publicly reported claim — not yet independently verified', confirmed: 'Verified through multiple independent sources', resolved: 'Acknowledged and addressed — apology, settlement, or legal resolution', disputed: 'Publicly contested by the subject — conflicting accounts exist' };

  const sourcesHtml = entry.sources.map(s =>
    `<li class="modal-source-item"><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>`
  ).join('');

  // Set dynamic aria-label for the modal so screen readers announce the entry name
  dom.modal.setAttribute('aria-label', `${entry.name} — controversy details`);

  // Collect all images: prefer imageUrls array, fall back to single imageUrl
  const modalImages = entry.imageUrls && entry.imageUrls.length > 0
    ? entry.imageUrls
    : entry.imageUrl ? [entry.imageUrl] : [];

  // Build image gallery HTML with blurred images that reveal on click
  const imagesHtml = modalImages.length > 0
    ? `<div class="modal-label">Evidence Images (${modalImages.length})</div>
       <div class="modal-image-gallery">
        ${modalImages.map((url, i) =>
          `<img src="${escapeHtml(url)}" alt="Evidence image ${i + 1} of ${escapeHtml(entry.name)}" loading="lazy" decoding="async" data-revealed="false">`
        ).join('')}
       </div>`
    : '';

  dom.modalContent.innerHTML = `
    <button class="modal-close" id="modal-close-inner" aria-label="Close modal">&times;</button>
    <h2 class="modal-name" id="modal-entry-name">${escapeHtml(entry.name)}</h2>
    <div class="modal-meta">
      <span class="status-badge ${entry.status}">${statusLabels[entry.status] || capitalize(entry.status)}</span>
      <span class="modal-date">${formatDate(entry.date)}</span>
      ${entry.genres.map(g => `<span class="entry-card-genre-tag">${escapeHtml(g)}</span>`).join('')}
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

    ${buildEngagementHtml(entry)}

    <div class="modal-footer-actions">
      <button class="copy-link-btn" data-entry-id="${escapeHtml(entry.id)}" aria-label="Copy link to this entry" title="Copy direct link to this entry">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Copy link
      </button>
    </div>
  `;

  // Add click-to-reveal for each modal gallery image (blurred until clicked)
  dom.modalContent.querySelectorAll('.modal-image-gallery img').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      img.classList.add('revealed');
    });
  });

  dom.modal.classList.add('open');
  dom.modalBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Initialize engagement (like + comment) listeners
  initEngagement(entry);

  // Focus the close button
  const closeBtn = dom.modalContent.querySelector('#modal-close-inner');
  if (closeBtn) closeBtn.focus();

  // Close handlers — with exit animation
  const closeModal = () => {
    const content = dom.modalContent;
    content.classList.add('closing');
    const onAnimationEnd = () => {
      dom.modal.classList.remove('open');
      dom.modalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
      content.classList.remove('closing');
      // Return focus to the triggering card
      const card = document.querySelector(`[data-entry-id="${entry.id}"]`);
      if (card) card.focus();
      content.removeEventListener('animationend', onAnimationEnd);
    };
    content.addEventListener('animationend', onAnimationEnd, { once: true });
    // Fallback: if animation doesn't fire (e.g. reduced motion), close after a small delay
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

  // Copy link button handler
  const copyLinkBtn = dom.modalContent.querySelector('.copy-link-btn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyEntryLink(entry.id);
    });
  }

  if (closeBtn) closeBtn.onclick = closeModal;
  dom.modalBackdrop.onclick = closeModal;

  // Escape key
  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKeydown);
    }
    // Focus trap
    if (e.key === 'Tab') {
      const focusable = dom.modalContent.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };
  document.addEventListener('keydown', onKeydown);
}

/* ========================================================================
   Scroll-to-Top Button
   ======================================================================== */

/**
 * Initializes the scroll-to-top button behavior.
 * Shows the button when the user scrolls past a threshold,
 * hides it when they're near the top.
 */
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

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Check initial scroll position
  if (window.scrollY > 400) {
    btn.classList.add('visible');
  }
}

/**
 * Copies a shareable URL to the clipboard that opens the entry modal on page load.
 * Creates a URL with the entry ID as a hash fragment (e.g., #entry-abc123).
 * @param {string} entryId - The entry ID to link to.
 */
function copyEntryLink(entryId) {
  const url = `${window.location.origin}${window.location.pathname}#entry-${entryId}`;
  navigator.clipboard.writeText(url).then(() => {
    // Brief visual feedback via temporary toast
    const btn = dom.modalContent.querySelector('.copy-link-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      btn.style.borderColor = 'var(--color-resolved)';
      btn.style.color = 'var(--color-resolved)';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    }
  }).catch(() => {
    // Clipboard API may fail in some contexts — silently ignore
  });
}

/**
 * Checks the page URL hash for an entry reference (#entry-<id>)
 * and opens the corresponding entry modal if found.
 */
function checkHashForEntry() {
  const hash = window.location.hash;
  if (!hash.startsWith('#entry-')) return;
  const entryId = hash.replace('#entry-', '');
  const entry = fullEntries.find(e => e.id === entryId);
  if (entry) {
    // Small delay to let the page render first
    setTimeout(() => openModal(entry), 300);
  }
}

/* ========================================================================
   View Tabs
   ======================================================================== */

/**
 * Switches the active view tab and renders the corresponding view.
 * @param {string} view - View identifier ('grid', 'timeline', 'stats', 'submit').
 */
function switchView(view) {
  currentView = view;
  $$('.view-tab', dom.viewTabs).forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
    tab.setAttribute('aria-selected', tab.dataset.view === view ? 'true' : 'false');
  });

  // Update nav button aria-current
  $$('.nav-btn').forEach(btn => {
    if (btn.dataset.view === view) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  // Hide the filters section on submit, stats, admin views
  const filtersSection = document.querySelector('.filters-section');
  if (filtersSection) {
    filtersSection.style.display = (view === 'grid' || view === 'timeline') ? '' : 'none';
  }

  // Close mobile nav if switching to a view (admin triggers via keyboard shortcut)
  if (dom.mainNav) dom.mainNav.classList.remove('open');

  renderView();
}

/* ========================================================================
   Submission Form — Ethical Guardrails
   ======================================================================== */

// [ETHICS] PII detection regex patterns
// These patterns detect common formats for phone numbers, physical addresses,
// and email addresses to prevent the submission of personal contact information.
// This protects both subjects and submitters from doxxing and harassment.
const PII_PATTERNS = {
  phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  // Simple address patterns — matches common US street address formats
  address: /\b\d{1,5}\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)\b/i
};

/**
 * Scans a string for phone numbers, email addresses, and physical addresses.
 * @param {string} text - The text to scan.
 * @returns {{ found: boolean, types: string[] }} Detection result.
 */
// [ETHICS] This function prevents the submission of personally identifying
// contact information, which could be used for harassment or doxxing.
function scanForPII(text) {
  const found = { phone: false, email: false, address: false };
  if (PII_PATTERNS.phone.test(text)) found.phone = true;
  if (PII_PATTERNS.email.test(text)) found.email = true;
  if (PII_PATTERNS.address.test(text)) found.address = true;

  const types = [];
  if (found.phone) types.push('phone number(s)');
  if (found.email) types.push('email address(es)');
  if (found.address) types.push('physical address(es)');

  return { found: types.length > 0, types };
}

/**
 * Reads an uploaded image file, resizes it client-side to a max dimension,
 * and converts it to a base64 data URL for storage in localStorage.
 *
 * Resizing to 300px max dimension keeps storage usage reasonable (under 100KB per image)
 * while maintaining enough detail for identification purposes.
 *
 * @param {File} file - The image file from the file input.
 * @returns {Promise<string|null>} A base64 data URL, or null on failure.
 */
function processImageFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 300px on the longest side to keep localStorage usage reasonable
        const MAX_DIM = 300;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height / width) * MAX_DIM);
            width = MAX_DIM;
          } else {
            width = Math.round((width / height) * MAX_DIM);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG at 0.8 quality for good compression
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Initializes the submission form with event listeners and validation.
 */
function initSubmissionForm() {
  if (!dom.formElement) return;

  /**
   * Processes and adds multiple images from the file input to the preview grid.
   * Each image is resized to 300px max via canvas and stored as a base64 data URL.
   */
  async function handleImageUpload() {
    const files = dom.imageInput.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      // Validate file size before processing
      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" is larger than 5MB. Skipping.`);
        continue;
      }

      const dataUrl = await processImageFile(file);
      if (!dataUrl || !isValidImageDataUrl(dataUrl)) continue;

      // Add to the array
      dom.uploadedImages.push(dataUrl);
      // Add preview thumbnail
      addImagePreviewThumb(dataUrl, dom.uploadedImages.length - 1);
    }

    // Reset the file input so the same files can be re-selected
    dom.imageInput.value = '';
  }

  /**
   * Adds a single image thumbnail to the preview grid with a remove button.
   * @param {string} dataUrl - Base64 data URL of the processed image.
   * @param {number} index - Index in the uploadedImages array.
   */
  function addImagePreviewThumb(dataUrl, index) {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.dataset.imgIndex = index;
    item.innerHTML = `
      <img src="${dataUrl}" alt="Reference image ${index + 1}" loading="lazy">
      <button type="button" class="remove-image-btn" aria-label="Remove image ${index + 1}">&times;</button>
    `;
    item.querySelector('.remove-image-btn').addEventListener('click', () => {
      const idx = parseInt(item.dataset.imgIndex, 10);
      dom.uploadedImages.splice(idx, 1);
      // Rebuild the entire preview grid to keep indices in sync
      rebuildPreviewGrid();
    });
    dom.imagesPreviewGrid.appendChild(item);
  }

  /**
   * Rebuilds all preview thumbnails from scratch, keeping indices in sync.
   * Called after removing an image from the array.
   */
  function rebuildPreviewGrid() {
    dom.imagesPreviewGrid.innerHTML = '';
    dom.uploadedImages.forEach((dataUrl, i) => {
      addImagePreviewThumb(dataUrl, i);
    });
  }

  dom.imageInput.addEventListener('change', handleImageUpload);

  // Character counter for summary
  dom.summaryInput.addEventListener('input', () => {
    const len = dom.summaryInput.value.length;
    dom.charCount.textContent = `${len} characters`;
    dom.charCount.className = 'char-count' + (len >= 50 ? ' valid' : '');
  });

  // Add source URL button
  dom.addSourceBtn.addEventListener('click', () => {
    const group = document.createElement('div');
    group.className = 'source-url-group';
    const sourceCount = $$('.source-url', dom.formElement).length + 1;
    group.innerHTML = `
      <input type="url" class="source-url" placeholder="https://example.com/article" aria-label="Source URL ${sourceCount}" required>
      <button type="button" class="remove-source" aria-label="Remove source ${sourceCount}">&times;</button>
    `;
    group.querySelector('.remove-source').addEventListener('click', () => {
      group.remove();
    });
    dom.sourceContainer.insertBefore(group, dom.addSourceBtn);
  });

  // Live PII scanning — watches all text fields for phone numbers, emails, and addresses
  const scanFields = () => {
    const allText = [
      dom.summaryInput.value,
      dom.submitterNote.value,
      ...$$('.source-url', dom.formElement).map(el => el.value)
    ].join(' ');

    const result = scanForPII(allText);
    if (result.found) {
      dom.warningText.innerHTML = `<strong>Warning:</strong> Your submission appears to contain ${result.types.join(', ')}. ` +
        'For privacy and safety, please remove any personal contact information before submitting. ' +
        'This archive documents public events — not private individuals\' contact details.';
      dom.warningBanner.classList.add('visible');
    } else {
      dom.warningBanner.classList.remove('visible');
    }
  };

  dom.summaryInput.addEventListener('input', scanFields);
  dom.submitterNote.addEventListener('input', scanFields);
  dom.sourceContainer.addEventListener('input', (e) => {
    if (e.target.classList.contains('source-url')) scanFields();
  });

  // Form submission
  dom.formElement.addEventListener('submit', (e) => {
    e.preventDefault();

    // [ETHICS] Block submission if PII is detected in any form field
    const allText = [
      dom.summaryInput.value,
      dom.submitterNote.value,
      ...$$('.source-url', dom.formElement).map(el => el.value)
    ].join(' ');
    const piiResult = scanForPII(allText);
    if (piiResult.found) {
      dom.warningBanner.classList.add('visible');
      dom.warningText.innerHTML = `<strong>Submission blocked:</strong> Your submission contains ${piiResult.types.join(', ')}. ` +
        'Please remove this information to proceed.';
      return;
    }

    // [ETHICS] Require at least one source URL — unsubstantiated claims cannot be submitted
    const sources = $$('.source-url', dom.formElement)
      .map(el => el.value.trim())
      .filter(v => v.length > 0);
    if (sources.length === 0) {
      alert('At least one source URL is required. Every entry must cite external reporting.');
      return;
    }

    // [ETHICS] Public figure checkbox — ensures the submitter affirms the subject
    // has a verifiable public profile, preventing submission about private individuals.
    if (!dom.publicFigureCheck.checked) {
      alert('You must confirm that the subject is a public figure with a verifiable public profile.');
      return;
    }

    // Gather form data
    // [ETHICS] The selected genres are validated against the known list to prevent
    // injection of arbitrary or deceptive tags.
    const selectedGenres = [...dom.genreSelect.selectedOptions].map(o => o.value);

    const submission = {
      id: `pending-${Date.now()}`,
      name: dom.formElement.querySelector('#entry-name').value.trim(),
      type: dom.formElement.querySelector('#entry-type').value,
      genres: selectedGenres,
      date: dom.formElement.querySelector('#entry-date').value,
      summary: dom.summaryInput.value.trim(),
      status: 'allegation',
      outcome: 'ongoing',
      sources: sources.map(url => {
        try {
          return { label: new URL(url).hostname, url };
        } catch (e) {
          // Skip malformed URLs instead of crashing the entire submit flow
          return { label: url, url };
        }
      }),
      // [ETHICS] Uploaded reference images are stored as base64 data URLs in localStorage.
      // These are only visible in the admin panel for editorial review and never published
      // publicly unless the entry is approved.
      imageUrls: dom.uploadedImages.length > 0 ? [...dom.uploadedImages] : [],
      // Legacy single-image field kept for backward compatibility
      imageUrl: dom.uploadedImages.length > 0 ? dom.uploadedImages[0] : null,
      submittedAt: new Date().toISOString(),
      submitterNote: dom.submitterNote.value.trim()
    };

    // Reset image upload state
    dom.uploadedImages = [];
    dom.imagesPreviewGrid.innerHTML = '';

    // Store in pendingSubmissions — these are only visible in admin.html
    const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
    pending.push(submission);
    localStorage.setItem('pendingSubmissions', JSON.stringify(pending));

    // Show confirmation
    dom.formElement.reset();
    dom.charCount.textContent = '0 characters';
    dom.formElement.style.display = 'none';
    dom.submitConfirm.classList.add('visible');
  });
}

/* ========================================================================
   Navigation & View Switching
   ======================================================================== */

/**
 * Initializes navigation tabs, hamburger menu, and filter controls.
 */
function initNavigation() {
  // View tabs
  $$('.view-tab', dom.viewTabs).forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Nav buttons (in header)
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) switchView(view);

      // Close mobile nav
      dom.mainNav.classList.remove('open');
    });
  });

  // Hamburger
  dom.hamburger.addEventListener('click', () => {
    dom.mainNav.classList.toggle('open');
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

  // Search input with debounce + clear button
  const searchClearBtn = document.getElementById('search-clear-btn');

  const updateSearchClearBtn = () => {
    if (searchClearBtn) {
      searchClearBtn.style.display = dom.searchInput.value ? 'flex' : 'none';
    }
  };

  dom.searchInput.addEventListener('input', () => {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      filters.search = dom.searchInput.value.trim();
      applyFilters();
    }, 200);
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

  // Clear search debounce timer on page unload to prevent stale callbacks
  window.addEventListener('beforeunload', () => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }
  });    // Secret admin trigger: type the cheat code "HESOYAM" to open the admin panel
  // Tracks the last N keystrokes and checks for the cheat sequence.
  // Skips when user is typing in a text field to avoid accidental triggers.
  const CHEAT_CODE = 'HESOYAM';
  let cheatBuffer = '';
  document.addEventListener('keydown', (e) => {
    // Skip if the user is actively typing in a text field
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    // Only track printable character keys, ignore modifier-only presses
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      cheatBuffer = (cheatBuffer + e.key.toUpperCase()).slice(-CHEAT_CODE.length);
      if (cheatBuffer === CHEAT_CODE) {
        cheatBuffer = '';
        if (isAuthenticated() || promptForPassword()) {
          switchView('admin');
        }
      }
    }
  });



  // Sort control
  const filterRow = document.querySelector('.filter-row');
  if (filterRow) {
    const sortGroup = document.createElement('div');
    sortGroup.className = 'filter-group';
    sortGroup.innerHTML = `
      <label>Sort</label>
      <div class="sort-wrapper">
        <select class="sort-select" id="sort-select" aria-label="Sort entries">
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </select>
      </div>
    `;
    filterRow.appendChild(sortGroup);

    const sortSelect = sortGroup.querySelector('.sort-select');
    sortSelect.value = sortBy;
    sortSelect.addEventListener('change', () => {
      sortBy = sortSelect.value;
      applyFilters();
    });
  }

  // Genre chips
  getAllGenres().forEach(genre => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip';
    chip.dataset.genre = genre;
    chip.textContent = genre;
    chip.setAttribute('aria-label', `Filter by genre: ${genre}`);
    chip.addEventListener('click', () => {
      const idx = filters.genres.indexOf(genre);
      if (idx > -1) {
        filters.genres.splice(idx, 1);
      } else {
        filters.genres.push(genre);
      }
      applyFilters();
    });
    dom.genreChips.appendChild(chip);
  });

  // Status filters
  ['allegation', 'confirmed', 'resolved', 'disputed'].forEach(status => {
    const chip = document.createElement('button');
    chip.className = 'status-chip';
    chip.dataset.status = status;
    chip.textContent = capitalize(status);
    chip.setAttribute('aria-label', `Filter by status: ${status}`);
    chip.addEventListener('click', () => {
      const idx = filters.status.indexOf(status);
      if (idx > -1) {
        filters.status.splice(idx, 1);
      } else {
        filters.status.push(status);
      }
      applyFilters();
    });
    dom.statusFilters.appendChild(chip);
  });

  // Year slider
  const { min, max } = getYearRange();
  dom.yearSlider.min = min;
  dom.yearSlider.max = max;
  dom.yearSlider.value = filters.yearEnd || max;
  dom.yearDisplay.textContent = filters.yearEnd || max;

  dom.yearSlider.addEventListener('input', () => {
    filters.yearEnd = parseInt(dom.yearSlider.value, 10);
    dom.yearDisplay.textContent = filters.yearEnd;
  });

  dom.yearSlider.addEventListener('change', () => {
    applyFilters();
  });

  // Clear all
  dom.clearAllBtn.addEventListener('click', clearAllFilters);

  // Genre select (submission form) — populate options
  if (dom.genreSelect) {
    getAllGenres().forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      dom.genreSelect.appendChild(opt);
    });
  }
}

/* ========================================================================
   Initialization
   ======================================================================== */

/**
 * Main entry point. Initializes all DOM references, loads the full dataset
 * (ENTRIES + approved submissions), applies URL-sourced filters, renders
 * the initial view, and sets up all event listeners.
 */
function init() {
  initDomRefs();

  // Load the combined dataset: hardcoded ENTRIES + approved submissions from localStorage
  fullEntries = loadAllEntries();

  initNavigation();
  initSubmissionForm();
  initScrollToTop();

  // Apply filters from URL params (must happen after initializing chips/inputs)
  applyFiltersFromQuery();
  applyFilters();

  // Check URL hash for direct entry link
  checkHashForEntry();

  // Listen for hash changes so back/forward navigation through entry links works
  window.addEventListener('hashchange', checkHashForEntry);

  // Check if admin mode was requested via URL (?admin=1)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin') === '1') {
    if (isAuthenticated() || promptForPassword()) {
      switchView('admin');
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
