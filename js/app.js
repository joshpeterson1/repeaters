// Application entry point - imports all modules and bridges global functions
import 'mapbox-gl/dist/mapbox-gl.css';
import { toggleFavorite, toggleFavoriteFromPopup, loadData } from './main.js';

// Bridge functions needed by inline onclick handlers in dynamically generated HTML
window.toggleFavorite = toggleFavorite;
window.toggleFavoriteFromPopup = toggleFavoriteFromPopup;
window.loadData = loadData;

// Side-effect imports: these modules register DOMContentLoaded listeners
import './ui.js';
