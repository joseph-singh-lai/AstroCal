// Interactive Sky/Star Map
// Displays stars, planets, and constellations for the user's location

let skyCanvas = null;
let skyCtx = null;
let skyMapInitialized = false;
let skyViewTime = new Date();
let showConstellations = true;
let showPlanets = true;
let showStars = true;
let hoveredObject = null;
let clickedObject = null;

// Zoom and pan state
let skyZoom = 1.0; // 1.0 = normal, >1.0 = zoomed in, <1.0 = zoomed out
let skyPanX = 0; // Pan offset in pixels
let skyPanY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartPanX = 0;
let dragStartPanY = 0;

// Star data with RA (hours) and Dec (degrees)
const STAR_DATA = [
    { name: 'Polaris', ra: 2.53, dec: 89.26, mag: 2.0, color: '#ffffff' },
    { name: 'Sirius', ra: 6.75, dec: -16.72, mag: -1.46, color: '#ffffff' },
    { name: 'Canopus', ra: 6.40, dec: -52.70, mag: -0.74, color: '#ffffaa' },
    { name: 'Arcturus', ra: 14.26, dec: 19.18, mag: -0.05, color: '#ffaa00' },
    { name: 'Vega', ra: 18.62, dec: 38.78, mag: 0.03, color: '#aaaaff' },
    { name: 'Capella', ra: 5.28, dec: 45.99, mag: 0.08, color: '#ffffaa' },
    { name: 'Rigel', ra: 5.24, dec: -8.20, mag: 0.18, color: '#aaaaff' },
    { name: 'Procyon', ra: 7.66, dec: 5.22, mag: 0.40, color: '#ffffff' },
    { name: 'Betelgeuse', ra: 5.92, dec: 7.41, mag: 0.45, color: '#ff6600' },
    { name: 'Achernar', ra: 1.63, dec: -57.24, mag: 0.46, color: '#aaaaff' },
    { name: 'Altair', ra: 19.85, dec: 8.87, mag: 0.77, color: '#ffffff' },
    { name: 'Spica', ra: 13.42, dec: -11.16, mag: 0.98, color: '#aaaaff' },
    { name: 'Antares', ra: 16.49, dec: -26.43, mag: 1.06, color: '#ff6600' },
    { name: 'Pollux', ra: 7.76, dec: 28.03, mag: 1.16, color: '#ffffaa' },
    { name: 'Fomalhaut', ra: 22.96, dec: -29.62, mag: 1.17, color: '#ffffff' }
];

// Constellation lines (simplified)
const CONSTELLATIONS = [
    { name: 'Orion', stars: ['Betelgeuse', 'Rigel', 'Bellatrix', 'Mintaka'] },
    { name: 'Ursa Major', stars: ['Dubhe', 'Merak', 'Phecda', 'Megrez'] },
    { name: 'Cassiopeia', stars: ['Schedar', 'Caph', 'Cih', 'Ruchbah'] }
];

/**
 * Initialize sky map
 */
function initSkyMap() {
    const canvas = document.getElementById('skyCanvas');
    if (!canvas || skyMapInitialized) return;

    skyCanvas = canvas;
    skyCtx = canvas.getContext('2d');
    
    // Set canvas size
    resizeSkyCanvas();
    window.addEventListener('resize', resizeSkyCanvas);

    // Setup controls
    setupSkyControls();

    // Initial render
    renderSkyMap();

    skyMapInitialized = true;
    console.log('Sky map initialized');
}

/**
 * Resize canvas to container
 */
function resizeSkyCanvas() {
    if (!skyCanvas) return;
    
    const container = skyCanvas.parentElement;
    skyCanvas.width = container.clientWidth;
    skyCanvas.height = container.clientHeight;
    
    renderSkyMap();
}

/**
 * Setup sky map controls
 */
