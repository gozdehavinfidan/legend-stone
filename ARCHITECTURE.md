# Elegant Stone — Website Architecture Blueprint

---

## 1. DIRECTORY STRUCTURE

```
elegant-stone/
│
├── index.html                          # Home page
├── pages/
│   ├── about.html                      # About page
│   ├── categories.html                 # Categories overview
│   ├── gallery.html                    # Photo gallery
│   ├── visit-us.html                   # Store experience & location
│   └── contact.html                    # Contact form & info
│
├── css/
│   ├── variables.css                   # Design tokens (colors, spacing, typography, breakpoints)
│   ├── reset.css                       # Modern CSS reset (box-sizing, margins, defaults)
│   ├── base.css                        # Global styles, theme switching logic, body defaults
│   ├── layout.css                      # Grid systems, containers, section layouts
│   ├── components/
│   │   ├── navbar.css                  # Navigation bar (desktop + mobile)
│   │   ├── footer.css                  # Footer layout
│   │   ├── buttons.css                 # Button variants (primary, secondary, text, icon)
│   │   ├── cards.css                   # Category cards, experience cards, trust badges
│   │   ├── hero.css                    # Hero sections (video bg, image bg, text overlay)
│   │   ├── gallery-grid.css            # Masonry/grid gallery layout
│   │   ├── lightbox.css                # Gallery lightbox/modal
│   │   ├── section-header.css          # Reusable section title + subtitle pattern
│   │   └── forms.css                   # Contact form styling
│   └── pages/
│       ├── home.css                    # Home-specific styles
│       ├── about.css                   # About-specific styles
│       ├── categories.css              # Categories-specific styles
│       ├── gallery.css                 # Gallery-specific styles
│       ├── visit-us.css                # Visit Us-specific styles
│       └── contact.css                 # Contact-specific styles
│
├── js/
│   ├── main.js                         # App initialization, theme toggle, scroll handlers
│   ├── navigation.js                   # Mobile menu toggle, active state, scroll behavior
│   ├── gallery.js                      # Lightbox, category filtering, lazy load triggers
│   ├── animations.js                   # IntersectionObserver-based scroll reveals
│   └── utils.js                        # Debounce, throttle, lazy loading helper
│
├── assets/
│   ├── images/
│   │   ├── hero/                       # Hero section backgrounds
│   │   ├── categories/                 # Category card images
│   │   ├── gallery/                    # Gallery photos
│   │   ├── about/                      # About page imagery
│   │   ├── store/                      # Store/mall photos
│   │   └── ui/                         # Logo, icons, decorative elements
│   ├── video/
│   │   └── store-background.mp4        # Hero video background
│   └── fonts/                          # Self-hosted font files (if needed)
│
└── favicon.ico
```

---

## 2. PAGE WIREFRAMES

### 2.1 Home (index.html)
```
┌─────────────────────────────────────────────┐
│  NAVBAR [Logo | Home About Categories        │
│          Gallery Visit Contact] [Theme ☀/🌙] │
├─────────────────────────────────────────────┤
│                                             │
│  ██████████████████████████████████████████  │
│  █                                        █  │
│  █          HERO SECTION                  █  │
│  █     Video Background + Dark Overlay    █  │
│  █                                        █  │
│  █   "Elegant Stone"                      █  │
│  █   "Where Nature Meets Artistry"        █  │
│  █                                        █  │
│  █   [ Explore Collections ]              █  │
│  █                                        █  │
│  ██████████████████████████████████████████  │
│                                             │
├─────────────────────────────────────────────┤
│  BRAND INTRO STRIP                          │
│  Short 2-line brand description + gold line │
├─────────────────────────────────────────────┤
│                                             │
│  CATEGORY SHOWCASE                          │
│  "Our Collections"                          │
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │Gems  │  │Jewel │  │Lamps │              │
│  │      │  │      │  │      │              │
│  └──────┘  └──────┘  └──────┘              │
│  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │Decor │  │Spirit│  │Gifts │              │
│  │      │  │      │  │      │              │
│  └──────┘  └──────┘  └──────┘              │
│                                             │
├─────────────────────────────────────────────┤
│  GALLERY PREVIEW                            │
│  "A Glimpse of Our World"                   │
│  4-6 curated images in masonry layout       │
│  [ View Full Gallery → ]                    │
├─────────────────────────────────────────────┤
│  STORE CTA                                  │
│  "Experience Elegant Stone In Person"       │
│  Background image + overlay                 │
│  [ Visit Our Store → ]                      │
├─────────────────────────────────────────────┤
│  FOOTER                                     │
│  [Brand] [Pages] [Contact] [Social] [Legal] │
└─────────────────────────────────────────────┘
```

