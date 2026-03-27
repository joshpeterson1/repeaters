import { describe, it, expect } from 'vitest';
import { parseOffset, parseCTCSS, generateLabel, escapeXML, generateCSV, generateChirpCSV, generateKX3XML, generateKML } from '../../js/export.js';

describe('parseOffset', () => {
    it('returns 0 for empty/invalid input', () => {
        expect(parseOffset('')).toBe(0);
        expect(parseOffset(null)).toBe(0);
        expect(parseOffset('N/A')).toBe(0);
        expect(parseOffset(undefined)).toBe(0);
    });

    it('parses positive MHz offset', () => {
        expect(parseOffset('+0.6')).toBeCloseTo(0.6);
    });

    it('parses negative MHz offset', () => {
        expect(parseOffset('-0.6')).toBeCloseTo(-0.6);
    });

    it('converts kHz to MHz for values > 10', () => {
        expect(parseOffset('+600')).toBeCloseTo(0.6);
        expect(parseOffset('-600')).toBeCloseTo(-0.6);
    });

    it('handles offsets with units text', () => {
        expect(parseOffset('+0.6 MHz')).toBeCloseTo(0.6);
    });
});

describe('parseCTCSS', () => {
    it('returns 0 for empty/invalid input', () => {
        expect(parseCTCSS('')).toBe(0);
        expect(parseCTCSS(null)).toBe(0);
        expect(parseCTCSS('N/A')).toBe(0);
    });

    it('parses standard CTCSS tones', () => {
        expect(parseCTCSS('100.0')).toBeCloseTo(100.0);
        expect(parseCTCSS('131.8')).toBeCloseTo(131.8);
    });

    it('extracts number from text', () => {
        expect(parseCTCSS('PL 100.0')).toBeCloseTo(100.0);
    });
});

describe('generateLabel', () => {
    it('uses call sign', () => {
        expect(generateLabel({ call: 'K7DAV', frequency: '146.620' })).toBe('K7DAV');
    });

    it('truncates long call signs to 8 chars', () => {
        expect(generateLabel({ call: 'K7DAV/RPT' })).toBe('K7DAV/RP');
    });

    it('falls back to frequency', () => {
        expect(generateLabel({ frequency: '146.620' })).toBe('146.620');
    });

    it('falls back to RPT', () => {
        expect(generateLabel({})).toBe('RPT');
    });
});

describe('escapeXML', () => {
    it('escapes XML special characters', () => {
        expect(escapeXML('<tag>')).toBe('&lt;tag&gt;');
        expect(escapeXML('a & b')).toBe('a &amp; b');
        expect(escapeXML("it's")).toBe('it&apos;s');
        expect(escapeXML('"hi"')).toBe('&quot;hi&quot;');
    });
});

describe('generateCSV', () => {
    it('returns empty string for empty array', () => {
        expect(generateCSV([])).toBe('');
    });

    it('generates header row and data rows', () => {
        const repeaters = [
            { call: 'K7DAV', frequency: '146.620' }
        ];
        const csv = generateCSV(repeaters);
        expect(csv).toContain('"call"');
        expect(csv).toContain('"frequency"');
        expect(csv).toContain('"K7DAV"');
        expect(csv).toContain('"146.620"');
    });

    it('escapes quotes in values', () => {
        const repeaters = [
            { call: 'K7DAV', notes: 'He said "hello"' }
        ];
        const csv = generateCSV(repeaters);
        expect(csv).toContain('""hello""');
    });
});

describe('generateChirpCSV', () => {
    it('generates CHIRP header', () => {
        const csv = generateChirpCSV([]);
        expect(csv).toContain('Location,Name,Frequency');
    });

    it('generates valid CHIRP rows', () => {
        const repeaters = [
            { call: 'K7DAV', frequency: '146.620', offset: '-0.6', ctcss: '100.0', general_location: 'Provo' }
        ];
        const csv = generateChirpCSV(repeaters);
        expect(csv).toContain('146.620000');
        expect(csv).toContain('Tone');
        expect(csv).toContain('-');
    });

    it('skips repeaters without frequency', () => {
        const repeaters = [{ call: 'K7DAV' }];
        const csv = generateChirpCSV(repeaters);
        const lines = csv.split('\n').filter(l => l.trim());
        expect(lines.length).toBe(1); // header only
    });
});

describe('generateKX3XML', () => {
    it('generates valid XML structure', () => {
        const repeaters = [
            { call: 'K7DAV', frequency: '146.620', offset: '-0.6', ctcss: '100.0', general_location: 'Provo' }
        ];
        const xml = generateKX3XML(repeaters);
        expect(xml).toContain('<?xml version="1.0"');
        expect(xml).toContain('<K3ME');
        expect(xml).toContain('<FrequencyMemory>');
        expect(xml).toContain('<VfoA>146.62</VfoA>');
        expect(xml).toContain('<PLTone>100</PLTone>');
    });
});

describe('generateKML', () => {
    it('generates valid KML structure', () => {
        const repeaters = [
            { call: 'K7DAV', frequency: '146.620', lat: 40.23, lon: -111.66, general_location: 'Provo', site_name: '', sponsor: '', ctcss: '', offset: '', elevation: '', info: '' }
        ];
        const kml = generateKML(repeaters);
        expect(kml).toContain('<?xml version="1.0"');
        expect(kml).toContain('<kml');
        expect(kml).toContain('<Placemark>');
        expect(kml).toContain('-111.66,40.23,0');
    });

    it('skips repeaters without coordinates', () => {
        const repeaters = [
            { call: 'K7DAV', frequency: '146.620' }
        ];
        const kml = generateKML(repeaters);
        expect(kml).not.toContain('<Placemark>');
    });
});
