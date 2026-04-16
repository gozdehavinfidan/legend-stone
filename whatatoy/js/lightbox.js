/* ============================================
   What A Toy! — Lightbox Controller
   Module purpose: a11y-correct modal lightbox wired over a .wat-gallery__grid.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import { qs, qsa, trapFocus } from './utils.js';

export function wireLightbox(grid, locationLabels = {}) {
  const lightbox = qs('[data-lightbox]');
  if (!lightbox) return;

  const imgEl = qs('[data-lightbox-image]', lightbox);
  const captionTitleEl = qs('[data-lightbox-caption-title]', lightbox);
  const captionMetaEl = qs('[data-lightbox-caption-meta]', lightbox);
  const counterEl = qs('[data-lightbox-counter]', lightbox);
  const closeBtn = qs('[data-lightbox-close]', lightbox);
  const prevBtn = qs('[data-lightbox-prev]', lightbox);
  const nextBtn = qs('[data-lightbox-next]', lightbox);

  let triggers = [];
  let currentIndex = 0;
  let lastTrigger = null;
  let releaseTrap = null;

  function refreshTriggers() {
    triggers = qsa('.wat-gallery__item', grid).filter((el) => !el.classList.contains('is-hidden'));
  }

  function updateFrame() {
    const trig = triggers[currentIndex];
    if (!trig) return;
    const img = qs('img', trig);
    if (!img) return;
    if (imgEl) {
      imgEl.src = img.src;
      imgEl.alt = img.alt;
    }
    if (captionTitleEl) captionTitleEl.textContent = img.alt;
    if (captionMetaEl) {
      const loc = trig.dataset.location;
      captionMetaEl.textContent = loc ? (locationLabels[loc] || loc) : '';
    }
    if (counterEl) counterEl.textContent = `${currentIndex + 1} / ${triggers.length}`;
  }

  function open(index) {
    refreshTriggers();
    if (!triggers.length) return;
    currentIndex = Math.max(0, Math.min(index, triggers.length - 1));
    lastTrigger = triggers[currentIndex];
    updateFrame();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('has-lightbox-open');
    releaseTrap = trapFocus(lightbox);
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-lightbox-open');
    if (releaseTrap) {
      releaseTrap();
      releaseTrap = null;
    }
    if (lastTrigger) lastTrigger.focus();
  }

  function step(delta) {
    if (!triggers.length) return;
    currentIndex = (currentIndex + delta + triggers.length) % triggers.length;
    updateFrame();
  }

  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-hidden', 'true');

  grid.addEventListener('click', (e) => {
    const trig = e.target.closest('.wat-gallery__item');
    if (!trig || trig.classList.contains('is-hidden')) return;
    refreshTriggers();
    const idx = triggers.indexOf(trig);
    if (idx !== -1) open(idx);
  });

  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => step(-1));
  nextBtn?.addEventListener('click', () => step(1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
}
