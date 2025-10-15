export async function scrape_raw_repeater_data() {
    const raw_url = "https://utahvhfs.org/rptrraw.txt";
    
    console.log("Fetching raw repeater data from Utah VHF Society...");
    
    try {
        const response = await fetch(raw_url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const content = await response.text();
        
        // Try to find CSV content between <pre> tags first
        const start_marker = '<pre style="word-wrap: break-word; white-space: pre-wrap;">';
        const end_marker = '</pre>';
        
        let start_idx = content.indexOf(start_marker);
        let end_idx = content.indexOf(end_marker);
        let csv_content;
        
        if (start_idx !== -1 && end_idx !== -1) {
            // Found pre tags, extract content
            csv_content = content.substring(start_idx + start_marker.length, end_idx).trim();
        } else {
            // Try alternative pre tag format
            const alt_start = '<pre>';
            const alt_end = '</pre>';
            start_idx = content.indexOf(alt_start);
            end_idx = content.indexOf(alt_end);
            
            if (start_idx !== -1 && end_idx !== -1) {
                csv_content = content.substring(start_idx + alt_start.length, end_idx).trim();
            } else {
                // If no pre tags found, look for CSV header directly
                if (content.includes('BAND,OUTPUT,INPUT,STATE,LOCATION,CALLSIGN')) {
                    // Find the start of CSV data
                    const csv_start = content.indexOf('BAND,OUTPUT,INPUT,STATE,LOCATION,CALLSIGN');
                    if (csv_start !== -1) {
                        // Take everything from the header onwards
                        csv_content = content.substring(csv_start).trim();
                        // Remove any trailing HTML if present
                        if (csv_content.includes('</body>')) {
                            csv_content = csv_content.substring(0, csv_content.indexOf('</body>')).trim();
                        }
                        if (csv_content.includes('</html>')) {
                            csv_content = csv_content.substring(0, csv_content.indexOf('</html>')).trim();
                        }
                    } else {
                        throw new Error("Could not find CSV header in the response");
                    }
                } else {
                    throw new Error("Could not find CSV data in the response");
                }
            }
        }
        
        // Clean up the CSV content
        csv_content = csv_content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split into lines and process as CSV
        const lines = csv_content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error("Not enough CSV data found");
        }
        
        console.log(`Found CSV data with ${lines.length} lines`);
        
        // Parse the CSV data
        const repeaters = [];
        const headers = parseCSVLine(lines[0]);
        
        let active_count = 0;
        let inactive_count = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            // Create row object from headers and values
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            // CRITICAL: Filter based on active state field
            // Only include repeaters with 'Y' (active) or 'T' (temporarily off air)
            const active_state_raw = row['Active'] || '';
            const active_state = active_state_raw.trim().toUpperCase();
            
            if (!['Y', 'T'].includes(active_state)) {
                inactive_count++;
                continue; // Skip inactive repeaters
            }
            
            active_count++;
            
            // Clean and process the data
            const repeater_data = process_raw_repeater_data(row);
            repeaters.push(repeater_data);
        }
        
        console.log(`Processed ${lines.length - 1} total entries`);
        console.log(`Active/Temp off repeaters: ${active_count}`);
        console.log(`Inactive repeaters filtered out: ${inactive_count}`);
        console.log(`Final dataset: ${repeaters.length} repeaters`);
        
        return repeaters;
        
    } catch (error) {
        console.error(`Error fetching raw data: ${error.message}`);
        throw error;
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function process_raw_repeater_data(row) {
    // Helper function to safely get and strip values
    function safe_get(key, defaultValue = '') {
        const value = row[key];
        return value != null ? value.trim() : defaultValue;
    }
    
    // Map the raw CSV fields to cleaner field names
    const repeater = {};
    
    // Basic repeater information
    repeater.band = safe_get('BAND');
    repeater.output_frequency = safe_get('OUTPUT');
    repeater.input_frequency = safe_get('INPUT');
    repeater.state = safe_get('STATE');
    repeater.location = safe_get('LOCATION');
    repeater.call = safe_get('CALLSIGN');
    repeater.sponsor = safe_get('SPONSOR');
    repeater.source = safe_get('SOURCE');
    repeater.area = safe_get('AREA');
    
    // Operational details
    repeater.coordinated = safe_get('COORDINATED');
    repeater.open = safe_get('OPEN');
    repeater.closed = safe_get('CLOSED');
    repeater.ctcss_in = safe_get('CTCSS_IN');
    repeater.ctcss_out = safe_get('CTCSS_OUT');
    repeater.dcs = safe_get('DCS');
    repeater.dcs_code = safe_get('DCS_CODE');
    
    // Features
    repeater.autopatch = safe_get('AUTOPATCH');
    repeater.emergency_power = safe_get('EMERG_POWER');
    repeater.linked = safe_get('LINKED');
    repeater.link_freq = safe_get('LINK_FREQ');
    repeater.portable = safe_get('PORTABLE');
    repeater.wide_area = safe_get('WIDE_AREA');
    
    // Location data
    repeater.latitude = safe_get('LATITUDE');
    repeater.longitude = safe_get('LONGITUDE');
    repeater.latitude_dms = safe_get('LATITUDE_DDMMSS');
    repeater.longitude_dms = safe_get('LONGITUDE_DDDMMSS');
    repeater.elevation_feet = safe_get('AMSL_FEET');
    
    // Technical details
    repeater.tx_power = safe_get('TX_POWER');
    repeater.antenna_info = safe_get('ANT_INFO');
    repeater.erp = safe_get('ERP');
    
    // Status and metadata
    repeater.active = safe_get('Active');
    repeater.site_name = safe_get('Site Name');
    repeater.coverage_area = safe_get('Coverage Area');
    repeater.footnotes = safe_get('Footnotes');
    repeater.contact_email = safe_get('Contact Email');
    repeater.repeater_web_page = safe_get('Repeater Web Page');
    repeater.contact_phone = safe_get('Contact Phone');
    repeater.update_source = safe_get('Update Source');
    repeater.coord_notes = safe_get('Coord. Notes');
    repeater.mailing_address = safe_get('Mailing Address');
    
    // Additional processing
    repeater.notes = safe_get('NOTES');
    repeater.update_date = safe_get('UPDATE');
    repeater.coord_date = safe_get('CORD_DATE');
    repeater.use_type = safe_get('USE');
    
    // Parse coordinates to decimal degrees if available
    if (repeater.latitude && repeater.longitude) {
        try {
            const lat = parseFloat(repeater.latitude);
            const lon = parseFloat(repeater.longitude);
            // Validate reasonable coordinates for Utah
            if (lat >= 36.0 && lat <= 42.5 && lon >= -114.5 && lon <= -109.0) {
                repeater.lat = lat;
                repeater.lon = lon;
            }
        } catch (error) {
            // Keep original values if parsing fails
        }
    }
    
    // Determine band from frequency
    if (repeater.output_frequency) {
        try {
            const freq = parseFloat(repeater.output_frequency);
            repeater.frequency = repeater.output_frequency;
            repeater.band_name = get_band_name(freq);
        } catch (error) {
            repeater.frequency = repeater.output_frequency;
        }
    }
    
    // Calculate offset if both input and output are available
    if (repeater.input_frequency && repeater.output_frequency) {
        try {
            const input_freq = parseFloat(repeater.input_frequency);
            const output_freq = parseFloat(repeater.output_frequency);
            const offset = input_freq - output_freq;
            repeater.offset = (offset >= 0 ? '+' : '') + offset.toFixed(4);
        } catch (error) {
            // Keep empty if calculation fails
        }
    }
    
    return repeater;
}

function get_band_name(frequency) {
    if (frequency >= 28 && frequency <= 29.7) {
        return '10m';
    } else if (frequency >= 50 && frequency <= 54) {
        return '6m';
    } else if (frequency >= 144 && frequency <= 148) {
        return '2m';
    } else if (frequency >= 222 && frequency <= 225) {
        return '1.25m';
    } else if (frequency >= 420 && frequency <= 450) {
        return '70cm';
    } else if (frequency >= 902 && frequency <= 928) {
        return '33cm';
    } else if (frequency >= 1240 && frequency <= 1300) {
        return '23cm';
    } else if (frequency >= 10000) {
        return 'Microwave';
    } else {
        return 'Other';
    }
}

export function save_to_csv_v2(repeaters) {
    if (!repeaters || repeaters.length === 0) {
        console.log("No repeater data to save");
        return '';
    }
    
    // Add version indicator to each repeater record
    repeaters.forEach(repeater => {
        repeater.scraper_version = 'v2';
    });
    
    // Get all possible field names
    const all_fields = new Set();
    repeaters.forEach(repeater => {
        Object.keys(repeater).forEach(key => all_fields.add(key));
    });
    
    // Define preferred field order
    const preferred_order = [
        'scraper_version', 'call', 'frequency', 'output_frequency', 'input_frequency', 'offset',
        'band', 'band_name', 'location', 'site_name', 'sponsor', 'area',
        'ctcss_in', 'ctcss_out', 'dcs_code', 'lat', 'lon', 'latitude', 'longitude',
        'elevation_feet', 'active', 'open', 'closed', 'wide_area', 'linked',
        'emergency_power', 'coverage_area', 'notes', 'contact_email', 'repeater_web_page'
    ];
    
    // Create final field list with preferred fields first, then remaining fields
    const fieldnames = [];
    preferred_order.forEach(field => {
        if (all_fields.has(field)) {
            fieldnames.push(field);
            all_fields.delete(field);
        }
    });
    
    // Add remaining fields
    fieldnames.push(...Array.from(all_fields).sort());
    
    // Generate CSV content
    let csv = fieldnames.map(field => `"${field}"`).join(',') + '\n';
    
    repeaters.forEach(repeater => {
        const row = fieldnames.map(field => {
            const value = repeater[field] || '';
            // Escape quotes and wrap in quotes
            return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csv += row.join(',') + '\n';
    });
    
    console.log(`Generated CSV for ${repeaters.length} repeaters`);
    return csv;
}
