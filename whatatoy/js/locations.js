/* ============================================
   What A Toy! — Store Locations Renderer
   Module purpose: render store cards from locations.json with progressive hours rendering.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import {
  qs, qsa, fetchJson, resolveContentUrl, resolveAssetUrl, renderFallbackMessage,
} from './utils.js';

const HOURS_DISCLAIMER = 'Hours vary by mall — please check the mall website.';

export async function initLocations() {
  const targets = qsa('[data-locations-target]');
  if (!targets.length) return;

  try {
    const locations = await fetchJson(resolveContentUrl('locations.json'));
    targets.forEach((target) => renderInto(target, locations));
    scrollToHashIfMatches(locations);
  } catch (err) {
    console.error('[locations] failed to load:', err);
    targets.forEach((t) => renderFallbackMessage(t));
  }
}

function scrollToHashIfMatches(locations) {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;
  if (!locations.some((l) => l.id === hash)) return;
  const target = document.getElementById(hash);
  if (!target) return;
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderInto(target, locations) {
  target.innerHTML = '';
  locations.forEach((loc, i) => {
    target.appendChild(buildCard(loc, i));
  });
}

function buildCard(loc, index) {
  const card = document.createElement('article');
  card.className = 'wat-store-card';
  card.id = loc.id;
  card.dataset.locationId = loc.id;
  card.dataset.reveal = '';
  card.dataset.revealDelay = String(index * 60);

  const media = document.createElement('div');
  media.className = 'wat-store-card__media';
  const img = document.createElement('img');
  img.src = resolveAssetUrl(`assets/${loc.photoFolder}/${loc.heroPhoto}`);
  img.alt = `${loc.mallName} — store photo`;
  img.loading = 'lazy';
  img.decoding = 'async';
  media.appendChild(img);

  const badge = document.createElement('span');
  badge.className = 'wat-store-card__badge';
  badge.textContent = loc.mallName;

  const body = document.createElement('div');
  body.className = 'wat-store-card__body';

  const name = document.createElement('h3');
  name.className = 'wat-store-card__name';
  name.textContent = loc.storeName;

  const address = document.createElement('p');
  address.className = 'wat-store-card__address tabular';
  address.textContent = loc.address;

  const meta = document.createElement('p');
  meta.className = 'wat-store-card__meta';
  meta.textContent = `${loc.city}, ${loc.state}`;

  body.append(name, address, meta);

  const hours = document.createElement('div');
  hours.className = 'wat-store-card__hours';
  if (loc.hoursVerified && loc.hoursLabel) {
    const day = document.createElement('span');
    day.className = 'wat-store-card__hours-day';
    day.textContent = loc.hoursLabel;
    hours.appendChild(day);
  } else {
    const disclaimer = document.createElement('p');
    disclaimer.textContent = HOURS_DISCLAIMER;
    hours.appendChild(disclaimer);
    if (loc.mallWebsiteUrl) {
      const link = document.createElement('a');
      link.className = 'wat-store-card__mall-link';
      link.href = loc.mallWebsiteUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Visit Mall Website';
      hours.appendChild(link);
    }
  }

  const footer = document.createElement('div');
  footer.className = 'wat-store-card__footer';

  const directions = document.createElement('a');
  directions.className = 'wat-btn wat-btn--filled';
  directions.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.directionsQuery)}`;
  directions.target = '_blank';
  directions.rel = 'noopener noreferrer';
  directions.textContent = 'Get Directions';

  const map = document.createElement('a');
  map.className = 'wat-btn wat-btn--outlined';
  map.href = loc.mapUrl;
  map.target = '_blank';
  map.rel = 'noopener noreferrer';
  map.textContent = 'View on Map';

  footer.append(directions, map);

  card.append(media, badge, body, hours, footer);
  return card;
}
