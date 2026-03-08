import { list } from '@vercel/blob';
import { parseCSVLine } from './utils.js';

export default async function handler(req, res) {
  try {
    // Get the latest CSV from Vercel Blob
    const { blobs } = await list({
      prefix: 'utah_repeaters.csv',
      limit: 1
    });
    
    if (blobs.length === 0) {
      return res.status(404).json({
        error: 'No data file found. Data will be available after the next scheduled update.'
      });
    }
    
    const blob = blobs[0];
    
    // Fetch the CSV content
    const response = await fetch(blob.url);
    const csvText = await response.text();
    
    // Parse CSV to JSON
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const repeaters = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = parseCSVLine(lines[i]);
        const repeater = {};
        
        headers.forEach((header, index) => {
          repeater[header] = values[index] || '';
        });
        
        // Convert coordinates to numbers
        if (repeater.lat && repeater.lon) {
          try {
            repeater.lat = parseFloat(repeater.lat);
            repeater.lon = parseFloat(repeater.lon);
          } catch (e) {
            // Keep as strings if conversion fails
          }
        }
        
        repeaters.push(repeater);
      }
    }
    
    return res.status(200).json({
      repeaters: repeaters,
      count: repeaters.length,
      data_version: 'v2',
      last_updated: blob.uploadedAt
    });
    
  } catch (error) {
    console.error('Error loading data:', error);
    return res.status(500).json({
      error: 'Error loading data',
      message: error.message
    });
  }
}
