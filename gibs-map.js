/**
 * AstroCal Satellite Imagery Module
 * Uses reliable, CORS-friendly satellite and map tile sources
 * Version: 3.0
 */

let gibsMap = null;
let currentLayer = null;
let baseLayer = null;
window.gibsMapInitialized = false;

// Available Satellite & Map Layers - All CORS-friendly
const SATELLITE_LAYERS = {
    // === SATELLITE IMAGERY ===
    "esri_satellite": {
        name: "ESRI World Imagery",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
        category: "satellite",
        description: "High-resolution satellite imagery worldwide"
    },
    "esri_satellite_labels": {
        name: "ESRI Satellite + Labels",
        type: "dual",
        baseUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        overlayUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 19,
        category: "satellite",
        description: "Satellite imagery with place names"
    },
    "esri_terrain": {
        name: "ESRI World Terrain",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 13,
        category: "terrain",
        description: "Terrain and topography"
    },
    "esri_topo": {
        name: "ESRI Topographic",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 19,
        category: "terrain",
        description: "Detailed topographic map"
    },
    "esri_natgeo": {
        name: "National Geographic",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri, National Geographic',
        maxZoom: 16,
        category: "terrain",
        description: "National Geographic style map"
    },
    "esri_ocean": {
        name: "ESRI Ocean Basemap",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 13,
        category: "ocean",
        description: "Ocean bathymetry and features"
    },
    
    // === WEATHER OVERLAYS ===
    "openweather_clouds": {
        name: "Cloud Cover (Live)",
        type: "overlay",
        url: "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=YOUR_API_KEY",
        fallbackUrl: "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-vis-1km-900913/{z}/{x}/{y}.png",
        attribution: '© Iowa Environmental Mesonet',
        maxZoom: 8,
        category: "weather",
        description: "GOES visible satellite imagery"
    },
    "radar_us": {
        name: "Weather Radar (US)",
        type: "overlay",
        url: "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png",
        attribution: '© Iowa Environmental Mesonet / NOAA',
        maxZoom: 8,
        category: "weather",
        description: "Live NEXRAD radar reflectivity"
    },
    "goes_visible": {
        name: "GOES Visible (US)",
        type: "overlay",
        url: "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-vis-1km-900913/{z}/{x}/{y}.png",
        attribution: '© Iowa Environmental Mesonet / NOAA',
        maxZoom: 8,
        category: "weather",
        description: "GOES visible satellite"
    },
    "goes_ir": {
        name: "GOES Infrared (US)",
        type: "overlay",
        url: "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-ir-4km-900913/{z}/{x}/{y}.png",
        attribution: '© Iowa Environmental Mesonet / NOAA',
        maxZoom: 6,
        category: "weather",
        description: "GOES infrared satellite"
    },

    // === BASE MAPS ===
    "osm": {
        name: "OpenStreetMap",
        type: "tile",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '© OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        category: "base",
        description: "Standard street map"
    },
    "carto_light": {
        name: "Light Map",
        type: "tile",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: '© CARTO © OpenStreetMap',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        category: "base",
        description: "Clean light theme"
    },
    "carto_dark": {
        name: "Dark Map",
        type: "tile",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '© CARTO © OpenStreetMap',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        category: "base",
        description: "Dark theme for night viewing"
    },
    "carto_voyager": {
        name: "Voyager (Colorful)",
        type: "tile",
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution: '© CARTO © OpenStreetMap',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        category: "base",
        description: "Colorful detailed map"
    },
    "stadia_outdoors": {
        name: "Outdoors / Hiking",
        type: "tile",
        url: "https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png",
        attribution: '© Stadia Maps © OpenStreetMap',
        maxZoom: 18,
        category: "terrain",
        description: "Great for outdoor activities"
    },
    "opentopomap": {
        name: "OpenTopoMap",
        type: "tile",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: '© OpenTopoMap (CC-BY-SA)',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 17,
        category: "terrain",
        description: "Topographic contour map"
    }
};

// Create a tile layer from config
function createTileLayer(config) {
    return L.tileLayer(config.url, {
        attribution: config.attribution,
        subdomains: config.subdomains || [],
        maxZoom: config.maxZoom || 18,
        crossOrigin: 'anonymous'
    });
}

