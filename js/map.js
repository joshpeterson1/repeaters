// Map-related functionality
// Public Mapbox client token — scoped by domain restrictions in the Mapbox dashboard.
// These tokens are designed to be embedded in frontend code; no .env or API proxy needed.
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic29tYmVyanAiLCJhIjoiY21majlxOG5oMDJoejJscHdwMXQwbzF5OCJ9.d4gGG0AbXkQff-UZsdkuow';

// Initialize Mapbox map
function initializeMap() {
    if (AppState.mapReady) return AppState.mapReady;

    var resolveMapReady;
    AppState.mapReady = new Promise(function(resolve) {
        resolveMapReady = resolve;
    });

    mapboxgl.accessToken = MAPBOX_TOKEN;

    AppState.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/outdoors-v12', // Good for radio coverage
        center: MAP_CENTER,
        zoom: MAP_DEFAULT_ZOOM
    });

    AppState.map.on('load', function() {
        // Add Utah boundary visualization
        AppState.map.addSource('utah-boundary', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-114.052962, 42.001567], // NW corner
                        [-109.041058, 42.001567], // NE corner
                        [-109.041058, 36.997968], // SE corner
                        [-114.052962, 36.997968], // SW corner
                        [-114.052962, 42.001567]  // Close polygon
                    ]]
                }
            }
        });

        // Add subtle boundary fill
        AppState.map.addLayer({
            id: 'utah-boundary-fill',
            type: 'fill',
            source: 'utah-boundary',
            paint: {
                'fill-color': '#007bff',
                'fill-opacity': 0.05
            }
        });

        // Add boundary line
        AppState.map.addLayer({
            id: 'utah-boundary-line',
            type: 'line',
            source: 'utah-boundary',
            paint: {
                'line-color': '#dc3545',
                'line-width': 2,
                'line-opacity': 0.6,
                'line-dasharray': [2, 2] // Dashed line
            }
        });

        // Add source for repeaters
        AppState.map.addSource('repeaters', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });

        // Add cluster circles
        AppState.map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'repeaters',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6',
                    10,
                    '#f1f075',
                    30,
                    '#f28cb1'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    10,
                    30,
                    30,
                    40
                ]
            }
        });

        // Add cluster count labels
        AppState.map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'repeaters',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });

        // Add individual repeater points
        AppState.map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'repeaters',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': [
                    'case',
                    ['==', ['get', 'band'], '2m'], '#dc3545',
                    ['==', ['get', 'band'], '70cm'], '#007bff',
                    ['==', ['get', 'band'], '6m'], '#28a745',
                    ['==', ['get', 'band'], '1.25m'], '#ffc107',
                    '#6c757d'
                ],
                'circle-radius': [
                    'case',
                    ['>', ['get', 'count'], 1], 10, // Larger for multiple repeaters
                    8 // Normal size for single repeaters
                ],
                'circle-stroke-width': [
                    'case',
                    ['>', ['get', 'count'], 1], 3, // Thicker stroke for multiple
                    2 // Normal stroke
                ],
                'circle-stroke-color': [
                    'case',
                    ['>', ['get', 'count'], 1], '#ff6b35', // Orange stroke for multiple
                    '#fff' // White stroke for single
                ]
            }
        });

        // Add highlighted repeater layer (for selected repeater)
        AppState.map.addSource('highlighted-repeater', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        AppState.map.addLayer({
            id: 'highlighted-point',
            type: 'circle',
            source: 'highlighted-repeater',
            paint: {
                'circle-color': '#ff0000',
                'circle-radius': 15,
                'circle-stroke-width': 4,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
            }
        });

        // Add source and layer for repeater links
        AppState.map.addSource('repeater-links', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        AppState.map.addLayer({
            id: 'repeater-links-line',
            type: 'line',
            source: 'repeater-links',
            paint: {
                'line-color': ['get', 'linkColor'], // Use the color from properties
                'line-width': [
                    'case',
                    ['==', ['get', 'linkType'], 'intertie'], 1.5, // Thinner for intertie
                    1.5 // Thinner for regular links
                ],
                'line-dasharray': [
                    'case',
                    ['==', ['get', 'linkType'], 'intertie'], ['literal', [1, 0]], // Solid for intertie
                    ['==', ['get', 'systemType'], SYSTEM_TYPES.CACTUS], ['literal', [1, 0]], // Solid for Cactus
                    ['==', ['get', 'linkType'], 'non-validated'], ['literal', [7, 7]], // Longer dashes for non-validated
                    ['literal', [3, 3]] // Dashed for other links
                ],
                'line-opacity': [
                    'case',
                    ['==', ['get', 'linkType'], 'non-validated'], 0.5, // 50% opacity for non-validated
                    0.7 // 70% opacity for all validated links
                ]
            }
        });

        // Click events for clusters
        AppState.map.on('click', 'clusters', function(e) {
            e.originalEvent.stopPropagation(); // Prevent map click event

            const features = AppState.map.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            const clusterId = features[0].properties.cluster_id;
            AppState.map.getSource('repeaters').getClusterExpansionZoom(
                clusterId,
                function(err, zoom) {
                    if (err) return;
                    AppState.map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });

        // Click events for individual points
        AppState.map.on('click', 'unclustered-point', function(e) {
            e.originalEvent.stopPropagation(); // Prevent map click event

            const coordinates = e.features[0].geometry.coordinates.slice();
            const props = e.features[0].properties;

            // Parse the properties back from JSON
            const repeater = JSON.parse(props.data);
            const count = props.count || 1;
            const groupIndex = props.groupIndex || 0;

            const isMultiple = count > 1;
            const popupContent = createPopupContent(repeater, isMultiple, groupIndex, count);

            new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(popupContent)
                .addTo(AppState.map);
        });

        // Click on map to deselect repeater
        AppState.map.on('click', function(e) {
            // Only deselect if we didn't click on a marker or cluster
            const features = AppState.map.queryRenderedFeatures(e.point, {
                layers: ['unclustered-point', 'clusters']
            });

            if (features.length === 0) {
                clearRepeaterSelection();
            }
        });

        // Change cursor on hover
        AppState.map.on('mouseenter', 'clusters', function() {
            AppState.map.getCanvas().style.cursor = 'pointer';
        });
        AppState.map.on('mouseleave', 'clusters', function() {
            AppState.map.getCanvas().style.cursor = '';
        });
        AppState.map.on('mouseenter', 'unclustered-point', function() {
            AppState.map.getCanvas().style.cursor = 'pointer';
        });
        AppState.map.on('mouseleave', 'unclustered-point', function() {
            AppState.map.getCanvas().style.cursor = '';
        });

        AppState.mapInitialized = true;
        resolveMapReady();
    });

    return AppState.mapReady;
}

function createPopupContent(repeater, isMultiple = false, groupIndex = 0, totalInGroup = 1) {
    let content = `<div class="popup-content">`;

    if (isMultiple) {
        content += `<div style="background-color: #e9ecef; padding: 5px; margin-bottom: 10px; border-radius: 3px; font-size: 11px;">
            <strong>Multiple repeaters at this location (${groupIndex + 1} of ${totalInGroup})</strong>
        </div>`;
    }

    const repeaterId = getRepeaterId(repeater);
    const isFavorited = AppState.favorites.has(repeaterId);

    content += `
        <h4>
            <span class="favorite-star ${isFavorited ? 'favorited' : ''}"
                  onclick="toggleFavoriteFromPopup('${repeaterId}', this)"
                  title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">&#9733;</span>
            ${escapeHTML(repeater.call || 'N/A')}
        </h4>
        <div class="frequency">${escapeHTML(repeater.frequency || 'N/A')} MHz</div>
        <p><strong>Location:</strong> ${escapeHTML(repeater.location || repeater.general_location || 'N/A')}</p>
        <p><strong>Site:</strong> ${escapeHTML(repeater.site_name || 'N/A')}</p>
        <p><strong>Sponsor:</strong> ${escapeHTML(repeater.sponsor || 'N/A')}</p>
        <p><strong>CTCSS:</strong> ${escapeHTML(repeater.ctcss || 'N/A')}</p>
        <p><strong>Offset:</strong> ${escapeHTML(repeater.offset || 'N/A')}</p>
        ${repeater.elevation ? `<p><strong>Elevation:</strong> ${escapeHTML(repeater.elevation)}</p>` : ''}
        ${repeater.distance ? `<p><strong>Distance:</strong> ${escapeHTML(repeater.distance)} miles</p>` : ''}
        ${repeater.internet_link ? `<p><strong>Internet:</strong> ${escapeHTML(repeater.internet_link)}</p>` : ''}
        ${repeater.info ? `<p><strong>Info:</strong> ${escapeHTML(repeater.info)}</p>` : ''}
    </div>`;

    return content;
}

// Escape HTML special characters for safe interpolation into HTML strings
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(c) {
        switch (c) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
        }
    });
}