### 2.2 About (about.html)
```
┌─────────────────────────────────────────────┐
│  NAVBAR                                     │
├─────────────────────────────────────────────┤
│  PAGE HERO                                  │
│  "The World's Hidden Treasures,             │
│   Handpicked for You."                      │
│  Subtle background image                    │
├─────────────────────────────────────────────┤
│  BRAND STORY                                │
│  2-column: Text (rules.txt §8.2) | Image    │
├─────────────────────────────────────────────┤
│  TRUST BADGES ROW                           │
│  [15+ Countries] [100% Handcrafted]         │
│  [Certified Authentic] [Premier Malls]      │
├─────────────────────────────────────────────┤
│  MISSION / VALUES                           │
│  "Curators of Energy, Light, and Culture"   │
│  3-column icon blocks                       │
├─────────────────────────────────────────────┤
│  FOOTER                                     │
└─────────────────────────────────────────────┘
```

### 2.3 Categories (categories.html)
```
┌─────────────────────────────────────────────┐
│  NAVBAR                                     │
├─────────────────────────────────────────────┤
│  PAGE HERO                                  │
│  "Our Collections"                          │
├─────────────────────────────────────────────┤
│                                             │
│  CATEGORY GRID (3 columns desktop)          │
│                                             │
│  ┌─────────────────┐                        │
│  │   [Image]       │  Each card:            │
│  │   Category Name │  - Full-bleed image    │
│  │   Short desc    │  - Overlay on hover    │
│  │   [Explore →]   │  - Atmospheric text    │
│  └─────────────────┘  - Future: links to    │
│                          detail pages       │
│  9 category cards total                     │
│                                             │
├─────────────────────────────────────────────┤
│  FOOTER                                     │
└─────────────────────────────────────────────┘
```

### 2.4 Gallery (gallery.html)
```
┌─────────────────────────────────────────────┐
│  NAVBAR                                     │
├─────────────────────────────────────────────┤
│  PAGE HERO                                  │
│  "Gallery"                                  │
├─────────────────────────────────────────────┤
│  FILTER BAR                                 │
│  [All] [Gemstones] [Jewelry] [Lamps]        │
│  [Decor] [Store]                            │
├─────────────────────────────────────────────┤
│                                             │
│  MASONRY GALLERY GRID                       │
│  ┌────┐ ┌────────┐ ┌────┐                  │
│  │    │ │        │ │    │                  │
│  │    │ │        │ ├────┤                  │
│  ├────┤ └────────┘ │    │                  │
│  │    │ ┌────┐     │    │                  │
│  │    │ │    │     └────┘                  │
│  └────┘ └────┘                              │
│                                             │
│  Lightbox on click                          │
│  Lazy loading on scroll                     │
│                                             │
├─────────────────────────────────────────────┤
│  FOOTER                                     │
└─────────────────────────────────────────────┘
```

### 2.5 Visit Us (visit-us.html)
```
┌─────────────────────────────────────────────┐
│  NAVBAR                                     │
├─────────────────────────────────────────────┤
│  HERO with store video/image                │
│  "The Elegant Stone Experience"             │
├─────────────────────────────────────────────┤
│                                             │
│  IN-STORE EXPERIENCES (5 sections)          │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 💎 Custom Gemstone Matching          │   │
│  │ Description text from §9.1           │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ 💡 The Light Gallery                 │   │
│  │ Description text from §9.2           │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ⚔️ Artisan Storytelling              │   │
│  │ Description text from §9.3           │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ 🕯️ Spiritual Cleansing Corner       │   │
│  │ Description text from §9.4           │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ 🏛️ Exclusive In-Store Masterpieces  │   │
│  │ Description text from §9.5           │   │
│  └──────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  LOCATION INFO                              │
│  Address | Hours | Map Placeholder          │
├─────────────────────────────────────────────┤
│  FOOTER                                     │
└─────────────────────────────────────────────┘
```

