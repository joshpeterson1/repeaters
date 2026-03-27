// Slide-out detail panel showing all repeater fields
import { AppState } from './state.js';
import { getRepeaterId, escapeHTML } from './utils.js';
import { pushFiltersToURL } from './url-state.js';

export function openDetailPanel(repeater) {
    const panel = document.getElementById('detailPanel');
    const content = document.getElementById('detailPanelContent');
    const title = document.getElementById('detailPanelTitle');

    AppState.detailRepeater = repeater;
    title.textContent = repeater.call || 'Repeater Details';
    content.innerHTML = createDetailContent(repeater);
    panel.classList.add('open');

    pushFiltersToURL();
}

export function closeDetailPanel() {
    const panel = document.getElementById('detailPanel');
    panel.classList.remove('open');
    AppState.detailRepeater = null;

    pushFiltersToURL();
}

export function openDetailFromURL() {
    const params = new URLSearchParams(window.location.search);
    const detailId = params.get('detail');
    if (!detailId) return;

    const repeater = AppState.allRepeaters.find(r => getRepeaterId(r) === detailId);
    if (repeater) openDetailPanel(repeater);
}

export function createDetailContent(repeater) {
    const h = escapeHTML;
    let html = '';

    // Header
    const repeaterId = getRepeaterId(repeater);
    const escapedId = h(repeaterId);
    const isFavorited = AppState.favorites.has(repeaterId);
    html += `<div class="detail-header-info">
        <span class="favorite-star ${isFavorited ? 'favorited' : ''}"
              onclick="toggleFavoriteFromPopup('${escapedId}', this)"
              title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">&#9733;</span>
        <span class="detail-call">${h(repeater.call || '')}</span>
        <span class="detail-freq">${h(repeater.frequency || '')} MHz</span>
        ${repeater.band_name ? `<span class="detail-band">${h(repeater.band_name)}</span>` : ''}
    </div>`;

    // Frequencies
    const freqItems = [];
    if (repeater.output_frequency) freqItems.push(['Output', `${h(repeater.output_frequency)} MHz`]);
    if (repeater.input_frequency) freqItems.push(['Input', `${h(repeater.input_frequency)} MHz`]);
    if (repeater.offset) freqItems.push(['Offset', `${h(repeater.offset)} MHz`]);
    if (freqItems.length) html += buildSection('Frequencies', freqItems);

    // Location
    const locItems = [];
    if (repeater.location || repeater.general_location) locItems.push(['City', h(repeater.location || repeater.general_location)]);
    if (repeater.site_name) locItems.push(['Site', h(repeater.site_name)]);
    if (repeater.area) locItems.push(['Area', h(repeater.area)]);
    if (repeater.coverage_area) locItems.push(['Coverage', h(repeater.coverage_area)]);
    if (repeater.lat && repeater.lon) locItems.push(['Coordinates', `${repeater.lat.toFixed(6)}, ${repeater.lon.toFixed(6)}`]);
    if (repeater.latitude_dms) locItems.push(['Lat (DMS)', h(repeater.latitude_dms)]);
    if (repeater.longitude_dms) locItems.push(['Lon (DMS)', h(repeater.longitude_dms)]);
    if (repeater.elevation_feet) locItems.push(['Elevation', `${h(repeater.elevation_feet)} ft`]);
    if (repeater.distance && repeater.distance !== 'N/A' && repeater.distance !== 'None') locItems.push(['Distance', `${h(repeater.distance)} mi`]);
    if (locItems.length) html += buildSection('Location', locItems);

    // Technical
    const techItems = [];
    if (repeater.ctcss_in) techItems.push(['CTCSS In', h(repeater.ctcss_in)]);
    if (repeater.ctcss_out) techItems.push(['CTCSS Out', h(repeater.ctcss_out)]);
    if (repeater.dcs === 'Y' && repeater.dcs_code) techItems.push(['DCS Code', h(repeater.dcs_code)]);
    else if (repeater.dcs === 'Y') techItems.push(['DCS', 'Yes']);
    if (repeater.tx_power) techItems.push(['TX Power', h(repeater.tx_power)]);
    if (repeater.erp) techItems.push(['ERP', `${h(repeater.erp)} W`]);
    if (repeater.antenna_info) techItems.push(['Antenna', h(repeater.antenna_info)]);
    if (techItems.length) html += buildSection('Technical', techItems);

    // Features (checkmark list)
    const features = [];
    if (repeater.open === 'Y') features.push('Open');
    if (repeater.closed === 'Y') features.push('Closed');
    if (repeater.coordinated === 'Y') features.push('Coordinated');
    if (repeater.autopatch === 'Y') features.push('Autopatch');
    if (repeater.races === 'Y') features.push('RACES');
    if (repeater.ares === 'Y') features.push('ARES');
    if (repeater.emergency_power === 'Y') features.push('Emergency Power');
    if (repeater.linked === 'Y') features.push('Linked');
    if (repeater.wide_area === 'Y') features.push('Wide Coverage');
    if (repeater.portable === 'Y') features.push('Portable');
    if (features.length) {
        html += `<div class="detail-section">
            <h4>Features</h4>
            <div class="detail-features">${features.map(f => `<span class="detail-feature-tag">${h(f)}</span>`).join('')}</div>
        </div>`;
    }

    // Internet & Links
    const netItems = [];
    if (repeater.internet_link) netItems.push(['Internet', h(repeater.internet_link)]);
    if (repeater.link_freq) netItems.push(['Link Freq', h(repeater.link_freq)]);
    if (repeater.repeater_web_page) netItems.push(['Web Page', `<a href="${h(repeater.repeater_web_page)}" target="_blank" rel="noopener">${h(repeater.repeater_web_page)}</a>`]);
    if (netItems.length) html += buildSection('Internet & Links', netItems);

    // Contact
    const contactItems = [];
    if (repeater.sponsor) contactItems.push(['Sponsor', h(repeater.sponsor)]);
    if (repeater.contact_email) contactItems.push(['Email', `<a href="mailto:${h(repeater.contact_email)}">${h(repeater.contact_email)}</a>`]);
    if (repeater.contact_phone) contactItems.push(['Phone', h(repeater.contact_phone)]);
    if (repeater.mailing_address) contactItems.push(['Address', h(repeater.mailing_address)]);
    if (contactItems.length) html += buildSection('Contact', contactItems);

    // Administrative
    const adminItems = [];
    if (repeater.update_date) adminItems.push(['Updated', h(repeater.update_date)]);
    if (repeater.coord_date) adminItems.push(['Coord Date', h(repeater.coord_date)]);
    if (repeater.update_source) adminItems.push(['Source', h(repeater.update_source)]);
    if (repeater.coord_notes) adminItems.push(['Coord Notes', h(repeater.coord_notes)]);
    if (repeater.use_type) adminItems.push(['Use Type', h(repeater.use_type)]);
    if (repeater.footnotes) adminItems.push(['Footnotes', h(repeater.footnotes)]);
    if (repeater.notes) adminItems.push(['Notes', h(repeater.notes)]);
    if (adminItems.length) html += buildSection('Administrative', adminItems);

    return html;
}

function buildSection(title, items) {
    const rows = items.map(([label, value]) =>
        `<dt>${label}</dt><dd>${value}</dd>`
    ).join('');
    return `<div class="detail-section"><h4>${title}</h4><dl>${rows}</dl></div>`;
}
