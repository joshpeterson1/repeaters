// Map-related functionality
import mapboxgl from 'mapbox-gl';
import { MAP_CENTER, MAP_DEFAULT_ZOOM, SYSTEM_TYPES, LINK_COLORS, SYSTEM_LINK_COLORS, MAP_STYLE_LIGHT } from './constants.js';
import { AppState } from './state.js';
import { getBand, getRepeaterId, escapeHTML } from './utils.js';
import { openDetailPanel } from './detail-panel.js';

// Public Mapbox client token — scoped by domain restrictions in the Mapbox dashboard.
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic29tYmVyanAiLCJhIjoiY21majlxOG5oMDJoejJscHdwMXQwbzF5OCJ9.d4gGG0AbXkQff-UZsdkuow';

// Read a CSS custom property from :root so map paint colors follow the active theme.
function token(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

export function initializeMap() {
    if (AppState.mapReady) return AppState.mapReady;

    let resolveMapReady;
    AppState.mapReady = new Promise(function(resolve) {
        resolveMapReady = resolve;
    });

    mapboxgl.accessToken = MAPBOX_TOKEN;

    AppState.map = new mapboxgl.Map({
        container: 'map',
        style: MAP_STYLE_LIGHT,
        center: MAP_CENTER,
        zoom: MAP_DEFAULT_ZOOM
    });

    AppState.map.on('load', function() {
        setupMapLayers();
        setupMapEvents();
        AppState.mapInitialized = true;
        resolveMapReady();
    });

    return AppState.mapReady;
}

// Extracted so dark mode can re-add layers after style switch
export function setupMapLayers() {
    AppState.map.addSource('utah-boundary', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-114.052962, 42.001567],
                    [-109.041058, 42.001567],
                    [-109.041058, 36.997968],
                    [-114.052962, 36.997968],
                    [-114.052962, 42.001567]
                ]]
            }
        }
    });

    AppState.map.addLayer({
        id: 'utah-boundary-fill', type: 'fill', source: 'utah-boundary',
        paint: { 'fill-color': token('--map-boundary-fill', '#0969da'), 'fill-opacity': 0.05 }
    });

    AppState.map.addLayer({
        id: 'utah-boundary-line', type: 'line', source: 'utah-boundary',
        paint: { 'line-color': token('--map-boundary-line', '#cf222e'), 'line-width': 2, 'line-opacity': 0.6, 'line-dasharray': [2, 2] }
    });

    AppState.map.addSource('repeaters', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true, clusterMaxZoom: 14, clusterRadius: 50
    });

    AppState.map.addLayer({
        id: 'clusters', type: 'circle', source: 'repeaters',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': ['step', ['get', 'point_count'],
                token('--map-cluster-low', '#56B4E9'), 10,
                token('--map-cluster-med', '#E69F00'), 30,
                token('--map-cluster-high', '#CC3311')],
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
            'circle-stroke-width': 2,
            'circle-stroke-color': token('--map-marker-stroke', '#ffffff')
        }
    });

    AppState.map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'repeaters',
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 13 },
        paint: { 'text-color': token('--map-cluster-text', '#0d1117') }
    });

    AppState.map.addLayer({
        id: 'unclustered-point', type: 'circle', source: 'repeaters',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': ['case',
                ['==', ['get', 'band'], '2m'], token('--map-marker-2m', '#E69F00'),
                ['==', ['get', 'band'], '70cm'], token('--map-marker-70cm', '#0072B2'),
                ['==', ['get', 'band'], '6m'], token('--map-marker-6m', '#009E73'),
                ['==', ['get', 'band'], '1.25m'], token('--map-marker-125m', '#CC79A7'),
                ['==', ['get', 'band'], '33cm'], token('--map-marker-33cm', '#F0E442'),
                ['==', ['get', 'band'], '23cm'], token('--map-marker-23cm', '#882255'),
                token('--map-marker-other', '#56B4E9')],
            'circle-radius': ['case', ['>', ['get', 'count'], 1], 10, 8],
            'circle-stroke-width': ['case', ['>', ['get', 'count'], 1], 3, 2],
            'circle-stroke-color': ['case',
                ['>', ['get', 'count'], 1], token('--map-marker-stroke-multi', '#0d1117'),
                token('--map-marker-stroke', '#ffffff')]
        }
    });

    AppState.map.addSource('highlighted-repeater', {
        type: 'geojson', data: { type: 'FeatureCollection', features: [] }
    });

    AppState.map.addLayer({
        id: 'highlighted-point', type: 'circle', source: 'highlighted-repeater',
        paint: {
            'circle-color': token('--map-highlight', '#cf222e'),
            'circle-radius': 15,
            'circle-stroke-width': 4,
            'circle-stroke-color': token('--map-highlight-stroke', '#ffffff'),
            'circle-opacity': 0.85
        }
    });

    AppState.map.addSource('repeater-links', {
        type: 'geojson', data: { type: 'FeatureCollection', features: [] }
    });

    AppState.map.addLayer({
        id: 'repeater-links-line', type: 'line', source: 'repeater-links',
        paint: {
            'line-color': ['get', 'linkColor'],
            'line-width': ['case', ['==', ['get', 'linkType'], 'intertie'], 1.5, 1.5],
            'line-dasharray': ['case', ['==', ['get', 'linkType'], 'intertie'], ['literal', [1, 0]], ['==', ['get', 'systemType'], SYSTEM_TYPES.CACTUS], ['literal', [1, 0]], ['==', ['get', 'linkType'], 'non-validated'], ['literal', [7, 7]], ['literal', [3, 3]]],
            'line-opacity': ['case', ['==', ['get', 'linkType'], 'non-validated'], 0.5, 0.7]
        }
    });
}

