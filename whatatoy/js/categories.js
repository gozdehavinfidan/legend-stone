/* ============================================
   What A Toy! — Category Cards Renderer
   Module purpose: render the 4 category cards from categories.json with inline SVG badges.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import {
  qs, qsa, fetchJson, resolveContentUrl, renderFallbackMessage, basePathForPage,
} from './utils.js';

const toneSuffix = (panelRole) =>
  (panelRole || '').replace('-container', '').replace('-variant', '');

export async function initCategories() {
  const targets = qsa('[data-categories-target]');
  if (!targets.length) return;

  try {
    const categories = await fetchJson(resolveContentUrl('categories.json'));
    targets.forEach((target) => {
      const limitAttr = target.dataset.categoriesLimit;
      const limit = limitAttr ? Number(limitAttr) : null;
      const list = limit ? categories.slice(0, limit) : categories;
      renderInto(target, list);
    });
  } catch (err) {
    console.error('[categories] failed to load:', err);
    targets.forEach((t) => renderFallbackMessage(t));
  }
}

function renderInto(target, categories) {
  target.innerHTML = '';
  const galleryHref = `${basePathForPage()}pages/gallery.html`;
  categories.forEach((cat, i) => {
    const tone = toneSuffix(cat.panelRole);
    const card = document.createElement('a');
    card.className = `wat-category-card wat-category-card--${tone}`;
    card.href = `${galleryHref}#${cat.id}`;
    card.dataset.category = cat.id;
    card.dataset.panelRole = cat.panelRole;
    card.dataset.reveal = '';
    card.dataset.revealDelay = String(i * 80);

    const media = document.createElement('span');
    media.className = 'wat-category-card__media';
    media.setAttribute('aria-hidden', 'true');
    media.innerHTML = cat.badgeSvg;

    const title = document.createElement('h3');
    title.className = 'wat-category-card__title';
    title.textContent = cat.title;

    const text = document.createElement('p');
    text.className = 'wat-category-card__text';
    text.textContent = cat.description;

    const cta = document.createElement('span');
    cta.className = 'wat-category-card__cta';
    cta.textContent = 'Explore →';

    card.append(media, title, text, cta);
    target.appendChild(card);
  });
}