function setupSkyControls() {
    // Time selector
    const timeSelect = document.getElementById('skyTimeSelect');
    if (timeSelect) {
        const now = new Date();
        timeSelect.value = now.toISOString().slice(0, 16);
        timeSelect.addEventListener('change', (e) => {
            skyViewTime = new Date(e.target.value);
            renderSkyMap();
            updateVisibleEvents();
        });
    }

    // Use current time button
    const useCurrentTime = document.getElementById('useCurrentTime');
    if (useCurrentTime) {
        useCurrentTime.addEventListener('click', () => {
            const now = new Date();
            skyViewTime = now;
            if (timeSelect) {
                timeSelect.value = now.toISOString().slice(0, 16);
            }
            renderSkyMap();
            updateVisibleEvents();
        });
    }

    // Toggle checkboxes
    const showConstellationsCheck = document.getElementById('showConstellations');
    const showPlanetsCheck = document.getElementById('showPlanets');
    const showStarsCheck = document.getElementById('showStars');

    if (showConstellationsCheck) {
        showConstellationsCheck.addEventListener('change', (e) => {
            showConstellations = e.target.checked;
            renderSkyMap();
        });
    }

    if (showPlanetsCheck) {
        showPlanetsCheck.addEventListener('change', (e) => {
            showPlanets = e.target.checked;
            renderSkyMap();
        });
    }

    if (showStarsCheck) {
        showStarsCheck.addEventListener('change', (e) => {
            showStars = e.target.checked;
            renderSkyMap();
        });
    }

    // Center on location button
    const centerSkyMapButton = document.getElementById('centerSkyMapButton');
    if (centerSkyMapButton) {
        centerSkyMapButton.addEventListener('click', () => {
            // Re-render with current location
            renderSkyMap();
            updateVisibleEvents();
        });
    }

    // Canvas interaction handlers
    if (skyCanvas) {
        skyCanvas.addEventListener('click', handleSkyClick);
        skyCanvas.addEventListener('mousemove', handleSkyMouseMove);
        skyCanvas.addEventListener('wheel', handleSkyWheel, { passive: false });
        skyCanvas.addEventListener('mousedown', handleSkyMouseDown);
        skyCanvas.addEventListener('mousemove', handleSkyMouseMove);
        skyCanvas.addEventListener('mouseup', handleSkyMouseUp);
        skyCanvas.addEventListener('mouseleave', handleSkyMouseUp);
        skyCanvas.style.cursor = 'grab';
    }
}

/**
 * Convert RA/Dec to Alt/Az (simplified calculation)
 */
