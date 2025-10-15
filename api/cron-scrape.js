import { put } from '@vercel/blob';
import { scrape_raw_repeater_data, save_to_csv_v2 } from '../utah_repeater_scraper_v2.js';

export default async function handler(req, res) {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting weekly repeater data scrape...');
    
    // Scrape the data
    const repeaters = await scrape_raw_repeater_data();
    
    // Convert to CSV format
    const csvData = await save_to_csv_v2(repeaters);
    
    // Upload to Vercel Blob
    const blob = await put('utah_repeaters.csv', csvData, {
      access: 'public',
      contentType: 'text/csv',
    });
    
    console.log(`Successfully scraped ${repeaters.length} repeaters and saved to blob`);
    
    return res.status(200).json({
      success: true,
      count: repeaters.length,
      blobUrl: blob.url,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cron scrape failed:', error);
    return res.status(500).json({
      error: 'Scraping failed',
      message: error.message
    });
  }
}
