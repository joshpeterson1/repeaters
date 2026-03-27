// UI event binding and modal management
import { AppState } from './state.js';
import { fitMapToRepeaters, centerMapOnUser } from './map.js';
import { showTableView, showMapView, showBothViews, toggleFullscreen } from './main.js';
import { applyFilters, clearFilters, sortTable } from './filters.js';
import { exportCSV, exportKML, exportKX3, exportChirp } from './export.js';
import { getSystemType, extractLinkFrequencies, findAllRepeatersByFrequency } from './data.js';
import { toggleDarkMode } from './dark-mode.js';
import { requestUserGeolocation } from './geolocation.js';
import { closeDetailPanel } from './detail-panel.js';

// Modal focus trap state
let currentFocusTrapCleanup = null;
let previouslyFocusedElement = null;

function trapFocus(modal) {
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null);
    if (focusableElements.length === 0) return () => {};

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleKeydown(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable.focus(); }
        } else {
            if (document.activeElement === lastFocusable) { e.preventDefault(); firstFocusable.focus(); }
        }
    }

    modal.addEventListener('keydown', handleKeydown);
    firstFocusable.focus();
    return () => modal.removeEventListener('keydown', handleKeydown);
}

function openModal(id) {
    previouslyFocusedElement = document.activeElement;
    const modal = document.getElementById(id);
    modal.style.display = 'block';
    currentFocusTrapCleanup = trapFocus(modal);
}

function closeCurrentModal(modalElement) {
    modalElement.style.display = 'none';
    if (currentFocusTrapCleanup) { currentFocusTrapCleanup(); currentFocusTrapCleanup = null; }
    if (previouslyFocusedElement) { previouslyFocusedElement.focus(); previouslyFocusedElement = null; }
}

function openHelpModal() { openModal('helpModal'); }
function openExportModal() { openModal('exportModal'); }
function openStatsModal() { openModal('statsModal'); }

function showStatsForNerds() {
    openStatsModal();
    generateStatsContent();
}

function generateStatsContent() {
    const statsContent = document.getElementById('statsContent');
    let content = '';

    const validatedLinks = AppState.repeaterLinks.filter(l => l.type === 'frequency').length;
    const nonValidatedLinksCount = AppState.nonValidatedLinks.length;
    const intertieLinks = AppState.repeaterLinks.filter(l => l.type === 'intertie').length;
    const systemLinks = AppState.repeaterLinks.filter(l => l.type === 'system').length;

    content += '=== BIDIRECTIONAL LINK VALIDATION RESULTS ===\n';
    content += `Successful bidirectional links: ${validatedLinks}\n`;
    content += `Non-validated single links: ${nonValidatedLinksCount}\n`;

    if (AppState.nonValidatedLinks.length > 0) {
        AppState.nonValidatedLinks.forEach((link, index) => {
            content += `  ${index + 1}. ${link.from.call} <> ${link.to.call}\n`;
        });
    }

    content += `Intertie links: ${intertieLinks}\n`;
    content += `System links: ${systemLinks}\n`;

    const systemRepeaters = {};
    AppState.allRepeaters.forEach(repeater => {
        const linkFreqText = (repeater.link_freq || '').toLowerCase();
        const systemType = getSystemType(linkFreqText);
        if (systemType) {
            if (!systemRepeaters[systemType]) systemRepeaters[systemType] = [];
            systemRepeaters[systemType].push(repeater);
        }
    });

    Object.entries(systemRepeaters).forEach(([systemType, repeaters]) => {
        const linkCount = (repeaters.length * (repeaters.length - 1)) / 2;
        content += `  ${systemType.toUpperCase()} system: ${repeaters.length} repeaters, ${linkCount} links\n`;
    });

    const failedBidirectionalLinks = [];
    AppState.allRepeaters.forEach(repeater => {
        if (!repeater.lat || !repeater.lon) return;
        const linkFrequencies = extractLinkFrequencies(repeater);
        linkFrequencies.forEach(linkFreq => {
            const potentialMatches = findAllRepeatersByFrequency(linkFreq);
            const validMatches = potentialMatches.filter(match => match !== repeater && match.lat && match.lon);
            if (validMatches.length > 0) {
                let foundBidirectionalLink = false;
                validMatches.forEach(linkedRepeater => {
                    const reverseLinks = extractLinkFrequencies(linkedRepeater);
                    const repeaterFreq = parseFloat(repeater.frequency || repeater.output_frequency);
                    if (reverseLinks.some(freq => parseFloat(freq) === parseFloat(repeaterFreq))) foundBidirectionalLink = true;
                });
                if (!foundBidirectionalLink) {
                    failedBidirectionalLinks.push({
                        call: repeater.call,
                        frequency: repeater.frequency || repeater.output_frequency,
                        location: repeater.location || repeater.general_location,
                        linkFreq: linkFreq,
                        potentialMatches: validMatches.map(match => ({ call: match.call, frequency: match.frequency || match.output_frequency, location: match.location || match.general_location }))
                    });
                }
            }
        });
    });

    content += `Failed bidirectional attempts: ${failedBidirectionalLinks.length}\n\n`;

    if (failedBidirectionalLinks.length > 0) {
        content += '=== FAILED BIDIRECTIONAL LINKS ===\n';
        failedBidirectionalLinks.forEach((link, index) => {
            content += `${index + 1}. ${link.call} (${link.frequency}) at ${link.location}\n`;
            content += `   \u2192 Links to: ${link.linkFreq}\n`;
            if (link.potentialMatches && link.potentialMatches.length > 0) {
                content += `   \u2192 Found ${link.potentialMatches.length} potential matches:\n`;
                link.potentialMatches.forEach((match, matchIndex) => {
                    content += `     ${matchIndex + 1}. ${match.call} (${match.frequency}) at ${match.location}\n`;
                    content += `        \u2192 But ${match.call} doesn't reference ${link.frequency} back\n`;
                });
            } else {
                content += `   \u2192 No repeaters found at ${link.linkFreq}\n`;
            }
            content += '\n';
        });
    }

    const missingLocationRepeaters = [];
    let simplexCount = 0;
    let sharedCount = 0;
    let normalMissingCount = 0;

    AppState.allRepeaters.forEach(repeater => {
        const callsign = (repeater.call || '').toLowerCase();
        const hasLocation = repeater.lat && repeater.lon;
        if (callsign.includes('(simplex)')) simplexCount++;
        else if (callsign.includes('(shared)')) sharedCount++;
        else if (!hasLocation) {
            normalMissingCount++;
            missingLocationRepeaters.push({ call: repeater.call, location: repeater.location || repeater.general_location || 'No location info' });
        }
    });

    content += '=== LOCATION DATA ANALYSIS ===\n';
    content += `Total repeaters: ${AppState.allRepeaters.length}\n`;
    content += `Simplex entries: ${simplexCount}\n`;
    content += `Shared entries: ${sharedCount}\n`;
    content += `Normal callsigns missing precision location data: ${normalMissingCount}\n\n`;

    if (missingLocationRepeaters.length > 0) {
        content += '=== NORMAL CALLSIGNS MISSING PRECISION LOCATION DATA ===\n';
        missingLocationRepeaters.forEach((repeater, index) => {
            content += `${index + 1}. ${repeater.call} - Location: "${repeater.location}"\n`;
        });
    }

    statsContent.textContent = content;
}

