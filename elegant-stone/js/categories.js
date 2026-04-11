/* ============================================
   Elegant Stone — Shared Category Renderer

   Single data source (categories.json) renders
   both Home page and Categories page cards.
   Change the JSON → both pages update.
   ============================================ */

function createCategoryCard(cat, basePath, delay, isFeatured) {
  const galleryPath = basePath ? 'gallery.html' : 'pages/gallery.html';
  const imgSrc = basePath ? `${basePath}${cat.image}` : cat.image;

  const card = document.createElement('a');
  card.href = `${galleryPath}#${cat.slug}`;
  card.className = `es-category-card es-reveal es-reveal--delay-${delay}`;
  if (isFeatured) card.classList.add('es-category-card--featured');
  card.dataset.category = cat.id;

  card.innerHTML = `
    <div class="es-category-card__image">
      <img src="${imgSrc}" alt="${cat.alt}" loading="lazy">
    </div>
    <div class="es-category-card__overlay"></div>
    <div class="es-category-card__content">
      <span class="es-category-card__label">Collection</span>
      <h3 class="es-category-card__title">${cat.title}</h3>
      <p class="es-category-card__desc">${cat.description}</p>
      <span class="es-category-card__arrow">Explore <span>&rarr;</span></span>
    </div>
  `;

  return card;
}

export async function renderCategories(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { basePath = '', maxItems = null } = options;

  // Resolve JSON path relative to the page
  const jsonPath = basePath ? `${basePath}content/categories.json` : 'content/categories.json';

  try {
    const res = await fetch(jsonPath);
    if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`);
    let categories = await res.json();

    // Limit items if maxItems is set (for home page)
    if (maxItems) {
      categories = categories.slice(0, maxItems);
    }

    // Clear static fallback content
    container.innerHTML = '';

    // Render cards
    categories.forEach((cat, i) => {
      const delay = (i % 3) + 1;
      const isFeatured = cat.featured && !maxItems;
      const card = createCategoryCard(cat, basePath, delay, isFeatured);
      container.appendChild(card);
    });
  } catch (err) {
    // If fetch fails, keep whatever static HTML is already there
    console.warn('Categories: using static fallback.', err.message);
  }
}
