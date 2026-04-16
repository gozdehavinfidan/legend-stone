/* ============================================
   What A Toy! — Gallery (filter + grid)
   Module purpose: load asset-manifest.json and render a filterable gallery grid.
   Two-axis filter: location (mall) AND category (in-store section).
   URL hash format: #cat=<id>, #loc=<id>, or #loc=<id>&cat=<id>
   Legacy bare hashes like #woodland are accepted as location shortcuts.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import {
  qs, qsa, fetchJson, resolveContentUrl, resolveAssetUrl, renderFallbackMessage,
} from './utils.js';
import { wireLightbox } from './lightbox.js';

const LOCATION_LABELS = {
  'woodland': 'Woodland Hills',
  'tulsa-premium': 'Tulsa Premium Outlets',
  'empire': 'The Empire Mall',
  'towne-east': 'Towne East Square',
  'grapevine': 'Grapevine Mills',
};

const CATEGORY_LABELS = {
  'action-figures': 'Action Figures',
  'educational-stem': 'Educational & STEM',
  'plushies': 'Plushies',
  'board-games': 'Board Games',
  'ride-on': 'Ride-on Vehicles',
  'keychains': 'Keychains',
};

let state = { loc: 'all', cat: 'all' };

export async function initGallery() {
  const target = qs('[data-gallery-target]');
  if (!target) return;

  const locChipsHost = qs('[data-gallery-filters]');
  const catChipsHost = qs('[data-gallery-category-filters]');

  try {
    const manifest = await fetchJson(resolveContentUrl('asset-manifest.json'));
    const items = (manifest.assets || []).filter((a) => (a.usage || []).includes('gallery'));

    // Seed state from URL before any render so initial chips are correct.
    state = parseHash(window.location.hash, items);

    renderGrid(target, items);
    if (locChipsHost) renderLocationChips(locChipsHost, items, target);
    if (catChipsHost) renderCategoryChips(catChipsHost, items, target);
    applyFilters(target);
    wireLightbox(target, LOCATION_LABELS);

    window.addEventListener('hashchange', () => {
      state = parseHash(window.location.hash, items);
      refreshChipActiveStates();
      applyFilters(target);
    });
  } catch (err) {
    console.error('[gallery] failed to load manifest:', err);
    renderFallbackMessage(target);
  }
}

/* ── URL <-> state ────────────────────────── */

function parseHash(hash, items) {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return { loc: 'all', cat: 'all' };

  // Structured form: key=value&key=value
  if (raw.includes('=')) {
    const next = { loc: 'all', cat: 'all' };
    raw.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if ((k === 'loc' || k === 'cat') && v) {
        next[k] = decodeURIComponent(v);
      }
    });
    return next;
  }

  // Legacy bare hash: treat as location if it matches, else as category.
  const decoded = decodeURIComponent(raw);
  const hasLoc = items.some((i) => i.location === decoded);
  if (hasLoc) return { loc: decoded, cat: 'all' };
  const hasCat = items.some((i) => i.category === decoded);
  if (hasCat) return { loc: 'all', cat: decoded };
  return { loc: 'all', cat: 'all' };
}

function writeHash() {
  const parts = [];
  if (state.loc && state.loc !== 'all') parts.push(`loc=${encodeURIComponent(state.loc)}`);
  if (state.cat && state.cat !== 'all') parts.push(`cat=${encodeURIComponent(state.cat)}`);
  const next = parts.length ? `#${parts.join('&')}` : '';
  if (next !== window.location.hash) {
    // replaceState avoids polluting browser history for every chip click
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
  }
}

/* ── Chip rendering ───────────────────────── */

function renderLocationChips(host, items, grid) {
  const locations = uniqueNonEmpty(items.map((i) => i.location));
  const counts = countBy(items, 'location');
  const chips = [
    { value: 'all', label: 'All Locations', count: items.length },
    ...locations.map((loc) => ({
      value: loc,
      label: LOCATION_LABELS[loc] || loc,
      count: counts[loc] || 0,
    })),
  ];
  host.innerHTML = '';
  chips.forEach((chip) => host.appendChild(buildChip(chip, 'loc', grid)));
  refreshChipActiveStatesForHost(host, 'loc');
}

function renderCategoryChips(host, items, grid) {
  const categories = uniqueNonEmpty(items.map((i) => i.category));
  if (!categories.length) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const counts = countBy(items, 'category');
  const chips = [
    { value: 'all', label: 'All Sections', count: items.length },
    ...categories.map((cat) => ({
      value: cat,
      label: CATEGORY_LABELS[cat] || humanize(cat),
      count: counts[cat] || 0,
    })),
  ];
  host.innerHTML = '';
  chips.forEach((chip) => host.appendChild(buildChip(chip, 'cat', grid)));
  refreshChipActiveStatesForHost(host, 'cat');
}

