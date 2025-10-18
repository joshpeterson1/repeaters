# Utah Repeater Viewer

A web application for viewing and filtering amateur radio repeaters in Utah, with interactive mapping and export capabilities.

## File Structure

### Main Files

- **`index.html`** - Main HTML page containing the UI structure, modals, and remaining JavaScript for modal handling and stats generation
- **`css/styles.css`** - All CSS styling for the application including responsive design, modal styles, and map controls

### JavaScript Modules

The application is modularized into several JavaScript files for better maintainability:

#### **`js/main.js`** - Core Application Logic
- Global variable declarations (non-map related)
- Utility functions (`getBand()`, `getLocationFromZip()`, `calculateDistance()`)
- Data loading and processing (`loadData()`, `processRepeaterData()`)
- Message display system (`showMessage()`)
- Favorites management (localStorage-based favorites system)
- View management (table/map/both view switching)
- Fullscreen functionality for map
- Application initialization

#### **`js/map.js`** - Map Functionality
- Mapbox GL JS integration and initialization
- Map layer setup (clusters, individual points, links, Utah boundary)
- Interactive map features (click handlers, popups, hover effects)
- Repeater visualization with color-coded bands
- Link rendering system for repeater connections
- Map data updates and coordinate calculations
- User location and repeater selection on map

#### **`js/filters.js`** - Filtering and Sorting
- Filter application logic (ZIP code, distance, band, call sign, etc.)
- Wide coverage filtering (checks `wide_area` column)
- Favorites-only filtering
- Closed repeater visibility toggle
- Link drawing controls (intertie, other, non-validated links)
- Table sorting functionality with multiple column support
- Repeater table rendering with clickable rows
- Statistics display and updates

#### **`js/export.js`** - Export Functionality
- Multiple export format support:
  - **CSV** - Standard comma-separated values
  - **KML** - Google Earth/Maps format with placemarks
  - **KX3** - Elecraft KX3 radio programming format (XML)
  - **CHIRP** - CHIRP radio programming software format (CSV)
- Data format conversion and validation
- File download handling
- Export modal integration

#### **`js/data.js`** - Data Processing and Link Analysis
- Repeater link parsing and validation
- Bidirectional link verification system
- System link detection (Cactus, BARC, SDARC networks)
- Intertie link identification
- Frequency matching and validation
- Non-validated link tracking for debugging
- Complex data relationship analysis

## Key Features

### Filtering System
- **Geographic**: ZIP code-based distance filtering
- **Technical**: Band filtering (6m, 2m, 1.25m, 70cm, 33cm, 23cm)
- **Operational**: Wide coverage, closed repeaters, favorites
- **Visual**: Link drawing controls for network visualization

### Interactive Mapping
- Clustered repeater display with color-coded bands
- Utah state boundary visualization
- Multiple repeater handling at same locations
- Link visualization with different styles for different network types
- Fullscreen map capability

### Export Capabilities
- Standard formats (CSV, KML) for general use
- Radio programming formats (KX3, CHIRP) for direct radio programming
- Filtered data export (only exports currently visible repeaters)

### Data Analysis
- Bidirectional link validation
- Network topology analysis
- Missing location data identification
- Statistics and debugging information ("Stats for nerds")

## Data Source

The application ingests data weekly from the [Utah VHF Society raw data](https://utahvhfs.org/raw_dat.html), processing only active and temporarily offline repeaters while filtering out permanently offline ones.

### API Endpoints

#### **`api/data.js`** - Data Serving API
- Serves processed repeater data from Vercel Blob storage
- Returns JSON with repeater array, count, and last update timestamp
- Handles CSV parsing with proper quote handling
- Filters out inactive repeaters and processes v2 data format
- Error handling for missing or corrupted data

#### **`api/cron-scrape.js`** - Automated Data Collection
- Weekly cron job for scraping Utah VHF Society raw data
- Fetches data from `https://utahvhfs.org/rptrraw.txt`
- Processes CSV data and filters active/temp-off repeaters only
- Stores processed data to Vercel Blob storage with timestamp
- Includes data validation and error handling
- Requires `CRON_SECRET` environment variable for security

## Technical Architecture

The application uses a modular JavaScript architecture with:
- **Frontend**: Vanilla JavaScript with Mapbox GL JS for mapping
- **Backend**: Node.js API endpoints for data serving (`/api/data`) and automated scraping (`/api/cron-scrape`)
- **Data Processing**: Automated weekly scraping via Vercel cron jobs
- **Storage**: Vercel Blob storage for processed CSV data
- **Deployment**: Vercel platform with serverless functions

### Data Flow
1. **Weekly Scraping**: `api/cron-scrape.js` fetches raw data from Utah VHF Society
2. **Data Processing**: Filters active repeaters, processes v2 format, stores to Blob
3. **Data Serving**: `api/data.js` serves processed data to frontend
4. **Frontend Processing**: JavaScript modules handle filtering, mapping, and export

Each JavaScript module has a specific responsibility, making the codebase maintainable and allowing for easy feature additions or modifications.