// Wire up all event listeners on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Modal close buttons (now <button> elements)
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            closeCurrentModal(this.closest('.modal'));
        });
    });

    // Close modal when clicking backdrop
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) closeCurrentModal(this);
        });
    });

    // Close modal/panel on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="display: block"]');
            if (openModal) { closeCurrentModal(openModal); return; }
            const detailPanel = document.getElementById('detailPanel');
            if (detailPanel.classList.contains('open')) closeDetailPanel();
        }
    });

    // Detail panel close button
    document.querySelector('.detail-panel-close').addEventListener('click', closeDetailPanel);

    // Help button
    document.querySelector('.settings-btn').addEventListener('click', openHelpModal);

    // Stats for nerds button
    document.querySelector('.btn-muted').addEventListener('click', showStatsForNerds);

    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Geolocation button
    document.getElementById('useMyLocationBtn').addEventListener('click', requestUserGeolocation);

    // Filter buttons
    document.querySelector('[data-action="apply-filters"]').addEventListener('click', applyFilters);
    document.querySelector('[data-action="clear-filters"]').addEventListener('click', clearFilters);
    document.querySelector('[data-action="open-export"]').addEventListener('click', openExportModal);

    // Export buttons
    document.querySelector('[data-action="export-csv"]').addEventListener('click', exportCSV);
    document.querySelector('[data-action="export-kml"]').addEventListener('click', exportKML);
    document.querySelector('[data-action="export-kx3"]').addEventListener('click', exportKX3);
    document.querySelector('[data-action="export-chirp"]').addEventListener('click', exportChirp);

    // View toggle buttons
    document.getElementById('tableViewBtn').addEventListener('click', showTableView);
    document.getElementById('mapViewBtn').addEventListener('click', showMapView);
    document.getElementById('bothViewBtn').addEventListener('click', showBothViews);

    // Map controls
    document.querySelector('[data-action="fit-repeaters"]').addEventListener('click', fitMapToRepeaters);
    document.getElementById('centerUserBtn').addEventListener('click', centerMapOnUser);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

    // Table header sorting via delegation (click + keyboard)
    const thead = document.querySelector('#repeaterTable thead');
    thead.addEventListener('click', function(e) {
        const th = e.target.closest('th[data-sort]');
        if (th) sortTable(th.dataset.sort);
    });
    thead.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            const th = e.target.closest('th[data-sort]');
            if (th) { e.preventDefault(); sortTable(th.dataset.sort); }
        }
    });
});
