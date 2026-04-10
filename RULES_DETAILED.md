# Elegant Stone — Detailed Design & Development Rules

> This document consolidates and expands rules.txt and rules2.txt into an implementation-ready specification.
> All decisions here must be respected during development.

---

## 1. PROJECT DEFINITION

### 1.1 Purpose
- **Brand presentation website** for Elegant Stone, a premium boutique store in US malls.
- **NOT** an e-commerce site. No cart, checkout, payment, pricing, or stock features.
- Showcase product categories, reflect brand identity, encourage physical store visits and contact.

### 1.2 Future Expansion Readiness
The architecture must allow future addition of:
- Online product catalog with detail pages
- E-commerce (cart, checkout, payment)
- Multilingual support (i18n)
- CMS / admin panel integration
- Blog / content marketing

### 1.3 Language
- Website language: **English** (US market)
- Brand identity: USA-based

---

## 2. BRAND IDENTITY

### 2.1 Brand Name
**Elegant Stone**

### 2.2 Brand Qualities (MUST reflect)
| Quality | How it manifests in design |
|---------|---------------------------|
| Premium | Generous spacing, refined typography, high-quality imagery |
| Elegant | Smooth transitions, balanced layouts, luxurious color palette |
| Warm | Gold/copper/amber tones, inviting copy, soft lighting in photos |
| Ethnic | Cultural patterns as subtle accents, artisan imagery |
| Spiritual | Atmospheric descriptions, energy/intention language (soft, not clinical) |
| Artistic | Gallery-like presentations, curated layouts |
| Culturally rich | Global sourcing narrative, heritage storytelling |
| Modern but authentic | Clean code + artisan aesthetic, contemporary layout + traditional elements |

### 2.3 Brand Anti-Qualities (MUST NOT feel)
- Cheap or discount-oriented
- Generic or template-like
- Overly corporate or sterile
- Visually noisy or cluttered
- Marketplace-like (no dense product grids)
- Aggressive or salesy

---

## 3. PRODUCT CATEGORIES

Categories for showcase (no purchasing flow):

| Category | Description Focus |
|----------|-------------------|
| Natural & Polished Gemstones | Sourced from 15+ countries (Latin America, Asia, Europe, Africa). Singles, strands, sets, bulk. |
| Jewelry | Necklaces, bracelets, rings, earrings, keychains — crafted from natural gemstones |
| Turkish Mosaic Lamps | Handcrafted mosaic glass table lamps, wall lamps, chandeliers — various colors, sizes, patterns |
| Home Decor | Decorative art pieces, wall decor, statement objects |
| Spiritual Products | Energy-related items, meditation accessories, spiritual centerpieces |
| Incense & Natural Oils | Fragrances, essential oils, scent collections |
| Swords & Knives | Decorative and heritage blades with cultural significance |
| Ethnic Clothing | Culturally inspired garments and accessories |
| Gifts & Decorative Objects | Curated gift items, massage stones, artisan crafts |

---

## 4. REQUIRED PAGES

### 4.1 Current Phase (Mandatory)

| Page | Purpose | Key Sections |
|------|---------|-------------|
| **Home** | Brand introduction, atmosphere, navigation hub | Hero (video bg), brand intro, category showcase, gallery preview, store CTA |
| **About** | Brand story, mission, trust | Heading + story text (rules.txt §8.2), corporate trust badges, sourcing narrative |
| **Categories** | Product category showcase | Category grid with images, atmospheric descriptions, hover effects |
| **Gallery** | Visual showcase of products and store | Filterable masonry grid, lightbox, lazy loading |
| **Visit Us / The Experience** | In-store experience, location | Store video/images, 5 experience sections (§9.1-9.5), location info, hours |
| **Contact** | Communication channel | Contact form, store info, social links, map placeholder |

### 4.2 Future Phase (Architecture-ready, not implemented)
- Blog
- Individual collection pages
- Product detail pages
- Online catalog

---

## 5. DESIGN SYSTEM

### 5.1 Overall Aesthetic
- **Luxurious, immersive, elegant, and warm**
- Dark mode is the **primary** visual identity
- Light mode **must also be supported**
- Refined visual hierarchy
- Generous spacing and clean layouts
- No visual clutter

### 5.2 Color Palette

