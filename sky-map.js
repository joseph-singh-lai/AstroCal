// Custom Interactive Sky Map
// Replaces Stellarium with a custom canvas-based implementation
// Version: 2.1 - Fixed initialization

let skyCanvas = null;
let skyCtx = null;
// Make skyMapInitialized global so script.js can access it
window.skyMapInitialized = false;

// Sky map state
let skyMapState = {
    lat: 10.25,  // Default: La Brea, Trinidad & Tobago
    lon: -61.63,
    time: new Date(),
    zoom: 1.0,
    panX: 0,
    panY: 0,
    showConstellations: false, // Disabled to debug
    showPlanets: false, // Disabled to debug
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

// Bright stars data (simplified catalog)
const BRIGHT_STARS = [
    { name: 'Sirius', ra: 6.7525, dec: -16.7161, mag: -1.46 },
    { name: 'Canopus', ra: 6.3992, dec: -52.6956, mag: -0.74 },
    { name: 'Arcturus', ra: 14.2611, dec: 19.1824, mag: -0.05 },
    { name: 'Vega', ra: 18.6156, dec: 38.7836, mag: 0.03 },
    { name: 'Capella', ra: 5.2782, dec: 45.9980, mag: 0.08 },
    { name: 'Rigel', ra: 5.2423, dec: -8.2016, mag: 0.13 },
    { name: 'Procyon', ra: 7.6550, dec: 5.2249, mag: 0.34 },
    { name: 'Betelgeuse', ra: 5.9195, dec: 7.4071, mag: 0.45 },
    { name: 'Altair', ra: 19.8464, dec: 8.8683, mag: 0.76 },
    { name: 'Spica', ra: 13.4199, dec: -11.1613, mag: 0.98 },
    { name: 'Antares', ra: 16.4901, dec: -26.4320, mag: 1.06 },
    { name: 'Pollux', ra: 7.7553, dec: 28.0262, mag: 1.16 },
    { name: 'Fomalhaut', ra: 22.9608, dec: -29.6222, mag: 1.17 },
    { name: 'Deneb', ra: 20.6905, dec: 45.2803, mag: 1.25 },
    { name: 'Regulus', ra: 10.1396, dec: 11.9672, mag: 1.36 }
];

// Major planets (simplified positions - would need ephemeris for accuracy)
const PLANETS = [
    { name: 'Mercury', symbol: '☿', color: '#8C7853' },
    { name: 'Venus', symbol: '♀', color: '#FFC649' },
    { name: 'Mars', symbol: '♂', color: '#CD5C5C' },
    { name: 'Jupiter', symbol: '♃', color: '#D8CA9D' },
    { name: 'Saturn', symbol: '♄', color: '#FAD5A5' }
];

// Constellation lines (simplified - major patterns)
const CONSTELLATION_LINES = [
    // Big Dipper (Ursa Major)
    { stars: [['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid']] },
    // Orion
    { stars: [['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Alnitak', 'Rigel'], ['Rigel', 'Saiph']] },
    // Cassiopeia (W shape)
    { stars: [['Schedar', 'Caph'], ['Caph', 'Cih'], ['Cih', 'Ruchbah'], ['Ruchbah', 'Segin']] }
];

/**
 * Initialize the sky map
 */
function initSkyMap() {
    skyCanvas = document.getElementById('skyCanvas');
    if (!skyCanvas) {
        console.error('Sky canvas not found');
        return;
    }
    
    skyCtx = skyCanvas.getContext('2d');
    
    // Set canvas size
    resizeSkyCanvas();
    window.addEventListener('resize', resizeSkyCanvas);

    // Event listeners
    setupSkyMapListeners();

    // Initial render
    renderSkyMap();
    window.skyMapInitialized = true;
}

/**
 * Resize canvas to fit container
 */
function resizeSkyCanvas() {
    if (!skyCanvas) return;
    
    // Get container dimensions
    const container = skyCanvas.parentElement;
    if (!container) return;
    
    // Get display size (CSS size)
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight || 500;
    
    // Set canvas internal size to match display size exactly to prevent scaling artifacts
    // This prevents the browser from scaling the canvas, which can cause visual artifacts like lines
    if (skyCanvas.width !== displayWidth || skyCanvas.height !== displayHeight) {
        skyCanvas.width = displayWidth;
        skyCanvas.height = displayHeight;
        // Re-render after resize
        if (window.skyMapInitialized) {
            renderSkyMap();
        }
    }
}

/**
 * Setup event listeners for sky map
 */
function setupSkyMapListeners() {
    // Mouse events for panning
    skyCanvas.addEventListener('mousedown', (e) => {
        skyMapState.isDragging = true;
        skyMapState.lastMouseX = e.offsetX;
        skyMapState.lastMouseY = e.offsetY;
    });
    
    skyCanvas.addEventListener('mousemove', (e) => {
        if (skyMapState.isDragging) {
            const dx = e.offsetX - skyMapState.lastMouseX;
            const dy = e.offsetY - skyMapState.lastMouseY;
            skyMapState.panX += dx;
            skyMapState.panY += dy;
            skyMapState.lastMouseX = e.offsetX;
            skyMapState.lastMouseY = e.offsetY;
            renderSkyMap();
        }
    });
    
    skyCanvas.addEventListener('mouseup', () => {
        skyMapState.isDragging = false;
    });
    
    skyCanvas.addEventListener('mouseleave', () => {
        skyMapState.isDragging = false;
    });
    
    // Wheel for zooming
    skyCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        skyMapState.zoom = Math.max(0.5, Math.min(3.0, skyMapState.zoom * zoomFactor));
        renderSkyMap();
    });
    
    // Control buttons
    const useLocationBtn = document.getElementById('sky-use-location');
    const resetViewBtn = document.getElementById('sky-reset-view');
    const toggleConstellationsBtn = document.getElementById('sky-toggle-constellations');
    const togglePlanetsBtn = document.getElementById('sky-toggle-planets');
    
    if (useLocationBtn) {
        useLocationBtn.addEventListener('click', () => {
            const location = getCurrentLocation();
            if (location) {
                skyMapState.lat = location.lat;
                skyMapState.lon = location.lon;
                renderSkyMap();
            } else {
                alert('Location not available. Please enable location access.');
            }
        });
    }
    
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            skyMapState.zoom = 1.0;
            skyMapState.panX = 0;
            skyMapState.panY = 0;
            renderSkyMap();
        });
    }

    if (toggleConstellationsBtn) {
        toggleConstellationsBtn.addEventListener('click', () => {
            skyMapState.showConstellations = !skyMapState.showConstellations;
            // Update the data-active attribute for visual toggle state
            toggleConstellationsBtn.setAttribute('data-active', skyMapState.showConstellations.toString());
            renderSkyMap();
        });
    }

    if (togglePlanetsBtn) {
        togglePlanetsBtn.addEventListener('click', () => {
            skyMapState.showPlanets = !skyMapState.showPlanets;
            // Update the data-active attribute for visual toggle state
            togglePlanetsBtn.setAttribute('data-active', skyMapState.showPlanets.toString());
            renderSkyMap();
        });
    }
}

