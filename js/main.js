// Main application logic - data loading, favorites, view management
import { AppState } from './state.js';
import { showMessage, formatInternetLink, loadFavorites, saveFavorites } from './utils.js';
import { displayRepeaters, updateStats, applyFilters } from './filters.js';
import { updateMapData, initializeMap, clearRepeaterSelection, fitMapToRepeaters } from './map.js';
import { parseRepeaterLinks } from './data.js';
import { loadFiltersFromURL, pushFiltersToURL } from './url-state.js';
import { initDarkMode } from './dark-mode.js';
import { showWhatsNewIfNeeded } from './whats-new.js';
import { openDetailFromURL } from './detail-panel.js';

// Data loading and processing
export async function loadData() {
    const statsEl = document.getElementById('stats');
    const tbody = document.getElementById('repeaterTableBody');

    // Show loading state
    statsEl.innerHTML = '<span class="loading-indicator">Loading repeater data...</span>';
    tbody.innerHTML = '<tr><td colspan="12" class="loading-cell">Loading...</td></tr>';

    try {
        const response = await fetch('/api/data');

        if (!response.ok) {
            if (response.status === 404) {
                showMessage('No repeater data available yet. Data will appear after the next weekly update.', 'error');
                statsEl.textContent = 'No data available';
                tbody.innerHTML = '';
                return;
            }
            throw new Error(`Server returned ${response.status}`);
        }

        let data;
        try {
            data = await response.json();
        } catch {
            showMessage('Received invalid data from server.', 'error');
            statsEl.textContent = 'Data error';
            tbody.innerHTML = '';
            return;
        }

        if (data.error) {
            showMessage(data.error, 'error');
            statsEl.textContent = 'Data error';
            tbody.innerHTML = '';
            return;
        }

        if (!data.repeaters || data.repeaters.length === 0) {
            showMessage('No repeaters found in the dataset.', 'error');
            statsEl.textContent = 'No repeaters found';
            tbody.innerHTML = '';
            return;
        }

        // Success path
        AppState.allRepeaters = data.repeaters;
        AppState.filteredRepeaters = [...AppState.allRepeaters];

        processRepeaterData();

        displayRepeaters();
        updateStats();

        if (AppState.currentView !== 'table') {
            updateMapData();
        }

        applyFilters();

        AppState.lastDataUpdate = data.last_updated;

        const lastUpdated = document.getElementById('lastUpdated');
        const updateTime = new Date(data.last_updated).toLocaleString();
        lastUpdated.textContent = `Data updated weekly via automated scraping. Last update: ${updateTime}`;

        showMessage(`Loaded ${data.count} repeaters`, 'success');

        // Open detail panel if URL has a detail param
        openDetailFromURL();
    } catch (error) {
        showMessage('Unable to load data. Check your connection and try again.', 'error');
        statsEl.innerHTML = 'Failed to load data. <button class="retry-btn" onclick="loadData()">Retry</button>';
        tbody.innerHTML = '';
    }
}

export function processRepeaterData() {
    AppState.allRepeaters.forEach(repeater => {
        // Map v2 fields to expected frontend fields
        repeater.general_location = repeater.location || repeater.general_location || '';
        repeater.ctcss = repeater.ctcss_in || repeater.ctcss_out || '';
        repeater.elevation = repeater.elevation_feet || '';
        repeater.info = repeater.notes || '';

        // Process internet link data
        repeater.internet_link = formatInternetLink(repeater.internet_link || '');

        // Create a combined info field with additional v2 data
        const infoItems = [];
        if (repeater.wide_area === 'Y') infoItems.push('Wide Coverage');
        if (repeater.link_freq) infoItems.push(`Linked: ${repeater.link_freq}`);
        if (repeater.races === 'Y') infoItems.push('RACES');
        if (repeater.ares === 'Y') infoItems.push('ARES');
        if (repeater.emergency_power === 'Y') infoItems.push('Emergency Power');
        if (repeater.autopatch === 'Y') infoItems.push('Autopatch');
        repeater.info = infoItems.join(', ');
    });

    // Parse and build repeater links
    parseRepeaterLinks();

    // Update filtered repeaters as well
    AppState.filteredRepeaters = [...AppState.allRepeaters];
}

export function toggleFavorite(repeaterId, starElement) {
    if (AppState.favorites.has(repeaterId)) {
        AppState.favorites.delete(repeaterId);
        starElement.classList.remove('favorited');
        starElement.title = 'Add to favorites';
        showMessage('Removed from favorites', 'success');
    } else {
        AppState.favorites.add(repeaterId);
        starElement.classList.add('favorited');
        starElement.title = 'Remove from favorites';
        showMessage('Added to favorites', 'success');
    }

    saveFavorites();
    updateStats();
}

export function toggleFavoriteFromPopup(repeaterId, starElement) {
    toggleFavorite(repeaterId, starElement);
    displayRepeaters();
}

// View management
export function showTableView() {
    AppState.currentView = 'table';
    document.getElementById('mapContainer').style.display = 'none';
    document.getElementById('repeaterTable').parentElement.style.display = 'block';

    document.getElementById('tableViewBtn').classList.add('active');
    document.getElementById('mapViewBtn').classList.remove('active');
    document.getElementById('bothViewBtn').classList.remove('active');

    clearRepeaterSelection();
    pushFiltersToURL();
}

export function showMapView() {
    AppState.currentView = 'map';
    document.getElementById('mapContainer').style.display = 'block';
    document.getElementById('repeaterTable').parentElement.style.display = 'none';

    initializeMap().then(function() {
        AppState.map.resize();
        updateMapData();
        if (!AppState.mapInitialDataLoaded) {
            fitMapToRepeaters();
            AppState.mapInitialDataLoaded = true;
        }
    });

    document.getElementById('tableViewBtn').classList.remove('active');
    document.getElementById('mapViewBtn').classList.add('active');
    document.getElementById('bothViewBtn').classList.remove('active');

    clearRepeaterSelection();
    pushFiltersToURL();
}

export function showBothViews() {
    AppState.currentView = 'both';
    document.getElementById('mapContainer').style.display = 'block';
    document.getElementById('repeaterTable').parentElement.style.display = 'block';

    initializeMap().then(function() {
        AppState.map.resize();
        updateMapData();
        if (!AppState.mapInitialDataLoaded) {
            fitMapToRepeaters();
            AppState.mapInitialDataLoaded = true;
        }
    });

    document.getElementById('tableViewBtn').classList.remove('active');
    document.getElementById('mapViewBtn').classList.remove('active');
    document.getElementById('bothViewBtn').classList.add('active');
    pushFiltersToURL();
}

// Fullscreen functionality
export function toggleFullscreen() {
    const mapContainer = document.getElementById('mapContainer');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    if (mapContainer.classList.contains('fullscreen')) {
        mapContainer.classList.remove('fullscreen');
        fullscreenBtn.textContent = '\u26F6';
        fullscreenBtn.title = 'Toggle Fullscreen';
    } else {
        mapContainer.classList.add('fullscreen');
        fullscreenBtn.textContent = '\u2715';
        fullscreenBtn.title = 'Exit Fullscreen';
    }

    setTimeout(() => {
        if (AppState.map) {
            AppState.map.resize();
        }
    }, 100);
}

// Handle ESC key to exit fullscreen
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer.classList.contains('fullscreen')) {
            toggleFullscreen();
        }
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    loadFavorites();
    showWhatsNewIfNeeded();

    // Apply URL-driven filter state before loading data
    const urlView = loadFiltersFromURL();
    if (urlView === 'map') showMapView();
    else if (urlView === 'both') showBothViews();

    loadData();
});
