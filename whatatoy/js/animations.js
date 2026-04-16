/* ============================================
   What A Toy! — Animation Orchestrator
   Module purpose: hero stagger reveal + scroll-triggered card reveals.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import { qsa, createIntersectionLazy, prefersReducedMotion } from './utils.js';

export function initAnimations() {
  if (prefersReducedMotion()) {
    qsa('[data-reveal], [data-stagger]').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  applyHeroStagger();

  createIntersectionLazy('[data-reveal]', (el) => {
    const delay = el.dataset.revealDelay;
    if (delay) el.style.setProperty('--wat-reveal-delay', `${Number(delay)}ms`);
    el.classList.add('is-visible');
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
}

function applyHeroStagger() {
  const groups = qsa('[data-stagger]');
  groups.forEach((group) => {
    const step = Number(group.dataset.staggerStep || 80);
    const startRaw = group.dataset.staggerStart;
    const start = startRaw == null ? 0 : Number(startRaw);
    const children = Array.from(group.children);
    children.forEach((child, i) => {
      child.style.setProperty('--wat-reveal-delay', `${start + i * step}ms`);
      child.classList.add('is-visible');
    });
  });
}
