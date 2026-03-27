import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vercel/blob before importing handler
vi.mock('@vercel/blob', () => ({
    put: vi.fn(() => Promise.resolve({ url: 'https://example.com/test.csv' })),
    list: vi.fn(() => Promise.resolve({ blobs: [] }))
}));

describe('cron-scrape handler', () => {
    let handler;

    beforeEach(async () => {
        vi.resetModules();

        // Set env var
        process.env.CRON_SECRET = 'test-secret';

        // Mock fetch for UVHFS data
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                text: () => Promise.resolve(
                    '<pre style="word-wrap: break-word; white-space: pre-wrap;">' +
                    'BAND,OUTPUT,INPUT,STATE,LOCATION,CALLSIGN,SPONSOR,SOURCE,AREA,COORDINATED,OPEN,CLOSED,CTCSS_IN,CTCSS_OUT,DCS,DCS_CODE,AUTOPATCH,EMERG_POWER,LINKED,LINK_FREQ,PORTABLE,WIDE_AREA,RACES,ARES,INTERNET,INTERNET_LINK,LATITUDE,LONGITUDE,LATITUDE_DDMMSS,LONGITUDE_DDDMMSS,AMSL_FEET,TX_POWER,ANT_INFO,ERP,Active,"Site Name","Coverage Area",Footnotes,"Contact Email","Repeater Web Page","Contact Phone","Update Source","Coord. Notes","Mailing Address",NOTES,UPDATE,CORD_DATE,USE\n' +
                    '"2m","146.620","146.020","UT","Provo","K7DAV","UARC","UVHFS","Utah County","Y","Y","","100.0","100.0","","","","Y","","","","Y","Y","","","","40.2338","-111.6585","","","5800","50","","","Y","Provo Peak","Utah Valley","","test@test.com","","","","","","Test notes","2024-01","","O"\n' +
                    '"2m","147.120","147.720","UT","Salt Lake","W7SP","UARC","UVHFS","Salt Lake","Y","Y","","100.0","100.0","","","","Y","","","","Y","Y","","","","40.7608","-111.8910","","","6000","100","","","Y","Farnsworth Peak","Salt Lake Valley","","","","","","","","","2024-01","","O"\n' +
                    '"2m","145.000","145.600","UT","Inactive","N7OFF","Club","UVHFS","Utah","Y","","","","","","","","","","","","","","","","","","","","","","","","","N","","","","","","","","","","","","",""' +
                    '\n</pre>'
                )
            })
        ));

        const module = await import('../../api/cron-scrape.js');
        handler = module.default;
    });

    it('rejects unauthorized requests', async () => {
        const req = { headers: { authorization: 'Bearer wrong' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('processes and saves repeater data', async () => {
        const req = { headers: { authorization: 'Bearer test-secret' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.count).toBeGreaterThan(0);
    });

    it('filters out inactive repeaters', async () => {
        const req = { headers: { authorization: 'Bearer test-secret' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        await handler(req, res);

        const response = res.json.mock.calls[0][0];
        // Only 2 active repeaters (Active=Y), the N7OFF one has Active=N
        expect(response.count).toBe(2);
    });
});