function setupMapEvents() {
    AppState.map.on('click', 'clusters', function(e) {
        e.originalEvent.stopPropagation();
        const features = AppState.map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        AppState.map.getSource('repeaters').getClusterExpansionZoom(clusterId, function(err, zoom) {
            if (err) return;
            AppState.map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
        });
    });

    AppState.map.on('click', 'unclustered-point', function(e) {
        e.originalEvent.stopPropagation();
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;
        const repeater = JSON.parse(props.data);
        const count = props.count || 1;
        const groupIndex = props.groupIndex || 0;
        const isMultiple = count > 1;
        new mapboxgl.Popup().setLngLat(coordinates).setHTML(createPopupContent(repeater, isMultiple, groupIndex, count)).addTo(AppState.map);
        openDetailPanel(repeater);
    });

    AppState.map.on('click', function(e) {
        const features = AppState.map.queryRenderedFeatures(e.point, { layers: ['unclustered-point', 'clusters'] });
        if (features.length === 0) clearRepeaterSelection();
    });

    AppState.map.on('mouseenter', 'clusters', () => { AppState.map.getCanvas().style.cursor = 'pointer'; });
    AppState.map.on('mouseleave', 'clusters', () => { AppState.map.getCanvas().style.cursor = ''; });
    AppState.map.on('mouseenter', 'unclustered-point', () => { AppState.map.getCanvas().style.cursor = 'pointer'; });
    AppState.map.on('mouseleave', 'unclustered-point', () => { AppState.map.getCanvas().style.cursor = ''; });
}

