/* =========================================================================
   store-detail.js  (ES module)
   export initStoreDetail()
   - Wire the #store-detail panel: close button, Esc, focus management
   - Assign window.WhatAToy.openStoreDetail(id):
       populate name, "City, ST", mini photo strip (encodeURI'd),
       "Get Directions" google maps search link, hours-vary note,
       then reveal the panel.
   Reads the locations cache set by globe-locations.js
   (window.WhatAToy.locations), or fetches it as a fallback.
   ========================================================================= */

window.WhatAToy = window.WhatAToy || {};

const LOCATIONS_URL = 'content/locations.json';
const HOURS_NOTE = "Hours vary by mall — please check the mall's website.";

// Element handles (resolved in initStoreDetail).
let panel,
  closeBtn,
  nameEl,
  placeEl,
  photosEl,
  hoursEl,
  directionsEl;

// Remembers what to return focus to when the panel closes.
let lastFocused = null;

export function initStoreDetail() {
  panel = document.getElementById('store-detail');
  if (!panel) return;

  closeBtn = document.getElementById('store-detail-close');
  nameEl = document.getElementById('store-detail-name');
  placeEl = document.getElementById('store-detail-place');
  photosEl = document.getElementById('store-detail-photos');
  hoursEl = document.getElementById('store-detail-hours');
  directionsEl = document.getElementById('store-detail-directions');

  // ---- Close interactions ----
  if (closeBtn) {
    closeBtn.addEventListener('click', closeStoreDetail);
  }

  // Esc closes the panel when it is open.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hasAttribute('hidden')) {
      closeStoreDetail();
    }
  });

  // ---- Public API: open the panel for a given store id ----
  window.WhatAToy.openStoreDetail = openStoreDetail;
}

/* -------------------------------------------------------------------------
   Resolve a location object by id from the cache (or fetch as fallback).
   ------------------------------------------------------------------------- */
async function getLocationById(id) {
  let locations = window.WhatAToy.locations;
  if (!Array.isArray(locations)) {
    try {
      const res = await fetch(LOCATIONS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      locations = await res.json();
      window.WhatAToy.locations = locations;
    } catch (err) {
      console.warn('[store-detail] could not load locations.json:', err);
      return null;
    }
  }
  return locations.find((l) => l.id === id) || null;
}

/* -------------------------------------------------------------------------
   openStoreDetail(id): populate + reveal the panel.
   ------------------------------------------------------------------------- */
async function openStoreDetail(id) {
  if (!panel) return;

  const loc = await getLocationById(id);
  if (!loc) {
    console.warn(`[store-detail] no location found for id "${id}"`);
    return;
  }

  // Remember the trigger so we can restore focus on close.
  lastFocused = document.activeElement;

  // ---- Name + place ----
  if (nameEl) nameEl.textContent = loc.name;
  if (placeEl) placeEl.textContent = `${loc.city}, ${loc.state}`;

  // ---- Mini photo strip ----
  if (photosEl) {
    photosEl.innerHTML = '';
    const photos = Array.isArray(loc.photos) ? loc.photos : [];
    photos.forEach((path, i) => {
      const img = document.createElement('img');
      // Paths are RAW (spaces / parens / Turkish chars) — always encodeURI.
      img.src = encodeURI(path);
      img.alt = `${loc.name} — store photo ${i + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      photosEl.appendChild(img);
    });
  }

  // ---- Hours note ----
  if (hoursEl) hoursEl.textContent = HOURS_NOTE;

  // ---- Get Directions link (Google Maps search) ----
  if (directionsEl) {
    const query = encodeURIComponent(loc.mapsQuery || loc.name);
    directionsEl.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  // ---- Reveal + focus management ----
  panel.removeAttribute('hidden');
  // Next frame so the transition (opacity/transform) actually plays.
  requestAnimationFrame(() => panel.classList.add('is-open'));

  // Move focus into the panel for keyboard/screen-reader users.
  if (closeBtn) {
    closeBtn.focus();
  } else {
    panel.setAttribute('tabindex', '-1');
    panel.focus();
  }
}

/* -------------------------------------------------------------------------
   closeStoreDetail(): hide the panel + restore focus.
   ------------------------------------------------------------------------- */
function closeStoreDetail() {
  if (!panel || panel.hasAttribute('hidden')) return;

  panel.classList.remove('is-open');

  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const finish = () => {
    panel.setAttribute('hidden', '');
    // Return focus to whatever opened the panel (list button or pin).
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
    lastFocused = null;
  };

  if (prefersReduced) {
    finish();
  } else {
    // Hide after the closing transition completes (fallback timer too).
    let done = false;
    const onEnd = () => {
      if (done) return;
      done = true;
      panel.removeEventListener('transitionend', onEnd);
      finish();
    };
    panel.addEventListener('transitionend', onEnd);
    setTimeout(onEnd, 400);
  }
}