function raDecToAltAz(ra, dec, lat, lon, time) {
    // Convert RA from hours to degrees
    const raDeg = ra * 15;
    
    // Calculate Local Sidereal Time (simplified)
    const jd = (time.getTime() / 86400000) + 2440587.5;
    const t = (jd - 2451545.0) / 36525.0;
    let lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + lon;
    lst = lst % 360;
    if (lst < 0) lst += 360;
    
    // Hour angle
    const ha = (lst - raDeg + 360) % 360;
    const haRad = (ha * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    
    // Calculate altitude and azimuth
    const sinAlt = Math.sin(decRad) * Math.sin(latRad) + 
                   Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
    const alt = Math.asin(sinAlt) * 180 / Math.PI;
    
    const cosAz = (Math.sin(decRad) - Math.sin(alt * Math.PI / 180) * Math.sin(latRad)) /
                  (Math.cos(alt * Math.PI / 180) * Math.cos(latRad));
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
    if (Math.sin(haRad) > 0) az = 360 - az;
    
    return { alt, az };
}

/**
 * Convert Alt/Az to screen coordinates (stereographic projection)
 */
function altAzToScreen(alt, az, width, height) {
    // Only show objects above horizon (alt > 0)
    if (alt < 0) return null;
    
    // Convert to radians
    const altRad = alt * Math.PI / 180;
    const azRad = az * Math.PI / 180;
    
    // Stereographic projection
    const r = (width / 2) * Math.tan((90 - alt) * Math.PI / 180);
    const x = width / 2 + r * Math.sin(azRad);
    const y = height / 2 - r * Math.cos(azRad);
    
    return { x, y };
}

/**
 * Render the sky map
 */
function renderSkyMap() {
    if (!skyCanvas || !skyCtx) return;

    const width = skyCanvas.width;
    const height = skyCanvas.height;

    // Clear canvas
    skyCtx.fillStyle = '#0a0a1a';
    skyCtx.fillRect(0, 0, width, height);

    // Save context for transformations
    skyCtx.save();
    
    // Apply pan and zoom transformations
    skyCtx.translate(width / 2 + skyPanX, height / 2 + skyPanY);
    skyCtx.scale(skyZoom, skyZoom);
    skyCtx.translate(-width / 2, -height / 2);

    // Get current location
    const location = getCurrentLocation();
    const lat = location.lat || 10.25;
    const lon = location.lon || -61.63;

    // Draw grid first
    drawGrid(width, height);

    // Draw stars
    if (showStars) {
        drawStars(width, height, lat, lon);
    }

    // Draw constellations
    if (showConstellations) {
        drawConstellations(width, height, lat, lon);
    }

    // Draw planets
    if (showPlanets) {
        drawPlanets(width, height, lat, lon);
    }

    // Draw horizon circle
    drawHorizon(width, height);

    // Draw cardinal directions
    drawDirections(width, height);

    // Restore context
    skyCtx.restore();

    // Draw zoom indicator and controls (not affected by transform)
    drawZoomControls(width, height);

    // Draw hover/click info (not affected by transform)
    if (hoveredObject) {
        drawObjectInfo(hoveredObject, width, height);
    }
}

/**
 * Draw stars
 */
function drawStars(width, height, lat, lon) {
    const location = getCurrentLocation();
    const currentLat = location.lat || lat;
    const currentLon = location.lon || lon;

    STAR_DATA.forEach(star => {
        // Convert RA/Dec to Alt/Az
        const coords = raDecToAltAz(star.ra, star.dec, currentLat, currentLon, skyViewTime);
        if (!coords || coords.alt < 0) return; // Below horizon

        // Convert to screen coordinates
        const screen = altAzToScreen(coords.alt, coords.az, width, height);
        if (!screen) return;

        const { x, y } = screen;

        // Star size based on magnitude
        const size = Math.max(1, Math.min(6, 5 - star.mag));
        const brightness = Math.max(0.4, Math.min(1, 1.2 - (star.mag / 4)));

        // Draw star
        skyCtx.beginPath();
        skyCtx.arc(x, y, size, 0, Math.PI * 2);
        skyCtx.fillStyle = star.color || '#ffffff';
        skyCtx.globalAlpha = brightness;
        skyCtx.fill();
        skyCtx.globalAlpha = 1;

        // Add glow effect for bright stars
        if (star.mag < 1) {
            const gradient = skyCtx.createRadialGradient(x, y, 0, x, y, size * 3);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            skyCtx.fillStyle = gradient;
            skyCtx.fill();
        }

        // Star name (for bright stars)
        if (star.mag < 1.5) {
            skyCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            skyCtx.font = '11px sans-serif';
            skyCtx.fillText(star.name, x + size + 3, y + size);
        }

        // Store star data for interaction
        star.screenX = x;
        star.screenY = y;
        star.alt = coords.alt;
        star.az = coords.az;
    });
}

/**
 * Draw constellations
 */
function drawConstellations(width, height, lat, lon) {
    if (!showConstellations) return;
    
    // Draw lines between bright stars (simplified)
    skyCtx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
    skyCtx.lineWidth = 1;
    
    // Draw some basic constellation patterns
    const location = getCurrentLocation();
    const currentLat = location.lat || lat;
    const currentLon = location.lon || lon;
    
    // Orion (simplified - Betelgeuse to Rigel)
    const betelgeuse = STAR_DATA.find(s => s.name === 'Betelgeuse');
    const rigel = STAR_DATA.find(s => s.name === 'Rigel');
    
    if (betelgeuse && rigel) {
        const betelCoords = raDecToAltAz(betelgeuse.ra, betelgeuse.dec, currentLat, currentLon, skyViewTime);
        const rigelCoords = raDecToAltAz(rigel.ra, rigel.dec, currentLat, currentLon, skyViewTime);
        
        if (betelCoords && betelCoords.alt > 0 && rigelCoords && rigelCoords.alt > 0) {
            const betelScreen = altAzToScreen(betelCoords.alt, betelCoords.az, width, height);
            const rigelScreen = altAzToScreen(rigelCoords.alt, rigelCoords.az, width, height);
            
            if (betelScreen && rigelScreen) {
                skyCtx.beginPath();
                skyCtx.moveTo(betelScreen.x, betelScreen.y);
                skyCtx.lineTo(rigelScreen.x, rigelScreen.y);
                skyCtx.stroke();
            }
        }
    }
}

/**
 * Get approximate planet positions (simplified - for accurate positions, use JPL Horizons API)
 */
function getPlanetPositions(lat, lon, time) {
    // Simplified planet positions based on current date
    // For accurate positions, integrate with NASA HORIZONS API
    const jd = (time.getTime() / 86400000) + 2440587.5;
    const t = (jd - 2451545.0) / 36525.0;
    
    // Approximate RA/Dec for major planets (simplified calculation)
    // In production, use proper ephemeris calculations
    const planets = [
        { name: 'Jupiter', ra: 2.0 + (t * 0.1), dec: 10.0, mag: -2.0, color: '#f59e0b' },
        { name: 'Saturn', ra: 22.0 + (t * 0.08), dec: -10.0, mag: 0.5, color: '#fbbf24' },
        { name: 'Mars', ra: 1.5 + (t * 0.15), dec: 5.0, mag: 1.0, color: '#ef4444' },
        { name: 'Venus', ra: 18.0 + (t * 0.2), dec: -15.0, mag: -4.0, color: '#fbbf24' }
    ];
    
    return planets;
}

/**
 * Draw planets
 */
function drawPlanets(width, height, lat, lon) {
    const location = getCurrentLocation();
    const currentLat = location.lat || lat;
    const currentLon = location.lon || lon;

    const planets = getPlanetPositions(currentLat, currentLon, skyViewTime);

    planets.forEach(planet => {
        // Convert RA/Dec to Alt/Az
        const coords = raDecToAltAz(planet.ra, planet.dec, currentLat, currentLon, skyViewTime);
        if (!coords || coords.alt < 0) return; // Below horizon

        // Convert to screen coordinates
        const screen = altAzToScreen(coords.alt, coords.az, width, height);
        if (!screen) return;

        const { x, y } = screen;

        // Draw planet
        skyCtx.beginPath();
        skyCtx.arc(x, y, 5, 0, Math.PI * 2);
        skyCtx.fillStyle = planet.color;
        skyCtx.fill();

        // Planet name
        skyCtx.fillStyle = planet.color;
        skyCtx.font = '12px sans-serif';
        skyCtx.fillText(planet.name, x + 7, y + 5);

        // Store planet data for interaction
        planet.screenX = x;
        planet.screenY = y;
        planet.alt = coords.alt;
        planet.az = coords.az;
    });
}

/**
 * Draw coordinate grid (altitude circles)
 */
function drawGrid(width, height) {
    skyCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    skyCtx.lineWidth = 1;

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 10;

    // Draw altitude circles (30°, 60°)
    [30, 60].forEach(alt => {
        const r = maxRadius * Math.tan((90 - alt) * Math.PI / 180) / Math.tan(90 * Math.PI / 180);
        skyCtx.beginPath();
        skyCtx.arc(centerX, centerY, r, 0, Math.PI * 2);
        skyCtx.stroke();
    });

    // Draw azimuth lines (N, E, S, W)
    const directions = [
        { az: 0, label: 'N' },
        { az: 90, label: 'E' },
        { az: 180, label: 'S' },
        { az: 270, label: 'W' }
    ];

    directions.forEach(dir => {
        const azRad = dir.az * Math.PI / 180;
        const x = centerX + maxRadius * Math.sin(azRad);
        const y = centerY - maxRadius * Math.cos(azRad);
        
        skyCtx.beginPath();
        skyCtx.moveTo(centerX, centerY);
        skyCtx.lineTo(x, y);
        skyCtx.stroke();
    });
}

/**
 * Draw horizon circle
 */
function drawHorizon(width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    skyCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    skyCtx.lineWidth = 2;
    skyCtx.beginPath();
    skyCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    skyCtx.stroke();
}

/**
 * Draw cardinal directions
 */
function drawDirections(width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 5;

    skyCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    skyCtx.font = 'bold 14px sans-serif';
    skyCtx.textAlign = 'center';

    const directions = [
        { az: 0, label: 'N' },
        { az: 90, label: 'E' },
        { az: 180, label: 'S' },
        { az: 270, label: 'W' }
    ];

    directions.forEach(dir => {
        const azRad = dir.az * Math.PI / 180;
        const x = centerX + radius * Math.sin(azRad);
        const y = centerY - radius * Math.cos(azRad);
        
        skyCtx.fillText(dir.label, x, y + 5);
    });
}

/**
 * Draw zoom controls
 */
function drawZoomControls(width, height) {
    // Zoom buttons
    const buttonSize = 40;
    const margin = 20;
    
    // Zoom in button
    skyCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    skyCtx.fillRect(width - buttonSize - margin, height - buttonSize * 2 - margin * 2, buttonSize, buttonSize);
    skyCtx.fillStyle = '#ffffff';
    skyCtx.font = 'bold 24px sans-serif';
    skyCtx.textAlign = 'center';
    skyCtx.fillText('+', width - buttonSize / 2 - margin, height - buttonSize - margin * 2 + 15);
    
    // Zoom out button
    skyCtx.fillRect(width - buttonSize - margin, height - buttonSize - margin, buttonSize, buttonSize);
    skyCtx.fillText('−', width - buttonSize / 2 - margin, height - margin + 15);
    
    // Reset button
    skyCtx.fillRect(width - buttonSize - margin, margin, buttonSize, buttonSize);
    skyCtx.font = 'bold 16px sans-serif';
    skyCtx.fillText('⌂', width - buttonSize / 2 - margin, margin + 25);
    
    // Zoom level indicator
    skyCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    skyCtx.fillRect(margin, height - 30, 100, 25);
    skyCtx.fillStyle = '#ffffff';
    skyCtx.font = '12px sans-serif';
    skyCtx.textAlign = 'left';
    skyCtx.fillText(`Zoom: ${(skyZoom * 100).toFixed(0)}%`, margin + 5, height - 12);
}

/**
 * Handle zoom button clicks
 */
function handleZoomButtonClick(x, y, width, height) {
    const buttonSize = 40;
    const margin = 20;
    const buttonX = width - buttonSize - margin;
    
    // Zoom in
    if (x >= buttonX && x <= buttonX + buttonSize && 
        y >= height - buttonSize * 2 - margin * 2 && y <= height - buttonSize - margin * 2) {
        skyZoom = Math.min(3.0, skyZoom * 1.2);
        renderSkyMap();
        return true;
    }
    
    // Zoom out
    if (x >= buttonX && x <= buttonX + buttonSize && 
        y >= height - buttonSize - margin && y <= height - margin) {
        skyZoom = Math.max(0.5, skyZoom * 0.8);
        renderSkyMap();
        return true;
    }
    
    // Reset
    if (x >= buttonX && x <= buttonX + buttonSize && 
        y >= margin && y <= margin + buttonSize) {
        skyZoom = 1.0;
        skyPanX = 0;
        skyPanY = 0;
        renderSkyMap();
        return true;
    }
    
    return false;
}

/**
 * Draw object info
 */
function drawObjectInfo(object, width, height) {
    if (!object || !object.screenX) return;

    // Adjust screen coordinates for zoom/pan
    const x = (object.screenX * skyZoom) + skyPanX + (width / 2) * (1 - skyZoom);
    const y = (object.screenY * skyZoom) + skyPanY + (height / 2) * (1 - skyZoom);

    // Draw info box
    const info = `${object.name}\nAlt: ${object.alt.toFixed(1)}°\nAz: ${object.az.toFixed(1)}°`;
    const lines = info.split('\n');
    const boxWidth = 120;
    const boxHeight = lines.length * 18 + 10;

    skyCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    skyCtx.fillRect(x + 10, y - boxHeight, boxWidth, boxHeight);

    skyCtx.fillStyle = '#ffffff';
    skyCtx.font = '11px sans-serif';
    skyCtx.textAlign = 'left';
    lines.forEach((line, i) => {
        skyCtx.fillText(line, x + 15, y - boxHeight + 18 + (i * 18));
    });
}

/**
 * Find object at screen coordinates
 */
function findObjectAt(x, y) {
    const threshold = 15; // pixels

    // Check stars
    for (const star of STAR_DATA) {
        if (star.screenX && star.screenY) {
            const dist = Math.sqrt(Math.pow(x - star.screenX, 2) + Math.pow(y - star.screenY, 2));
            if (dist < threshold) {
                return star;
            }
        }
    }

    // Check planets
    const location = getCurrentLocation();
    const planets = getPlanetPositions(location.lat, location.lon, skyViewTime);
    for (const planet of planets) {
        if (planet.screenX && planet.screenY) {
            const dist = Math.sqrt(Math.pow(x - planet.screenX, 2) + Math.pow(y - planet.screenY, 2));
            if (dist < threshold) {
                return planet;
            }
        }
    }

    return null;
}

/**
 * Handle click on sky map
 */
function handleSkyClick(event) {
    if (isDragging) {
        // Don't trigger click if we were dragging
        return;
    }
    
    const rect = skyCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if zoom button was clicked
    if (handleZoomButtonClick(x, y, skyCanvas.width, skyCanvas.height)) {
        return;
    }

    // Adjust coordinates for zoom/pan
    const adjustedX = (x - skyPanX - skyCanvas.width / 2) / skyZoom + skyCanvas.width / 2;
    const adjustedY = (y - skyPanY - skyCanvas.height / 2) / skyZoom + skyCanvas.height / 2;

    const object = findObjectAt(adjustedX, adjustedY);
    clickedObject = object;

    // Show info in skyInfo div
    const skyInfo = document.getElementById('skyInfo');
    if (skyInfo) {
        if (object) {
            skyInfo.innerHTML = `
                <p><strong>${object.name}</strong></p>
                <p>Altitude: ${object.alt.toFixed(1)}°</p>
                <p>Azimuth: ${object.az.toFixed(1)}°</p>
                ${object.mag !== undefined ? `<p>Magnitude: ${object.mag.toFixed(2)}</p>` : ''}
            `;
        } else {
            skyInfo.innerHTML = '<p>Click on stars or planets to learn more</p>';
        }
    }

    renderSkyMap();
}

/**
 * Handle mouse wheel for zoom
 */
function handleSkyWheel(event) {
    if (!skyCanvas) return;
    
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3.0, skyZoom * delta));
    
    if (newZoom !== skyZoom) {
        // Zoom towards mouse position
        const rect = skyCanvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const zoomFactor = newZoom / skyZoom;
        skyPanX = mouseX - (mouseX - skyPanX) * zoomFactor;
        skyPanY = mouseY - (mouseY - skyPanY) * zoomFactor;
        
        skyZoom = newZoom;
        renderSkyMap();
    }
}

