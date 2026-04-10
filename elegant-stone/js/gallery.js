/* ============================================
   Elegant Stone — Gallery Controller
   Filtering + Lightbox
   ============================================ */

export function initGalleryFilter() {
  const filterBtns = document.querySelectorAll('.es-filter-btn');
  const items = document.querySelectorAll('.es-gallery-item');

  if (!filterBtns.length || !items.length) return;

  function applyFilter(filter) {
    filterBtns.forEach(b => {
      b.classList.toggle('is-active', b.dataset.filter === filter);
    });
    items.forEach(item => {
      const category = item.dataset.category;
      const shouldShow = filter === 'all' || category === filter;
      item.classList.toggle('is-hidden', !shouldShow);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyFilter(btn.dataset.filter);
    });
  });

  // Auto-filter from URL hash (e.g. gallery.html#gemstones)
  const hash = window.location.hash.slice(1);
  if (hash) {
    const validFilters = [...filterBtns].map(b => b.dataset.filter);
    if (validFilters.includes(hash)) {
      applyFilter(hash);
    }
  }
}

export function initLightbox() {
  const lightbox = document.querySelector('.es-lightbox');
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector('.es-lightbox__image');
  const closeBtn = lightbox.querySelector('.es-lightbox__close');
  const prevBtn = lightbox.querySelector('.es-lightbox__prev');
  const nextBtn = lightbox.querySelector('.es-lightbox__next');
  const counter = lightbox.querySelector('.es-lightbox__counter');

  let currentIndex = 0;
  let galleryImages = [];

  // Collect all gallery triggers
  function updateGalleryImages() {
    galleryImages = [...document.querySelectorAll('[data-lightbox]')].filter(
      el => !el.classList.contains('is-hidden')
    );
  }

  function openLightbox(index) {
    updateGalleryImages();
    currentIndex = index;
    updateImage();
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function updateImage() {
    if (!galleryImages[currentIndex]) return;
    const src = galleryImages[currentIndex].dataset.lightbox;
    lightboxImg.src = src;
    lightboxImg.alt = galleryImages[currentIndex].alt || '';
    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
    }
  }

  function navigate(direction) {
    currentIndex = (currentIndex + direction + galleryImages.length) % galleryImages.length;
    updateImage();
  }

  // Event listeners
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox]');
    if (trigger) {
      updateGalleryImages();
      const index = galleryImages.indexOf(trigger);
      if (index !== -1) openLightbox(index);
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  // Close on backdrop click
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}