function buildChip(chip, axis, grid) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wat-gallery__chip';
  btn.dataset.filter = chip.value;
  btn.dataset.axis = axis;
  btn.setAttribute('aria-pressed', 'false');

  const labelEl = document.createElement('span');
  labelEl.textContent = chip.label;
  btn.appendChild(labelEl);

  const countEl = document.createElement('span');
  countEl.className = 'wat-gallery__chip-count';
  countEl.textContent = String(chip.count);
  btn.appendChild(countEl);

  btn.addEventListener('click', () => {
    state = { ...state, [axis]: chip.value };
    writeHash();
    refreshChipActiveStates();
    applyFilters(grid);
  });

  return btn;
}

function refreshChipActiveStates() {
  refreshChipActiveStatesForHost(qs('[data-gallery-filters]'), 'loc');
  refreshChipActiveStatesForHost(qs('[data-gallery-category-filters]'), 'cat');
}

function refreshChipActiveStatesForHost(host, axis) {
  if (!host) return;
  const active = state[axis];
  qsa('.wat-gallery__chip', host).forEach((btn) => {
    const isActive = btn.dataset.filter === active;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

/* ── Grid rendering ───────────────────────── */

function renderGrid(grid, items) {
  grid.innerHTML = '';
  items.forEach((asset, index) => grid.appendChild(buildItem(asset, index)));
}

function buildItem(asset, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wat-gallery__item';
  btn.dataset.location = asset.location || '';
  btn.dataset.category = asset.category || '';
  btn.dataset.index = String(index);
  btn.setAttribute('aria-label', `Open image: ${asset.alt}`);

  const img = document.createElement('img');
  img.className = 'wat-gallery__image';
  img.src = resolveAssetUrl(asset.path);
  img.alt = asset.alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (asset.orientation) img.dataset.orientation = asset.orientation;
  btn.appendChild(img);

  if (asset.location) {
    const tag = document.createElement('span');
    tag.className = 'wat-gallery__tag';
    tag.textContent = LOCATION_LABELS[asset.location] || asset.location;
    btn.appendChild(tag);
  }

  const caption = document.createElement('figcaption');
  caption.className = 'wat-gallery__caption';

  const title = document.createElement('span');
  title.className = 'wat-gallery__caption-title';
  title.textContent = asset.alt;
  caption.appendChild(title);

  const metaParts = [];
  if (asset.location) metaParts.push(LOCATION_LABELS[asset.location] || asset.location);
  if (asset.category) metaParts.push(CATEGORY_LABELS[asset.category] || humanize(asset.category));
  if (metaParts.length) {
    const meta = document.createElement('span');
    meta.className = 'wat-gallery__caption-meta';
    meta.textContent = metaParts.join(' · ');
    caption.appendChild(meta);
  }

  btn.appendChild(caption);
  return btn;
}

/* ── Filter logic ─────────────────────────── */

function applyFilters(grid) {
  const items = qsa('.wat-gallery__item', grid);
  let visible = 0;
  items.forEach((item) => {
    const matchLoc = state.loc === 'all' || item.dataset.location === state.loc;
    const matchCat = state.cat === 'all' || item.dataset.category === state.cat;
    const match = matchLoc && matchCat;
    item.classList.toggle('is-hidden', !match);
    if (match) visible += 1;
  });
  grid.dataset.activeLocation = state.loc;
  grid.dataset.activeCategory = state.cat;
  updateEmptyState(grid, visible);
}

function updateEmptyState(grid, visible) {
  let emptyMsg = qs('.wat-gallery__empty', grid);
  if (visible > 0) {
    if (emptyMsg) emptyMsg.remove();
    return;
  }
  if (!emptyMsg) {
    emptyMsg = document.createElement('p');
    emptyMsg.className = 'wat-gallery__empty';
    emptyMsg.setAttribute('role', 'status');
    grid.appendChild(emptyMsg);
  }
  emptyMsg.textContent = emptyStateMessage();
}

function emptyStateMessage() {
  const hasLoc = state.loc !== 'all';
  const hasCat = state.cat !== 'all';
  if (hasCat && hasLoc) {
    return 'No photos match this combination yet — try a different section or location.';
  }
  if (hasCat) {
    const label = CATEGORY_LABELS[state.cat] || humanize(state.cat);
    return `${label} photos are coming soon — visit us in store to see the full collection!`;
  }
  if (hasLoc) {
    return 'No photos for this location yet.';
  }
  return 'No photos to display.';
}

/* ── Helpers ──────────────────────────────── */

function uniqueNonEmpty(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function countBy(items, key) {
  const counts = {};
  items.forEach((it) => {
    const v = it[key];
    if (!v) return;
    counts[v] = (counts[v] || 0) + 1;
  });
  return counts;
}

function humanize(slug) {
  return String(slug).split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}
