import requests
import csv
import re
from datetime import datetime

def scrape_raw_repeater_data():
    """
    Scrape repeater data from the Utah VHF Society raw data file.
    This is version 2.0 of the scraper that uses the raw CSV data.
    """
    raw_url = "https://utahvhfs.org/rptrraw.txt"
    
    print("Fetching raw repeater data from Utah VHF Society...")
    
    try:
        response = requests.get(raw_url)
        response.raise_for_status()
        
        # The response appears to be wrapped in HTML, so we need to extract the CSV content
        content = response.text
        
        # Find the CSV content between <pre> tags
        start_marker = '<pre style="word-wrap: break-word; white-space: pre-wrap;">'
        end_marker = '</pre>'
        
        start_idx = content.find(start_marker)
        end_idx = content.find(end_marker)
        
        if start_idx == -1 or end_idx == -1:
            raise ValueError("Could not find CSV data in the response")
        
        # Extract just the CSV content
        csv_content = content[start_idx + len(start_marker):end_idx].strip()
        
        # Split into lines and process as CSV
        lines = csv_content.split('\n')
        
        # Parse the CSV data
        repeaters = []
        csv_reader = csv.DictReader(lines)
        
        active_count = 0
        inactive_count = 0
        
        for row in csv_reader:
            # CRITICAL: Filter based on active state field (19th field)
            # Only include repeaters with 'Y' (active) or 'T' (temporarily off air)
            active_state = row.get('Active', '').strip().upper()
            
            if active_state not in ['Y', 'T']:
                inactive_count += 1
                continue  # Skip inactive repeaters
            
            active_count += 1
            
            # Clean and process the data
            repeater_data = process_raw_repeater_data(row)
            repeaters.append(repeater_data)
        
        print(f"Processed {len(lines)-1} total entries")
        print(f"Active/Temp off repeaters: {active_count}")
        print(f"Inactive repeaters filtered out: {inactive_count}")
        print(f"Final dataset: {len(repeaters)} repeaters")
        
        return repeaters
        
    except Exception as e:
        print(f"Error fetching raw data: {e}")
        return []

def process_raw_repeater_data(row):
    """
    Process a single row of raw repeater data into a clean format.
    """
    # Map the raw CSV fields to cleaner field names
    repeater = {}
    
    # Basic repeater information
    repeater['band'] = row.get('BAND', '').strip()
    repeater['output_frequency'] = row.get('OUTPUT', '').strip()
    repeater['input_frequency'] = row.get('INPUT', '').strip()
    repeater['state'] = row.get('STATE', '').strip()
    repeater['location'] = row.get('LOCATION', '').strip()
    repeater['call'] = row.get('CALLSIGN', '').strip()
    repeater['sponsor'] = row.get('SPONSOR', '').strip()
    repeater['source'] = row.get('SOURCE', '').strip()
    repeater['area'] = row.get('AREA', '').strip()
    
    # Operational details
    repeater['coordinated'] = row.get('COORDINATED', '').strip()
    repeater['open'] = row.get('OPEN', '').strip()
    repeater['closed'] = row.get('CLOSED', '').strip()
    repeater['ctcss_in'] = row.get('CTCSS_IN', '').strip()
    repeater['ctcss_out'] = row.get('CTCSS_OUT', '').strip()
    repeater['dcs'] = row.get('DCS', '').strip()
    repeater['dcs_code'] = row.get('DCS_CODE', '').strip()
    
    # Features
    repeater['autopatch'] = row.get('AUTOPATCH', '').strip()
    repeater['emergency_power'] = row.get('EMERG_POWER', '').strip()
    repeater['linked'] = row.get('LINKED', '').strip()
    repeater['link_freq'] = row.get('LINK_FREQ', '').strip()
    repeater['portable'] = row.get('PORTABLE', '').strip()
    repeater['wide_area'] = row.get('WIDE_AREA', '').strip()
    
    # Location data
    repeater['latitude'] = row.get('LATITUDE', '').strip()
    repeater['longitude'] = row.get('LONGITUDE', '').strip()
    repeater['latitude_dms'] = row.get('LATITUDE_DDMMSS', '').strip()
    repeater['longitude_dms'] = row.get('LONGITUDE_DDDMMSS', '').strip()
    repeater['elevation_feet'] = row.get('AMSL_FEET', '').strip()
    
    # Technical details
    repeater['tx_power'] = row.get('TX_POWER', '').strip()
    repeater['antenna_info'] = row.get('ANT_INFO', '').strip()
    repeater['erp'] = row.get('ERP', '').strip()
    
    # Status and metadata
    repeater['active'] = row.get('Active', '').strip()
    repeater['site_name'] = row.get('Site Name', '').strip()
    repeater['coverage_area'] = row.get('Coverage Area', '').strip()
    repeater['footnotes'] = row.get('Footnotes', '').strip()
    repeater['contact_email'] = row.get('Contact Email', '').strip()
    repeater['repeater_web_page'] = row.get('Repeater Web Page', '').strip()
    repeater['contact_phone'] = row.get('Contact Phone', '').strip()
    repeater['update_source'] = row.get('Update Source', '').strip()
    repeater['coord_notes'] = row.get('Coord. Notes', '').strip()
    repeater['mailing_address'] = row.get('Mailing Address', '').strip()
    
    # Additional processing
    repeater['notes'] = row.get('NOTES', '').strip()
    repeater['update_date'] = row.get('UPDATE', '').strip()
    repeater['coord_date'] = row.get('CORD_DATE', '').strip()
    repeater['use_type'] = row.get('USE', '').strip()
    
    # Parse coordinates to decimal degrees if available
    if repeater['latitude'] and repeater['longitude']:
        try:
            lat = float(repeater['latitude'])
            lon = float(repeater['longitude'])
            # Validate reasonable coordinates for Utah
            if 36.0 <= lat <= 42.5 and -114.5 <= lon <= -109.0:
                repeater['lat'] = lat
                repeater['lon'] = lon
        except (ValueError, TypeError):
            pass
    
    # Determine band from frequency
    if repeater['output_frequency']:
        try:
            freq = float(repeater['output_frequency'])
            repeater['frequency'] = repeater['output_frequency']
            repeater['band_name'] = get_band_name(freq)
        except (ValueError, TypeError):
            repeater['frequency'] = repeater['output_frequency']
    
    # Calculate offset if both input and output are available
    if repeater['input_frequency'] and repeater['output_frequency']:
        try:
            input_freq = float(repeater['input_frequency'])
            output_freq = float(repeater['output_frequency'])
            offset = input_freq - output_freq
            repeater['offset'] = f"{offset:+.4f}"
        except (ValueError, TypeError):
            pass
    
    return repeater

