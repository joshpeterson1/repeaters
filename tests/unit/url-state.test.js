import { describe, it, expect } from 'vitest';
import { serializeFilters, deserializeFilters } from '../../js/url-state.js';

// Note: serializeFilters reads from DOM, so we test deserializeFilters (pure) directly
// and test round-trip logic

describe('deserializeFilters', () => {
    it('parses text params', () => {
        const state = deserializeFilters('?zip=84101&call=K7DAV');
        expect(state.zipCode).toBe('84101');
        expect(state.callFilter).toBe('K7DAV');
    });

    it('parses select params with validation', () => {
        const state = deserializeFilters('?dist=25');
        expect(state.distance).toBe('25');
    });

    it('rejects invalid select values', () => {
        const state = deserializeFilters('?dist=999');
        expect(state.distance).toBeUndefined();
    });

    it('parses multi-select params', () => {
        const state = deserializeFilters('?band=2m,70cm');
        expect(state.bandFilter).toEqual(['2m', '70cm']);
    });

    it('filters invalid band values', () => {
        const state = deserializeFilters('?band=2m,invalid,70cm');
        expect(state.bandFilter).toEqual(['2m', '70cm']);
    });

    it('parses checkbox params', () => {
        const state = deserializeFilters('?wide=1&closed=1');
        expect(state.wideCoverageFilter).toBe(true);
        expect(state.showClosedFilter).toBe(true);
    });

    it('parses view param', () => {
        const state = deserializeFilters('?view=map');
        expect(state._view).toBe('map');
    });

    it('rejects invalid view values', () => {
        const state = deserializeFilters('?view=invalid');
        expect(state._view).toBeUndefined();
    });

    it('ignores unknown params', () => {
        const state = deserializeFilters('?foo=bar&zip=84101');
        expect(state.zipCode).toBe('84101');
        expect(state.foo).toBeUndefined();
    });

    it('returns empty object for no params', () => {
        const state = deserializeFilters('');
        expect(Object.keys(state).length).toBe(0);
    });

    it('handles all checkbox types', () => {
        const state = deserializeFilters('?ilinks=1&olinks=1&nvlinks=1&favs=1');
        expect(state.drawIntertieLinksFilter).toBe(true);
        expect(state.drawOtherLinksFilter).toBe(true);
        expect(state.drawNonValidatedLinksFilter).toBe(true);
        expect(state.showFavoritesOnly).toBe(true);
    });
});
