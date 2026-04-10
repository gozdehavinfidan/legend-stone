/* ============================================
   Elegant Stone — Navigation Controller
   ============================================ */

import { throttle } from './utils.js';

export function initNavigation() {
  const nav = document.querySelector('.es-nav');
  const hamburger = document.querySelector('[data-nav-toggle]');
  const mobileMenu = document.querySelector('.es-nav__mobile');
  const mobileLinks = document.querySelectorAll('.es-nav__mobile-link');

  if (!nav) return;

  // Scroll-based nav background
  const handleScroll = throttle(() => {
    nav.classList.toggle('is-scrolled', window.scrollY > 60);
  }, 50);

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile menu toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('is-open');

      hamburger.classList.toggle('is-active');
      mobileMenu.classList.toggle('is-open');
      document.body.style.overflow = isOpen ? '' : 'hidden';

      hamburger.setAttribute('aria-expanded', !isOpen);
    });

    // Close mobile menu on link click
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-active');
        mobileMenu.classList.remove('is-open');
        document.body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Set active link based on current page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const allLinks = document.querySelectorAll('.es-nav__link, .es-nav__mobile-link');

  allLinks.forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    if (href === currentPath || (currentPath === 'index.html' && (href === '/' || href === 'index.html' || href === ''))) {
      link.classList.add('is-active');
    }
  });
}