function updateMapData() {
    if (!AppState.map || !AppState.mapInitialized) return;

    const mappableRepeaters = AppState.filteredRepeaters.filter(repeater => repeater.lat && repeater.lon);

    // Group repeaters by location to handle overlapping points
    const locationGroups = {};
    mappableRepeaters.forEach(repeater => {
        const key = `${repeater.lat.toFixed(6)},${repeater.lon.toFixed(6)}`;
        if (!locationGroups[key]) {
            locationGroups[key] = [];
        }
        locationGroups[key].push(repeater);
    });

    const features = [];
    Object.entries(locationGroups).forEach(([locationKey, repeaters]) => {
        const [lat, lon] = locationKey.split(',').map(parseFloat);

        if (repeaters.length === 1) {
            // Single repeater at this location
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                },
                properties: {
                    band: getBand(repeaters[0].frequency),
                    data: JSON.stringify(repeaters[0]),
                    count: 1
                }
            });
        } else {
            // Multiple repeaters at same location - create slightly offset points
            repeaters.forEach((repeater, index) => {
                // Create small offset in a circle pattern
                const offsetDistance = 0.0001; // Very small offset
                const angle = (index / repeaters.length) * 2 * Math.PI;
                const offsetLat = lat + (offsetDistance * Math.cos(angle));
                const offsetLon = lon + (offsetDistance * Math.sin(angle));

                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [offsetLon, offsetLat]
                    },
                    properties: {
                        band: getBand(repeater.frequency),
                        data: JSON.stringify(repeater),
                        count: repeaters.length,
                        originalLat: lat,
                        originalLon: lon,
                        groupIndex: index
                    }
                });
            });
        }
    });

    AppState.map.getSource('repeaters').setData({
        type: 'FeatureCollection',
        features: features
    });

    // Update links if any are enabled
    if (AppState.drawIntertieLinks || AppState.drawOtherLinks || AppState.drawNonValidatedLinks) {
        updateRepeaterLinks();
    } else {
        // Clear links
        AppState.map.getSource('repeater-links').setData({
            type: 'FeatureCollection',
            features: []
        });
    }

    // Update map stats
    const mapStats = document.getElementById('mapStats');
    const mappableCount = mappableRepeaters.length;
    const locationCount = Object.keys(locationGroups).length;

    // Count the actual links that will be rendered
    let linkCount = 0;
    if (AppState.drawIntertieLinks || AppState.drawOtherLinks || AppState.drawNonValidatedLinks) {
        const allLinksToRender = [...AppState.repeaterLinks];
        if (AppState.drawNonValidatedLinks) {
            allLinksToRender.push(...AppState.nonValidatedLinks);
        }

        linkCount = allLinksToRender.filter(link => {
            // Only count links for visible repeaters
            const fromVisible = AppState.filteredRepeaters.includes(link.from);
            const toVisible = AppState.filteredRepeaters.includes(link.to);

            // Check if this link type should be drawn
            const shouldDrawLink = (link.type === 'intertie' && AppState.drawIntertieLinks) ||
                                 ((link.type === 'frequency' || link.type === 'system') && AppState.drawOtherLinks) ||
                                 (link.type === 'non-validated' && AppState.drawNonValidatedLinks);

            return fromVisible && toVisible && shouldDrawLink;
        }).length;
    }

    mapStats.textContent = `Showing ${mappableCount} repeaters at ${locationCount} locations${linkCount > 0 ? `, ${linkCount} links` : ''} on map`;
}

