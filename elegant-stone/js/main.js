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

/* ── Hero Video Autoplay (mobile-safe) ────── */

function initHeroVideo() {
  const video = document.querySelector('.es-hero__video');
  if (!video) return;

  // Force muted as a property — some mobile browsers only grant autoplay
  // when this is true at the property level, not just the HTML attribute.
  video.muted = true;
  video.setAttribute('muted', '');

  // Only ever (re)play when actually paused — never fight a play in progress.
  const tryPlay = () => {
    if (!video.paused) return;
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  // Recover on the first user gesture (the gesture itself satisfies autoplay
  // policy) — fires once, then cleans itself up.
  const recoverOnGesture = () => {
    tryPlay();
    ['touchstart', 'pointerdown', 'click', 'scroll'].forEach((evt) => {
      window.removeEventListener(evt, recoverOnGesture);
    });
  };
  ['touchstart', 'pointerdown', 'click', 'scroll'].forEach((evt) => {
    window.addEventListener(evt, recoverOnGesture, { passive: true });
  });

  // Re-play whenever the tab/app regains focus (common pause trigger on mobile).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryPlay();
  });

  // Initial attempt — wait for data if the element isn't ready yet.
  if (video.readyState >= 2) {
    tryPlay();
  } else {
    video.addEventListener('canplay', tryPlay, { once: true });
  }
}

/* ── Initialize ───────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initNavigation();
  initHeroVideo();

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
