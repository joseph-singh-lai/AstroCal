// GIBS (Global Imagery Browse Services) Map Integration
// Uses Leaflet to display NASA satellite imagery

let gibsMap = null;
let currentLayer = null;
let mapInitializationAttempted = false;

// GIBS tile layer URLs - Using correct WMTS format
const GIBS_LAYERS = {
    blueMarble: {
        name: 'Blue Marble (Day)',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA Blue Marble',
        time: '2024-01-01',
        format: 'jpg'
    },
    blueMarbleNight: {
        name: 'Blue Marble (Night)',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA VIIRS Night Lights',
        time: '2012-01-01',
        format: 'jpg'
    },
    viirsDayNight: {
        name: 'VIIRS Day/Night Band',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_DayNightBand_ENCC/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA VIIRS',
        time: new Date().toISOString().split('T')[0],
        format: 'jpg'
    },
    modisTerra: {
        name: 'MODIS Terra True Color',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA MODIS Terra',
        time: new Date().toISOString().split('T')[0],
        format: 'jpg'
    },
    modisAqua: {
        name: 'MODIS Aqua True Color',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA MODIS Aqua',
        time: new Date().toISOString().split('T')[0],
        format: 'jpg'
    },
    fires: {
        name: 'Active Fires',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/FIRMS/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.png',
        attribution: 'NASA FIRMS',
        time: new Date().toISOString().split('T')[0],
        format: 'png'
    },
    aerosol: {
        name: 'Aerosol Index',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/OMI_Aerosol_Index/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.png',
        attribution: 'NASA OMI',
        time: new Date().toISOString().split('T')[0],
        format: 'png'
    }
};

/**
 * Initialize GIBS map
 */
function initGIBSMap() {
    const mapContainer = document.getElementById('gibsMap');
    if (!mapContainer) {
        console.error('GIBS map container not found');
        return;
    }
    
    if (gibsMap) {
        console.log('GIBS map already initialized');
        return;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Error: Leaflet map library failed to load. Please check your internet connection.</div>';
        return;
    }

    // Default to La Brea, Trinidad & Tobago
    const defaultLat = 10.25;
    const defaultLon = -61.63;
    const defaultZoom = 8;

    try {
        // Create map
        gibsMap = L.map('gibsMap', {
            center: [defaultLat, defaultLon],
            zoom: defaultZoom,
            minZoom: 1,
            maxZoom: 8,
            attributionControl: true,
            crs: L.CRS.EPSG3857 // Web Mercator projection
        });

        // Try to add GIBS layer, but immediately fallback to OpenStreetMap
        // GIBS has CORS issues and complex URL requirements
        // Using OpenStreetMap as primary, with option to try GIBS later
        try {
            // Use OpenStreetMap as primary (more reliable)
            currentLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors | <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                maxZoom: 19
            });
            currentLayer.addTo(gibsMap);
            
            // Try GIBS in background (may fail due to CORS)
            setTimeout(() => {
                try {
                    switchGIBSLayer('blueMarble');
                    console.log('GIBS layer loaded successfully');
                } catch (e) {
                    console.warn('GIBS layer unavailable (CORS or service issue), using OpenStreetMap');
                }
            }, 500);
        } catch (e) {
            console.error('Error setting up map layer:', e);
            mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Error loading map. Please refresh the page.</div>';
        }
    } catch (error) {
        console.error('Error initializing map:', error);
        mapContainer.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Error initializing map: ${error.message}</div>`;
        return;
    }

    // Setup layer selector
    const layerSelect = document.getElementById('layerSelect');
    if (layerSelect) {
        layerSelect.addEventListener('change', (e) => {
            switchGIBSLayer(e.target.value);
        });
    }

    // Center map buttons
    const centerMapButton = document.getElementById('centerMapButton');
    const centerDefaultButton = document.getElementById('centerDefaultButton');

    if (centerMapButton) {
        centerMapButton.addEventListener('click', () => {
            const currentLocation = getCurrentLocation();
            if (currentLocation && currentLocation.lat && currentLocation.lon) {
                gibsMap.setView([currentLocation.lat, currentLocation.lon], 10);
            } else {
                alert('Please enable location access first using the location button in the Events section.');
            }
        });
    }

    if (centerDefaultButton) {
        centerDefaultButton.addEventListener('click', () => {
            gibsMap.setView([defaultLat, defaultLon], defaultZoom);
        });
    }

    window.gibsMap = gibsMap; // Store globally
    mapInitializationAttempted = true;
    console.log('GIBS map initialized successfully');
    
    // Force a resize after initialization to ensure proper rendering
    setTimeout(() => {
        if (gibsMap && gibsMap.invalidateSize) {
            gibsMap.invalidateSize();
        }
    }, 100);
}

/**
 * Switch GIBS layer
 */
function switchGIBSLayer(layerKey) {
    if (!gibsMap) return;

    // Handle OpenStreetMap option
    if (layerKey === 'osm') {
        if (currentLayer) {
            gibsMap.removeLayer(currentLayer);
        }
        currentLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors | <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19
        });
        currentLayer.addTo(gibsMap);
        console.log('Switched to OpenStreetMap');
        return;
    }

    const layerConfig = GIBS_LAYERS[layerKey];
    if (!layerConfig) {
        console.error('Unknown layer:', layerKey);
        return;
    }

    // Remove current layer
    if (currentLayer) {
        gibsMap.removeLayer(currentLayer);
    }

    // Create new layer with proper WMTS format
    const time = layerConfig.time || new Date().toISOString().split('T')[0];
    
    // Use Leaflet's tileLayer with custom getTileUrl
    // Note: GIBS WMTS uses a specific URL format
    currentLayer = L.tileLayer('', {
        attribution: `© ${layerConfig.attribution}`,
        maxZoom: 8,
        minZoom: 1,
        tileSize: 256,
        zoomOffset: 0,
        getTileUrl: function(coords) {
            try {
                // Convert Leaflet coords to GIBS WMTS format
                const level = coords.z;
                const row = coords.y;
                const col = coords.x;
                
                // GIBS uses inverted Y coordinates (TMS format)
                const maxRow = Math.pow(2, level) - 1;
                const invertedRow = maxRow - row;
                
                let url = layerConfig.url
                    .replace('{time}', time)
                    .replace('{level}', level)
                    .replace('{row}', invertedRow)
                    .replace('{col}', col);
                
                // Debug: uncomment to see tile URLs
                // console.log('GIBS tile URL:', url);
                return url;
            } catch (e) {
                console.error('Error generating tile URL:', e);
                return '';
            }
        },
        crossOrigin: true, // Handle CORS
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    });

    currentLayer.addTo(gibsMap);
    console.log('Switched to layer:', layerConfig.name);
}

/**
 * Update map center when user location changes
 */
function updateGIBSMapLocation() {
    if (!gibsMap) return;

    const currentLocation = getCurrentLocation();
    if (currentLocation && currentLocation.lat && currentLocation.lon) {
        gibsMap.setView([currentLocation.lat, currentLocation.lon], 10);
    }
}

// Make functions globally accessible
window.initGIBSMap = initGIBSMap;
window.updateGIBSMapLocation = updateGIBSMapLocation;
window.switchGIBSLayer = switchGIBSLayer;

