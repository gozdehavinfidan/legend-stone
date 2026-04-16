/* ============================================
   What A Toy! — Gallery (filter + grid)
   Module purpose: load asset-manifest.json and render a filterable gallery grid.
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

export async function initGallery() {
  const target = qs('[data-gallery-target]');
  if (!target) return;

  const chipsHost = qs('[data-gallery-filters]');
  try {
    const manifest = await fetchJson(resolveContentUrl('asset-manifest.json'));
    const items = (manifest.assets || []).filter((a) => (a.usage || []).includes('gallery'));
    if (chipsHost) renderChips(chipsHost, items, target);
    renderGrid(target, items, 'all');
    wireLightbox(target, LOCATION_LABELS);
  } catch (err) {
    console.error('[gallery] failed to load manifest:', err);
    renderFallbackMessage(target);
  }
}

function countByLocation(items) {
  const counts = { all: items.length };
  items.forEach((it) => {
    if (!it.location) return;
    counts[it.location] = (counts[it.location] || 0) + 1;
  });
  return counts;
}

function renderChips(host, items, grid) {
  const locations = Array.from(new Set(items.map((i) => i.location).filter(Boolean)));
  const counts = countByLocation(items);
  host.innerHTML = '';
  const chips = [
    { value: 'all', label: 'All Locations' },
    ...locations.map((loc) => ({ value: loc, label: LOCATION_LABELS[loc] || loc })),
  ];
  chips.forEach((chip, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wat-gallery__chip';
    btn.dataset.filter = chip.value;
    btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    if (i === 0) btn.classList.add('is-active');

    const labelEl = document.createElement('span');
    labelEl.textContent = chip.label;
    btn.appendChild(labelEl);

    const countEl = document.createElement('span');
    countEl.className = 'wat-gallery__chip-count';
    countEl.textContent = String(counts[chip.value] ?? 0);
    btn.appendChild(countEl);

    btn.addEventListener('click', () => {
      qsa('.wat-gallery__chip', host).forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      applyFilter(grid, chip.value);
    });
    host.appendChild(btn);
  });
}

function renderGrid(grid, items, filter) {
  grid.innerHTML = '';
  items.forEach((asset, index) => grid.appendChild(buildItem(asset, index)));
  applyFilter(grid, filter);
}

function buildItem(asset, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wat-gallery__item';
  btn.dataset.location = asset.location || '';
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

  if (asset.location) {
    const meta = document.createElement('span');
    meta.className = 'wat-gallery__caption-meta';
    meta.textContent = LOCATION_LABELS[asset.location] || asset.location;
    caption.appendChild(meta);
  }

  btn.appendChild(caption);
  return btn;
}

function applyFilter(grid, filter) {
  const items = qsa('.wat-gallery__item', grid);
  let visible = 0;
  items.forEach((item) => {
    const match = filter === 'all' || item.dataset.location === filter;
    item.classList.toggle('is-hidden', !match);
    if (match) visible += 1;
  });
  grid.dataset.activeFilter = filter;

  let emptyMsg = qs('.wat-gallery__empty', grid);
  if (visible === 0) {
    if (!emptyMsg) {
      emptyMsg = document.createElement('p');
      emptyMsg.className = 'wat-gallery__empty';
      emptyMsg.setAttribute('role', 'status');
      emptyMsg.textContent = 'No photos for this location yet.';
      grid.appendChild(emptyMsg);
    }
  } else if (emptyMsg) {
    emptyMsg.remove();
  }
}