/**
 * Convert RA/Dec to screen coordinates
 */
function raDecToScreen(ra, dec, width, height) {
    // Simplified projection (equirectangular)
    const centerX = width / 2 + skyMapState.panX;
    const centerY = height / 2 + skyMapState.panY;
    
    // Convert RA (0-24h) to degrees (0-360°)
    const raDeg = (ra / 24) * 360;
    
    // Project to screen (simplified - doesn't account for observer location/time)
    const x = centerX + (raDeg - 180) * skyMapState.zoom;
    const y = centerY - dec * skyMapState.zoom;
    
    return { x, y };
}

/**
 * Render the sky map
 */
function renderSkyMap() {
    if (!skyCanvas || !skyCtx) return;

    const width = skyCanvas.width;
    const height = skyCanvas.height;

    // Clear canvas completely - ensure we're using the actual canvas dimensions
    skyCtx.clearRect(0, 0, width, height);
    
    // Reset transform to identity to prevent any transform artifacts
    skyCtx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Fill background
    skyCtx.fillStyle = '#0a0e27';
    skyCtx.fillRect(0, 0, width, height);

    // Reset all canvas state to defaults to prevent artifacts
    skyCtx.globalAlpha = 1.0;
    skyCtx.lineWidth = 0; // Set to 0 to prevent any accidental line drawing
    skyCtx.strokeStyle = 'transparent'; // Make stroke transparent
    skyCtx.fillStyle = '#ffffff';
    skyCtx.textAlign = 'left';
    skyCtx.textBaseline = 'alphabetic';
    skyCtx.font = '10px Arial, sans-serif';
    skyCtx.setLineDash([]); // Ensure no dashed lines
    skyCtx.lineCap = 'butt'; // Prevent line caps
    skyCtx.lineJoin = 'miter'; // Prevent line joins
    
    // Ensure no composite operations that could cause artifacts
    skyCtx.globalCompositeOperation = 'source-over';

    // Draw stars
    skyCtx.fillStyle = '#ffffff';
    BRIGHT_STARS.forEach(star => {
        const pos = raDecToScreen(star.ra, star.dec, width, height);
        
        // Star size based on magnitude (brighter = larger)
        const size = Math.max(1, (2.5 - star.mag) * 2);
        
        // Only draw if on screen
        if (pos.x >= -50 && pos.x <= width + 50 && pos.y >= -50 && pos.y <= height + 50) {
            // Isolate each star drawing to prevent path artifacts
            skyCtx.save();
            skyCtx.beginPath();
            skyCtx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            skyCtx.fill();
            skyCtx.restore(); // Restore state after each star
            
            // Label bright stars - temporarily disabled to debug line issue
            // if (star.mag < 1.0) {
            //     skyCtx.save(); // Save state
            //     skyCtx.fillStyle = '#b8c5e0';
            //     skyCtx.font = '12px Arial, sans-serif';
            //     skyCtx.textAlign = 'left';
            //     skyCtx.textBaseline = 'middle';
            //     skyCtx.fillText(star.name, pos.x + size + 5, pos.y);
            //     skyCtx.restore(); // Restore state
            // }
        }
    });
    
    // Constellation lines and planets completely removed for debugging
    
    // Draw info
    const infoEl = document.getElementById('skyInfo');
    if (infoEl) {
    const location = getCurrentLocation();
        const lat = location ? location.lat : skyMapState.lat;
        const lon = location ? location.lon : skyMapState.lon;
        infoEl.innerHTML = `
            <div>📍 Location: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</div>
            <div>🔍 Zoom: ${(skyMapState.zoom * 100).toFixed(0)}%</div>
            <div>🕐 Time: ${skyMapState.time.toLocaleTimeString()}</div>
        `;
    }
}

/**
 * Update sky map location
 */
function updateSkyMapLocation(lat, lon) {
    skyMapState.lat = lat;
    skyMapState.lon = lon;
    if (window.skyMapInitialized) {
        renderSkyMap();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for other scripts to load
        setTimeout(initSkyMap, 100);
    });
    } else {
    setTimeout(initSkyMap, 100);
}

