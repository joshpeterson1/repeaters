// Global variables (non-map related)
let allRepeaters = [];
let filteredRepeaters = [];
let currentSort = { column: null, direction: 'asc' };
let userLocation = null;
let debugInfo = [];
let socket = null;
let currentView = 'table'; // 'table', 'map', 'both'
let lastDataUpdate = null;
let favorites = new Set();

// Utility functions
function addDebug(message) {
    // Debug messages disabled for production
}

function debugMissingLocationData() {
    // Location data analysis available in Stats for Nerds modal
}

function toggleDebug() {
    // Simplified - no more debug DOM manipulation
}

function getBand(frequency) {
    const freq = parseFloat(frequency);
    if (freq >= 50 && freq < 54) return '6m';
    if (freq >= 144 && freq < 148) return '2m';
    if (freq >= 222 && freq < 225) return '1.25m';
    if (freq >= 420 && freq < 450) return '70cm';
    if (freq >= 902 && freq < 928) return '33cm';
    if (freq >= 1240 && freq < 1300) return '23cm';
    return 'other';
}

async function getLocationFromZip(zipCode) {
    try {
        // Using a free geocoding service
        const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
        if (response.ok) {
            const data = await response.json();
            return {
                lat: parseFloat(data.places[0].latitude),
                lon: parseFloat(data.places[0].longitude)
            };
        }
    } catch (error) {
        console.error('Error geocoding ZIP code:', error);
    }
    return null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Data loading and processing
function initSocket() {
    // No longer needed
}

function loadData() {
    fetch('/api/data')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMessage(data.error, 'error');
        } else {
            allRepeaters = data.repeaters;
            filteredRepeaters = [...allRepeaters];
            
            // Process data (always v2 now)
            processRepeaterData('v2');
            
            displayRepeaters();
            updateStats();
            
            if (currentView !== 'table') {
                updateMapData();
            }
            
            // Apply default filter to hide closed repeaters
            applyFilters();
            
            // Debug missing location data
            debugMissingLocationData();
            
            // Store the last update time
            lastDataUpdate = data.last_updated;
            
            // Update last updated time
            const lastUpdated = document.getElementById('lastUpdated');
            const updateTime = new Date(data.last_updated).toLocaleString();
            lastUpdated.textContent = `Data updated weekly via automated scraping. Last update: ${updateTime}`;
            
            showMessage(`Loaded ${data.count} repeaters`, 'success');
        }
    })
    .catch(error => {
        showMessage('Error loading data: ' + error.message, 'error');
    });
}

function processRepeaterData(version) {
    allRepeaters.forEach(repeater => {
        if (version === 'v2') {
            // v2 data processing
            // Map v2 fields to expected frontend fields
            repeater.general_location = repeater.location || repeater.general_location || '';
            repeater.ctcss = repeater.ctcss_in || repeater.ctcss_out || '';
            repeater.elevation = repeater.elevation_feet || '';
            repeater.info = repeater.notes || '';
            
            // Process internet link data
            repeater.internet_link = formatInternetLink(repeater.internet_link || '');
            
            // Create a combined info field with additional v2 data
            let infoItems = [];
            if (repeater.wide_area === 'Y') infoItems.push('Wide Coverage');
            if (repeater.link_freq) infoItems.push(`Linked: ${repeater.link_freq}`);
            if (repeater.races === 'Y') infoItems.push('RACES');
            if (repeater.ares === 'Y') infoItems.push('ARES');
            if (repeater.emergency_power === 'Y') infoItems.push('Emergency Power');
            if (repeater.autopatch === 'Y') infoItems.push('Autopatch');
            repeater.info = infoItems.join(', ');
            
        } else {
            // v1 data - already in expected format
            // No additional processing needed
        }
    });
    
    // Parse and build repeater links
    parseRepeaterLinks();
    
    // Update filtered repeaters as well
    filteredRepeaters = [...allRepeaters];
}

