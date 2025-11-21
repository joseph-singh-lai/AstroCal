// GIBS (Global Imagery Browse Services) Map Integration
// Uses Leaflet to display NASA satellite imagery

let gibsMap = null;
let currentLayer = null;
let mapInitializationAttempted = false;

// GIBS tile layer URLs - Using correct WMTS format
// Note: GIBS tiles may have CORS restrictions. Using NASA Worldview as alternative.
const GIBS_LAYERS = {
    blueMarble: {
        name: 'Blue Marble (Day)',
        // Try NASA Worldview CDN first (more reliable)
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA Blue Marble',
        time: '2024-01-01',
        format: 'jpg',
        // Alternative: Use NASA Worldview tile service (try this first)
        altUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-geo/BlueMarble_ShadedRelief_Bathymetry/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg'
    },
    blueMarbleNight: {
        name: 'Blue Marble (Night)',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA VIIRS Night Lights',
        time: '2012-01-01',
        format: 'jpg',
        altUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-geo/VIIRS_CityLights_2012/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg'
    },
    viirsDayNight: {
        name: 'VIIRS Day/Night Band',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_DayNightBand_ENCC/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA VIIRS',
        time: new Date().toISOString().split('T')[0],
        format: 'jpg',
        altUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-geo/VIIRS_DayNightBand_ENCC/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg'
    },
    modisTerra: {
        name: 'MODIS Terra True Color',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA MODIS Terra',
        time: new Date().toISOString().split('T')[0],
        format: 'jpg',
        altUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-geo/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg'
    },
    modisAqua: {
        name: 'MODIS Aqua True Color',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA MODIS Aqua',
        time: new Date().toISOString().split('T')[0],
        format: 'jpg',
        altUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-geo/MODIS_Aqua_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg'
    },
    fires: {
        name: 'Active Fires',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/FIRMS/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.png',
        attribution: 'NASA FIRMS',
        time: new Date().toISOString().split('T')[0],
        format: 'png',
        altUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-geo/FIRMS/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.png'
    },
    aerosol: {
        name: 'Aerosol Index',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/OMI_Aerosol_Index/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.png',
        attribution: 'NASA OMI',
        time: new Date().toISOString().split('T')[0],
        format: 'png',
        altUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-geo/OMI_Aerosol_Index/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.png'
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
    
    if (gibsMap && gibsMap instanceof L.Map) {
        console.log('GIBS map already initialized and is valid Leaflet map');
        // Still invalidate size in case container was hidden
        if (gibsMap.invalidateSize) {
            setTimeout(() => gibsMap.invalidateSize(), 100);
        }
        return;
    }
    
    // If gibsMap exists but isn't valid, clear it
    if (gibsMap && !(gibsMap instanceof L.Map)) {
        console.warn('Existing gibsMap is not a valid Leaflet map, clearing and re-initializing...');
        gibsMap = null;
        window.gibsMap = null;
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
        // Ensure container has dimensions
        if (mapContainer.offsetHeight === 0 || mapContainer.offsetWidth === 0) {
            console.warn('Map container has no dimensions, setting defaults');
            mapContainer.style.height = '600px';
            mapContainer.style.width = '100%';
        }

        // Create map
        gibsMap = L.map('gibsMap', {
            center: [defaultLat, defaultLon],
            zoom: defaultZoom,
            minZoom: 1,
            maxZoom: 8,
            attributionControl: true,
            crs: L.CRS.EPSG3857, // Web Mercator projection
            zoomControl: true
        });

        // Start directly with GIBS Blue Marble - load immediately
        console.log('Loading GIBS Blue Marble layer...');
        try {
            switchGIBSLayer('blueMarble');
            console.log('GIBS Blue Marble layer added');
        } catch (e) {
            console.warn('GIBS layer failed, falling back to OpenStreetMap:', e);
            // Fallback to OpenStreetMap if GIBS fails
            currentLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors | <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                maxZoom: 19,
                subdomains: 'abc'
            });
            currentLayer.addTo(gibsMap);
            console.log('Map initialized with OpenStreetMap fallback');
        }
        
        // Invalidate size immediately (no delay needed if container is visible)
        if (gibsMap && gibsMap.invalidateSize) {
            gibsMap.invalidateSize();
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
    window.gibsMapInitialized = true; // Flag to track initialization
    mapInitializationAttempted = true;
    console.log('GIBS map initialized successfully');
    console.log('Map instance check:', gibsMap instanceof L.Map);
    console.log('Map has invalidateSize:', typeof gibsMap.invalidateSize === 'function');
    
    // Force a resize after initialization to ensure proper rendering
    setTimeout(() => {
        if (gibsMap && gibsMap.invalidateSize) {
            gibsMap.invalidateSize();
            console.log('Map size invalidated');
        }
    }, 200);
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
    // Try alternative URL first (NASA Worldview CDN), fallback to main GIBS URL
    // Note: altUrl is often more reliable, so we try it first
    const baseUrl = layerConfig.altUrl || layerConfig.url;
    console.log('Using tile URL base:', baseUrl.substring(0, 80) + '...');
    
    currentLayer = L.tileLayer('', {
        attribution: `© ${layerConfig.attribution} | NASA GIBS`,
        maxZoom: 8,
        minZoom: 1,
        tileSize: 256,
        zoomOffset: 0,
        // Optimize tile loading
        keepBuffer: 2,
        updateWhenIdle: false,
        updateWhenZooming: false,
        getTileUrl: function(coords) {
            try {
                // Convert Leaflet coords to GIBS WMTS format
                const level = coords.z;
                const row = coords.y;
                const col = coords.x;
                
                // GIBS uses inverted Y coordinates (TMS format)
                const maxRow = Math.pow(2, level) - 1;
                const invertedRow = maxRow - row;
                
                // Try alternative URL format first (more reliable)
                let url = baseUrl
                    .replace('{time}', time)
                    .replace('{level}', level)
                    .replace('{row}', invertedRow)
                    .replace('{col}', col);
                
                // Debug: log first few tile URLs to check format
                if (coords.x === 0 && coords.y === 0) {
                    console.log('Sample GIBS tile URL:', url);
                }
                
                return url;
            } catch (e) {
                console.error('Error generating tile URL:', e);
                return '';
            }
        },
        crossOrigin: 'anonymous',
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    });
    
    // Add tile error handler as event listener (not constructor option)
    // Note: Leaflet passes error object with tile property, not as separate parameter
    currentLayer.on('tileerror', function(error) {
        const tile = error.tile; // Tile is in the error object
        const coords = error.coords; // Coords are also in the error object
        
        console.warn('GIBS tile error for:', layerConfig.name);
        
        // Try to get the failed URL
        let failedUrl = null;
        if (tile && tile.src) {
            failedUrl = tile.src;
            console.log('Failed tile URL:', failedUrl);
        } else if (coords) {
            // Reconstruct URL from coordinates
            const level = coords.z;
            const maxRow = Math.pow(2, level) - 1;
            const invertedRow = maxRow - coords.y;
            failedUrl = baseUrl
                .replace('{time}', time)
                .replace('{level}', level)
                .replace('{row}', invertedRow)
                .replace('{col}', coords.x);
            console.log('Failed tile URL (reconstructed):', failedUrl);
            console.log('Tile coords:', coords);
        }
        
        // Log error type if available
        if (error.error) {
            console.warn('Error type:', error.error.message || error.error);
        }
        
        // Check if this is a CORS or network error
        if (failedUrl) {
            console.log('Check Network tab for this URL to see if it\'s a CORS, 404, or other HTTP error');
        }
    });

    // Add layer with error handling
    try {
        currentLayer.addTo(gibsMap);
        console.log('Switched to layer:', layerConfig.name);
        
        // Lightweight tile loading check (only once after a short delay)
        setTimeout(() => {
            if (currentLayer && currentLayer._tiles) {
                const tiles = Object.values(currentLayer._tiles);
                const loadedTiles = tiles.filter(t => t.loaded || t.complete).length;
                const totalTiles = tiles.length;
                if (totalTiles > 0) {
                    console.log(`Layer ${layerConfig.name}: ${loadedTiles}/${totalTiles} tiles loaded`);
                }
            }
        }, 1500);
    } catch (e) {
        console.error('Error adding layer to map:', e);
        // Fallback to OSM
        switchGIBSLayer('osm');
    }
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

