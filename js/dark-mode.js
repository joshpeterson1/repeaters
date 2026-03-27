// Dark mode toggle with localStorage persistence and Mapbox style switching
import { THEME_KEY, MAP_STYLE_LIGHT, MAP_STYLE_DARK } from './constants.js';
import { AppState } from './state.js';
import { setupMapLayers, updateMapData } from './map.js';

export function getThemePreference() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
}

export function initDarkMode() {
    const theme = getThemePreference();
    applyTheme(theme);
}

export function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    switchMapStyle(next);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('darkModeToggle');
    if (btn) {
        // Moon for light mode (click to go dark), sun for dark mode (click to go light)
        btn.textContent = theme === 'dark' ? '\u2600' : '\u263E';
        btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
}

function switchMapStyle(theme) {
    if (!AppState.map || !AppState.mapInitialized) return;

    const style = theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
    AppState.map.setStyle(style);

    // After setStyle, all sources/layers are removed. Re-add them once the new style loads.
    AppState.map.once('style.load', () => {
        setupMapLayers();
        updateMapData();
    });
}
