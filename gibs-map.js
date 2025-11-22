// NASA GIBS Satellite Imagery - Simplified WMTS Implementation
// Uses Leaflet to display NASA satellite imagery with direct WMTS tile access

let gibsMap = null;
let currentGibsLayer = null;

// Use EPSG3857 (Web Mercator) which is Leaflet's default
// Note: Some layers may require specific dates, not today's date
const GIBS_TEMPLATE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg";

// Layer-specific date requirements
const LAYER_DATES = {
    "MODIS_Terra_CorrectedReflectance_TrueColor": () => {
        // Use a date from 7 days ago (more likely to have data)
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split("T")[0];
    },
    "MODIS_Aqua_CorrectedReflectance_TrueColor": () => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split("T")[0];
    },
    "VIIRS_SNPP_CorrectedReflectance_TrueColor": () => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split("T")[0];
    },
    "GOES-East_ABI_GeoColor": () => {
        // GOES-East is near real-time, use today
        return new Date().toISOString().split("T")[0];
    },
    "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance": () => {
        // Night lights - use a known good date
        return "2020-01-01";
    },
    "MODIS_Terra_Aerosol": () => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split("T")[0];
    },
    "MODIS_Aqua_Cloud_Top_Temperature_Day": () => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split("T")[0];
    },
    "MODIS_Terra_Thermal_Anomalies_250m": () => {
        // Fire data - use recent date
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().split("T")[0];
    }
};

function getLayerDate(layerName) {
    if (LAYER_DATES[layerName]) {
        return LAYER_DATES[layerName]();
    }
    // Default: use 7 days ago
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
}

function setGibsLayer(layerName) {
    if (!gibsMap) {
        console.error("Map not initialized");
        return;
    }

    const date = getLayerDate(layerName);
    console.log(`Loading GIBS layer: ${layerName} with date: ${date}`);

    if (currentGibsLayer) {
        gibsMap.removeLayer(currentGibsLayer);
    }

    const tileUrl = GIBS_TEMPLATE
        .replace("{layer}", layerName)
        .replace("{date}", date);

    console.log(`GIBS tile URL template: ${tileUrl}`);

    currentGibsLayer = L.tileLayer(tileUrl, {
        tileSize: 256,
        noWrap: false,
        attribution: "Imagery from NASA Global Imagery Browse Services (GIBS)",
        maxZoom: 8,
        minZoom: 2,
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzAwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UaWxlIGVycm9yPC90ZXh0Pjwvc3ZnPg=='
    });

    // Add error handler
    currentGibsLayer.on('tileerror', function(error, tile) {
        console.warn('GIBS tile error:', error, 'for layer:', layerName);
    });

    currentGibsLayer.addTo(gibsMap);
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

    // Load default layer
    setGibsLayer("MODIS_Terra_CorrectedReflectance_TrueColor");

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