/**
 * Handle mouse down for dragging
 */
function handleSkyMouseDown(event) {
    if (!skyCanvas) return;
    
    isDragging = true;
    const rect = skyCanvas.getBoundingClientRect();
    dragStartX = event.clientX - rect.left;
    dragStartY = event.clientY - rect.top;
    dragStartPanX = skyPanX;
    dragStartPanY = skyPanY;
    skyCanvas.style.cursor = 'grabbing';
}

/**
 * Handle mouse up for dragging
 */
function handleSkyMouseUp(event) {
    if (!skyCanvas) return;
    
    isDragging = false;
    skyCanvas.style.cursor = 'grab';
}

/**
 * Handle mouse move for hover and dragging
 */
function handleSkyMouseMove(event) {
    if (!skyCanvas) return;

    const rect = skyCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isDragging) {
        // Pan the map
        skyPanX = dragStartPanX + (x - dragStartX);
        skyPanY = dragStartPanY + (y - dragStartY);
        renderSkyMap();
    } else {
        // Check for hover
        // Adjust coordinates for zoom/pan
        const adjustedX = (x - skyPanX - skyCanvas.width / 2) / skyZoom + skyCanvas.width / 2;
        const adjustedY = (y - skyPanY - skyCanvas.height / 2) / skyZoom + skyCanvas.height / 2;
        
        const object = findObjectAt(adjustedX, adjustedY);
        if (object !== hoveredObject) {
            hoveredObject = object;
            renderSkyMap();
        }
    }
}