#### Dark Theme (Primary)
| Token | Role | Value | Usage |
|-------|------|-------|-------|
| `--color-bg-primary` | Main background | `#0D0D0D` | Page background |
| `--color-bg-secondary` | Card/section background | `#1A1A1A` | Cards, elevated surfaces |
| `--color-bg-tertiary` | Subtle distinction | `#252525` | Hover states, alt sections |
| `--color-text-primary` | Main text | `#F5F0EB` | Headings, body text |
| `--color-text-secondary` | Subdued text | `#B8B0A8` | Captions, meta text |
| `--color-gold` | Primary accent | `#B8860B` | CTAs, highlights, brand accent |
| `--color-gold-light` | Gold variant | `#D4A843` | Hover states, secondary accent |
| `--color-copper` | Warm accent | `#B87333` | Decorative elements, icons |
| `--color-amber` | Warm highlight | `#FFBF00` | Micro-interactions, badges |
| `--color-emerald` | Deep accent | `#2E4F3E` | Subtle backgrounds, spiritual section |
| `--color-burgundy` | Optional accent | `#722F37` | Sparingly — special callouts |
| `--color-brown-dark` | Warm neutral | `#3E2723` | Borders, dividers |

#### Light Theme
| Token | Role | Value |
|-------|------|-------|
| `--color-bg-primary` | Main background | `#FEFCF8` |
| `--color-bg-secondary` | Card background | `#F5F0EB` |
| `--color-bg-tertiary` | Subtle distinction | `#EDE8E2` |
| `--color-text-primary` | Main text | `#1A1A1A` |
| `--color-text-secondary` | Subdued text | `#5C5550` |

> Accent colors (gold, copper, amber, emerald, burgundy) remain the same across both themes.

### 5.3 Material Design Compliance

The website **MUST** follow official Material Design principles:

#### Spacing
- **Base unit**: 4px
- **Spacing scale**: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px
- All margins, paddings, gaps must align to 4px grid

#### Elevation
- Use box-shadow levels for depth hierarchy:
  - Level 0: Flat (no shadow)
  - Level 1: `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)` — Cards
  - Level 2: `0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)` — Raised cards
  - Level 3: `0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)` — Modals, lightbox
  - Level 4: `0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)` — Nav overlay

#### Button Standards
| Type | Min Height | Min Width | Padding | Border Radius |
|------|-----------|-----------|---------|---------------|
| Primary (filled) | 48px | 120px | 12px 24px | 8px |
| Secondary (outlined) | 48px | 120px | 12px 24px | 8px |
| Text button | 40px | auto | 8px 16px | 8px |
| Icon button | 48px | 48px | 12px | 50% |

#### Touch Targets
- Minimum touch target: **48x48px** on all interactive elements
- Minimum spacing between touch targets: **8px**

---

## 6. TYPOGRAPHY

### 6.1 Font Strategy
| Role | Style | Suggestion |
|------|-------|------------|
| Display / H1 | Serif or display typeface | Playfair Display, Cormorant Garamond, or similar |
| Headings H2-H4 | Serif or semi-serif | Same family as display, different weight |
| Body text | Clean sans-serif | Inter, Source Sans 3, or similar |
| Accent / Labels | Small caps or spaced sans | Same as body, letter-spaced |

### 6.2 Type Scale (Material Design)
| Level | Size | Line Height | Weight | Letter Spacing |
|-------|------|-------------|--------|----------------|
| Display Large | 57px | 64px | 400 | -0.25px |
| Display Medium | 45px | 52px | 400 | 0px |
| Display Small | 36px | 44px | 400 | 0px |
| Headline Large | 32px | 40px | 400 | 0px |
| Headline Medium | 28px | 36px | 400 | 0px |
| Headline Small | 24px | 32px | 400 | 0px |
| Title Large | 22px | 28px | 500 | 0px |
| Title Medium | 16px | 24px | 500 | 0.15px |
| Body Large | 16px | 24px | 400 | 0.5px |
| Body Medium | 14px | 20px | 400 | 0.25px |
| Body Small | 12px | 16px | 400 | 0.4px |
| Label Large | 14px | 20px | 500 | 0.1px |
| Label Medium | 12px | 16px | 500 | 0.5px |

---

## 7. ANIMATION RULES