function fitMapToRepeaters() {
    if (!AppState.map || !AppState.mapInitialized) return;

    const mappableRepeaters = AppState.filteredRepeaters.filter(r => r.lat && r.lon);
    if (mappableRepeaters.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    mappableRepeaters.forEach(repeater => {
        bounds.extend([repeater.lon, repeater.lat]);
    });

    AppState.map.fitBounds(bounds, { padding: 50 });
}

function centerMapOnUser() {
    if (!AppState.map || !AppState.userLocation) return;

    AppState.map.flyTo({
        center: [AppState.userLocation.lon, AppState.userLocation.lat],
        zoom: 10
    });

    // Add user location marker if it doesn't exist
    if (!AppState.map.getSource('user-location')) {
        AppState.map.addSource('user-location', {
            type: 'geojson',
            data: {
                type: 'Point',
                coordinates: [AppState.userLocation.lon, AppState.userLocation.lat]
            }
        });

        AppState.map.addLayer({
            id: 'user-location',
            type: 'circle',
            source: 'user-location',
            paint: {
                'circle-radius': 10,
                'circle-color': '#ff0000',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff'
            }
        });
    }
}

function selectRepeaterOnMap(repeater) {
    if (!AppState.map || !AppState.mapInitialized || !repeater.lat || !repeater.lon) return;

    // Store selected repeater
    AppState.selectedRepeater = repeater;

    // Update highlighted repeater source
    AppState.map.getSource('highlighted-repeater').setData({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [repeater.lon, repeater.lat]
            },
            properties: {}
        }]
    });

    // Center map on the repeater
    AppState.map.flyTo({
        center: [repeater.lon, repeater.lat],
        zoom: Math.max(AppState.map.getZoom(), 12) // Zoom in if not already zoomed
    });

    // Show popup for the selected repeater
    setTimeout(() => {
        const popupContent = createPopupContent(repeater);
        new mapboxgl.Popup()
            .setLngLat([repeater.lon, repeater.lat])
            .setHTML(popupContent)
            .addTo(AppState.map);
    }, 500); // Delay to let the map finish flying
}

