// Centralized constants for the Utah Repeater Viewer

export const BANDS = [
    { name: '6m',    min: 50,   max: 54   },
    { name: '2m',    min: 144,  max: 148  },
    { name: '1.25m', min: 222,  max: 225  },
    { name: '70cm',  min: 420,  max: 450  },
    { name: '33cm',  min: 902,  max: 928  },
    { name: '23cm',  min: 1240, max: 1300 },
];

export const SYSTEM_TYPES = {
    CACTUS: 'cactus',
    BARC: 'barc',
    SDARC: 'sdarc',
};

export const MAP_CENTER = [-111.6946, 40.2338]; // Utah County center (Provo area)
export const MAP_DEFAULT_ZOOM = 9;

export const FAVORITES_KEY = 'utah-repeater-favorites';
export const THEME_KEY = 'utah-repeater-theme';
export const WHATS_NEW_KEY = 'utah-repeater-whats-new-seen';
export const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/outdoors-v12';
export const MAP_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';

// Update this when releasing noteworthy changes — drives the "What's New" popup
export const APP_VERSION = '2026-04-20';
export const WHATS_NEW = {
    date: 'April 20, 2026',
    items: [
        { emoji: '\uD83C\uDFA8', text: 'Accessibility-first color palette — all text now meets WCAG AA contrast in both light and dark modes' },
        { emoji: '\uD83D\uDC41\uFE0F', text: 'Color-blind-safe map markers and link lines — bands are distinguishable for deuteranopia, protanopia, and tritanopia' },
        { emoji: '\uD83D\uDCF1', text: 'Mobile filter checkboxes redesigned as full-width tap cards with 44px touch targets' },
        { emoji: '\u2728', text: 'Reduced-motion and high-contrast media queries respected system-wide' },
        { emoji: '\uD83D\uDCAC', text: 'Map popup and selected rows now readable in dark mode with proper theming' },
    ]
};

// Color-blind-safe palette for link lines. Blends Okabe-Ito and Tol Bright;
// each hue is distinguishable under deuteranopia, protanopia, and tritanopia.
// First entry is reserved for the "intertie" link type.
export const LINK_COLORS = [
    '#CC3311', // Vermillion (reserved for intertie)
    '#0072B2', // Blue
    '#009E73', // Bluish green
    '#E69F00', // Orange
    '#CC79A7', // Reddish purple
    '#56B4E9', // Sky blue
    '#D55E00', // Red-orange
    '#F0E442', // Yellow
    '#882255', // Wine
    '#117733', // Forest
    '#44AA99', // Teal
    '#AA3377', // Purple
    '#332288', // Indigo
    '#DDCC77', // Sand
    '#88CCEE', // Light cyan
    '#999933', // Olive
    '#661100', // Maroon
    '#6699CC', // Steel blue
    '#AA4499', // Mauve
    '#DDDDDD', // Pale grey (fallback)
];

// Colors for well-known link systems. CVD-safe and distinct from the main band palette.
export const SYSTEM_LINK_COLORS = {
    intertie: '#CC3311',
    cactus: '#117733',
    barc: '#332288',
    sdarc: '#AA3377',
    other: '#E69F00',
};

// Frequency ranges for link validation (superset of BANDS, includes 10m)
export const LINK_FREQ_RANGES = [
    { min: 28,   max: 29.7  }, // 10m
    { min: 50,   max: 54    }, // 6m
    { min: 144,  max: 148   }, // 2m
    { min: 222,  max: 225   }, // 1.25m
    { min: 420,  max: 450   }, // 70cm
    { min: 902,  max: 928   }, // 33cm
    { min: 1240, max: 1300  }, // 23cm
];
