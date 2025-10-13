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
        
        for row in rows[1:]:  # Skip header row
            cells = row.find_all('td')
            if len(cells) >= 8:  # Ensure we have enough columns
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
                
                offset = ""
                if "(**--**)" in str(freq_cell):
                    offset = "-"
                elif "(**+**)" in str(freq_cell):
                    offset = "+"
                
                # Find the detail link (§ symbol)
                detail_link = freq_cell.find('a')
                detail_url = ""
                if detail_link:
                    detail_url = urljoin(base_url, detail_link.get('href'))
                
                repeater_data = {
                    'frequency': frequency,
                    'offset': offset,
                    'location': location,
                    'area': area,
                    'site_name': site_name,
                    'call': call,
                    'sponsor': sponsor,
                    'ctcss': ctcss,
                    'info': info,
                    'detail_url': detail_url
                }
                
                # Get additional details if detail URL exists
                if detail_url:
                    print(f"Scraping details for {call} on {frequency}...")
                    additional_data = scrape_repeater_details(detail_url)
                    repeater_data.update(additional_data)
                    time.sleep(1)  # Be polite to the server
                
                repeaters.append(repeater_data)
    
    return repeaters

def scrape_repeater_details(detail_url):
    """Scrape additional details from the repeater detail page"""
    try:
        response = requests.get(detail_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        details = {}
        
        # Find all table cells and extract key-value pairs
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True).replace(':', '').lower()
                    value = cells[1].get_text(strip=True)
                    
                    # Map common fields
                    field_mapping = {
                        'output frequency': 'output_freq',
                        'input frequency': 'input_freq',
                        'elevation': 'elevation',
                        'coordinates': 'coordinates',
                        'coordinated': 'coordinated_date',
                        'info updated': 'info_updated',
                        'coverage': 'coverage',
                        'web site': 'website'
                    }
                    
                    mapped_key = field_mapping.get(key, key.replace(' ', '_'))
                    details[mapped_key] = value
        
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