### 7.1 Allowed
- Scroll-triggered fade-in / slide-up reveals (subtle, once per element)
- Hover transitions on cards and buttons (150-300ms, ease-out)
- Theme toggle transition (smooth color crossfade)
- Gallery lightbox open/close (scale + fade)
- Nav background transition on scroll (transparent → solid)
- Video background (muted, autoplay, loop)

### 7.2 Prohibited
- Parallax scrolling (heavy, distracting)
- Auto-rotating carousels
- Flashing or pulsing elements
- Complex particle effects
- Page transition animations
- Scroll-jacking

### 7.3 Timing
- Micro-interactions: 150ms
- Component transitions: 250ms
- Section reveals: 400-600ms
- Easing: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material standard)

---

## 8. CONTENT & TONE

### 8.1 Voice
- Warm, elegant, refined, brand-oriented
- NOT aggressive, salesy, or generic
- Atmospheric and inviting category descriptions
- Highlight craftsmanship, authenticity, cultural richness, aesthetics

### 8.2 Restrictions
- No pricing, stock, checkout, or cart language
- No direct medical, therapeutic, or guaranteed spiritual outcome claims
- Spiritual language allowed in lifestyle/atmospheric sense only — soft and inspirational

### 8.3 Pre-written Content (from rules.txt)
- About Us heading: "The World's Hidden Treasures, Handpicked for You."
- About Us body text: See rules.txt §8.2 (English version)
- In-Store Experiences: See rules.txt §9.1-9.5
- Corporate Trust Info: See rules.txt §10

---

## 9. RESPONSIVE DESIGN

### 9.1 Breakpoints
| Name | Min Width | Target |
|------|-----------|--------|
| Mobile S | 320px | Small phones |
| Mobile | 375px | Standard phones |
| Tablet | 768px | Tablets, landscape phones |
| Desktop | 1024px | Small desktops, landscape tablets |
| Desktop L | 1440px | Standard desktops |
| Desktop XL | 1920px | Large screens |

### 9.2 Layout Rules
- Mobile-first approach (base styles = mobile)
- Navigation: hamburger on mobile → full horizontal on desktop
- Gallery grid: 1 col → 2 col → 3 col → 4 col
- Category cards: vertical stack → 2-col → 3-col grid
- Hero text: smaller on mobile, larger display on desktop
- Touch targets: minimum 48px on all devices

---

## 10. ACCESSIBILITY

- Semantic HTML5 elements (`<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`)
- WCAG AA contrast ratios minimum (4.5:1 for body text, 3:1 for large text)
- Alt text on all images
- Keyboard navigation support
- Focus-visible styles on interactive elements
- Skip-to-content link
- ARIA labels where semantic HTML is insufficient

---

## 11. PERFORMANCE

- Lazy load images below the fold
- Optimize/compress images before deployment
- Video: poster frame fallback, lazy load, compressed format
- Minimal JavaScript — no heavy libraries
- CSS: modular files, no unused styles
- Target: <3s first meaningful paint on 3G

---

## 12. PROHIBITED FEATURES (Current Phase)

Do NOT implement:
- Shopping cart
- Checkout flow
- Payment system
- User accounts / authentication
- Stock tracking
- Product pricing logic
- Marketplace-style dense product grids
- Search functionality (future phase)
- Wishlist / favorites
- Product comparison

---

## 13. ASSET NAMING CONVENTION

All assets must follow:
- **kebab-case** English file names
- Organized by purpose in subdirectories
- Format: `{category}-{descriptor}-{variant}.{ext}`
- Examples: `hero-gemstone-collection.jpg`, `category-turkish-lamps.jpg`, `gallery-necklace-01.jpg`

---

## 14. CODE STANDARDS

### 14.1 HTML
- Semantic elements throughout
- Consistent indentation (2 spaces)
- `data-*` attributes for JavaScript hooks (not classes)
- Clear section comments

### 14.2 CSS
- CSS custom properties for all design tokens
- BEM-inspired naming with `es-` prefix: `.es-card`, `.es-card__title`, `.es-card--featured`
- Modular file structure (no monolith CSS)
- No `!important` unless overriding third-party
- Logical property order: positioning → display → box model → typography → visual → misc

### 14.3 JavaScript
- Vanilla JS (no framework requirement)
- ES6+ module pattern
- Event delegation where appropriate
- No global namespace pollution
- Clear function naming and documentation for complex logic only
