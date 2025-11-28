// Stellarium Web Engine Integration
// This file handles the integration with the built Stellarium Web Engine

let stellariumModule = null;
let stellariumCanvas = null;
let isEngineLoaded = false;

// Default location: La Brea, Trinidad
const DEFAULT_LAT = 10.25;
const DEFAULT_LON = -61.63;
const DEFAULT_FOV = 60;

/**
 * Check if Web Engine files are available
 */
function isWebEngineAvailable() {
    // Check if the built files exist
    // In production, these would be in stellarium-build/ directory
    return typeof Module !== 'undefined' || 
           document.querySelector('script[src*="stellarium-web-engine.js"]') !== null;
}

/**
 * Initialize Stellarium Web Engine
 */
async function initStellariumEngine(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return false;
    }

    const {
        latitude = DEFAULT_LAT,
        longitude = DEFAULT_LON,
        fov = DEFAULT_FOV,
        date = new Date(),
        showConstellations = true,
        showPlanets = true,
        showStars = true
    } = options;

    try {
        // Create canvas for WebGL rendering
        stellariumCanvas = document.createElement('canvas');
        stellariumCanvas.id = 'stellarium-canvas';
        stellariumCanvas.style.width = '100%';
        stellariumCanvas.style.height = '100%';
        stellariumCanvas.style.display = 'block';
        container.innerHTML = '';
        container.appendChild(stellariumCanvas);

        // Set canvas size
        resizeCanvas();

        // Load the Stellarium Web Engine module
        // This assumes the engine is loaded via script tag or dynamic import
        if (typeof Module === 'undefined') {
            console.warn('Stellarium Web Engine Module not found. Loading...');
            await loadStellariumEngine();
        }

        // Initialize the engine with options
        if (typeof Module !== 'undefined') {
            stellariumModule = Module({
                canvas: stellariumCanvas,
                locateFile: (path) => {
                    // Point to the WASM file location
                    return `stellarium-build/${path}`;
                },
                onRuntimeInitialized: () => {
                    console.log('Stellarium Web Engine initialized');
                    isEngineLoaded = true;
                    
                    // Set location
                    setLocation(latitude, longitude);
                    
                    // Set date/time
                    setDateTime(date);
                    
                    // Set FOV
                    setFOV(fov);
                    
                    // Configure display options
                    setDisplayOptions({
                        showConstellations,
                        showPlanets,
                        showStars
                    });
                    
                    // Start rendering
                    startRendering();
                }
            });
        } else {
            throw new Error('Failed to load Stellarium Web Engine Module');
        }

        return true;
    } catch (error) {
        console.error('Error initializing Stellarium Web Engine:', error);
        return false;
    }
}

/**
 * Load Stellarium Web Engine script dynamically
 */
function loadStellariumEngine() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof Module !== 'undefined') {
            resolve();
            return;
        }

        // Load the engine script
        const script = document.createElement('script');
        script.src = 'stellarium-build/stellarium-web-engine.js';
        script.async = true;
        script.onload = () => {
            console.log('Stellarium Web Engine script loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('Failed to load Stellarium Web Engine script');
            reject(new Error('Failed to load engine script'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Resize canvas to match container
 */
function resizeCanvas() {
    if (!stellariumCanvas) return;
    
    const container = stellariumCanvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    stellariumCanvas.width = rect.width * window.devicePixelRatio;
    stellariumCanvas.height = rect.height * window.devicePixelRatio;
    
    // Notify engine of resize
    if (stellariumModule && stellariumModule._resizeCanvas) {
        stellariumModule._resizeCanvas(stellariumCanvas.width, stellariumCanvas.height);
    }
}

/**
 * Set location (latitude, longitude)
 */
function setLocation(lat, lon) {
    if (!stellariumModule || !isEngineLoaded) return;
    
    // Convert to radians if needed
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    
    // Call engine's setLocation function
    if (stellariumModule._setLocation) {
        stellariumModule._setLocation(latRad, lonRad);
    } else if (stellariumModule.setLocation) {
        stellariumModule.setLocation(latRad, lonRad);
    }
}

/**
 * Set date and time
 */
function setDateTime(date) {
    if (!stellariumModule || !isEngineLoaded) return;
    
    // Convert to Julian Day or Unix timestamp as required by engine
    const jd = dateToJulianDay(date);
    
    if (stellariumModule._setDate) {
        stellariumModule._setDate(jd);
    } else if (stellariumModule.setDate) {
        stellariumModule.setDate(jd);
    }
}

/**
 * Set field of view
 */
function setFOV(fov) {
    if (!stellariumModule || !isEngineLoaded) return;
    
    // Convert to radians
    const fovRad = fov * Math.PI / 180;
    
    if (stellariumModule._setFOV) {
        stellariumModule._setFOV(fovRad);
    } else if (stellariumModule.setFOV) {
        stellariumModule.setFOV(fovRad);
    }
}

/**
 * Set display options
 */
function setDisplayOptions(options) {
    if (!stellariumModule || !isEngineLoaded) return;
    
    if (stellariumModule._setShowConstellations) {
        stellariumModule._setShowConstellations(options.showConstellations);
    }
    if (stellariumModule._setShowPlanets) {
        stellariumModule._setShowPlanets(options.showPlanets);
    }
    if (stellariumModule._setShowStars) {
        stellariumModule._setShowStars(options.showStars);
    }
}

/**
 * Start rendering loop
 */
function startRendering() {
    if (!stellariumModule || !isEngineLoaded) return;
    
    // Request animation frame for rendering
    function render() {
        if (stellariumModule && stellariumModule._render) {
            stellariumModule._render();
        }
        requestAnimationFrame(render);
    }
    
    render();
}

/**
 * Convert JavaScript Date to Julian Day
 */
function dateToJulianDay(date) {
    const time = date.getTime();
    return (time / 86400000) + 2440587.5;
}

/**
 * Handle window resize
 */
window.addEventListener('resize', () => {
    resizeCanvas();
});

// Export functions for use in sky-map.html
window.StellariumEngine = {
    init: initStellariumEngine,
    setLocation: setLocation,
    setDateTime: setDateTime,
    setFOV: setFOV,
    setDisplayOptions: setDisplayOptions,
    isAvailable: isWebEngineAvailable
};

