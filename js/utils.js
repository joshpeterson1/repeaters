// Shared utility functions extracted to break circular dependencies
import { BANDS, FAVORITES_KEY } from './constants.js';
import { AppState } from './state.js';

export function getBand(frequency) {
    const freq = parseFloat(frequency);
    for (const band of BANDS) {
        if (freq >= band.min && freq < band.max) return band.name;
    }
    return 'other';
}

export async function getLocationFromZip(zipCode) {
    try {
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

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function formatInternetLink(internetLinkData) {
    if (!internetLinkData || internetLinkData.trim() === '') {
        return '';
    }

    const normalizedData = internetLinkData
        .replace(/D\s+Star/gi, 'D-Star')
        .replace(/Mot\s+DMR/gi, 'Mot DMR');

    const parts = normalizedData.split(/[,\/]+/).map(part => part.trim()).filter(part => part !== '');
    const formattedParts = [];

    parts.forEach(part => {
        const trimmedPart = part.trim();

        if (/^E\d+$/i.test(trimmedPart)) {
            const nodeNumber = trimmedPart.substring(1);
            formattedParts.push(`Echo ${nodeNumber}`);
        }
        else if (/^I\d+$/i.test(trimmedPart)) {
            const nodeNumber = trimmedPart.substring(1);
            formattedParts.push(`IRLP ${nodeNumber}`);
        }
        else if (/^A\d+$/i.test(trimmedPart)) {
            const nodeNumber = trimmedPart.substring(1);
            formattedParts.push(`AllStar ${nodeNumber}`);
        }
        else if (/^DMR\s+\d+$/i.test(trimmedPart)) {
            formattedParts.push(trimmedPart);
        }
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
        else if (/^[EIA]$/i.test(trimmedPart)) {
            // Skip standalone E, I, or A without numbers
        }
        else if (trimmedPart.includes(' ')) {
            const subParts = trimmedPart.split(/\s+/);
            const subFormatted = [];

            for (let i = 0; i < subParts.length; i++) {
                const subPart = subParts[i];

                if (/^E\d+$/i.test(subPart)) {
                    subFormatted.push(`Echo ${subPart.substring(1)}`);
                }
                else if (/^I\d+$/i.test(subPart)) {
                    subFormatted.push(`IRLP ${subPart.substring(1)}`);
                }
                else if (/^A\d+$/i.test(subPart)) {
                    subFormatted.push(`AllStar ${subPart.substring(1)}`);
                }
                else if (!/^[EIA]$/i.test(subPart) && subPart.length > 0) {
                    subFormatted.push(subPart);
                }
            }

            if (subFormatted.length > 0) {
                formattedParts.push(subFormatted.join(' '));
            }
        }
        else if (trimmedPart.length > 0) {
            formattedParts.push(trimmedPart);
        }
    });

    return formattedParts.join(', ');
}

export function showMessage(message, type) {
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

export function getRepeaterId(repeater) {
    return `${repeater.call}-${repeater.frequency}`;
}

export function loadFavorites() {
    try {
        const savedFavorites = localStorage.getItem(FAVORITES_KEY);
        if (savedFavorites) {
            AppState.favorites = new Set(JSON.parse(savedFavorites));
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        AppState.favorites = new Set();
    }
}

export function saveFavorites() {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...AppState.favorites]));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(c) {
        switch (c) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
        }
    });
}
