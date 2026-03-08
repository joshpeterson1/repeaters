// UI event binding and modal management

function handleRowClick(repeater, rowElement) {
    clearRepeaterSelection();
    rowElement.classList.add('selected');

    if (AppState.currentView !== 'table') {
        selectRepeaterOnMap(repeater);
    } else {
        showBothViews();
        setTimeout(() => {
            selectRepeaterOnMap(repeater);
        }, 1000);
    }
}

// Modal open/close functions
function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function openHelpModal() { openModal('helpModal'); }
function closeHelpModal() { closeModal('helpModal'); }
function openExportModal() { openModal('exportModal'); }
function closeExportModal() { closeModal('exportModal'); }
function openStatsModal() { openModal('statsModal'); }
function closeStatsModal() { closeModal('statsModal'); }

function showStatsForNerds() {
    openStatsModal();
    generateStatsContent();
}

function generateStatsContent() {
    const statsContent = document.getElementById('statsContent');
    let content = '';

    // Get bidirectional link validation results
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

    // Get system breakdown
    const systemRepeaters = {};
    AppState.allRepeaters.forEach(repeater => {
        const linkFreqText = (repeater.link_freq || '').toLowerCase();
        const systemType = getSystemType(linkFreqText);
        if (systemType) {
            if (!systemRepeaters[systemType]) {
                systemRepeaters[systemType] = [];
            }
            systemRepeaters[systemType].push(repeater);
        }
    });

    Object.entries(systemRepeaters).forEach(([systemType, repeaters]) => {
        const linkCount = (repeaters.length * (repeaters.length - 1)) / 2;
        content += `  ${systemType.toUpperCase()} system: ${repeaters.length} repeaters, ${linkCount} links\n`;
    });

    // Get failed bidirectional links
    const failedBidirectionalLinks = [];
    AppState.allRepeaters.forEach(repeater => {
        if (!repeater.lat || !repeater.lon) return;

        const linkFrequencies = extractLinkFrequencies(repeater);
        linkFrequencies.forEach(linkFreq => {
            const potentialMatches = findAllRepeatersByFrequency(linkFreq);
            const validMatches = potentialMatches.filter(match =>
                match !== repeater && match.lat && match.lon
            );

            if (validMatches.length > 0) {
                let foundBidirectionalLink = false;

                validMatches.forEach(linkedRepeater => {
                    const reverseLinks = extractLinkFrequencies(linkedRepeater);
                    const repeaterFreq = parseFloat(repeater.frequency || repeater.output_frequency);

                    const hasReverseLink = reverseLinks.some(freq => {
                        const freq1 = parseFloat(freq);
                        const freq2 = parseFloat(repeaterFreq);
                        return freq1 === freq2;
                    });

                    if (hasReverseLink) {
                        foundBidirectionalLink = true;
                    }
                });

                if (!foundBidirectionalLink) {
                    failedBidirectionalLinks.push({
                        call: repeater.call,
                        frequency: repeater.frequency || repeater.output_frequency,
                        location: repeater.location || repeater.general_location,
                        linkFreq: linkFreq,
                        potentialMatches: validMatches.map(match => ({
                            call: match.call,
                            frequency: match.frequency || match.output_frequency,
                            location: match.location || match.general_location
                        }))
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

    // Get missing location data
    const missingLocationRepeaters = [];
    let simplexCount = 0;
    let sharedCount = 0;
    let normalMissingCount = 0;

    AppState.allRepeaters.forEach(repeater => {
        const callsign = (repeater.call || '').toLowerCase();
        const hasLocation = repeater.lat && repeater.lon;

        if (callsign.includes('(simplex)')) {
            simplexCount++;
        } else if (callsign.includes('(shared)')) {
            sharedCount++;
        } else if (!hasLocation) {
            normalMissingCount++;
            missingLocationRepeaters.push({
                call: repeater.call,
                location: repeater.location || repeater.general_location || 'No location info'
            });
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
    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                this.style.display = 'none';
            }
        });
    });

    // Help button
    document.querySelector('.settings-btn').addEventListener('click', openHelpModal);

    // Stats for nerds button
    document.querySelector('.btn-muted').addEventListener('click', showStatsForNerds);

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

    // Table header sorting via delegation
    document.querySelector('#repeaterTable thead').addEventListener('click', function(e) {
        const th = e.target.closest('th[data-sort]');
        if (th) {
            sortTable(th.dataset.sort);
        }
    });
});