function clearRepeaterSelection() {
    AppState.selectedRepeater = null;

    // Clear highlighted repeater - but only if map is initialized and source exists
    if (AppState.map && AppState.mapInitialized && AppState.map.getSource('highlighted-repeater')) {
        AppState.map.getSource('highlighted-repeater').setData({
            type: 'FeatureCollection',
            features: []
        });
    }

    // Remove selected class from all table rows
    document.querySelectorAll('#repeaterTableBody tr').forEach(row => {
        row.classList.remove('selected');
    });
}

function getLinkColor(link, linkColorMap, colorIndex) {
    if (link.type === 'intertie') {
        return { color: '#FF0000', colorIndex };
    }

    if (link.type === 'system') {
        const systemColors = {
            [SYSTEM_TYPES.CACTUS]: '#00FF00',
            [SYSTEM_TYPES.BARC]: '#0000FF',
            [SYSTEM_TYPES.SDARC]: '#FF00FF',
        };
        return { color: systemColors[link.systemType] || '#FFA500', colorIndex };
    }

    // Frequency-based or non-validated links get unique colors
    const linkKey = [link.from.call, link.to.call].sort().join('-');
    if (!linkColorMap.has(linkKey)) {
        linkColorMap.set(linkKey, LINK_COLORS[colorIndex % LINK_COLORS.length]);
        colorIndex++;
    }
    return { color: linkColorMap.get(linkKey), colorIndex };
}

