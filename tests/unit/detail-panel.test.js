// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createDetailContent } from '../../js/detail-panel.js';

const fullRepeater = {
    call: 'K7DAV',
    frequency: '146.620',
    output_frequency: '146.620',
    input_frequency: '146.020',
    offset: '-0.6000',
    band_name: '2m',
    location: 'Provo',
    site_name: 'Provo Peak',
    area: 'Utah County',
    coverage_area: 'Utah Valley',
    lat: 40.2338,
    lon: -111.6585,
    latitude_dms: '40 14 02',
    longitude_dms: '111 39 31',
    elevation_feet: '5800',
    ctcss_in: '100.0',
    ctcss_out: '100.0',
    dcs: 'N',
    dcs_code: '',
    tx_power: '50',
    erp: '25',
    antenna_info: '6 dBd omni',
    open: 'Y',
    closed: '',
    coordinated: 'Y',
    autopatch: 'Y',
    races: 'Y',
    ares: 'Y',
    emergency_power: 'Y',
    linked: '',
    wide_area: 'Y',
    portable: '',
    internet_link: 'Echo 12345',
    link_freq: '449.950',
    repeater_web_page: 'https://example.com',
    sponsor: 'UARC',
    contact_email: 'test@test.com',
    contact_phone: '801-555-1234',
    mailing_address: '123 Main St',
    update_date: '2024-01',
    coord_date: '2023-06',
    update_source: 'UVHFS',
    coord_notes: 'Test notes',
    use_type: 'O',
    footnotes: 'Test footnotes',
    notes: 'Test repeater notes',
    distance: '12.5',
};

const minimalRepeater = {
    call: 'W7SP',
    frequency: '147.120',
};

describe('createDetailContent', () => {
    it('renders all sections for full repeater', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('K7DAV');
        expect(html).toContain('146.620');
        expect(html).toContain('Frequencies');
        expect(html).toContain('Location');
        expect(html).toContain('Technical');
        expect(html).toContain('Features');
        expect(html).toContain('Internet');
        expect(html).toContain('Contact');
        expect(html).toContain('Administrative');
    });

    it('renders frequency details', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('146.020');
        expect(html).toContain('-0.6000');
    });

    it('renders location details with coordinates', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('Provo');
        expect(html).toContain('Provo Peak');
        expect(html).toContain('40.233800');
        expect(html).toContain('5800');
    });

    it('renders technical details', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('100.0');
        expect(html).toContain('50');
        expect(html).toContain('6 dBd omni');
    });

    it('renders feature tags', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('RACES');
        expect(html).toContain('ARES');
        expect(html).toContain('Autopatch');
        expect(html).toContain('Emergency Power');
        expect(html).toContain('Wide Coverage');
    });

    it('renders contact info with mailto link', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('mailto:test@test.com');
        expect(html).toContain('UARC');
    });

    it('renders web page as clickable link', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('target="_blank"');
    });

    it('omits empty sections for minimal repeater', () => {
        const html = createDetailContent(minimalRepeater);
        expect(html).toContain('W7SP');
        expect(html).toContain('147.120');
        expect(html).not.toContain('Location');
        expect(html).not.toContain('Technical');
        expect(html).not.toContain('Features');
        expect(html).not.toContain('Contact');
        expect(html).not.toContain('Administrative');
    });

    it('escapes HTML in field values', () => {
        const xssRepeater = {
            call: '<b>bold</b>',
            frequency: '146.620',
            location: 'Test & "quoted"',
        };
        const html = createDetailContent(xssRepeater);
        // Call sign should be escaped in display
        expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
        // Location should be escaped
        expect(html).toContain('Test &amp; &quot;quoted&quot;');
    });

    it('renders distance when available', () => {
        const html = createDetailContent(fullRepeater);
        expect(html).toContain('12.5 mi');
    });
});