// Create overlay layer (with dark base underneath)
function createOverlayLayers(config) {
    const base = L.tileLayer(SATELLITE_LAYERS['carto_dark'].url, {
        attribution: SATELLITE_LAYERS['carto_dark'].attribution,
        subdomains: SATELLITE_LAYERS['carto_dark'].subdomains,
        maxZoom: 19
    });
    
    // Use fallback URL if available (for weather layers that need API keys)
    const overlayUrl = config.fallbackUrl || config.url;
    const overlay = L.tileLayer(overlayUrl, {
        attribution: config.attribution,
        maxZoom: config.maxZoom || 8,
        opacity: 0.7,
        crossOrigin: 'anonymous'
    });
    
    return { base, overlay };
}

// Create dual layer (satellite + labels)
function createDualLayers(config) {
    const base = L.tileLayer(config.baseUrl, {
        attribution: config.attribution,
        maxZoom: config.maxZoom || 18
    });
    
    const labels = L.tileLayer(config.overlayUrl, {
        attribution: '',
        maxZoom: config.maxZoom || 18,
        pane: 'overlayPane'
    });
    
    return { base, labels };
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
            maxZoom: 19,
            worldCopyJump: true
        });
        
        // Add default base layer (ESRI Satellite)
        const defaultConfig = SATELLITE_LAYERS["esri_satellite"];
        baseLayer = createTileLayer(defaultConfig);
        baseLayer.addTo(gibsMap);
        
        // Set up layer control
        setupLayerControl();
        
        // Update layer info
        updateLayerInfo(defaultConfig);
        
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
        terrain: { label: '⛰️ Terrain & Topography', layers: [] },
        ocean: { label: '🌊 Ocean', layers: [] },
        weather: { label: '🌦️ Live Weather (US/Americas)', layers: [] },
        base: { label: '🗺️ Street Maps', layers: [] }
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
    
    // Remove current layers
    if (currentLayer) {
        gibsMap.removeLayer(currentLayer);
        currentLayer = null;
    }
    if (baseLayer) {
        gibsMap.removeLayer(baseLayer);
        baseLayer = null;
    }
    
    // Show loading indicator
    showLoadingIndicator(true);
    
    // Create layer based on type
    if (config.type === 'overlay') {
        // Weather/overlay layers need a base map underneath
        const layers = createOverlayLayers(config);
        baseLayer = layers.base;
        currentLayer = layers.overlay;
        
        baseLayer.addTo(gibsMap);
        currentLayer.addTo(gibsMap);
        
        currentLayer.on('load', () => showLoadingIndicator(false));
        currentLayer.on('tileerror', handleTileError);
        
    } else if (config.type === 'dual') {
        // Dual layers (satellite + labels)
        const layers = createDualLayers(config);
        baseLayer = layers.base;
        currentLayer = layers.labels;
        
        baseLayer.addTo(gibsMap);
        currentLayer.addTo(gibsMap);
        
        baseLayer.on('load', () => showLoadingIndicator(false));
        baseLayer.on('tileerror', handleTileError);
        
    } else {
        // Standard tile layer
        baseLayer = createTileLayer(config);
        baseLayer.addTo(gibsMap);
        
        baseLayer.on('load', () => showLoadingIndicator(false));
        baseLayer.on('tileerror', handleTileError);
    }
    
    // Update layer info
    updateLayerInfo(config);
}

// Handle tile loading errors
function handleTileError(e) {
    console.warn('Tile error (may be normal for edge tiles):', e.coords);
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
    
    let extraInfo = '';
    if (config.category === 'weather') {
        extraInfo = `<br><small>⚡ Live data - refreshes automatically</small>`;
    }
    
    infoEl.innerHTML = `
        <strong>${config.name}</strong>
        <span style="color: #8892b0; margin-left: 0.5rem;">— ${config.description || ''}</span>
        ${extraInfo}
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
                        centerBtn.innerHTML = '📍 My Location';
                    },
                    (err) => {
                        console.error('Geolocation error:', err);
                        centerBtn.innerHTML = '📍 My Location';
                        alert('Could not get location. Please enable location access.');
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
