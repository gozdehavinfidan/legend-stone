/* =========================================================================
   What-A-Toy! — page-nav.js  (ES module)
   Full-page ("one section per gesture") snap navigation. A small wheel /
   arrow-key / swipe gesture smoothly advances to the next 100vh page and
   locks until the animated scroll finishes — so the user never has to drag
   through a page manually. Free internal scrolling is still allowed inside
   elements marked [data-scroll="y"] (e.g. the expanded gallery) until they
   reach their edge, then page-snapping resumes.

   Desktop/pointer only — on touch/narrow screens the page falls back to
   natural stacked scrolling (sections are auto-height there).

   Exports: initPageNav(lenis)
   ========================================================================= */

const PAGE_SELECTOR = '#hero, #intro, #products, #locations, #gallery, #about, #contact, #footer';
const ANIM_MS = 900;

export function initPageNav(lenis) {
  const prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Only enable the snap on wide, fine-pointer screens.
  const enabled =
    window.matchMedia('(min-width: 901px)').matches &&
    !window.matchMedia('(hover: none)').matches;
  if (!enabled) return;

  const pages = Array.from(document.querySelectorAll(PAGE_SELECTOR));
  if (pages.length < 2) return;

  let animating = false;
  let safety = null;

  function docTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  // Which page currently occupies the viewport center?
  function currentIndex() {
    const mid = window.scrollY + window.innerHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pages.length; i++) {
      const top = docTop(pages[i]);
      const center = top + pages[i].offsetHeight / 2;
      const d = Math.abs(center - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function release() {
    animating = false;
  }

  function go(dir) {
    if (animating) return;
    const i = currentIndex();
    const next = Math.min(Math.max(i + dir, 0), pages.length - 1);
    if (next === i) return;

    animating = true;
    const y = docTop(pages[next]);

    if (lenis && typeof lenis.scrollTo === 'function' && !prefersReduced) {
      lenis.scrollTo(y, {
        duration: ANIM_MS / 1000,
        easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
        lock: true,
        onComplete: release,
      });
    } else {
      window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
    }
    clearTimeout(safety);
    safety = setTimeout(release, ANIM_MS + 200); // never get stuck locked
  }

  // Find a scrollable ancestor that can still scroll in `dir`.
  function innerScrollCanTake(target, dir) {
    let el = target;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.dataset && el.dataset.scroll === 'y') {
        const canDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
        const canUp = el.scrollTop > 0;
        return dir > 0 ? canDown : canUp;
      }
      el = el.parentElement;
    }
    return false;
  }

  // ---- Wheel ----
  window.addEventListener(
    'wheel',
    (e) => {
      // Over the globe: let globe.gl zoom; never page-snap (don't preventDefault).
      if (e.target && e.target.closest && e.target.closest('#globe-canvas')) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      if (innerScrollCanTake(e.target, dir)) return; // let the inner area scroll
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) return;
      go(dir);
    },
    { passive: false }
  );

  // ---- Keyboard ----
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      go(-1);
    }
  });

  // ---- Touch (best-effort swipe) ----
  let touchY = null;
  window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchY == null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) {
      const dir = dy > 0 ? 1 : -1;
      if (!innerScrollCanTake(e.target, dir)) go(dir);
    }
    touchY = null;
  }, { passive: true });
}
