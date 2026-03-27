# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Dark mode with toggle button, localStorage persistence, and `prefers-color-scheme` detection; Mapbox map switches between outdoor and dark styles
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