### 2.6 Contact (contact.html)
```
┌─────────────────────────────────────────────┐
│  NAVBAR                                     │
├─────────────────────────────────────────────┤
│  PAGE HERO                                  │
│  "Get in Touch"                             │
├─────────────────────────────────────────────┤
│                                             │
│  2-COLUMN LAYOUT                            │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ Contact Form│  │ Store Info  │          │
│  │             │  │             │          │
│  │ Name        │  │ Address     │          │
│  │ Email       │  │ Phone       │          │
│  │ Subject     │  │ Email       │          │
│  │ Message     │  │ Hours       │          │
│  │             │  │ Social      │          │
│  │ [Send →]    │  │ Links       │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
├─────────────────────────────────────────────┤
│  MAP PLACEHOLDER                            │
├─────────────────────────────────────────────┤
│  FOOTER                                     │
└─────────────────────────────────────────────┘
```

---

## 3. COMPONENT HIERARCHY

### 3.1 Global Components (every page)
| Component | CSS Class | Description |
|-----------|-----------|-------------|
| Navbar | `.es-nav` | Sticky, transparent→solid on scroll, logo left, links right, theme toggle, hamburger on mobile |
| Footer | `.es-footer` | 4-column: Brand + tagline, Quick links, Contact info, Social media + legal |
| Theme Toggle | `.es-theme-toggle` | Sun/moon icon button in navbar, persists preference in localStorage |
| Skip Link | `.es-skip-link` | Accessibility: skip to main content |

### 3.2 Section Components (reusable across pages)
| Component | CSS Class | Description |
|-----------|-----------|-------------|
| Page Hero | `.es-page-hero` | Full-width, background image/video + overlay + centered text |
| Section Header | `.es-section-header` | Title + optional subtitle + decorative gold line |
| CTA Banner | `.es-cta-banner` | Background image + overlay + text + button |

### 3.3 Content Components
| Component | CSS Class | Description |
|-----------|-----------|-------------|
| Category Card | `.es-category-card` | Image + overlay text + hover zoom effect |
| Gallery Item | `.es-gallery-item` | Image thumbnail + category tag + lightbox trigger |
| Experience Card | `.es-experience-card` | Icon + title + description (Visit Us page) |
| Trust Badge | `.es-trust-badge` | Icon + stat + description (About page) |
| Contact Form | `.es-contact-form` | Material-styled form inputs + submit |
| Filter Bar | `.es-filter-bar` | Category filter buttons (Gallery page) |
| Lightbox | `.es-lightbox` | Full-screen image viewer with nav arrows |

---

## 4. CSS ARCHITECTURE

### 4.1 File Load Order
```html
<link rel="stylesheet" href="css/reset.css">
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components/navbar.css">
<link rel="stylesheet" href="css/components/footer.css">
<link rel="stylesheet" href="css/components/buttons.css">
<link rel="stylesheet" href="css/components/cards.css">
<link rel="stylesheet" href="css/components/hero.css">
<link rel="stylesheet" href="css/components/section-header.css">
<link rel="stylesheet" href="css/components/gallery-grid.css">
<link rel="stylesheet" href="css/components/lightbox.css">
<link rel="stylesheet" href="css/components/forms.css">
<link rel="stylesheet" href="css/pages/{current-page}.css">
```

### 4.2 variables.css Structure
```css
:root {
  /* === Colors (Dark Theme — Default) === */
  --color-bg-primary: #0D0D0D;
  --color-bg-secondary: #1A1A1A;
  /* ... all color tokens ... */

  /* === Typography === */
  --font-display: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
  /* ... type scale tokens ... */

  /* === Spacing (4px base) === */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;

  /* === Breakpoints (for reference — used in media queries) === */
  --bp-mobile: 375px;
  --bp-tablet: 768px;
  --bp-desktop: 1024px;
  --bp-desktop-l: 1440px;

  /* === Elevation === */
  --shadow-1: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
  --shadow-2: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
  --shadow-3: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);

  /* === Transitions === */
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --duration-micro: 150ms;
  --duration-component: 250ms;
  --duration-section: 500ms;

  /* === Layout === */
  --container-max: 1200px;
  --container-padding: var(--space-6);
  --nav-height: 72px;

  /* === Border Radius === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

[data-theme="light"] {
  --color-bg-primary: #FEFCF8;
  --color-bg-secondary: #F5F0EB;
  --color-bg-tertiary: #EDE8E2;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #5C5550;
  /* Accent colors remain the same */
}
```

