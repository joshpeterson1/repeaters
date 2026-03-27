import { describe, it, expect, beforeEach } from 'vitest';
import { getSystemType, extractLinkFrequencies, createPairKey, findRepeaterByFrequency, findAllRepeatersByFrequency } from '../../js/data.js';
import { AppState } from '../../js/state.js';

describe('getSystemType', () => {
    it('returns cactus for cactus text', () => {
        expect(getSystemType('cactus intertie')).toBe('cactus');
    });

    it('returns barc for barc text', () => {
        expect(getSystemType('barc system')).toBe('barc');
    });

    it('returns sdarc for sdarc text', () => {
        expect(getSystemType('sdarc link')).toBe('sdarc');
    });

    it('returns null for no match', () => {
        expect(getSystemType('146.620')).toBeNull();
        expect(getSystemType('')).toBeNull();
    });
});

describe('extractLinkFrequencies', () => {
    it('extracts decimal frequencies', () => {
        const repeater = { link_freq: '146.620' };
        const freqs = extractLinkFrequencies(repeater);
        expect(freqs).toContain(146.62);
    });

    it('extracts multiple frequencies', () => {
        const repeater = { link_freq: 'L146.620 L449.950' };
        const freqs = extractLinkFrequencies(repeater);
        expect(freqs).toContain(146.62);
        expect(freqs).toContain(449.95);
    });

    it('returns empty for no link freq', () => {
        expect(extractLinkFrequencies({})).toEqual([]);
        expect(extractLinkFrequencies({ link_freq: '' })).toEqual([]);
    });

    it('filters out invalid frequencies', () => {
        const repeater = { link_freq: '1.234' }; // Not in any valid band
        const freqs = extractLinkFrequencies(repeater);
        expect(freqs).toEqual([]);
    });

    it('deduplicates frequencies', () => {
        const repeater = { link_freq: 'L146.620 Link 146.620' };
        const freqs = extractLinkFrequencies(repeater);
        const count146 = freqs.filter(f => Math.abs(f - 146.62) < 0.001).length;
        expect(count146).toBe(1);
    });
});

describe('createPairKey', () => {
    it('creates sorted pair key', () => {
        const r1 = { call: 'K7DAV', frequency: '146.620' };
        const r2 = { call: 'W7SP', frequency: '449.950' };
        const key1 = createPairKey(r1, r2);
        const key2 = createPairKey(r2, r1);
        expect(key1).toBe(key2); // Order-independent
    });

    it('uses output_frequency as fallback', () => {
        const r1 = { call: 'K7DAV', output_frequency: '146.620' };
        const r2 = { call: 'W7SP', frequency: '449.950' };
        const key = createPairKey(r1, r2);
        expect(key).toContain('K7DAV-146.620');
    });
});

describe('findRepeaterByFrequency', () => {
    beforeEach(() => {
        AppState.allRepeaters = [
            { call: 'K7DAV', frequency: '146.620', output_frequency: '146.620', input_frequency: '146.020' },
            { call: 'W7SP', frequency: '449.950', output_frequency: '449.950', input_frequency: '444.950' },
        ];
    });

    it('finds by output frequency', () => {
        const result = findRepeaterByFrequency(146.620);
        expect(result.call).toBe('K7DAV');
    });

    it('finds by input frequency', () => {
        const result = findRepeaterByFrequency(146.020);
        expect(result.call).toBe('K7DAV');
    });

    it('returns undefined for no match', () => {
        expect(findRepeaterByFrequency(999.999)).toBeUndefined();
    });
});

describe('findAllRepeatersByFrequency', () => {
    beforeEach(() => {
        AppState.allRepeaters = [
            { call: 'K7DAV', frequency: '146.620', output_frequency: '146.620', input_frequency: '146.020' },
            { call: 'W7SP', frequency: '146.620', output_frequency: '146.620', input_frequency: '146.020' },
            { call: 'N7ABC', frequency: '449.950', output_frequency: '449.950', input_frequency: '444.950' },
        ];
    });

    it('finds all matching repeaters', () => {
        const results = findAllRepeatersByFrequency(146.620);
        expect(results.length).toBe(2);
    });

    it('returns empty array for no match', () => {
        expect(findAllRepeatersByFrequency(999.999)).toEqual([]);
    });
});
