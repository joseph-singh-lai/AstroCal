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
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/sat_meteo_imagery_goes16geocolor/MapServer/WMTS/tile/1.0.0/sat_meteo_imagery_goes16geocolor/default/default028mm/{z}/{y}/{x}.jpg",
        attribution: 'Imagery © NOAA',
        maxZoom: 8,
        description: "NOAA GOES-East GeoColor (near real-time)"
    },
    "NOAA_GOES_West": {
        type: "noaa",
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/sat_meteo_imagery_goes17geocolor/MapServer/WMTS/tile/1.0.0/sat_meteo_imagery_goes17geocolor/default/default028mm/{z}/{y}/{x}.jpg",
        attribution: 'Imagery © NOAA',
        maxZoom: 8,
        description: "NOAA GOES-West GeoColor (near real-time)"
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
        minZoom: 2,
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzAwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UaWxlIGVycm9yPC90ZXh0Pjwvc3ZnPg=='
    };

    // Add subdomains for OSM
    if (layerConfig.subdomains) {
        tileOptions.subdomains = layerConfig.subdomains;
    }

    currentGibsLayer = L.tileLayer(layerConfig.url, tileOptions);

    // Add error handler - fallback to OSM if satellite imagery fails
    let errorCount = 0;
    const maxErrors = 5;
    
    currentGibsLayer.on('tileerror', function(error, tile) {
        errorCount++;
        console.warn(`Tile error (${errorCount}/${maxErrors}):`, error, 'for layer:', mappedLayer);
        
        // If too many errors and not already on OSM, switch to OSM
        if (errorCount >= maxErrors && mappedLayer !== "OpenStreetMap") {
            console.warn('Too many tile errors, falling back to OpenStreetMap');
            setGibsLayer("OpenStreetMap");
        }
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

    // Load default layer - start with NOAA GOES-East, fallback to OSM
    setGibsLayer("NOAA_GOES_East");

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
