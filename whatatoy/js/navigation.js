/* ============================================
   What A Toy! — Navigation Controller
   Module purpose: sticky navbar state, mobile drawer, active-link highlight.
   Owner: Agent 4 content-js · team whatatoy-impl
   Date: 2026-04-16
   ============================================ */

import { qs, qsa, throttle, trapFocus } from './utils.js';

const MOBILE_BREAKPOINT = 960;
const SCROLL_THRESHOLD = 8;

export function initNavigation() {
  const nav = qs('.wat-nav');
  if (!nav) return;

  const toggle = qs('[data-nav-toggle]', nav);
  const drawer = qs('[data-nav-drawer]', nav);
  const drawerLinks = qsa('[data-nav-drawer] a', nav);
  let releaseTrap = null;

  const handleScroll = throttle(() => {
    nav.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  }, 50);
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    toggle?.classList.add('is-active');
    toggle?.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('has-nav-drawer-open');
    releaseTrap = trapFocus(drawer);
  }

  function closeDrawer({ returnFocus = true } = {}) {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    toggle?.classList.remove('is-active');
    toggle?.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-nav-drawer-open');
    if (releaseTrap) {
      releaseTrap();
      releaseTrap = null;
    }
    if (returnFocus) toggle?.focus();
  }

  if (toggle && drawer) {
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');

    toggle.addEventListener('click', () => {
      if (drawer.classList.contains('is-open')) closeDrawer();
      else openDrawer();
    });

    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => closeDrawer({ returnFocus: false }));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });

    window.addEventListener('resize', throttle(() => {
      if (window.innerWidth > MOBILE_BREAKPOINT && drawer.classList.contains('is-open')) {
        closeDrawer({ returnFocus: false });
      }
    }, 120));
  }

  highlightActiveLink(nav);
}

function highlightActiveLink(nav) {
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const isHome = currentFile === '' || currentFile === 'index.html';
  const links = qsa('a[href]', nav);
  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const file = href.split('/').pop();
    let active = false;
    if (isHome && (href === '/' || href === 'index.html' || href === '../index.html' || href === '')) {
      active = true;
    } else if (!isHome && file && file === currentFile) {
      active = true;
    }
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