function formatInternetLink(internetLinkData) {
    if (!internetLinkData || internetLinkData.trim() === '') {
        return '';
    }
    
    // First, normalize common variations before processing
    let normalizedData = internetLinkData
        .replace(/D\s+Star/gi, 'D-Star')  // Convert "D Star" to "D-Star"
        .replace(/Mot\s+DMR/gi, 'Mot DMR'); // Ensure "Mot DMR" stays together
    
    // Split by common separators (comma, slash) but be more careful with spaces
    const parts = normalizedData.split(/[,\/]+/).map(part => part.trim()).filter(part => part !== '');
    const formattedParts = [];
    
    parts.forEach(part => {
        const trimmedPart = part.trim();
        
        // Handle Echolink nodes (E followed by numbers)
        if (/^E\d+$/i.test(trimmedPart)) {
            const nodeNumber = trimmedPart.substring(1);
            formattedParts.push(`Echo ${nodeNumber}`);
        }
        // Handle IRLP nodes (I followed by numbers)
        else if (/^I\d+$/i.test(trimmedPart)) {
            const nodeNumber = trimmedPart.substring(1);
            formattedParts.push(`IRLP ${nodeNumber}`);
        }
        // Handle AllStar nodes (A followed by numbers)
        else if (/^A\d+$/i.test(trimmedPart)) {
            const nodeNumber = trimmedPart.substring(1);
            formattedParts.push(`AllStar ${nodeNumber}`);
        }
        // Handle DMR with node numbers (e.g., "DMR 3192979")
        else if (/^DMR\s+\d+$/i.test(trimmedPart)) {
            formattedParts.push(trimmedPart);
        }
        // Handle standalone system names (case insensitive)
        else if (/^DMR$/i.test(trimmedPart)) {
            formattedParts.push('DMR');
        }
        else if (/^D-?Star$/i.test(trimmedPart)) {
            formattedParts.push('D-Star');
        }
        else if (/^Mot\s+DMR$/i.test(trimmedPart)) {
            formattedParts.push('Mot DMR');
        }
        else if (/^P25$/i.test(trimmedPart)) {
            formattedParts.push('P25');
        }
        else if (/^Fusion$/i.test(trimmedPart)) {
            formattedParts.push('Fusion');
        }
        // Skip standalone E, I, or A without numbers
        else if (/^[EIA]$/i.test(trimmedPart)) {
            // Don't add these
        }
        // For space-separated entries within a part, split and process each
        else if (trimmedPart.includes(' ')) {
            const subParts = trimmedPart.split(/\s+/);
            const subFormatted = [];
            
            for (let i = 0; i < subParts.length; i++) {
                const subPart = subParts[i];
                
                // Handle node formats
                if (/^E\d+$/i.test(subPart)) {
                    subFormatted.push(`Echo ${subPart.substring(1)}`);
                }
                else if (/^I\d+$/i.test(subPart)) {
                    subFormatted.push(`IRLP ${subPart.substring(1)}`);
                }
                else if (/^A\d+$/i.test(subPart)) {
                    subFormatted.push(`AllStar ${subPart.substring(1)}`);
                }
                // Skip standalone letters
                else if (!/^[EIA]$/i.test(subPart) && subPart.length > 0) {
                    subFormatted.push(subPart);
                }
            }
            
            if (subFormatted.length > 0) {
                formattedParts.push(subFormatted.join(' '));
            }
        }
        // For any other single format, include as-is if it's not empty
        else if (trimmedPart.length > 0) {
            formattedParts.push(trimmedPart);
        }
    });
    
    return formattedParts.join(', ');
}

// Message display
function showMessage(message, type) {
    const existingMessage = document.querySelector('.error, .success');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.children[1]);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Favorites management functions
function getRepeaterId(repeater) {
    // Create a unique ID for each repeater using call sign and frequency
    return `${repeater.call}-${repeater.frequency}`;
}

function loadFavorites() {
    try {
        const savedFavorites = localStorage.getItem('utah-repeater-favorites');
        if (savedFavorites) {
            favorites = new Set(JSON.parse(savedFavorites));
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = new Set();
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('utah-repeater-favorites', JSON.stringify([...favorites]));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

function toggleFavorite(repeaterId, starElement) {
    if (favorites.has(repeaterId)) {
        favorites.delete(repeaterId);
        starElement.classList.remove('favorited');
        starElement.title = 'Add to favorites';
        showMessage('Removed from favorites', 'success');
    } else {
        favorites.add(repeaterId);
        starElement.classList.add('favorited');
        starElement.title = 'Remove from favorites';
        showMessage('Added to favorites', 'success');
    }
    
    saveFavorites();
    updateStats();
}

function toggleFavoriteFromPopup(repeaterId, starElement) {
    toggleFavorite(repeaterId, starElement);
    // Refresh the table to update the star there too
    displayRepeaters();
}

// View management
function showTableView() {
    currentView = 'table';
    document.getElementById('mapContainer').style.display = 'none';
    document.getElementById('repeaterTable').parentElement.style.display = 'block';
    
    document.getElementById('tableViewBtn').classList.add('active');
    document.getElementById('mapViewBtn').classList.remove('active');
    document.getElementById('bothViewBtn').classList.remove('active');
    
    clearRepeaterSelection();
}

function showMapView() {
    currentView = 'map';
    document.getElementById('mapContainer').style.display = 'block';
    document.getElementById('repeaterTable').parentElement.style.display = 'none';
    
    if (!mapInitialized) {
        initializeMap();
        // Wait a bit for map to initialize, then update data
        setTimeout(() => {
            updateMapData();
            fitMapToRepeaters();
        }, 1000);
    } else {
        // Resize map first, then update data
        setTimeout(() => {
            if (map) {
                map.resize();
                updateMapData();
            }
        }, 100);
    }
    
    document.getElementById('tableViewBtn').classList.remove('active');
    document.getElementById('mapViewBtn').classList.add('active');
    document.getElementById('bothViewBtn').classList.remove('active');
    
    clearRepeaterSelection();
}

function showBothViews() {
    currentView = 'both';
    document.getElementById('mapContainer').style.display = 'block';
    document.getElementById('repeaterTable').parentElement.style.display = 'block';
    
    if (!mapInitialized) {
        initializeMap();
        setTimeout(() => {
            updateMapData();
            fitMapToRepeaters();
        }, 1000);
    } else {
        // Resize map first, then update data
        setTimeout(() => {
            if (map) {
                map.resize();
                updateMapData();
            }
        }, 100);
    }
    
    document.getElementById('tableViewBtn').classList.remove('active');
    document.getElementById('mapViewBtn').classList.remove('active');
    document.getElementById('bothViewBtn').classList.add('active');
}

// Fullscreen functionality
function toggleFullscreen() {
    const mapContainer = document.getElementById('mapContainer');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (mapContainer.classList.contains('fullscreen')) {
        // Exit fullscreen
        mapContainer.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Toggle Fullscreen';
    } else {
        // Enter fullscreen
        mapContainer.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '✕';
        fullscreenBtn.title = 'Exit Fullscreen';
    }
    
    // Resize map after transition
    setTimeout(() => {
        if (map) {
            map.resize();
        }
    }, 100);
}

// Handle ESC key to exit fullscreen
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer.classList.contains('fullscreen')) {
            toggleFullscreen();
        }
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadFavorites();
    initSocket();
    // Try to load existing data on page load
    loadData();
});
