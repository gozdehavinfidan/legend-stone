/* ============================================
   What A Toy! — Utility Helpers
   Module purpose: tiny DOM/timing helpers shared across feature modules.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function debounce(fn, ms = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms = 100) {
  let locked = false;
  let trailingArgs = null;
  return (...args) => {
    if (locked) {
      trailingArgs = args;
      return;
    }
    fn(...args);
    locked = true;
    setTimeout(() => {
      locked = false;
      if (trailingArgs) {
        const t = trailingArgs;
        trailingArgs = null;
        fn(...t);
      }
    }, ms);
  };
}

export function once(el, evt, handler, opts = {}) {
  const wrap = (e) => {
    el.removeEventListener(evt, wrap, opts);
    handler(e);
  };
  el.addEventListener(evt, wrap, opts);
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function createIntersectionLazy(selector, onIntersect, opts = {}) {
  const nodes = qsa(selector);
  if (!nodes.length || !('IntersectionObserver' in window)) {
    nodes.forEach((el) => onIntersect(el));
    return null;
  }
  const { rootMargin = '0px 0px -10% 0px', threshold = 0.15, once: onlyOnce = true } = opts;
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        onIntersect(entry.target);
        if (onlyOnce) observer.unobserve(entry.target);
      }
    });
  }, { rootMargin, threshold });
  nodes.forEach((el) => io.observe(el));
  return io;
}

export async function fetchJson(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.json();
}

export function renderFallbackMessage(container, message = 'Content failed to load — please refresh.') {
  if (!container) return;
  container.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'wat-fallback';
  p.setAttribute('role', 'status');
  p.textContent = message;
  container.appendChild(p);
}

export function trapFocus(container) {
  const focusables = qsa(
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, [tabindex]:not([tabindex="-1"])',
    container
  ).filter((el) => !el.hasAttribute('aria-hidden'));
  if (!focusables.length) return () => {};
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  function onKey(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  container.addEventListener('keydown', onKey);
  first.focus();
  return () => container.removeEventListener('keydown', onKey);
}

export function basePathForPage() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

export function resolveContentUrl(filename) {
  return `${basePathForPage()}content/${filename}`;
}

export function resolveAssetUrl(relative) {
  return `${basePathForPage()}${relative}`;
}
