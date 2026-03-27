import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBand, calculateDistance, getRepeaterId, formatInternetLink, escapeHTML } from '../../js/utils.js';

describe('getBand', () => {
    it('returns 2m for 144-148 MHz', () => {
        expect(getBand('146.620')).toBe('2m');
        expect(getBand('144.000')).toBe('2m');
        expect(getBand('147.999')).toBe('2m');
    });

    it('returns 70cm for 420-450 MHz', () => {
        expect(getBand('449.950')).toBe('70cm');
        expect(getBand('420.000')).toBe('70cm');
    });

    it('returns 6m for 50-54 MHz', () => {
        expect(getBand('52.525')).toBe('6m');
    });

    it('returns 1.25m for 222-225 MHz', () => {
        expect(getBand('224.100')).toBe('1.25m');
    });

    it('returns 33cm for 902-928 MHz', () => {
        expect(getBand('927.500')).toBe('33cm');
    });

    it('returns 23cm for 1240-1300 MHz', () => {
        expect(getBand('1290.000')).toBe('23cm');
    });

    it('returns other for out-of-range frequencies', () => {
        expect(getBand('14.225')).toBe('other');
        expect(getBand('0')).toBe('other');
        expect(getBand('')).toBe('other');
    });

    it('handles numeric input', () => {
        expect(getBand(146.62)).toBe('2m');
    });
});

describe('calculateDistance', () => {
    it('returns 0 for same point', () => {
        expect(calculateDistance(40.0, -111.0, 40.0, -111.0)).toBe(0);
    });

    it('calculates distance between two Utah points', () => {
        // SLC to Provo ~45 miles
        const distance = calculateDistance(40.7608, -111.8910, 40.2338, -111.6585);
        expect(distance).toBeGreaterThan(35);
        expect(distance).toBeLessThan(45);
    });

    it('returns a positive number', () => {
        const distance = calculateDistance(40.0, -111.0, 41.0, -112.0);
        expect(distance).toBeGreaterThan(0);
    });
});

describe('getRepeaterId', () => {
    it('creates ID from call and frequency', () => {
        expect(getRepeaterId({ call: 'K7DAV', frequency: '146.620' })).toBe('K7DAV-146.620');
    });

    it('handles missing fields', () => {
        expect(getRepeaterId({ call: 'K7DAV', frequency: undefined })).toBe('K7DAV-undefined');
    });
});

describe('formatInternetLink', () => {
    it('returns empty string for empty input', () => {
        expect(formatInternetLink('')).toBe('');
        expect(formatInternetLink(null)).toBe('');
        expect(formatInternetLink(undefined)).toBe('');
    });

    it('formats Echolink nodes', () => {
        expect(formatInternetLink('E12345')).toBe('Echo 12345');
    });

    it('formats IRLP nodes', () => {
        expect(formatInternetLink('I9999')).toBe('IRLP 9999');
    });

    it('formats AllStar nodes', () => {
        expect(formatInternetLink('A54321')).toBe('AllStar 54321');
    });

    it('formats DMR', () => {
        expect(formatInternetLink('DMR')).toBe('DMR');
    });

    it('formats D-Star', () => {
        expect(formatInternetLink('D-Star')).toBe('D-Star');
        expect(formatInternetLink('D Star')).toBe('D-Star');
    });

    it('handles comma-separated values', () => {
        const result = formatInternetLink('E12345,I9999');
        expect(result).toBe('Echo 12345, IRLP 9999');
    });

    it('skips standalone letters', () => {
        expect(formatInternetLink('E')).toBe('');
        expect(formatInternetLink('I')).toBe('');
    });
});

describe('escapeHTML', () => {
    it('escapes ampersands', () => {
        expect(escapeHTML('a & b')).toBe('a &amp; b');
    });

    it('escapes angle brackets', () => {
        expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes quotes', () => {
        expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
        expect(escapeHTML("it's")).toBe("it&#39;s");
    });

    it('handles null and undefined', () => {
        expect(escapeHTML(null)).toBe('');
        expect(escapeHTML(undefined)).toBe('');
    });

    it('converts numbers to string', () => {
        expect(escapeHTML(42)).toBe('42');
    });
});
