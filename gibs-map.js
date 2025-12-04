// Satellite Imagery - NOAA GOES with OSM fallback
// Uses Leaflet to display satellite imagery with fallback options

let gibsMap = null;
let currentGibsLayer = null;

// NOAA GOES Satellite Imagery Sources
// Note: These are experimental - may need adjustment based on actual availability
const NOAA_GOES_TEMPLATES = {
    // GOES-East GeoColor (near real-time)
    "GOES-East_GeoColor": "https://rammb-slider.cira.colostate.edu/data/imagery/{date}/goes-16---geocolor/{z}/{y}/{x}.jpg",
    // Alternative: Try NOAA CoastWatch if available
    "NOAA_CoastWatch": "https://coastwatch.noaa.gov/cw_html/cwView_EPA.html"
};

// OpenStreetMap fallback (reliable base layer)
const OSM_TEMPLATE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// Available satellite imagery layers
const SATELLITE_LAYERS = {
    "OpenStreetMap": {
        type: "osm",
        url: OSM_TEMPLATE,
        attribution: '© OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        description: "Standard map view (reliable fallback)"
    },
    "NOAA_GOES_East": {
        type: "noaa",
        // Try TMS format (ArcGIS REST format) - note: Leaflet uses {z}/{x}/{y} but ArcGIS uses {z}/{y}/{x}
        // We'll need to handle coordinate conversion
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/sat_meteo_imagery_goes16geocolor/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Imagery © NOAA',
        maxZoom: 8,
        minZoom: 2,
        description: "NOAA GOES-East GeoColor (near real-time)",
        tms: true // ArcGIS uses TMS (Y coordinate flipped)
    },
    "NOAA_GOES_West": {
        type: "noaa",
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/sat_meteo_imagery_goes17geocolor/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Imagery © NOAA',
        maxZoom: 8,
        minZoom: 2,
        description: "NOAA GOES-West GeoColor (near real-time)",
        tms: true
    }
};

// Legacy GIBS layer names mapped to new options
const LEGACY_LAYER_MAP = {
    "MODIS_Terra_CorrectedReflectance_TrueColor": "NOAA_GOES_East",
    "MODIS_Aqua_CorrectedReflectance_TrueColor": "NOAA_GOES_West",
    "VIIRS_SNPP_CorrectedReflectance_TrueColor": "NOAA_GOES_East",
    "GOES-East_ABI_GeoColor": "NOAA_GOES_East",
    "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance": "OpenStreetMap",
    "MODIS_Terra_Aerosol": "NOAA_GOES_East",
    "MODIS_Aqua_Cloud_Top_Temperature_Day": "NOAA_GOES_West",
    "MODIS_Terra_Thermal_Anomalies_250m": "NOAA_GOES_East"
};

