// Filtering and sorting functionality

async function applyFilters() {
    const zipCode = document.getElementById('zipCode').value.trim();
    const maxDistance = document.getElementById('distance').value;
    const bandFilterSelect = document.getElementById('bandFilter');
    const selectedBands = Array.from(bandFilterSelect.selectedOptions).map(option => option.value);
    const callFilter = document.getElementById('callFilter').value.trim().toLowerCase();
    const wideCoverageOnly = document.getElementById('wideCoverageFilter').checked;
    const showFavoritesOnly = document.getElementById('showFavoritesOnly').checked;
    const showClosed = document.getElementById('showClosedFilter').checked;
    drawIntertieLinks = document.getElementById('drawIntertieLinksFilter').checked;
    drawOtherLinks = document.getElementById('drawOtherLinksFilter').checked;
    drawNonValidatedLinks = document.getElementById('drawNonValidatedLinksFilter').checked;

    // Get user location if ZIP code provided
    if (zipCode && zipCode !== '') {
        userLocation = await getLocationFromZip(zipCode);
        if (!userLocation) {
            showMessage('Could not find location for ZIP code: ' + zipCode, 'error');
            return;
        }
    }

    filteredRepeaters = allRepeaters.filter(repeater => {
        // Band filter - check if any selected bands match
        if (selectedBands.length > 0 && !selectedBands.includes(getBand(repeater.frequency))) {
            return false;
        }

        // Call sign filter
        if (callFilter && !repeater.call.toLowerCase().includes(callFilter)) {
            return false;
        }

        // Wide coverage filter - check wide_area column for 'Y'
        if (wideCoverageOnly) {
            if (repeater.wide_area !== 'Y') {
                return false;
            }
        }

        // Favorites filter
        if (showFavoritesOnly) {
            const repeaterId = getRepeaterId(repeater);
            if (!favorites.has(repeaterId)) {
                return false;
            }
        }

        // Closed repeater filter - hide closed repeaters by default
        if (!showClosed && repeater.closed === 'Y') {
            return false;
        }

        // Distance filter
        if (maxDistance && userLocation && repeater.lat && repeater.lon) {
            const distance = calculateDistance(userLocation.lat, userLocation.lon, repeater.lat, repeater.lon);
            repeater.distance = distance.toFixed(1);
            if (distance > parseFloat(maxDistance)) {
                return false;
            }
        } else if (userLocation && repeater.lat && repeater.lon) {
            const distance = calculateDistance(userLocation.lat, userLocation.lon, repeater.lat, repeater.lon);
            repeater.distance = distance.toFixed(1);
        } else if (userLocation) {
            // Set distance based on callsign type
            const callsign = (repeater.call || '').toLowerCase();
            if (callsign.includes('(simplex)') || callsign.includes('(shared)')) {
                repeater.distance = 'None';
            } else if (!repeater.lat || !repeater.lon) {
                repeater.distance = 'N/A';
            }
        }

        return true;
    });

    displayRepeaters();
    updateStats();
    
    // Update map if visible
    if (currentView !== 'table') {
        updateMapData();
    }
}

function clearFilters() {
    document.getElementById('zipCode').value = '';
    document.getElementById('distance').value = '';
    // Clear all selected options in the multiple select
    const bandFilter = document.getElementById('bandFilter');
    Array.from(bandFilter.options).forEach(option => option.selected = false);
    document.getElementById('callFilter').value = '';
    document.getElementById('wideCoverageFilter').checked = false;
    document.getElementById('showFavoritesOnly').checked = false;
    document.getElementById('drawIntertieLinksFilter').checked = false;
    document.getElementById('drawOtherLinksFilter').checked = false;
    document.getElementById('showClosedFilter').checked = false;
    document.getElementById('drawNonValidatedLinksFilter').checked = false;
    drawIntertieLinks = false;
    drawOtherLinks = false;
    drawNonValidatedLinks = false;
    userLocation = null;
    
    // Clear distances
    allRepeaters.forEach(repeater => {
        delete repeater.distance;
    });
    
    filteredRepeaters = [...allRepeaters];
    displayRepeaters();
    updateStats();
    
    // Hide center user button
    document.getElementById('centerUserBtn').style.display = 'none';
    updateMapData();
}

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    filteredRepeaters.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';

        // Handle numeric columns
        if (column === 'frequency' || column === 'elevation' || column === 'distance') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else {
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }

        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    displayRepeaters();
    updateSortHeaders();
}

function updateSortHeaders() {
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    if (currentSort.column) {
        const th = document.querySelector(`th[onclick="sortTable('${currentSort.column}')"]`);
        if (th) {
            th.classList.add(`sort-${currentSort.direction}`);
        }
    }
}

function displayRepeaters() {
    const tbody = document.getElementById('repeaterTableBody');
    tbody.innerHTML = '';

    // Displaying filtered repeaters

    filteredRepeaters.forEach((repeater, index) => {
        const row = tbody.insertRow();
        
        // Make row clickable (except for the star cell)
        row.classList.add('table-row-clickable');
        row.title = 'Click to show on map';
        row.addEventListener('click', (e) => {
            // Don't trigger row click if clicking on the star
            if (!e.target.classList.contains('favorite-star')) {
                handleRowClick(repeater, row);
            }
        });
        
        // Add favorite star cell
        const starCell = row.insertCell();
        const repeaterId = getRepeaterId(repeater);
        const isFavorited = favorites.has(repeaterId);
        starCell.innerHTML = `<span class="favorite-star ${isFavorited ? 'favorited' : ''}" 
            onclick="toggleFavorite('${repeaterId}', this)" 
            title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">★</span>`;
        
        const freqCell = row.insertCell();
        freqCell.innerHTML = `<span class="frequency">${repeater.frequency || 'N/A'}</span>`;
        
        const callCell = row.insertCell();
        callCell.innerHTML = `<span class="callsign">${repeater.call || 'N/A'}</span>`;
        
        row.insertCell().textContent = repeater.location || repeater.general_location || '';
        row.insertCell().textContent = repeater.site_name || '';
        row.insertCell().textContent = repeater.sponsor || '';
        row.insertCell().textContent = repeater.ctcss || '';
        row.insertCell().textContent = repeater.offset || '';
        row.insertCell().textContent = repeater.elevation || '';
        
        const distanceCell = row.insertCell();
        if (repeater.distance) {
            if (repeater.distance === 'None' || repeater.distance === 'N/A') {
                distanceCell.textContent = repeater.distance;
            } else {
                distanceCell.innerHTML = `<span class="distance">${repeater.distance} mi</span>`;
            }
        } else {
            distanceCell.textContent = '';
        }
        
        row.insertCell().textContent = repeater.internet_link || '';
        row.insertCell().textContent = repeater.info || '';
    });
    
    if (currentView !== 'table') updateMapData();
}

function updateStats() {
    const total = allRepeaters.length;
    const filtered = filteredRepeaters.length;
    const favoritesCount = favorites.size;
    const closedCount = allRepeaters.filter(r => r.closed === 'Y').length;
    const showClosed = document.getElementById('showClosedFilter').checked;
    const closedStatus = showClosed ? 'closed shown' : 'closed not shown';
    const statsEl = document.getElementById('stats');
    
    if (total === 0) {
        statsEl.textContent = 'No data loaded';
    } else if (filtered === total) {
        statsEl.textContent = `Showing all ${total} repeaters (${favoritesCount} favorites, ${closedCount} ${closedStatus})`;
    } else {
        statsEl.textContent = `Showing ${filtered} of ${total} repeaters (${favoritesCount} favorites, ${closedCount} ${closedStatus})`;
    }
}
