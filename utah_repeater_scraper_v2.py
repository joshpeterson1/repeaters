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
        
        content = response.text
        
        # Try to find CSV content between <pre> tags first
        start_marker = '<pre style="word-wrap: break-word; white-space: pre-wrap;">'
        end_marker = '</pre>'
        
        start_idx = content.find(start_marker)
        end_idx = content.find(end_marker)
        
        if start_idx != -1 and end_idx != -1:
            # Found pre tags, extract content
            csv_content = content[start_idx + len(start_marker):end_idx].strip()
        else:
            # Try alternative pre tag format
            alt_start = '<pre>'
            alt_end = '</pre>'
            start_idx = content.find(alt_start)
            end_idx = content.find(alt_end)
            
            if start_idx != -1 and end_idx != -1:
                csv_content = content[start_idx + len(alt_start):end_idx].strip()
            else:
                # If no pre tags found, look for CSV header directly
                if 'BAND,OUTPUT,INPUT,STATE,LOCATION,CALLSIGN' in content:
                    # Find the start of CSV data
                    csv_start = content.find('BAND,OUTPUT,INPUT,STATE,LOCATION,CALLSIGN')
                    if csv_start != -1:
                        # Take everything from the header onwards
                        csv_content = content[csv_start:].strip()
                        # Remove any trailing HTML if present
                        if '</body>' in csv_content:
                            csv_content = csv_content[:csv_content.find('</body>')].strip()
                        if '</html>' in csv_content:
                            csv_content = csv_content[:csv_content.find('</html>')].strip()
                    else:
                        raise ValueError("Could not find CSV header in the response")
                else:
                    raise ValueError("Could not find CSV data in the response")
        
        # Clean up the CSV content
        csv_content = csv_content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Split into lines and process as CSV
        lines = csv_content.split('\n')
        
        # Remove empty lines
        lines = [line for line in lines if line.strip()]
        
        if len(lines) < 2:
            raise ValueError("Not enough CSV data found")
        
        print(f"Found CSV data with {len(lines)} lines")
        
        # Parse the CSV data
        repeaters = []
        csv_reader = csv.DictReader(lines)
        
        active_count = 0
        inactive_count = 0
        
        for row in csv_reader:
            # CRITICAL: Filter based on active state field (19th field)
            # Only include repeaters with 'Y' (active) or 'T' (temporarily off air)
            active_state_raw = row.get('Active', '')
            active_state = active_state_raw.strip().upper() if active_state_raw is not None else ''
            
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
        print("Response content preview:")
        try:
            print(response.text[:500] + "..." if len(response.text) > 500 else response.text)
        except:
            print("Could not display response content")
        return []

def process_raw_repeater_data(row):
    """
    Process a single row of raw repeater data into a clean format.
    """
    # Helper function to safely get and strip values
    def safe_get(key, default=''):
        value = row.get(key, default)
        return value.strip() if value is not None else default
    
    # Map the raw CSV fields to cleaner field names
    repeater = {}
    
    # Basic repeater information
    repeater['band'] = safe_get('BAND')
    repeater['output_frequency'] = safe_get('OUTPUT')
    repeater['input_frequency'] = safe_get('INPUT')
    repeater['state'] = safe_get('STATE')
    repeater['location'] = safe_get('LOCATION')
    repeater['call'] = safe_get('CALLSIGN')
    repeater['sponsor'] = safe_get('SPONSOR')
    repeater['source'] = safe_get('SOURCE')
    repeater['area'] = safe_get('AREA')
    
    # Operational details
    repeater['coordinated'] = safe_get('COORDINATED')
    repeater['open'] = safe_get('OPEN')
    repeater['closed'] = safe_get('CLOSED')
    repeater['ctcss_in'] = safe_get('CTCSS_IN')
    repeater['ctcss_out'] = safe_get('CTCSS_OUT')
    repeater['dcs'] = safe_get('DCS')
    repeater['dcs_code'] = safe_get('DCS_CODE')
    
    # Features
    repeater['autopatch'] = safe_get('AUTOPATCH')
    repeater['emergency_power'] = safe_get('EMERG_POWER')
    repeater['linked'] = safe_get('LINKED')
    repeater['link_freq'] = safe_get('LINK_FREQ')
    repeater['portable'] = safe_get('PORTABLE')
    repeater['wide_area'] = safe_get('WIDE_AREA')
    
    # Location data
    repeater['latitude'] = safe_get('LATITUDE')
    repeater['longitude'] = safe_get('LONGITUDE')
    repeater['latitude_dms'] = safe_get('LATITUDE_DDMMSS')
    repeater['longitude_dms'] = safe_get('LONGITUDE_DDDMMSS')
    repeater['elevation_feet'] = safe_get('AMSL_FEET')
    
    # Technical details
    repeater['tx_power'] = safe_get('TX_POWER')
    repeater['antenna_info'] = safe_get('ANT_INFO')
    repeater['erp'] = safe_get('ERP')
    
    # Status and metadata
    repeater['active'] = safe_get('Active')
    repeater['site_name'] = safe_get('Site Name')
    repeater['coverage_area'] = safe_get('Coverage Area')
    repeater['footnotes'] = safe_get('Footnotes')
    repeater['contact_email'] = safe_get('Contact Email')
    repeater['repeater_web_page'] = safe_get('Repeater Web Page')
    repeater['contact_phone'] = safe_get('Contact Phone')
    repeater['update_source'] = safe_get('Update Source')
    repeater['coord_notes'] = safe_get('Coord. Notes')
    repeater['mailing_address'] = safe_get('Mailing Address')
    
    # Additional processing
    repeater['notes'] = safe_get('NOTES')
    repeater['update_date'] = safe_get('UPDATE')
    repeater['coord_date'] = safe_get('CORD_DATE')
    repeater['use_type'] = safe_get('USE')
    
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
    
    # Add version indicator to each repeater record
    for repeater in repeaters:
        repeater['scraper_version'] = 'v2'
    
    # Get all possible field names
    all_fields = set()
    for repeater in repeaters:
        all_fields.update(repeater.keys())
    
    # Define preferred field order (including version indicator first)
    preferred_order = [
        'scraper_version', 'call', 'frequency', 'output_frequency', 'input_frequency', 'offset',
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
