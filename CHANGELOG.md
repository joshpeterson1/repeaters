# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Accessibility-first color palette overhaul — all tokens now meet WCAG 2.1 AA (4.5:1 text, 3:1 UI) across light and dark modes, based on GitHub Primer / Radix / Carbon systems
- Color-blind-safe band markers on the map using the Okabe-Ito palette (2m, 70cm, 6m, 1.25m, 33cm, 23cm, other) so deuteranopia/protanopia/tritanopia users can still distinguish bands
- Color-blind-safe link line palette (Okabe-Ito + Tol Bright blend, 20 hues) replacing the previous primary-color set; new `SYSTEM_LINK_COLORS` constant for intertie/CACTUS/BARC/SDARC
- New CSS map tokens (`--map-marker-*`, `--map-cluster-*`, `--map-highlight`, `--map-boundary-*`) consumed by `js/map.js` so map paint colors follow the active theme automatically
- `prefers-reduced-motion` media query — disables fade/slide/spin animations for users with vestibular sensitivities
- `prefers-contrast: more` media query — strengthens borders, text, and focus rings in high-contrast mode
- Stronger focus rings with 4px outer glow for improved keyboard navigation visibility; focus-visible extended to close buttons, detail panel close, dark-mode toggle, and fullscreen button
- Selected table row now has a 3px left-edge accent so the selection is distinguishable for color-blind users
- `aria-live="polite"` on the detail panel content region so screen readers announce updates when a new repeater is opened
- Dark mode with toggle button, localStorage persistence, and `prefers-color-scheme` detection; Mapbox map switches between outdoor and dark styles

### Fixed
- Mobile filter checkbox layout — checkboxes were floating mid-column with labels crammed right. Each checkbox row is now a full-width tap card (44px min touch target, checkbox flush-left, label flush-next-to-it, explicit surface/border) matching the card design of other controls.
- Dark mode map popup was unreadable — Mapbox default popup kept a white background while our dark-mode text tokens rendered on it, turning labels into near-invisible light gray. Popup surface, tip, close button, and inner text now follow theme tokens.

### Changed
- Mobile: ZIP / callsign inputs, distance select, and action buttons now enforce 44px minimum height and 16px font-size (prevents iOS zoom-on-focus); band multiselect keeps a visible scrollable area instead of collapsing
- Cluster colors moved off pink/yellow (`#f1f075` / `#f28cb1`) to Okabe-Ito orange/vermillion for better contrast over OSM tiles
- Selection marker moved from pure `#ff0000` to `#cf222e` (light) / `#f85149` (dark) to reduce halation
- Muted text darkened from `#666` → `#525252` (light) and `#9e9e9e` → `#c6c6c6` (dark) to pass AA
- Dark-mode borders lifted from `#3a3a5c` to `#4c5155` (plus `--color-border-strong` for form controls)
- Disabled buttons now use a dedicated `--color-disabled-bg` / `--color-disabled-text` pair instead of opacity, guaranteeing 3:1
- Link line palette regenerated to be CVD-safe (see "Added")
- URL-based filter state — filters, view mode, and search params encode into shareable URLs via `history.replaceState`
- Geolocation API "My Location" button as alternative to ZIP code entry for distance filtering
- Repeater detail panel — slide-out panel showing all 40+ fields when a repeater is clicked (table row or map marker), with deep-linkable URLs via `?detail=CALL-FREQ`
- "What's New" popup — shows once per release to highlight recent changes, dismissed permanently via localStorage
- Accessibility: skip-to-content link, `aria-sort` on sortable table headers with keyboard Enter/Space support, `aria-live` on stats region, modal focus trapping with focus restore, `role="dialog"` and `aria-modal` on modals, visible `:focus-visible` outlines, modal close buttons converted from `<span>` to `<button>`
- 20 new tests for URL state serialization, dark mode preference resolution, and geolocation error messages (98 total)
- Vite build system with ES module migration (replaces global-scope script tags)
- Automated test suite with Vitest (78 tests covering utils, export formats, data processing, CSV parser, API endpoints, and scraper)
- GitHub Actions CI workflow (lint, test, build on every push/PR)
- Loading spinner and error states for data fetching with retry capability
- `/api/health` endpoint for data pipeline health monitoring (checks data freshness and repeater count)
- Scraper count comparison logging — warns if repeater count drops >20% between scrapes
- Failure notification webhook support via `HEALTH_WEBHOOK_URL` environment variable
- Vercel Web Analytics for visitor metrics tracking
- Mobile responsive layout (controls stack vertically, table scrolls horizontally, reduced spacing)

### Changed
- Refactored all hardcoded CSS colors to CSS custom properties for full theme support (~25 color values)
- Extracted `setupMapLayers()` from `initializeMap()` in map.js to support dark mode style switching
- Migrated all frontend JS from global-scope `<script>` tags to ES modules with proper imports/exports
- Extracted shared utility functions into `js/utils.js` to break circular dependencies
- Mapbox GL JS now loaded via npm package instead of CDN
- Rewrote `loadData()` from `.then()` chains to `async/await` with comprehensive error handling
- ESLint config simplified — removed 80+ manual globals in favor of module imports

### Fixed
- Map sometimes loading blank due to race conditions with Mapbox load timing (replaced blind setTimeout with Promise-based approach)
