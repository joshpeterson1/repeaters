// Centralized application state
const AppState = {
    allRepeaters: [],
    filteredRepeaters: [],
    currentSort: { column: null, direction: 'asc' },
    userLocation: null,
    currentView: 'table',
    lastDataUpdate: null,
    favorites: new Set(),
    map: null,
    mapInitialized: false,
    selectedRepeater: null,
    repeaterLinks: [],
    drawIntertieLinks: false,
    drawOtherLinks: false,
    drawNonValidatedLinks: false,
    nonValidatedLinks: [],
};
