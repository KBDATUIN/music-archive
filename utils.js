/**
 * FLAGGED — Shared Utilities
 *
 * Utility functions shared between index.html (public archive) and
 * admin.html (editorial panel). Load this file BEFORE script.js or admin.js
 * on any page that needs these helpers.
 *
 * @module utils
 */

/* ========================================================================
   String Utilities
   ======================================================================== */

/**
 * Basic HTML entity escaping to prevent XSS.
 * @param {string} str - Raw string.
 * @returns {string} Escaped string safe for innerHTML.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - Input string.
 * @returns {string} Capitalized string.
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats an ISO date string into a readable format (e.g., "June 14, 2021").
 * @param {string} isoString - ISO 8601 date string.
 * @returns {string} Formatted date string.
 */
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Validates that a data URL string starts with an accepted image MIME type prefix.
 * Prevents injection of non-image schemes (e.g., data:text/html, data:application/...).
 * @param {string} dataUrl - The data URL to validate.
 * @returns {boolean} Whether the data URL is a valid image data URL.
 */
function isValidImageDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  return /^data:image\/(jpeg|png|gif|webp|bmp|svg\+xml);base64,/.test(dataUrl);
}

/* ========================================================================
   Admin Image Rendering
   ======================================================================== */

/**
 * Generates HTML for displaying one or more reference/admin images.
 * Handles both the new imageUrls[] array and the legacy imageUrl field.
 * Uses escapeHtml for safe string interpolation.
 * @param {Object} entry - Entry or submission object.
 * @param {string} altName - Alt text description (pre-escaped or raw — will be escaped).
 * @returns {string} HTML string for the image(s).
 */
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
