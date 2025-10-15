from flask import Flask, render_template, jsonify, request, send_file
import json
import os
import csv
from datetime import datetime
from utah_repeater_scraper import scrape_repeater_list, save_to_csv
from utah_repeater_scraper_v2 import scrape_raw_repeater_data, save_to_csv_v2

app = Flask(__name__)
app.config['SECRET_KEY'] = 'utah_repeater_secret_key'

# Global variable to track scraping status
scraping_status = {
    'is_scraping': False
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scrape', methods=['POST'])
def start_scrape():
    global scraping_status
    
    if scraping_status['is_scraping']:
        return jsonify({'error': 'Scraping already in progress'}), 400
    
    try:
        scraping_status['is_scraping'] = True
        
        # Use the v2 scraper directly (synchronous)
        repeaters = scrape_raw_repeater_data()
        
        # Save to CSV
        save_to_csv_v2(repeaters, 'utah_repeaters.csv')
        
        return jsonify({
            'message': f'Successfully scraped {len(repeaters)} repeaters',
            'count': len(repeaters)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    finally:
        scraping_status['is_scraping'] = False

@app.route('/api/data')
def get_data():
    """Load and return the latest CSV data"""
    csv_file = 'utah_repeaters.csv'
    if not os.path.exists(csv_file):
        return jsonify({'error': 'No data file found. Please scrape data first.'}), 404
    
    repeaters = []
    data_version = 'v1'  # Default to v1
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Check if this is v2 data
                if row.get('scraper_version') == 'v2':
                    data_version = 'v2'
                    # v2 data already has lat/lon fields
                    if row.get('lat') and row.get('lon'):
                        try:
                            row['lat'] = float(row['lat'])
                            row['lon'] = float(row['lon'])
                        except (ValueError, TypeError):
                            pass
                else:
                    # v1 data - parse coordinates from the coordinates field
                    if row.get('coordinates') and row['coordinates'] != 'N/A':
                        import re
                        # Format: "Lat:40.6136° N.   (40°36'49"")Lon:112.1869° W. (112°11'13"")"
                        coord_match = re.search(r'Lat:(\d+\.\d+)°?\s*N\..*?Lon:(\d+\.\d+)°?\s*W', row['coordinates'])
                        if coord_match:
                            row['lat'] = float(coord_match.group(1))
                            row['lon'] = -float(coord_match.group(2))
                
                repeaters.append(row)
        
        return jsonify({
            'repeaters': repeaters,
            'count': len(repeaters),
            'data_version': data_version,
            'last_updated': datetime.fromtimestamp(os.path.getmtime(csv_file)).isoformat()
        })
    except Exception as e:
        return jsonify({'error': f'Error reading data file: {str(e)}'}), 500

@app.route('/download/csv')
def download_csv():
    """Download the current CSV file"""
    csv_file = 'utah_repeaters.csv'
    if os.path.exists(csv_file):
        return send_file(csv_file, as_attachment=True, download_name='utah_repeaters.csv')
    else:
        return jsonify({'error': 'No CSV file available'}), 404

# Removed WebSocket functions - no longer needed

if __name__ == '__main__':
    # This is only for local development
    app.run(debug=True, host='0.0.0.0', port=5000)
