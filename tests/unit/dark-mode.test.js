// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getThemePreference } from '../../js/dark-mode.js';

describe('getThemePreference', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    });

    it('returns stored light preference', () => {
        localStorage.setItem('utah-repeater-theme', 'light');
        expect(getThemePreference()).toBe('light');
    });

    it('returns stored dark preference', () => {
        localStorage.setItem('utah-repeater-theme', 'dark');
        expect(getThemePreference()).toBe('dark');
    });

    it('falls back to system dark preference', () => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
        expect(getThemePreference()).toBe('dark');
    });

    it('defaults to light when no preference', () => {
        expect(getThemePreference()).toBe('light');
    });

    it('ignores invalid stored values', () => {
        localStorage.setItem('utah-repeater-theme', 'invalid');
        expect(getThemePreference()).toBe('light');
    });
});
