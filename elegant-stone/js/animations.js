/* ============================================
   Elegant Stone — Scroll Reveal Animations
   IntersectionObserver-based, performant
   ============================================ */

export function initScrollReveal() {
  const elements = document.querySelectorAll('.es-reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px',
  });

  elements.forEach(el => observer.observe(el));
}
