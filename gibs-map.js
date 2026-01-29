/**
 * AstroCal Satellite Imagery Module
 * Uses NASA GIBS (Global Imagery Browse Services) and other free satellite sources
 * Version: 2.0
 */

let gibsMap = null;
let currentLayer = null;
let baseLayer = null;
window.gibsMapInitialized = false;

// NASA GIBS WMTS Configuration
const GIBS_WMTS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

// Available Satellite Layers
const SATELLITE_LAYERS = {
    // Base Maps
    "osm": {
        name: "OpenStreetMap",
        type: "base",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '© OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        category: "base"
    },
    "esri_satellite": {
        name: "ESRI World Imagery",
        type: "base",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri, Maxar, Earthstar Geographics',
        maxZoom: 18,
        category: "satellite"
    },
    "carto_dark": {
        name: "Dark Map",
        type: "base",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '© CARTO',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        category: "base"
    },
    
    // NASA GIBS Layers (WMTS)
    "modis_terra": {
        name: "MODIS Terra True Color",
        type: "gibs",
        layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
        format: "image/jpeg",
        time: "today",
        attribution: '© NASA GIBS',
        maxZoom: 9,
        category: "nasa"
    },
    "modis_aqua": {
        name: "MODIS Aqua True Color", 
        type: "gibs",
        layer: "MODIS_Aqua_CorrectedReflectance_TrueColor",
        format: "image/jpeg",
        time: "today",
        attribution: '© NASA GIBS',
        maxZoom: 9,
        category: "nasa"
    },
    "viirs_snpp": {
        name: "VIIRS SNPP True Color",
        type: "gibs",
        layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        format: "image/jpeg",
        time: "today",
        attribution: '© NASA GIBS',
        maxZoom: 9,
        category: "nasa"
    },
    "blue_marble": {
        name: "Blue Marble (Monthly)",
        type: "gibs",
        layer: "BlueMarble_NextGeneration",
        format: "image/jpeg",
        time: null, // No time dimension
        attribution: '© NASA GIBS',
        maxZoom: 8,
        category: "nasa"
    },
    "earth_at_night": {
        name: "Earth at Night 2012",
        type: "gibs",
        layer: "VIIRS_Black_Marble",
        format: "image/png",
        time: null,
        attribution: '© NASA GIBS',
        maxZoom: 8,
        category: "nasa"
    },
    "cloud_tops": {
        name: "Cloud Top Temperature",
        type: "gibs",
        layer: "MODIS_Terra_Cloud_Top_Temp_Day",
        format: "image/png",
        time: "today",
        attribution: '© NASA GIBS',
        maxZoom: 7,
        category: "weather"
    },
    "sea_surface_temp": {
        name: "Sea Surface Temperature",
        type: "gibs",
        layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
        format: "image/png",
        time: "today",
        attribution: '© NASA GIBS',
        maxZoom: 7,
        category: "ocean"
    },
    "fires": {
        name: "Active Fires (MODIS)",
        type: "gibs",
        layer: "MODIS_Terra_Thermal_Anomalies_All",
        format: "image/png",
        time: "today",
        attribution: '© NASA GIBS',
        maxZoom: 9,
        category: "hazards"
    },
    "aerosol": {
        name: "Aerosol Optical Depth",
        type: "gibs",
        layer: "MODIS_Terra_Aerosol_Optical_Depth_3km",
        format: "image/png",
        time: "today",
        attribution: '© NASA GIBS',
        maxZoom: 7,
        category: "atmosphere"
    }
};

// Get formatted date for GIBS (YYYY-MM-DD)
function getGIBSDate(daysAgo = 1) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo); // GIBS data is usually 1 day behind
    return date.toISOString().split('T')[0];
}

