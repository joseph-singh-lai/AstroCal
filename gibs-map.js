// NASA GIBS Satellite Imagery - Simplified WMTS Implementation
// Uses Leaflet to display NASA satellite imagery with direct WMTS tile access

let gibsMap = null;
let currentGibsLayer = null;

const GIBS_TEMPLATE = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{date}/250m/{z}/{y}/{x}.jpg";

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

function setGibsLayer(layerName) {
    const date = getTodayDate();

    if (currentGibsLayer) {
        gibsMap.removeLayer(currentGibsLayer);
    }

    const tileUrl = GIBS_TEMPLATE
        .replace("{layer}", layerName)
        .replace("{date}", date);

    currentGibsLayer = L.tileLayer(tileUrl, {
        tileSize: 256,
        noWrap: true,
        continuousWorld: true,
        attribution: "Imagery from NASA Global Imagery Browse Services (GIBS)"
    });

    currentGibsLayer.addTo(gibsMap);
}

function initGIBSMap() {
    if (gibsMap) {
        return; // Already initialized
    }

    const mapContainer = document.getElementById("gibs-map");
    if (!mapContainer) {
        console.warn("GIBS map container not found");
        return;
    }

    // Initialize Leaflet map
    gibsMap = L.map("gibs-map", {
        center: [10.25, -61.63], // La Brea, Trinidad & Tobago
        zoom: 4,
        minZoom: 2,
        maxZoom: 8,
        worldCopyJump: true
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