function setGibsLayer(layerName) {
    if (!gibsMap) {
        console.error("Map not initialized");
        return;
    }

    // Map legacy layer names to new layer system
    const mappedLayer = LEGACY_LAYER_MAP[layerName] || layerName;
    
    // Get layer configuration
    const layerConfig = SATELLITE_LAYERS[mappedLayer];
    
    if (!layerConfig) {
        console.warn(`Layer ${layerName} not found, using OpenStreetMap fallback`);
        setGibsLayer("OpenStreetMap");
        return;
    }

    console.log(`Loading satellite layer: ${mappedLayer} (${layerConfig.description})`);

    if (currentGibsLayer) {
        gibsMap.removeLayer(currentGibsLayer);
    }

    // Create tile layer with appropriate configuration
    const tileOptions = {
        tileSize: 256,
        noWrap: false,
        attribution: layerConfig.attribution,
        maxZoom: layerConfig.maxZoom || 18,
        minZoom: layerConfig.minZoom || 2,
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzAwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UaWxlIGVycm9yPC90ZXh0Pjwvc3ZnPg=='
    };

    // Add subdomains for OSM
    if (layerConfig.subdomains) {
        tileOptions.subdomains = layerConfig.subdomains;
    }

    // Handle TMS format (Y coordinate flipped) for ArcGIS services
    if (layerConfig.tms) {
        tileOptions.tms = true;
    }

    // For NOAA layers, use proxy to bypass CORS
    // Create custom tile layer class that properly overrides getTileUrl
    if (layerConfig.type === "noaa") {
        // Extend L.TileLayer to properly override getTileUrl
        const ProxyTileLayer = L.TileLayer.extend({
            getTileUrl: function(coords) {
                console.log('getTileUrl called with coords:', coords);
                
                // Build the actual NOAA tile URL with coordinates
                // Note: TMS format uses {z}/{y}/{x}, Leaflet will handle TMS flag via tms: true
                let actualUrl = layerConfig.url
                    .replace('{z}', coords.z)
                    .replace('{y}', coords.y)
                    .replace('{x}', coords.x);
                
                // Route through proxy to avoid CORS
                const proxyUrl = `/api/gibs-tile.js?url=${encodeURIComponent(actualUrl)}`;
                console.log(`NOAA tile request: z=${coords.z}, y=${coords.y}, x=${coords.x}`);
                console.log(`Actual URL: ${actualUrl}`);
                console.log(`Proxy URL: ${proxyUrl}`);
                return proxyUrl;
            }
        });
        
        // Create instance with placeholder URL (required by Leaflet but won't be used)
        currentGibsLayer = new ProxyTileLayer('https://placeholder/{z}/{x}/{y}.png', tileOptions);
        
        console.log('Using proxy for NOAA tiles to bypass CORS');
        console.log('NOAA tile URL template:', layerConfig.url);
    } else {
        // For OSM, use standard tile layer
        currentGibsLayer = L.tileLayer(layerConfig.url, tileOptions);
    }

    // Add error handler - fallback to OSM if satellite imagery fails
    let errorCount = 0;
    let successCount = 0;
    const maxErrors = 3; // Lower threshold for faster fallback
    
    currentGibsLayer.on('tileerror', function(error) {
        errorCount++;
        console.warn(`Tile error (${errorCount}/${maxErrors}):`, error);
        
        // Safely get tile URL if available
        const tileUrl = error.tile ? (error.tile.src || 'unknown') : 'tile object unavailable';
        console.warn('Failed tile URL:', tileUrl);
        console.warn('Error details:', error);
        
        // If too many errors and not already on OSM, switch to OSM
        if (errorCount >= maxErrors && mappedLayer !== "OpenStreetMap") {
            console.warn('NOAA satellite imagery unavailable, falling back to OpenStreetMap');
            console.warn(`Total errors: ${errorCount}, Successes: ${successCount}`);
            
            // Show user-friendly message
            const mapContainer = document.getElementById("gibs-map");
            if (mapContainer) {
                const existingMsg = mapContainer.querySelector('.layer-error-message');
                if (!existingMsg) {
                    const msg = document.createElement('div');
                    msg.className = 'layer-error-message';
                    msg.style.cssText = 'position: absolute; top: 10px; left: 10px; right: 10px; background: rgba(255, 100, 100, 0.9); color: white; padding: 10px; border-radius: 5px; z-index: 1000; font-size: 0.9rem;';
                    msg.innerHTML = '⚠️ NOAA satellite imagery unavailable. Switched to OpenStreetMap.';
                    mapContainer.style.position = 'relative';
                    mapContainer.appendChild(msg);
                    
                    // Remove message after 5 seconds
                    setTimeout(() => {
                        if (msg.parentNode) {
                            msg.parentNode.removeChild(msg);
                        }
                    }, 5000);
                }
            }
            
            setGibsLayer("OpenStreetMap");
        }
    });
    
    // Track successful tile loads (but ignore error placeholder tiles)
    currentGibsLayer.on('tileload', function(event) {
        const tileUrl = event.tile ? event.tile.src : 'unknown';
        // Only count as success if it's not the error placeholder
        if (tileUrl && !tileUrl.includes('data:image/svg+xml')) {
            successCount++;
            console.log(`Tile loaded successfully (${successCount}):`, tileUrl);
            
            // Check if tile is actually visible (not transparent/empty)
            if (event.tile && event.tile.complete) {
                // Try to detect if image is mostly transparent/green (might be our fallback)
                const img = event.tile;
                if (img.naturalWidth === 1 && img.naturalHeight === 1) {
                    console.warn('Tile appears to be 1x1 pixel (likely transparent fallback):', tileUrl);
                }
            }
        } else {
            console.warn('Tile loaded but appears to be error placeholder:', tileUrl);
        }
    });
    
    // Track when tiles start loading
    currentGibsLayer.on('loading', function() {
        console.log('Tiles loading for layer:', mappedLayer);
    });

    // Reset error count on successful tile load
    currentGibsLayer.on('tileload', function() {
        if (errorCount > 0) {
            errorCount = 0; // Reset on successful load
        }
    });

    currentGibsLayer.addTo(gibsMap);
    console.log(`Layer ${mappedLayer} loaded successfully`);
}

