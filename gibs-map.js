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
        // Using NASA Worldview which provides GIBS tiles through a CDN
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/{time}/GoogleMapsCompatible_Level{level}/{level}/{row}/{col}.jpg',
        attribution: 'NASA Blue Marble',
        time: '2024-01-01',
        format: 'jpg',
        // Alternative: Use NASA Worldview tile service
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

        // Start with OpenStreetMap as reliable fallback
        // Use CartoDB Positron as a more reliable alternative to OSM
        currentLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO | <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
            subdomains: 'abcd',
            ext: 'png'
        });
        
        // Add error handling for tile loading
        currentLayer.on('tileerror', function(error, tile) {
            console.warn('Tile load error:', error, tile);
        });
        
        currentLayer.addTo(gibsMap);
        console.log('Map initialized with CartoDB base layer');
        
        // Force map to resize and render after container becomes visible
        setTimeout(() => {
            if (gibsMap) {
                console.log('Invalidating map size and checking tile loading...');
                gibsMap.invalidateSize();
                
                // Check if tiles are loading
                setTimeout(() => {
                    if (currentLayer && currentLayer._tiles) {
                        const tiles = Object.values(currentLayer._tiles);
                        const loaded = tiles.filter(t => t.complete && t.naturalWidth > 0).length;
                        const total = tiles.length;
                        console.log(`Base layer tiles: ${loaded}/${total} loaded`);
                        
                        if (loaded === 0 && total > 0) {
                            console.warn('No tiles loaded, trying alternative tile provider...');
                            // Try OpenStreetMap directly
                            gibsMap.removeLayer(currentLayer);
                            currentLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap contributors',
                                maxZoom: 19
                            });
                            currentLayer.addTo(gibsMap);
                            gibsMap.invalidateSize();
                        }
                    }
                }, 2000);
            }
        }, 500);
        
        // Try to load GIBS layer after ensuring base layer works
        setTimeout(() => {
            if (gibsMap) {
                console.log('Attempting to load GIBS Blue Marble layer...');
                try {
                    switchGIBSLayer('blueMarble');
                } catch (e) {
                    console.warn('GIBS layer failed to load:', e);
                    console.log('Continuing with base layer');
                }
            }
        }, 3000);
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
    const baseUrl = layerConfig.altUrl || layerConfig.url;
    
    currentLayer = L.tileLayer('', {
        attribution: `© ${layerConfig.attribution} | NASA GIBS`,
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
                
                // Try alternative URL format first (more reliable)
                let url = baseUrl
                    .replace('{time}', time)
                    .replace('{level}', level)
                    .replace('{row}', invertedRow)
                    .replace('{col}', col);
                
                return url;
            } catch (e) {
                console.error('Error generating tile URL:', e);
                return '';
            }
        },
        crossOrigin: 'anonymous', // Handle CORS
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    });

    // Add layer with error handling
    try {
        currentLayer.addTo(gibsMap);
        console.log('Switched to layer:', layerConfig.name);
        
        // Monitor tile loading
        let tileLoadAttempts = 0;
        const checkTileLoading = setInterval(() => {
            if (!currentLayer || !gibsMap) {
                clearInterval(checkTileLoading);
                return;
            }
            
            tileLoadAttempts++;
            if (currentLayer._tiles) {
                const tiles = Object.values(currentLayer._tiles);
                const loadedTiles = tiles.filter(t => t.loaded || t.complete).length;
                const errorTiles = tiles.filter(t => t.classList && t.classList.contains('leaflet-error-tile')).length;
                
                if (tileLoadAttempts === 3) {
                    console.log(`Layer ${layerConfig.name}: ${loadedTiles} tiles loaded, ${errorTiles} errors`);
                }
                
                // If many errors and using altUrl, try main URL
                if (tileLoadAttempts >= 5 && errorTiles > loadedTiles && baseUrl === layerConfig.altUrl && layerConfig.url) {
                    console.warn('Many tile errors detected, trying main GIBS URL format...');
                    clearInterval(checkTileLoading);
                    // Remove current layer and try with main URL
                    gibsMap.removeLayer(currentLayer);
                    const mainUrl = layerConfig.url;
                    const newLayer = L.tileLayer('', {
                        attribution: `© ${layerConfig.attribution} | NASA GIBS`,
                        maxZoom: 8,
                        minZoom: 1,
                        tileSize: 256,
                        getTileUrl: function(coords) {
                            const level = coords.z;
                            const maxRow = Math.pow(2, level) - 1;
                            const invertedRow = maxRow - coords.y;
                            return mainUrl
                                .replace('{time}', time)
                                .replace('{level}', level)
                                .replace('{row}', invertedRow)
                                .replace('{col}', coords.x);
                        },
                        crossOrigin: 'anonymous',
                        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                    });
                    currentLayer = newLayer;
                    newLayer.addTo(gibsMap);
                }
                
                // Stop checking after 10 attempts
                if (tileLoadAttempts >= 10) {
                    clearInterval(checkTileLoading);
                }
            }
        }, 1000);
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

