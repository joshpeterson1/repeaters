// Map-related functionality
let map = null;
let mapInitialized = false;
let selectedRepeater = null;
let highlightedMarker = null;
let repeaterLinks = [];
let drawIntertieLinks = false;
let drawOtherLinks = false;
let drawNonValidatedLinks = false;
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic29tYmVyanAiLCJhIjoiY21majlxOG5oMDJoejJscHdwMXQwbzF5OCJ9.d4gGG0AbXkQff-UZsdkuow';

// Initialize Mapbox map
function initializeMap() {
    if (mapInitialized) return;
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/outdoors-v12', // Good for radio coverage
        center: [-111.6946, 40.2338], // Utah County center (Provo area)
        zoom: 9
    });
    
    map.on('load', function() {
        // Add Utah boundary visualization
        map.addSource('utah-boundary', {
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
        map.addLayer({
            id: 'utah-boundary-fill',
            type: 'fill',
            source: 'utah-boundary',
            paint: {
                'fill-color': '#007bff',
                'fill-opacity': 0.05
            }
        });
        
        // Add boundary line
        map.addLayer({
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
        map.addSource('repeaters', {
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
        map.addLayer({
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
        map.addLayer({
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
        map.addLayer({
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
        map.addSource('highlighted-repeater', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
        
        map.addLayer({
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
        map.addSource('repeater-links', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
        
        map.addLayer({
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
                'line-opacity': 0.5,
                'line-dasharray': [
                    'case',
                    ['==', ['get', 'linkType'], 'intertie'], ['literal', [1, 0]], // Solid for intertie
                    ['==', ['get', 'systemType'], 'cactus'], ['literal', [1, 0]], // Solid for Cactus
                    ['==', ['get', 'linkType'], 'non-validated'], ['literal', [7, 7]], // Longer dashes for non-validated
                    ['literal', [3, 3]] // Dashed for other links
                ],
                'line-opacity': [
                    'case',
                    ['==', ['get', 'linkType'], 'non-validated'], 0.3, // More transparent for non-validated
                    0.5 // Normal opacity for other links
                ]
            }
        });
        
        // Click events for clusters
        map.on('click', 'clusters', function(e) {
            e.originalEvent.stopPropagation(); // Prevent map click event
            
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('repeaters').getClusterExpansionZoom(
                clusterId,
                function(err, zoom) {
                    if (err) return;
                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });
        
        // Click events for individual points
        map.on('click', 'unclustered-point', function(e) {
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
                .addTo(map);
        });
        
        // Click on map to deselect repeater
        map.on('click', function(e) {
            // Only deselect if we didn't click on a marker or cluster
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['unclustered-point', 'clusters']
            });
            
            if (features.length === 0) {
                clearRepeaterSelection();
            }
        });
        
        // Change cursor on hover
        map.on('mouseenter', 'clusters', function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters', function() {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'unclustered-point', function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'unclustered-point', function() {
            map.getCanvas().style.cursor = '';
        });
        
    });
    
    mapInitialized = true;
}

function createPopupContent(repeater, isMultiple = false, groupIndex = 0, totalInGroup = 1) {
    let content = `<div class="popup-content">`;
    
    if (isMultiple) {
        content += `<div style="background-color: #e9ecef; padding: 5px; margin-bottom: 10px; border-radius: 3px; font-size: 11px;">
            <strong>Multiple repeaters at this location (${groupIndex + 1} of ${totalInGroup})</strong>
        </div>`;
    }
    
    const repeaterId = getRepeaterId(repeater);
    const isFavorited = favorites.has(repeaterId);
    
    content += `
        <h4>
            <span class="favorite-star ${isFavorited ? 'favorited' : ''}" 
                  onclick="toggleFavoriteFromPopup('${repeaterId}', this)" 
                  title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">★</span>
            ${repeater.call || 'N/A'}
        </h4>
        <div class="frequency">${repeater.frequency || 'N/A'} MHz</div>
        <p><strong>Location:</strong> ${repeater.location || repeater.general_location || 'N/A'}</p>
        <p><strong>Site:</strong> ${repeater.site_name || 'N/A'}</p>
        <p><strong>Sponsor:</strong> ${repeater.sponsor || 'N/A'}</p>
        <p><strong>CTCSS:</strong> ${repeater.ctcss || 'N/A'}</p>
        <p><strong>Offset:</strong> ${repeater.offset || 'N/A'}</p>
        ${repeater.elevation ? `<p><strong>Elevation:</strong> ${repeater.elevation}</p>` : ''}
        ${repeater.distance ? `<p><strong>Distance:</strong> ${repeater.distance} miles</p>` : ''}
        ${repeater.internet_link ? `<p><strong>Internet:</strong> ${repeater.internet_link}</p>` : ''}
        ${repeater.info ? `<p><strong>Info:</strong> ${repeater.info}</p>` : ''}
    </div>`;
    
    return content;
}

function updateMapData() {
    if (!map || !mapInitialized) return;
    
    const mappableRepeaters = filteredRepeaters.filter(repeater => repeater.lat && repeater.lon);
    
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
    
    map.getSource('repeaters').setData({
        type: 'FeatureCollection',
        features: features
    });
    
    // Update links if any are enabled
    if (drawIntertieLinks || drawOtherLinks || drawNonValidatedLinks) {
        updateRepeaterLinks();
    } else {
        // Clear links
        map.getSource('repeater-links').setData({
            type: 'FeatureCollection',
            features: []
        });
    }
    
    // Update map stats
    const mapStats = document.getElementById('mapStats');
    const mappableCount = mappableRepeaters.length;
    const totalCount = filteredRepeaters.length;
    const locationCount = Object.keys(locationGroups).length;
    
    // Count the actual links that will be rendered
    let linkCount = 0;
    if (drawIntertieLinks || drawOtherLinks || drawNonValidatedLinks) {
        const allLinksToRender = [...repeaterLinks];
        if (drawNonValidatedLinks && window.nonValidatedLinks) {
            allLinksToRender.push(...window.nonValidatedLinks);
        }
        
        linkCount = allLinksToRender.filter(link => {
            // Only count links for visible repeaters
            const fromVisible = filteredRepeaters.includes(link.from);
            const toVisible = filteredRepeaters.includes(link.to);
            
            // Check if this link type should be drawn
            const shouldDrawLink = (link.type === 'intertie' && drawIntertieLinks) || 
                                 ((link.type === 'frequency' || link.type === 'system') && drawOtherLinks) ||
                                 (link.type === 'non-validated' && drawNonValidatedLinks);
            
            return fromVisible && toVisible && shouldDrawLink;
        }).length;
    }
    
    mapStats.textContent = `Showing ${mappableCount} repeaters at ${locationCount} locations${linkCount > 0 ? `, ${linkCount} links` : ''} on map`;
}

function fitMapToRepeaters() {
    if (!map || !mapInitialized) return;
    
    const mappableRepeaters = filteredRepeaters.filter(r => r.lat && r.lon);
    if (mappableRepeaters.length === 0) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    mappableRepeaters.forEach(repeater => {
        bounds.extend([repeater.lon, repeater.lat]);
    });
    
    map.fitBounds(bounds, { padding: 50 });
}

function centerMapOnUser() {
    if (!map || !userLocation) return;
    
    map.flyTo({
        center: [userLocation.lon, userLocation.lat],
        zoom: 10
    });
    
    // Add user location marker if it doesn't exist
    if (!map.getSource('user-location')) {
        map.addSource('user-location', {
            type: 'geojson',
            data: {
                type: 'Point',
                coordinates: [userLocation.lon, userLocation.lat]
            }
        });
        
        map.addLayer({
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
    if (!map || !mapInitialized || !repeater.lat || !repeater.lon) return;
    
    // Store selected repeater
    selectedRepeater = repeater;
    
    // Update highlighted repeater source
    map.getSource('highlighted-repeater').setData({
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
    map.flyTo({
        center: [repeater.lon, repeater.lat],
        zoom: Math.max(map.getZoom(), 12) // Zoom in if not already zoomed
    });
    
    // Show popup for the selected repeater
    setTimeout(() => {
        const popupContent = createPopupContent(repeater);
        new mapboxgl.Popup()
            .setLngLat([repeater.lon, repeater.lat])
            .setHTML(popupContent)
            .addTo(map);
    }, 500); // Delay to let the map finish flying
    
    // Selected repeater on map
}

function clearRepeaterSelection() {
    selectedRepeater = null;
    
    // Clear highlighted repeater - but only if map is initialized and source exists
    if (map && mapInitialized && map.getSource('highlighted-repeater')) {
        map.getSource('highlighted-repeater').setData({
            type: 'FeatureCollection',
            features: []
        });
    }
    
    // Remove selected class from all table rows
    document.querySelectorAll('#repeaterTableBody tr').forEach(row => {
        row.classList.remove('selected');
    });
}

function updateRepeaterLinks() {
    if (!map || !mapInitialized) return;
    
    const linkFeatures = [];
    const linkColorMap = new Map(); // Track colors for each link pair
    let colorIndex = 0;
    
    // Define a palette of distinct, high-visibility colors for links
    const linkColors = [
        '#FF0000', // Red (reserved for intertie)
        '#00AA00', // Dark Green (better than bright green)
        '#0066FF', // Bright Blue
        '#FF6600', // Orange
        '#AA00AA', // Purple/Magenta
        '#00AAAA', // Teal/Cyan
        '#FFAA00', // Amber (better than yellow)
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
        '#6666AA'  // Slate Blue
    ];
    
    // Combine regular repeater links with non-validated links if enabled
    const allLinksToRender = [...repeaterLinks];
    if (drawNonValidatedLinks && window.nonValidatedLinks) {
        allLinksToRender.push(...window.nonValidatedLinks);
    }
    
    allLinksToRender.forEach(link => {
        // Only show links for repeaters that are currently filtered/visible
        const fromVisible = filteredRepeaters.includes(link.from);
        const toVisible = filteredRepeaters.includes(link.to);
        
        // Check if this link type should be drawn
        const shouldDrawLink = (link.type === 'intertie' && drawIntertieLinks) || 
                             ((link.type === 'frequency' || link.type === 'system') && drawOtherLinks) ||
                             (link.type === 'non-validated' && drawNonValidatedLinks);
        
        if (fromVisible && toVisible && shouldDrawLink) {
            // Find the actual rendered coordinates for both repeaters
            const fromCoords = findRepeaterRenderCoords(link.from);
            const toCoords = findRepeaterRenderCoords(link.to);
            
            if (fromCoords && toCoords) {
                // Generate unique color for this link pair
                let linkColor;
                if (link.type === 'intertie') {
                    linkColor = '#FF0000'; // Red for intertie
                } else if (link.type === 'system') {
                    // Use consistent colors for each system type
                    const systemColors = {
                        'cactus': '#00FF00',   // Green for Cactus
                        'barc': '#0000FF',     // Blue for BARC
                        'sdarc': '#FF00FF'     // Magenta for SDARC
                    };
                    linkColor = systemColors[link.systemType] || '#FFA500'; // Orange fallback
                } else if (link.type === 'non-validated') {
                    // Non-validated links get unique colors from the palette
                    const linkKey = [link.from.call, link.to.call].sort().join('-');
                    if (!linkColorMap.has(linkKey)) {
                        linkColorMap.set(linkKey, linkColors[colorIndex % linkColors.length]);
                        colorIndex++;
                    }
                    linkColor = linkColorMap.get(linkKey);
                } else {
                    // Frequency-based links get unique colors
                    const linkKey = [link.from.call, link.to.call].sort().join('-');
                    if (!linkColorMap.has(linkKey)) {
                        linkColorMap.set(linkKey, linkColors[colorIndex % linkColors.length]);
                        colorIndex++;
                    }
                    linkColor = linkColorMap.get(linkKey);
                }
                
                linkFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [fromCoords, toCoords]
                    },
                    properties: {
                        linkType: link.type,
                        systemType: link.systemType || '', // Add systemType for styling
                        linkColor: linkColor,
                        fromCall: link.from.call,
                        toCall: link.to.call,
                        fromFreq: link.from.frequency || link.from.output_frequency,
                        toFreq: link.to.frequency || link.to.output_frequency
                    }
                });
            }
        }
    });
    
    map.getSource('repeater-links').setData({
        type: 'FeatureCollection',
        features: linkFeatures
    });
}

function findRepeaterRenderCoords(repeater) {
    // Find the actual coordinates used for rendering this repeater
    if (!repeater.lat || !repeater.lon) return null;
    
    // Check if this repeater is part of a multi-repeater location
    const mappableRepeaters = filteredRepeaters.filter(r => r.lat && r.lon);
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
