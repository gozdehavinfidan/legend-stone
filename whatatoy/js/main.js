/* ============================================
   What A Toy! — Boot Orchestrator
   Module purpose: load on DOMContentLoaded and run conditional feature modules.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initGallery } from './gallery.js';
import { initCategories } from './categories.js';
import { initLocations } from './locations.js';
import { initContact } from './contact.js';

function hasTarget(selector) {
  return !!document.querySelector(selector);
}

async function boot() {
  initNavigation();

  const tasks = [];
  if (hasTarget('[data-categories-target]')) tasks.push(initCategories());
  if (hasTarget('[data-locations-target]')) tasks.push(initLocations());
  if (hasTarget('[data-gallery-target]')) tasks.push(initGallery());
  if (hasTarget('[data-contact-form], [data-contact-card]')) tasks.push(Promise.resolve(initContact()));

  await Promise.allSettled(tasks);

  initAnimations();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