function initGIBSMap() {
    if (gibsMap && gibsMap instanceof L.Map) {
        // Map already exists, just invalidate size
        setTimeout(() => {
            if (gibsMap.invalidateSize) {
                gibsMap.invalidateSize();
            }
        }, 100);
        return;
    }

    const mapContainer = document.getElementById("gibs-map");
    if (!mapContainer) {
        console.warn("GIBS map container not found");
        return;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error("Leaflet library not loaded");
        mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Error: Leaflet map library failed to load. Please check your internet connection.</div>';
        return;
    }

    // Initialize Leaflet map with Web Mercator (EPSG3857)
    gibsMap = L.map("gibs-map", {
        center: [10.25, -61.63], // La Brea, Trinidad & Tobago
        zoom: 4,
        minZoom: 2,
        maxZoom: 8,
        worldCopyJump: false
    });

    // Load default layer - start with OSM (reliable), NOAA available but may have issues
    setGibsLayer("OpenStreetMap");

    // Change layer dynamically
    const layerSelect = document.getElementById("gibs-layer-select");
    if (layerSelect) {
        layerSelect.addEventListener("change", (e) => {
            setGibsLayer(e.target.value);
        });
    }

    // Center on user location button
    const centerMapButton = document.getElementById("centerMapButton");
    if (centerMapButton) {
        centerMapButton.addEventListener("click", () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        gibsMap.setView([lat, lon], 6);
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        alert("Unable to retrieve your location.");
                    }
                );
            } else {
                alert("Geolocation is not supported by your browser.");
            }
        });
    }

    // Center on default location button
    const centerDefaultButton = document.getElementById("centerDefaultButton");
    if (centerDefaultButton) {
        centerDefaultButton.addEventListener("click", () => {
            gibsMap.setView([10.25, -61.63], 4);
        });
    }

    // Make map available globally
    window.gibsMap = gibsMap;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGIBSMap);
} else {
    initGIBSMap();
}

// Re-initialize when the section becomes visible
document.addEventListener("DOMContentLoaded", () => {
    const setupNavigation = () => {
        const navButtons = document.querySelectorAll(".nav-button");
        navButtons.forEach(button => {
            button.addEventListener("click", () => {
                const section = button.getAttribute("data-section");
                if (section === "gibs") {
                    // Delay initialization slightly to ensure container is visible
                    setTimeout(() => {
                        if (!gibsMap) {
                            initGIBSMap();
                        } else {
                            // Invalidate size if map already exists
                            setTimeout(() => {
                                gibsMap.invalidateSize();
                            }, 100);
                        }
                    }, 100);
                }
            });
        });
    };
    setupNavigation();
});