// Create NASA GIBS WMTS layer
function createGIBSLayer(config) {
    const date = config.time === "today" ? getGIBSDate(1) : config.time;
    
    // GIBS WMTS URL template
    let url = `${GIBS_WMTS_BASE}/${config.layer}/default/`;
    if (date) {
        url += `${date}/`;
    }
    url += `GoogleMapsCompatible_Level${config.maxZoom}/{z}/{y}/{x}.${config.format.split('/')[1]}`;
    
    return L.tileLayer(url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        tileSize: 256,
        opacity: 1
    });
}

// Create standard tile layer
function createTileLayer(config) {
    return L.tileLayer(config.url, {
        attribution: config.attribution,
        subdomains: config.subdomains || [],
        maxZoom: config.maxZoom || 18
    });
}

// Initialize the map
function initGIBSMap() {
    console.log('Initializing Satellite Map...');
    
    const container = document.getElementById('gibs-map');
    if (!container) {
        console.error('Map container not found');
        return;
    }
    
    // Check if already initialized
    if (gibsMap && gibsMap instanceof L.Map) {
        console.log('Map already initialized');
        gibsMap.invalidateSize();
        return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Default location (La Brea, Trinidad)
    const defaultLat = window.userLocation?.lat || 10.25;
    const defaultLon = window.userLocation?.lon || -61.63;
    
    try {
        // Create map
        gibsMap = L.map(container, {
            center: [defaultLat, defaultLon],
            zoom: 4,
            minZoom: 2,
            maxZoom: 18,
            worldCopyJump: true
        });
        
        // Add default base layer (ESRI Satellite)
        const defaultConfig = SATELLITE_LAYERS["esri_satellite"];
        baseLayer = createTileLayer(defaultConfig);
        baseLayer.addTo(gibsMap);
        
        // Set up layer control
        setupLayerControl();
        
        // Add scale
        L.control.scale({ position: 'bottomleft' }).addTo(gibsMap);
        
        window.gibsMap = gibsMap;
        window.gibsMapInitialized = true;
        
        console.log('Satellite map initialized successfully');
        
        // Force size update after a moment
        setTimeout(() => {
            if (gibsMap) {
                gibsMap.invalidateSize();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error initializing map:', error);
        container.innerHTML = `<div style="padding: 20px; color: #ff6b6b;">Error loading map: ${error.message}</div>`;
    }
}

// Setup layer selection dropdown
function setupLayerControl() {
    const select = document.getElementById('gibs-layer-select');
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = '';
    
    // Group layers by category
    const categories = {
        satellite: { label: '🛰️ Satellite Imagery', layers: [] },
        nasa: { label: '🚀 NASA GIBS (Daily)', layers: [] },
        weather: { label: '🌤️ Weather', layers: [] },
        ocean: { label: '🌊 Ocean', layers: [] },
        atmosphere: { label: '💨 Atmosphere', layers: [] },
        hazards: { label: '🔥 Hazards', layers: [] },
        base: { label: '🗺️ Base Maps', layers: [] }
    };
    
    // Sort layers into categories
    Object.entries(SATELLITE_LAYERS).forEach(([key, config]) => {
        const cat = config.category || 'base';
        if (categories[cat]) {
            categories[cat].layers.push({ key, ...config });
        }
    });
    
    // Create optgroups
    Object.entries(categories).forEach(([catKey, category]) => {
        if (category.layers.length === 0) return;
        
        const optgroup = document.createElement('optgroup');
        optgroup.label = category.label;
        
        category.layers.forEach(layer => {
            const option = document.createElement('option');
            option.value = layer.key;
            option.textContent = layer.name;
            if (layer.key === 'esri_satellite') {
                option.selected = true;
            }
            optgroup.appendChild(option);
        });
        
        select.appendChild(optgroup);
    });
    
    // Handle layer change
    select.addEventListener('change', (e) => {
        setGibsLayer(e.target.value);
    });
}

// Set the active layer
function setGibsLayer(layerKey) {
    if (!gibsMap) {
        console.error('Map not initialized');
        return;
    }
    
    const config = SATELLITE_LAYERS[layerKey];
    if (!config) {
        console.error('Layer not found:', layerKey);
        return;
    }
    
    console.log('Switching to layer:', config.name);
    
    // Remove current layer
    if (currentLayer) {
        gibsMap.removeLayer(currentLayer);
        currentLayer = null;
    }
    if (baseLayer) {
        gibsMap.removeLayer(baseLayer);
        baseLayer = null;
    }
    
    // Create new layer based on type
    let newLayer;
    if (config.type === 'gibs') {
        newLayer = createGIBSLayer(config);
    } else {
        newLayer = createTileLayer(config);
    }
    
    // Add loading indicator
    showLoadingIndicator(true);
    
    newLayer.on('load', () => {
        showLoadingIndicator(false);
        console.log('Layer loaded:', config.name);
    });
    
    newLayer.on('tileerror', (e) => {
        console.warn('Tile error:', e);
    });
    
    // For NASA GIBS layers, add a dark base layer underneath
    if (config.type === 'gibs') {
        baseLayer = createTileLayer(SATELLITE_LAYERS['carto_dark']);
        baseLayer.addTo(gibsMap);
        newLayer.addTo(gibsMap);
        currentLayer = newLayer;
    } else {
        newLayer.addTo(gibsMap);
        baseLayer = newLayer;
    }
    
    // Update layer info
    updateLayerInfo(config);
}

// Show/hide loading indicator
function showLoadingIndicator(show) {
    let indicator = document.getElementById('map-loading');
    
    if (show) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'map-loading';
            indicator.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                            background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 8px; 
                            color: white; z-index: 1000; display: flex; align-items: center; gap: 10px;">
                    <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #666; 
                                                border-top-color: #fff; border-radius: 50%; 
                                                animation: spin 1s linear infinite;"></div>
                    Loading imagery...
                </div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
            const container = document.getElementById('gibs-map');
            if (container) {
                container.style.position = 'relative';
                container.appendChild(indicator);
            }
        }
    } else if (indicator) {
        indicator.remove();
    }
}

// Update layer information display
function updateLayerInfo(config) {
    const infoEl = document.getElementById('layer-info');
    if (!infoEl) return;
    
    let timeInfo = '';
    if (config.time === 'today') {
        timeInfo = `<br><small>📅 Data from: ${getGIBSDate(1)}</small>`;
    }
    
    infoEl.innerHTML = `
        <strong>${config.name}</strong>
        ${timeInfo}
    `;
}

// Center map on location
function centerGIBSMap(lat, lon, zoom = 8) {
    if (!gibsMap) return;
    gibsMap.setView([lat, lon], zoom);
}

// Update map location (called from main script)
function updateGIBSMapLocation() {
    if (!gibsMap) return;
    
    const lat = window.userLocation?.lat || 10.25;
    const lon = window.userLocation?.lon || -61.63;
    
    centerGIBSMap(lat, lon);
}

// Setup map control buttons
function setupMapControls() {
    // Center on user location
    const centerBtn = document.getElementById('centerMapButton');
    if (centerBtn) {
        centerBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                centerBtn.innerHTML = '⏳ Locating...';
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        centerGIBSMap(pos.coords.latitude, pos.coords.longitude, 10);
                        centerBtn.innerHTML = '📍 Center on My Location';
                    },
                    (err) => {
                        console.error('Geolocation error:', err);
                        centerBtn.innerHTML = '📍 Center on My Location';
                        alert('Could not get location');
                    }
                );
            }
        });
    }
    
    // Center on default location
    const defaultBtn = document.getElementById('centerDefaultButton');
    if (defaultBtn) {
        defaultBtn.addEventListener('click', () => {
            centerGIBSMap(10.25, -61.63, 8);
        });
    }
}

// Expose functions globally
window.initGIBSMap = initGIBSMap;
window.setGibsLayer = setGibsLayer;
window.centerGIBSMap = centerGIBSMap;
window.updateGIBSMapLocation = updateGIBSMapLocation;

// Initialize controls when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMapControls);
} else {
    setupMapControls();
}
