/**
 * TMS Staff Resources — common.js
 * Shared helpers used by schedule.js, orgchart.js, and app.js.
 */
window.TMSCommon = (function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initials(name) {
    return String(name || '')
      .split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
  }

  function photoPath(filename) {
    return 'assets/headshots/' + encodeURIComponent(filename);
  }

  // Builds a photo element for a person. Falls back to a clearly-labeled
  // "photo unavailable" placeholder (not a silent blank/initials-only box)
  // whenever no filename is set, or the referenced file fails to load.
  function makePhoto(person, cls, placeholderCls) {
    if (person.photo) {
      const img = document.createElement('img');
      img.className = cls || 'staff-photo';
      img.src = photoPath(person.photo);
      img.alt = person.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = function () {
        this.replaceWith(makePlaceholder(person, placeholderCls || cls));
      };
      return img;
    }
    return makePlaceholder(person, placeholderCls || cls);
  }

  function makePlaceholder(person, cls) {
    const el = document.createElement('div');
    el.className = 'photo-unavailable ' + (cls || 'staff-photo');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Photo unavailable for ' + person.name);
    el.innerHTML =
      '<span class="pu-initials">' + esc(initials(person.name)) + '</span>' +
      '<span class="pu-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="3.5"/>' +
          '<line x1="3" y1="21" x2="21" y2="3" stroke-width="1.75"/>' +
        '</svg>' +
      '</span>';
    return el;
  }

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Parses a "Month Day" string (e.g. "November 24") into { month, day } (month is 0-11).
  // Returns null if it can't be parsed.
  function parseBirthday(str) {
    const s = String(str || '').trim();
    if (!s) return null;
    const m = s.match(/^([A-Za-z]+)\s+(\d{1,2})/);
    if (!m) return null;
    const monthIdx = MONTH_NAMES.findIndex((name) => name.toLowerCase() === m[1].toLowerCase());
    if (monthIdx === -1) return null;
    const day = parseInt(m[2], 10);
    if (!day || day < 1 || day > 31) return null;
    return { month: monthIdx, day };
  }

  // Days from today until the next occurrence of this birthday (0 = today, wraps to next year).
  function daysUntilBirthday(str) {
    const b = parseBirthday(str);
    if (!b) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let next = new Date(today.getFullYear(), b.month, b.day);
    if (next < today) next = new Date(today.getFullYear() + 1, b.month, b.day);
    return Math.round((next - today) / 86400000);
  }

  // Phone values ending in "*" mean text-messaging has limited-hours availability.
  // Returns { display, hasNote } — display has the trailing "*" (and any space
  // before it) stripped off, ready to show in a tel: link.
  function parsePhoneNote(value) {
    const raw = String(value == null ? '' : value).trim();
    const hasNote = raw.endsWith('*');
    const display = hasNote ? raw.slice(0, -1).trim() : raw;
    return { display, hasNote };
  }

  function lastNameOf(name) {
    const parts = String(name || '').trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }

  // Small inline icon for a work-location value (Office / Remote / Travel / PTO / etc.)
  function locationIcon(location) {
    const key = String(location || '').trim().toLowerCase();
    const icons = {
      office: '<rect x="4" y="3" width="16" height="18" rx="1"/>' +
        '<rect x="7.5" y="6" width="2" height="2" fill="currentColor" stroke="none"/>' +
        '<rect x="14.5" y="6" width="2" height="2" fill="currentColor" stroke="none"/>' +
        '<rect x="7.5" y="10.5" width="2" height="2" fill="currentColor" stroke="none"/>' +
        '<rect x="14.5" y="10.5" width="2" height="2" fill="currentColor" stroke="none"/>' +
        '<path d="M10 21v-4h4v4"/>',
      remote: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
      travel: '<path d="M2 16l20-8-8 20-3-8-9-4z"/>',
      pto: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    };
    const path = icons[key] || '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/>';
    return (
      '<svg class="loc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        path +
      '</svg>'
    );
  }

  let toastTimer = null;
  function showToast(message) {
    let el = document.getElementById('tms-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tms-toast';
      el.className = 'tms-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
  }

  return {
    esc, initials, photoPath, makePhoto, makePlaceholder, lastNameOf, locationIcon, showToast,
    MONTH_NAMES, parseBirthday, daysUntilBirthday, parsePhoneNote,
  };
})();
