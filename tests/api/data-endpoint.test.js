import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
    list: vi.fn()
}));

import { list } from '@vercel/blob';

describe('data API handler', () => {
    let handler;

    beforeEach(async () => {
        vi.resetModules();

        const module = await import('../../api/data.js');
        handler = module.default;
    });

    it('returns 404 when no blob exists', async () => {
        list.mockResolvedValue({ blobs: [] });

        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns parsed repeater data', async () => {
        list.mockResolvedValue({
            blobs: [{
                url: 'https://example.com/test.csv',
                uploadedAt: '2025-03-20T00:00:00Z'
            }]
        });

        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({
                text: () => Promise.resolve(
                    '"call","frequency","lat","lon"\n"K7DAV","146.620","40.2338","-111.6585"\n'
                )
            })
        ));

        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const data = res.json.mock.calls[0][0];
        expect(data.repeaters).toHaveLength(1);
        expect(data.repeaters[0].call).toBe('K7DAV');
        expect(data.repeaters[0].lat).toBe(40.2338);
        expect(data.count).toBe(1);
        expect(data.data_version).toBe('v2');
    });

    it('handles server errors', async () => {
        list.mockRejectedValue(new Error('Blob storage error'));

        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
