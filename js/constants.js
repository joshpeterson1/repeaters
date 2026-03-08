// Centralized constants for the Utah Repeater Viewer

const BANDS = [
    { name: '6m',    min: 50,   max: 54   },
    { name: '2m',    min: 144,  max: 148  },
    { name: '1.25m', min: 222,  max: 225  },
    { name: '70cm',  min: 420,  max: 450  },
    { name: '33cm',  min: 902,  max: 928  },
    { name: '23cm',  min: 1240, max: 1300 },
];

const SYSTEM_TYPES = {
    CACTUS: 'cactus',
    BARC: 'barc',
    SDARC: 'sdarc',
};

const MAP_CENTER = [-111.6946, 40.2338]; // Utah County center (Provo area)
const MAP_DEFAULT_ZOOM = 9;

const FAVORITES_KEY = 'utah-repeater-favorites';

const LINK_COLORS = [
    '#FF0000', // Red (reserved for intertie)
    '#00AA00', // Dark Green
    '#0066FF', // Bright Blue
    '#FF6600', // Orange
    '#AA00AA', // Purple/Magenta
    '#00AAAA', // Teal/Cyan
    '#FFAA00', // Amber
    '#AA0000', // Dark Red
    '#0000AA', // Dark Blue
    '#AA6600', // Brown/Orange
    '#6600AA', // Dark Purple
    '#00AA66', // Teal Green
    '#FF0066', // Pink/Red
    '#66AA00', // Olive Green
    '#0066AA', // Steel Blue
    '#AA6600', // Dark Orange
    '#6600FF', // Blue Purple
    '#FF6600', // Red Orange
    '#00FF66', // Spring Green
    '#6666AA', // Slate Blue
];

// Frequency ranges for link validation (superset of BANDS, includes 10m)
const LINK_FREQ_RANGES = [
    { min: 28,   max: 29.7  }, // 10m
    { min: 50,   max: 54    }, // 6m
    { min: 144,  max: 148   }, // 2m
    { min: 222,  max: 225   }, // 1.25m
    { min: 420,  max: 450   }, // 70cm
    { min: 902,  max: 928   }, // 33cm
    { min: 1240, max: 1300  }, // 23cm
];
