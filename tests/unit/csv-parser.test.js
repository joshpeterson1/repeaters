import { describe, it, expect } from 'vitest';
import { parseCSVLine } from '../../api/utils.js';

describe('parseCSVLine', () => {
    it('parses simple comma-separated values', () => {
        expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('handles quoted fields', () => {
        expect(parseCSVLine('"hello","world"')).toEqual(['hello', 'world']);
    });

    it('handles commas inside quotes', () => {
        expect(parseCSVLine('"hello, world",other')).toEqual(['hello, world', 'other']);
    });

    it('handles escaped quotes (double quotes)', () => {
        expect(parseCSVLine('"he said ""hi""",other')).toEqual(['he said "hi"', 'other']);
    });

    it('handles empty fields', () => {
        expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c']);
    });

    it('handles single field', () => {
        expect(parseCSVLine('hello')).toEqual(['hello']);
    });

    it('handles empty input', () => {
        expect(parseCSVLine('')).toEqual(['']);
    });

    it('handles mixed quoted and unquoted', () => {
        expect(parseCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
    });
});