export function createPopupContent(repeater, isMultiple = false, groupIndex = 0, totalInGroup = 1) {
    let content = `<div class="popup-content">`;

    if (isMultiple) {
        content += `<div class="popup-multi-indicator">
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

export function updateMapData() {
    if (!AppState.map || !AppState.mapInitialized) return;

    const mappableRepeaters = AppState.filteredRepeaters.filter(repeater => repeater.lat && repeater.lon);
    const locationGroups = {};
    mappableRepeaters.forEach(repeater => {
        const key = `${repeater.lat.toFixed(6)},${repeater.lon.toFixed(6)}`;
        if (!locationGroups[key]) locationGroups[key] = [];
        locationGroups[key].push(repeater);
    });

    const features = [];
    Object.entries(locationGroups).forEach(([locationKey, repeaters]) => {
        const [lat, lon] = locationKey.split(',').map(parseFloat);
        if (repeaters.length === 1) {
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { band: getBand(repeaters[0].frequency), data: JSON.stringify(repeaters[0]), count: 1 } });
        } else {
            repeaters.forEach((repeater, index) => {
                const offsetDistance = 0.0001;
                const angle = (index / repeaters.length) * 2 * Math.PI;
                features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon + offsetDistance * Math.sin(angle), lat + offsetDistance * Math.cos(angle)] }, properties: { band: getBand(repeater.frequency), data: JSON.stringify(repeater), count: repeaters.length, originalLat: lat, originalLon: lon, groupIndex: index } });
            });
        }
    });

    AppState.map.getSource('repeaters').setData({ type: 'FeatureCollection', features });

    if (AppState.drawIntertieLinks || AppState.drawOtherLinks || AppState.drawNonValidatedLinks) {
        updateRepeaterLinks();
    } else {
        AppState.map.getSource('repeater-links').setData({ type: 'FeatureCollection', features: [] });
    }

    const mapStats = document.getElementById('mapStats');
    const mappableCount = mappableRepeaters.length;
    const locationCount = Object.keys(locationGroups).length;

    let linkCount = 0;
    if (AppState.drawIntertieLinks || AppState.drawOtherLinks || AppState.drawNonValidatedLinks) {
        const allLinksToRender = [...AppState.repeaterLinks];
        if (AppState.drawNonValidatedLinks) allLinksToRender.push(...AppState.nonValidatedLinks);
        linkCount = allLinksToRender.filter(link => {
            const fromVisible = AppState.filteredRepeaters.includes(link.from);
            const toVisible = AppState.filteredRepeaters.includes(link.to);
            const shouldDraw = (link.type === 'intertie' && AppState.drawIntertieLinks) || ((link.type === 'frequency' || link.type === 'system') && AppState.drawOtherLinks) || (link.type === 'non-validated' && AppState.drawNonValidatedLinks);
            return fromVisible && toVisible && shouldDraw;
        }).length;
    }

    mapStats.textContent = `Showing ${mappableCount} repeaters at ${locationCount} locations${linkCount > 0 ? `, ${linkCount} links` : ''} on map`;
}

export function fitMapToRepeaters() {
    if (!AppState.map || !AppState.mapInitialized) return;
    const mappableRepeaters = AppState.filteredRepeaters.filter(r => r.lat && r.lon);
    if (mappableRepeaters.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    mappableRepeaters.forEach(repeater => { bounds.extend([repeater.lon, repeater.lat]); });
    AppState.map.fitBounds(bounds, { padding: 50 });
}

export function centerMapOnUser() {
    if (!AppState.map || !AppState.userLocation) return;
    AppState.map.flyTo({ center: [AppState.userLocation.lon, AppState.userLocation.lat], zoom: 10 });

    if (!AppState.map.getSource('user-location')) {
        AppState.map.addSource('user-location', { type: 'geojson', data: { type: 'Point', coordinates: [AppState.userLocation.lon, AppState.userLocation.lat] } });
        AppState.map.addLayer({ id: 'user-location', type: 'circle', source: 'user-location', paint: {
            'circle-radius': 10,
            'circle-color': token('--map-user-location', '#1a7f37'),
            'circle-stroke-width': 3,
            'circle-stroke-color': token('--map-user-location-stroke', '#ffffff')
        } });
    }
}

export function selectRepeaterOnMap(repeater) {
    if (!AppState.map || !AppState.mapInitialized || !repeater.lat || !repeater.lon) return;
    AppState.selectedRepeater = repeater;
    AppState.map.getSource('highlighted-repeater').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [repeater.lon, repeater.lat] }, properties: {} }] });
    AppState.map.flyTo({ center: [repeater.lon, repeater.lat], zoom: Math.max(AppState.map.getZoom(), 12) });
    setTimeout(() => {
        new mapboxgl.Popup().setLngLat([repeater.lon, repeater.lat]).setHTML(createPopupContent(repeater)).addTo(AppState.map);
    }, 500);
}

export function clearRepeaterSelection() {
    AppState.selectedRepeater = null;
    if (AppState.map && AppState.mapInitialized && AppState.map.getSource('highlighted-repeater')) {
        AppState.map.getSource('highlighted-repeater').setData({ type: 'FeatureCollection', features: [] });
    }
    document.querySelectorAll('#repeaterTableBody tr').forEach(row => { row.classList.remove('selected'); });
}

export function getLinkColor(link, linkColorMap, colorIndex) {
    if (link.type === 'intertie') return { color: SYSTEM_LINK_COLORS.intertie, colorIndex };
    if (link.type === 'system') {
        const systemColors = {
            [SYSTEM_TYPES.CACTUS]: SYSTEM_LINK_COLORS.cactus,
            [SYSTEM_TYPES.BARC]: SYSTEM_LINK_COLORS.barc,
            [SYSTEM_TYPES.SDARC]: SYSTEM_LINK_COLORS.sdarc,
        };
        return { color: systemColors[link.systemType] || SYSTEM_LINK_COLORS.other, colorIndex };
    }
    const linkKey = [link.from.call, link.to.call].sort().join('-');
    // skip index 0 (reserved for intertie) for per-link auto coloring
    if (!linkColorMap.has(linkKey)) {
        const palette = LINK_COLORS.slice(1);
        linkColorMap.set(linkKey, palette[colorIndex % palette.length]);
        colorIndex++;
    }
    return { color: linkColorMap.get(linkKey), colorIndex };
}

export function updateRepeaterLinks() {
    if (!AppState.map || !AppState.mapInitialized) return;
    const linkFeatures = [];
    const linkColorMap = new Map();
    let colorIndex = 0;
    const allLinksToRender = [...AppState.repeaterLinks];
    if (AppState.drawNonValidatedLinks) allLinksToRender.push(...AppState.nonValidatedLinks);

    allLinksToRender.forEach(link => {
        const fromVisible = AppState.filteredRepeaters.includes(link.from);
        const toVisible = AppState.filteredRepeaters.includes(link.to);
        const shouldDraw = (link.type === 'intertie' && AppState.drawIntertieLinks) || ((link.type === 'frequency' || link.type === 'system') && AppState.drawOtherLinks) || (link.type === 'non-validated' && AppState.drawNonValidatedLinks);
        if (fromVisible && toVisible && shouldDraw) {
            const fromCoords = findRepeaterRenderCoords(link.from);
            const toCoords = findRepeaterRenderCoords(link.to);
            if (fromCoords && toCoords) {
                const result = getLinkColor(link, linkColorMap, colorIndex);
                colorIndex = result.colorIndex;
                linkFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [fromCoords, toCoords] }, properties: { linkType: link.type, systemType: link.systemType || '', linkColor: result.color, fromCall: link.from.call, toCall: link.to.call, fromFreq: link.from.frequency || link.from.output_frequency, toFreq: link.to.frequency || link.to.output_frequency } });
            }
        }
    });

    AppState.map.getSource('repeater-links').setData({ type: 'FeatureCollection', features: linkFeatures });
}

export function findRepeaterRenderCoords(repeater) {
    if (!repeater.lat || !repeater.lon) return null;
    const mappableRepeaters = AppState.filteredRepeaters.filter(r => r.lat && r.lon);
    const locationKey = `${repeater.lat.toFixed(6)},${repeater.lon.toFixed(6)}`;
    const repeatersAtLocation = mappableRepeaters.filter(r => `${r.lat.toFixed(6)},${r.lon.toFixed(6)}` === locationKey);

    if (repeatersAtLocation.length === 1) return [repeater.lon, repeater.lat];

    const repeaterIndex = repeatersAtLocation.findIndex(r => r.call === repeater.call && (r.frequency || r.output_frequency) === (repeater.frequency || repeater.output_frequency));
    if (repeaterIndex !== -1) {
        const offsetDistance = 0.0001;
        const angle = (repeaterIndex / repeatersAtLocation.length) * 2 * Math.PI;
        return [repeater.lon + offsetDistance * Math.sin(angle), repeater.lat + offsetDistance * Math.cos(angle)];
    }
    return [repeater.lon, repeater.lat];
}
