// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { getGeolocationErrorMessage } from '../../js/geolocation.js';

describe('getGeolocationErrorMessage', () => {
    it('returns permission denied message for code 1', () => {
        expect(getGeolocationErrorMessage(1)).toContain('denied');
    });

    it('returns unavailable message for code 2', () => {
        expect(getGeolocationErrorMessage(2)).toContain('unavailable');
    });

    it('returns timeout message for code 3', () => {
        expect(getGeolocationErrorMessage(3)).toContain('timed out');
    });

    it('returns unknown error for other codes', () => {
        expect(getGeolocationErrorMessage(99)).toContain('unknown');
    });
});
