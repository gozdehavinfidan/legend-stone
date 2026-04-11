/* ============================================
   Elegant Stone — Main Entry Point
   ============================================ */

import { initNavigation } from './navigation.js';
import { initScrollReveal } from './animations.js';
import { initGalleryFilter, initLightbox } from './gallery.js';
import { lazyLoadImages } from './utils.js';
import { renderCategories } from './categories.js';

/* ── Theme Toggle ─────────────────────────── */

function initThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]');
  const html = document.documentElement;

  // Determine initial theme
  const saved = localStorage.getItem('es-theme');
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const theme = saved || preferred;

  html.setAttribute('data-theme', theme);

  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';

    // Enable transition class temporarily
    html.classList.add('es-theme-transitioning');
    html.setAttribute('data-theme', next);
    localStorage.setItem('es-theme', next);

    setTimeout(() => {
      html.classList.remove('es-theme-transitioning');
    }, 500);
  });
}

/* ── Initialize ───────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initNavigation();

  // Detect if we're in /pages/ subfolder
  const isSubPage = window.location.pathname.includes('/pages/');
  const basePath = isSubPage ? '../' : '';

  // Render categories from shared JSON
  // Home page shows first 4 categories, Categories page shows all
  const isCategoriesPage = window.location.pathname.includes('categories');
  const maxItems = isCategoriesPage ? null : 4;
  await renderCategories('categories-grid', { basePath, maxItems });

  // Init after dynamic content is rendered
  initScrollReveal();
  initGalleryFilter();
  initLightbox();
  lazyLoadImages();
});
