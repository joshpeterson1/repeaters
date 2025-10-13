import requests
from bs4 import BeautifulSoup
import re
import csv
import time
from urllib.parse import urljoin

def scrape_repeater_list():
    base_url = "https://utahvhfs.org/"
    main_url = "https://utahvhfs.org/rptr.html"
    
    # Get the main page
    response = requests.get(main_url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    repeaters = []
    
    # Find all tables containing repeater data
    tables = soup.find_all('table')
    
    for table in tables:
        rows = table.find_all('tr')
        
        # Skip if no rows or if it's not a repeater table
        if len(rows) < 2:
            continue
            
        # Check if this looks like a repeater table by examining headers
        header_row = rows[0]
        header_text = header_row.get_text().lower()
        if 'freq' not in header_text or 'call' not in header_text:
            continue
        
        # Process data rows
        for row in rows[1:]:
            cells = row.find_all('td')
            if len(cells) < 8:  # Need at least 8 columns for basic data
                continue
                
            # Extract basic info from main table
            freq_cell = cells[0]
            location = cells[1].get_text(strip=True)
            area = cells[2].get_text(strip=True)
            site_name = cells[3].get_text(strip=True)
            call = cells[4].get_text(strip=True)
            sponsor = cells[5].get_text(strip=True)
            ctcss = cells[6].get_text(strip=True)
            info = cells[7].get_text(strip=True)
            
            # Extract frequency and offset from first cell
            freq_text = freq_cell.get_text(strip=True)
            freq_match = re.search(r'([\d.]+)', freq_text)
            frequency = freq_match.group(1) if freq_match else ""
            
            # Determine offset from the symbols in parentheses
            offset = ""
            if "(**--**)" in str(freq_cell) or "(**-**)" in str(freq_cell):
                offset = "-"
            elif "(**+**)" in str(freq_cell) or "(**++**)" in str(freq_cell):
                offset = "+"
            elif "(**--**)" not in str(freq_cell) and "(**+**)" not in str(freq_cell):
                offset = "simplex"
            
            # Find the detail link (§ symbol)
            detail_link = freq_cell.find('a')
            detail_url = ""
            if detail_link:
                detail_url = urljoin(base_url, detail_link.get('href'))
            
            # Extract links from last column if it exists
            links = ""
            if len(cells) > 8:
                links = cells[8].get_text(strip=True)
            
            repeater_data = {
                'frequency': frequency,
                'offset': offset,
                'general_location': location,
                'area': area,
                'site_name': site_name,
                'call': call,
                'sponsor': sponsor,
                'ctcss': ctcss,
                'info': info,
                'links': links,
                'detail_url': detail_url
            }
            
            # Get additional details if detail URL exists
            if detail_url:
                print(f"Scraping details for {call} on {frequency}...")
                additional_data = scrape_repeater_details(detail_url)
                repeater_data.update(additional_data)
                time.sleep(0.5)  # Be polite to the server
            
            repeaters.append(repeater_data)
    
    return repeaters

def scrape_repeater_details(detail_url):
    """Scrape additional details from the repeater detail page"""
    try:
        response = requests.get(detail_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        details = {}
        
        # Find all tables in the detail page
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2:
                    key_cell = cells[0]
                    value_cell = cells[1]
                    
                    key = key_cell.get_text(strip=True).replace(':', '').lower()
                    value = value_cell.get_text(strip=True)
                    
                    # Clean up and map the fields
                    if 'output frequency' in key:
                        details['output_freq'] = value
                    elif 'input frequency' in key:
                        details['input_freq'] = value
                    elif 'elevation' in key:
                        details['elevation'] = value
                    elif 'coordinates' in key:
                        details['coordinates'] = value
                    elif 'coordinated' in key:
                        details['coordinated_date'] = value
                    elif 'info updated' in key:
                        details['info_updated'] = value
                    elif 'coverage' in key:
                        details['coverage'] = value
                    elif 'web site' in key:
                        details['website'] = value
                    elif 'features' in key:
                        details['features'] = value
                    elif 'erp' in key:
                        details['erp'] = value
                    elif 'mail address' in key:
                        details['mail_address'] = value
                    elif 'open/closed' in key:
                        details['open_closed'] = value
                    elif 'repeater callsign' in key:
                        details['repeater_callsign'] = value
        
        return details
        
    except Exception as e:
        print(f"Error scraping details from {detail_url}: {e}")
        return {}

def save_to_csv(repeaters, filename='utah_repeaters.csv'):
    """Save repeater data to CSV file"""
    if not repeaters:
        print("No repeater data to save")
        return
    
    # Get all possible field names
    all_fields = set()
    for repeater in repeaters:
        all_fields.update(repeater.keys())
    
    fieldnames = sorted(list(all_fields))
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repeaters)
    
    print(f"Saved {len(repeaters)} repeaters to {filename}")

def main():
    print("Starting Utah VHF Society repeater scraper...")
    
    # Scrape all repeater data
    repeaters = scrape_repeater_list()
    
    # Save to CSV
    save_to_csv(repeaters)
    
    # Print summary
    print(f"\nScraping complete! Found {len(repeaters)} repeaters.")
    
    # Show first few entries as example
    if repeaters:
        print("\nFirst few entries:")
        for i, repeater in enumerate(repeaters[:3]):
            print(f"\n{i+1}. {repeater.get('call', 'N/A')} - {repeater.get('frequency', 'N/A')} MHz")
            print(f"   Location: {repeater.get('location', 'N/A')}")
            print(f"   Site: {repeater.get('site_name', 'N/A')}")
            if 'elevation' in repeater:
                print(f"   Elevation: {repeater['elevation']}")

# Make functions available for import
__all__ = ['scrape_repeater_list', 'scrape_repeater_details', 'save_to_csv']

if __name__ == "__main__":
    main()