---

## 5. JAVASCRIPT ARCHITECTURE

### 5.1 Module Structure
```
main.js          → DOMContentLoaded entry point
  ├── imports navigation.js    → initNavigation()
  ├── imports animations.js    → initScrollReveal()
  ├── manages theme toggle     → initThemeToggle()
  └── page-specific init

navigation.js    → Mobile menu, active link state, scroll-based nav styling
gallery.js       → Filter buttons, masonry layout, lightbox open/close/navigate
animations.js    → IntersectionObserver for `.es-reveal` elements
utils.js         → debounce(), throttle(), lazyLoadImages()
```

### 5.2 Theme Toggle Logic
```
1. Check localStorage for saved preference
2. Check prefers-color-scheme media query
3. Default to dark theme
4. On toggle: update data-theme attribute on <html>, save to localStorage
5. Smooth transition via CSS transition on color properties
```

---

## 6. ASSET MAPPING

Current assets → Organized structure:

| Current File | New Location | Purpose |
|-------------|-------------|---------|
| decoratif.JPG | assets/images/categories/home-decor.jpg | Category: Home Decor |
| jewerly.png | assets/images/categories/jewelry.jpg | Category: Jewelry |
| neclace.png | assets/images/categories/necklaces.jpg | Category: Necklaces / Gallery |
| natural stokes.jpg | assets/images/categories/gemstones-01.jpg | Category: Gemstones |
| natural stokes2.jpg | assets/images/categories/gemstones-02.jpg | Gallery: Gemstones |
| natural stokes 3.jpg | assets/images/categories/gemstones-03.jpg | Gallery: Gemstones |
| Picture3.jpg | assets/images/gallery/product-01.jpg | Gallery |
| Picture5.jpg | assets/images/gallery/product-02.jpg | Gallery |
| Picture6.jpg | assets/images/gallery/product-03.jpg | Gallery |
| Picture7.jpg | assets/images/gallery/product-04.jpg | Gallery |
| shoppingmall_picture1.jpg | assets/images/store/store-exterior-01.jpg | Visit Us / About |
| shoppingmall_picture2.jpg | assets/images/store/store-exterior-02.jpg | Visit Us |
| shoppingmall_picture3.jpg | assets/images/store/store-interior-01.jpg | Visit Us |
| shoppingmall_picture4.jpg | assets/images/store/store-interior-02.jpg | Visit Us |
| Ev Dekoru...01kn...png | assets/images/hero/home-decor-hero-01.png | Hero / About |
| Ev Dekoru...01kn...png | assets/images/hero/home-decor-hero-02.png | Hero variant |
| Mağaza_Arka_Plan_Videosu... | assets/video/store-background.mp4 | Hero video bg |

---

## 7. IMPLEMENTATION ORDER

| Phase | Task | Dependencies |
|-------|------|-------------|
| 1 | Set up directory structure + asset organization | None |
| 2 | Create CSS foundation: reset, variables, base, layout | Phase 1 |
| 3 | Build global components: navbar, footer | Phase 2 |
| 4 | Build Home page (hero + all sections) | Phase 3 |
| 5 | Build About page | Phase 3 |
| 6 | Build Categories page | Phase 3 |
| 7 | Build Gallery page (with lightbox + filtering) | Phase 3 |
| 8 | Build Visit Us page | Phase 3 |
| 9 | Build Contact page | Phase 3 |
| 10 | Add animations (scroll reveal) | Phases 4-9 |
| 11 | Responsive testing & polish | Phase 10 |
| 12 | Performance optimization | Phase 11 |
| 13 | Accessibility audit | Phase 12 |