/**
 * Update visible events based on current time
 */
function updateVisibleEvents() {
    const visibleEventsContainer = document.getElementById('visibleEvents');
    if (!visibleEventsContainer) return;
    
    // Get events from global scope
    const allEvents = window.allEvents || [];
    
    // Ensure getCurrentLocation is available
    if (typeof getCurrentLocation !== 'function' && typeof window.getCurrentLocation === 'function') {
        window.getCurrentLocation = window.getCurrentLocation;
    }

    // Filter events visible at current time
    const now = skyViewTime;
    const visibleEvents = window.allEvents.filter(event => {
        const eventDate = new Date(event.datetime);
        const hoursDiff = Math.abs(eventDate - now) / (1000 * 60 * 60);
        return hoursDiff < 24; // Events within 24 hours
    }).slice(0, 5); // Show top 5

    if (visibleEvents.length === 0) {
        visibleEventsContainer.innerHTML = '<p style="color: var(--text-secondary);">No events visible at this time.</p>';
        return;
    }

    visibleEventsContainer.innerHTML = visibleEvents.map(event => `
        <div class="visible-event-item">
            <strong>${escapeHtml(event.title)}</strong><br>
            <span style="font-size: 0.85rem; color: var(--text-secondary);">
                ${new Date(event.datetime).toLocaleString()}
            </span>
        </div>
    `).join('');
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.initSkyMap = initSkyMap;
window.renderSkyMap = renderSkyMap;
window.updateVisibleEvents = updateVisibleEvents;

// Expose initialization state
Object.defineProperty(window, 'skyMapInitialized', {
    get: () => skyMapInitialized,
    set: (value) => { skyMapInitialized = value; }
});