def get_band_name(frequency):
    """Convert frequency to band name"""
    if 28 <= frequency <= 29.7:
        return '10m'
    elif 50 <= frequency <= 54:
        return '6m'
    elif 144 <= frequency <= 148:
        return '2m'
    elif 222 <= frequency <= 225:
        return '1.25m'
    elif 420 <= frequency <= 450:
        return '70cm'
    elif 902 <= frequency <= 928:
        return '33cm'
    elif 1240 <= frequency <= 1300:
        return '23cm'
    elif frequency >= 10000:
        return 'Microwave'
    else:
        return 'Other'

def save_to_csv_v2(repeaters, filename='utah_repeaters_v2.csv'):
    """Save repeater data to CSV file (version 2.0)"""
    if not repeaters:
        print("No repeater data to save")
        return
    
    # Get all possible field names
    all_fields = set()
    for repeater in repeaters:
        all_fields.update(repeater.keys())
    
    # Define preferred field order
    preferred_order = [
        'call', 'frequency', 'output_frequency', 'input_frequency', 'offset',
        'band', 'band_name', 'location', 'site_name', 'sponsor', 'area',
        'ctcss_in', 'ctcss_out', 'dcs_code', 'lat', 'lon', 'latitude', 'longitude',
        'elevation_feet', 'active', 'open', 'closed', 'wide_area', 'linked',
        'emergency_power', 'coverage_area', 'notes', 'contact_email', 'repeater_web_page'
    ]
    
    # Create final field list with preferred fields first, then remaining fields
    fieldnames = []
    for field in preferred_order:
        if field in all_fields:
            fieldnames.append(field)
            all_fields.remove(field)
    
    # Add remaining fields
    fieldnames.extend(sorted(all_fields))
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repeaters)
    
    print(f"Saved {len(repeaters)} repeaters to {filename}")

def main():
    """Main function for the version 2.0 scraper"""
    print("Utah VHF Society Repeater Scraper v2.0")
    print("=" * 50)
    print("IMPORTANT: This scraper filters out inactive repeaters as recommended")
    print("by the Utah VHF Society. Only repeaters marked as 'Y' (active) or")
    print("'T' (temporarily off air) are included in the output.")
    print("=" * 50)
    
    # Scrape the raw data
    repeaters = scrape_raw_repeater_data()
    
    if not repeaters:
        print("No repeater data retrieved. Exiting.")
        return
    
    # Save to CSV
    save_to_csv_v2(repeaters)
    
    # Print summary statistics
    print("\nSummary Statistics:")
    print("-" * 30)
    
    # Count by band
    band_counts = {}
    active_counts = {'Y': 0, 'T': 0}
    
    for repeater in repeaters:
        band = repeater.get('band_name', 'Unknown')
        band_counts[band] = band_counts.get(band, 0) + 1
        
        active_status = repeater.get('active', '')
        if active_status in active_counts:
            active_counts[active_status] += 1
    
    print("Repeaters by band:")
    for band, count in sorted(band_counts.items()):
        print(f"  {band}: {count}")
    
    print(f"\nActive status:")
    print(f"  Active (Y): {active_counts['Y']}")
    print(f"  Temporarily off air (T): {active_counts['T']}")
    
    # Count repeaters with coordinates
    with_coords = sum(1 for r in repeaters if r.get('lat') and r.get('lon'))
    print(f"\nRepeaters with coordinates: {with_coords} ({with_coords/len(repeaters)*100:.1f}%)")
    
    print(f"\nTotal repeaters in output: {len(repeaters)}")

# Make functions available for import
__all__ = ['scrape_raw_repeater_data', 'process_raw_repeater_data', 'save_to_csv_v2']

if __name__ == "__main__":
    main()