function updateRepeaterLinks() {
    if (!AppState.map || !AppState.mapInitialized) return;

    const linkFeatures = [];
    const linkColorMap = new Map();
    let colorIndex = 0;

    // Combine regular repeater links with non-validated links if enabled
    const allLinksToRender = [...AppState.repeaterLinks];
    if (AppState.drawNonValidatedLinks) {
        allLinksToRender.push(...AppState.nonValidatedLinks);
    }

    allLinksToRender.forEach(link => {
        // Only show links for repeaters that are currently filtered/visible
        const fromVisible = AppState.filteredRepeaters.includes(link.from);
        const toVisible = AppState.filteredRepeaters.includes(link.to);

        // Check if this link type should be drawn
        const shouldDrawLink = (link.type === 'intertie' && AppState.drawIntertieLinks) ||
                             ((link.type === 'frequency' || link.type === 'system') && AppState.drawOtherLinks) ||
                             (link.type === 'non-validated' && AppState.drawNonValidatedLinks);

        if (fromVisible && toVisible && shouldDrawLink) {
            // Find the actual rendered coordinates for both repeaters
            const fromCoords = findRepeaterRenderCoords(link.from);
            const toCoords = findRepeaterRenderCoords(link.to);

            if (fromCoords && toCoords) {
                const result = getLinkColor(link, linkColorMap, colorIndex);
                colorIndex = result.colorIndex;

                linkFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [fromCoords, toCoords]
                    },
                    properties: {
                        linkType: link.type,
                        systemType: link.systemType || '',
                        linkColor: result.color,
                        fromCall: link.from.call,
                        toCall: link.to.call,
                        fromFreq: link.from.frequency || link.from.output_frequency,
                        toFreq: link.to.frequency || link.to.output_frequency
                    }
                });
            }
        }
    });

    AppState.map.getSource('repeater-links').setData({
        type: 'FeatureCollection',
        features: linkFeatures
    });
}

function findRepeaterRenderCoords(repeater) {
    // Find the actual coordinates used for rendering this repeater
    if (!repeater.lat || !repeater.lon) return null;

    // Check if this repeater is part of a multi-repeater location
    const mappableRepeaters = AppState.filteredRepeaters.filter(r => r.lat && r.lon);
    const locationKey = `${repeater.lat.toFixed(6)},${repeater.lon.toFixed(6)}`;

    // Find all repeaters at this location
    const repeatersAtLocation = mappableRepeaters.filter(r => {
        const rKey = `${r.lat.toFixed(6)},${r.lon.toFixed(6)}`;
        return rKey === locationKey;
    });

    if (repeatersAtLocation.length === 1) {
        // Single repeater, use original coordinates
        return [repeater.lon, repeater.lat];
    } else {
        // Multiple repeaters, find the offset coordinates
        const repeaterIndex = repeatersAtLocation.findIndex(r =>
            r.call === repeater.call &&
            (r.frequency || r.output_frequency) === (repeater.frequency || repeater.output_frequency)
        );

        if (repeaterIndex !== -1) {
            // Calculate the same offset used in updateMapData
            const offsetDistance = 0.0001;
            const angle = (repeaterIndex / repeatersAtLocation.length) * 2 * Math.PI;
            const offsetLat = repeater.lat + (offsetDistance * Math.cos(angle));
            const offsetLon = repeater.lon + (offsetDistance * Math.sin(angle));
            return [offsetLon, offsetLat];
        }
    }

    // Fallback to original coordinates
    return [repeater.lon, repeater.lat];
}
