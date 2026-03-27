// Browser Geolocation API integration
import { AppState } from './state.js';
import { showMessage } from './utils.js';
import { applyFilters } from './filters.js';

export function getGeolocationErrorMessage(code) {
    switch (code) {
        case 1: return 'Location access was denied. Please enable location permissions in your browser settings.';
        case 2: return 'Location information is unavailable.';
        case 3: return 'Location request timed out. Please try again.';
        default: return 'An unknown error occurred while getting your location.';
    }
}

export function requestUserGeolocation() {
    if (!navigator.geolocation) {
        showMessage('Geolocation is not supported by your browser', 'error');
        return;
    }

    const btn = document.getElementById('useMyLocationBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            AppState.userLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };

            // Clear ZIP since geolocation supersedes it
            document.getElementById('zipCode').value = '';

            // Show the center button
            document.getElementById('centerUserBtn').style.display = '';

            applyFilters();
            showMessage('Using your current location', 'success');

            btn.disabled = false;
            btn.textContent = originalText;
        },
        (error) => {
            showMessage(getGeolocationErrorMessage(error.code), 'error');
            btn.disabled = false;
            btn.textContent = originalText;
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
}
