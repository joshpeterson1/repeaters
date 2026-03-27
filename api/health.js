import { list } from '@vercel/blob';

export default async function handler(req, res) {
    try {
        const { blobs } = await list({
            prefix: 'utah_repeaters.csv',
            limit: 1
        });

        if (blobs.length === 0) {
            return res.status(503).json({
                status: 'unhealthy',
                reason: 'no_data_file',
                message: 'No CSV blob found in store'
            });
        }

        const blob = blobs[0];
        const uploadedAt = new Date(blob.uploadedAt);
        const ageMs = Date.now() - uploadedAt.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);

        // Data older than 10 days is stale (weekly scrape + 3 day grace)
        const isStale = ageDays > 10;

        // Quick row count check
        const response = await fetch(blob.url);
        const csvText = await response.text();
        const lineCount = csvText.split('\n').filter(l => l.trim()).length - 1; // minus header

        // Utah has 200+ repeaters; <100 suggests truncation or parse failure
        const isCountHealthy = lineCount > 100;

        const status = (!isStale && isCountHealthy) ? 'healthy' : 'degraded';

        return res.status(status === 'healthy' ? 200 : 503).json({
            status,
            data_age_days: Math.round(ageDays * 10) / 10,
            repeater_count: lineCount,
            last_updated: blob.uploadedAt,
            checks: {
                data_freshness: isStale ? 'FAIL' : 'PASS',
                data_count: isCountHealthy ? 'PASS' : 'FAIL'
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}
