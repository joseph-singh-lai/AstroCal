// Global error handler to catch JS errors
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global Error:', { msg, url, lineNo, columnNo, error });
    return false;
};

console.log('AstroCal script.js loaded - v3.1');

// Helper function to get NASA API config
function getNASAConfig() {
    if (typeof NASA_API_CONFIG !== 'undefined') {
        return NASA_API_CONFIG;
    }
    if (typeof window !== 'undefined' && window.NASA_API_CONFIG) {
        return window.NASA_API_CONFIG;
    }
    console.error('NASA_API_CONFIG is not defined. Config should be inlined in index.html');
    return null;
}

// Global state
let allEvents = [];
let filteredEvents = [];
let selectedCategories = new Set(['apod']); // Default: Only show NASA APOD on first visit

// Location state
let userLocation = null;
let locationPermissionRequested = false;

// La Brea, Trinidad & Tobago coordinates (fallback)
const LA_BREA_COORDS = {
    lat: 10.25,
    lon: -61.63,
    name: 'La Brea, Trinidad & Tobago'
};

/* ============================
   Custom Sky Map
   ============================ */
// Sky map functionality moved to sky-map.js

// DOM Elements (will be initialized after DOM loads)
let eventsContainer;
let searchInput;
let applyFiltersButton;
let eventDetailSection;
let filterCheckboxes;
let locationButton;
let locationStatus;
let clearLocationButton;
let refreshNASAButton;
let loadingProgressContainer;
let loadingProgressFill;
let loadingProgressText;

// Loading progress tracking
let loadingProgress = {
    total: 6, // Total number of loading tasks
    completed: 0,
    tasks: {
        apod: false,
        staticEvents: false,
        issPasses: false,
        nasaData: false,
        astronomy: false,
        planetVisibility: false
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired - initializing AstroCal...');
    
    // Initialize DOM elements
    eventsContainer = document.getElementById('eventsContainer');
    searchInput = document.getElementById('searchInput');
    applyFiltersButton = document.getElementById('applyFilters');
    eventDetailSection = document.getElementById('eventDetail');
    filterCheckboxes = document.querySelectorAll('.filter-checkbox input[type="checkbox"]');
    locationButton = document.getElementById('locationButton');
    locationStatus = document.getElementById('locationStatus');
    clearLocationButton = document.getElementById('clearLocationButton');
    refreshNASAButton = document.getElementById('refreshNASA');
    loadingProgressContainer = document.getElementById('loadingProgress');
    loadingProgressFill = document.getElementById('loadingProgressFill');
    loadingProgressText = document.getElementById('loadingProgressText');
    
    // Check if elements exist
    if (!eventsContainer) {
        console.error('Events container not found!');
        return;
    }
    
    // Check for saved location in localStorage
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
        try {
            userLocation = JSON.parse(savedLocation);
            updateLocationStatus(userLocation);
        } catch (e) {
            console.error('Error parsing saved location:', e);
            updateLocationStatus(LA_BREA_COORDS);
        }
    } else {
        // Initialize with default location
        updateLocationStatus(LA_BREA_COORDS);
    }
    
    // Initialize checkboxes to match default selectedCategories (APOD is default)
    // All checkboxes are always visible in HTML - no dynamic generation
    filterCheckboxes.forEach(checkbox => {
        if (selectedCategories.has(checkbox.value)) {
            checkbox.checked = true;
        }
    });
    
    // Show loading progress bar
    showLoadingProgress();
    
    // Load APOD first (priority - it's the default view)
    // Show cached APOD immediately if available, then fetch fresh in background
    loadAPODPriority().then(() => {
        updateLoadingProgress('apod');
        // After APOD is shown, load other events in parallel
        Promise.all([
            loadEvents().then(() => updateLoadingProgress('staticEvents')),
            loadISSPasses().then(() => updateLoadingProgress('issPasses')),
            loadNASADataOther().then(() => updateLoadingProgress('nasaData')), // Load DONKI and EONET (not APOD)
            loadAstronomyData().then(() => updateLoadingProgress('astronomy')),
            loadPlanetVisibility().then(() => updateLoadingProgress('planetVisibility'))
        ]).then(() => {
            // All categories are always shown in HTML - no need to update checkboxes
            hideLoadingProgress();
            applyFilters();
        }).catch((error) => {
            console.error('Error loading events:', error);
            // Even if some fail, show what we have
            hideLoadingProgress();
            if (allEvents.length > 0) {
                applyFilters();
            }
        });
    });
    
    setupEventListeners();
    setupNavigation();
    setupHeaderScroll();
    setupMotionToggle();
    setupFilterPanel();
    setupGlossarySearch();
    updateFilterCount();
});

/**
 * Show loading progress bar
 */
function showLoadingProgress() {
    if (loadingProgressContainer) {
        loadingProgressContainer.style.display = 'block';
        updateLoadingProgressDisplay();
    }
}

/**
 * Hide loading progress bar
 */
function hideLoadingProgress() {
    if (loadingProgressContainer) {
        // Small delay to show 100% before hiding
        setTimeout(() => {
            if (loadingProgressContainer) {
                loadingProgressContainer.style.display = 'none';
            }
        }, 500);
    }
}

/**
 * Update loading progress for a specific task
 */
function updateLoadingProgress(taskName) {
    if (!loadingProgress.tasks.hasOwnProperty(taskName)) {
        return;
    }
    
    if (!loadingProgress.tasks[taskName]) {
        loadingProgress.tasks[taskName] = true;
        loadingProgress.completed++;
        updateLoadingProgressDisplay();
    }
}

/**
 * Update the visual progress bar and text
 */
function updateLoadingProgressDisplay() {
    if (!loadingProgressFill || !loadingProgressText) {
        return;
    }
    
    const percentage = Math.round((loadingProgress.completed / loadingProgress.total) * 100);
    loadingProgressFill.style.width = `${percentage}%`;
    
    // Update text with current status
    const taskNames = {
        apod: 'APOD',
        staticEvents: 'Static Events',
        issPasses: 'ISS Passes',
        nasaData: 'NASA Data',
        astronomy: 'Astronomy Data',
        planetVisibility: 'Planet Visibility'
    };
    
    const completedTasks = Object.entries(loadingProgress.tasks)
        .filter(([_, completed]) => completed)
        .map(([name, _]) => taskNames[name] || name);
    
    if (loadingProgress.completed === loadingProgress.total) {
        loadingProgressText.textContent = 'Loading complete!';
    } else {
        loadingProgressText.textContent = `Loading events... (${loadingProgress.completed}/${loadingProgress.total})`;
    }
}

/**
 * Reset loading progress (for refresh)
 */
function resetLoadingProgress() {
    loadingProgress.completed = 0;
    Object.keys(loadingProgress.tasks).forEach(key => {
        loadingProgress.tasks[key] = false;
    });
}

/**
 * Setup navigation between sections
 */
function setupNavigation() {
    console.log('setupNavigation called');
    const navButtons = document.querySelectorAll('.nav-button');
    const sections = document.querySelectorAll('.content-section');
    console.log('Found nav buttons:', navButtons.length, 'sections:', sections.length);

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.getAttribute('data-section');

            // Update active button
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update active section
            sections.forEach(section => section.classList.remove('active'));
            const targetElement = document.getElementById(`${targetSection}-section`);
            if (targetElement) {
                targetElement.classList.add('active');
            }

            // Initialize maps when their sections become active
            if (targetSection === 'gibs') {
                setTimeout(() => {
                    const mapContainer = document.getElementById('gibsMap');
                    if (!mapContainer) {
                        console.error('GIBS map container not found');
                        return;
                    }
                    
                    if (typeof initGIBSMap === 'function') {
                        if (!window.gibsMap) {
                            initGIBSMap();
                        } else {
                            // Check if map object is valid
                            if (!window.gibsMap) {
                                initGIBSMap();
                                return;
                            }
                            
                            // If map is not a proper Leaflet map, re-initialize it
                            if (!(window.gibsMap instanceof L.Map) || typeof window.gibsMap.invalidateSize !== 'function') {
                                window.gibsMap = null;
                                if (typeof window.gibsMapInitialized !== 'undefined') {
                                    window.gibsMapInitialized = false;
                                }
                                initGIBSMap();
                                return;
                            }
                            
                            try {
                                // Force map to re-render by invalidating size
                                if (window.gibsMap.invalidateSize) {
                                    window.gibsMap.invalidateSize();
                                    
                                    // Update location if available
                                    if (typeof updateGIBSMapLocation === 'function') {
                                        updateGIBSMapLocation();
                                    }
                                    
                                    // Force multiple invalidations to ensure tiles reload
                                    setTimeout(() => {
                                        try {
                                            if (window.gibsMap && window.gibsMap.invalidateSize) {
                                                window.gibsMap.invalidateSize();
                                                
                                                // Trigger a view change to force tile reload
                                                if (window.gibsMap.getCenter && window.gibsMap.getZoom && window.gibsMap.setView) {
                                                    const currentCenter = window.gibsMap.getCenter();
                                                    const currentZoom = window.gibsMap.getZoom();
                                                    window.gibsMap.setView(currentCenter, currentZoom);
                                                }
                                            }
                                        } catch (e) {
                                            console.error('Error in map re-render:', e);
                                        }
                                    }, 200);
                                }
                            } catch (e) {
                                console.error('Error during map re-render:', e);
                            }
                        }
                    }
                }, 100); // Minimal delay - container should be visible immediately when section is active
            }

            if (targetSection === 'sky') {
                // Force render sky map when section becomes visible
                setTimeout(() => {
                    if (typeof window.forceSkyMapRender === 'function') {
                        window.forceSkyMapRender();
                    } else if (!window.skyMapInitialized && typeof initSkyMap === 'function') {
                        initSkyMap();
                    } else if (window.skyMapInitialized && typeof renderSkyMap === 'function') {
                        renderSkyMap();
                    }
                }, 150); // Wait for section to be visible
            }
        });
    });
}

/**
 * Load events from JSON file
 */
async function loadEvents() {
    try {
        eventsContainer.innerHTML = '<div class="loading">Loading events</div>';
        
        const response = await fetch('data/events.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const staticEvents = data.events || [];
        
        
        // Merge static events with existing events (don't replace - APOD might already be loaded)
        // Remove any existing static events first to avoid duplicates
        allEvents = allEvents.filter(e => e.category !== 'meteor' && e.category !== 'workshop');
        allEvents = [...allEvents, ...staticEvents];
        
        // Sort events by datetime (earliest first)
        allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        
        // Update global reference
        window.allEvents = allEvents;
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading events:', error);
        const errorMessage = error.message || 'Unknown error';
        const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch') || 
                           window.location.protocol === 'file:';
        
        eventsContainer.innerHTML = `
            <div class="no-events">
                <div class="no-events-icon">⚠️</div>
                <p><strong>Failed to load events</strong></p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.7;">${errorMessage}</p>
                ${isCorsError ? `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="margin-bottom: 0.5rem;"><strong>💡 Solution:</strong></p>
                        <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">You need to run a local server. Try one of these:</p>
                        <ul style="font-size: 0.85rem; margin-left: 1.5rem; line-height: 1.8;">
                            <li><strong>Python:</strong> <code style="background: var(--bg-secondary); padding: 0.2rem 0.4rem; border-radius: 4px;">python -m http.server 8000</code></li>
                            <li><strong>Node.js:</strong> <code style="background: var(--bg-secondary); padding: 0.2rem 0.4rem; border-radius: 4px;">npx http-server</code></li>
                            <li><strong>VS Code:</strong> Use the "Live Server" extension</li>
                        </ul>
                        <p style="font-size: 0.85rem; margin-top: 0.5rem;">Then open <code style="background: var(--bg-secondary); padding: 0.2rem 0.4rem; border-radius: 4px;">http://localhost:8000</code></p>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

/**
 * Request user's location with permission
 */
function requestUserLocation() {
    // Check browser support
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser. Using default location.');
        return;
    }

    // Check if running on HTTPS or localhost (required for geolocation)
    // Vercel provides HTTPS, so this should work in production
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.endsWith('.vercel.app');
    
    if (!isSecure && window.location.protocol !== 'file:') {
        console.warn('Geolocation may not work without HTTPS');
        // Don't block, just warn - Vercel provides HTTPS
    }

    if (locationPermissionRequested) {
        return; // Already requested
    }

    locationPermissionRequested = true;
    locationButton.disabled = true;
    locationButton.textContent = '📍 Requesting...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Success - got user location
            userLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
                name: 'Your Location'
            };

            // Save to localStorage
            localStorage.setItem('userLocation', JSON.stringify(userLocation));

            updateLocationStatus(userLocation);
            
            // Reload ISS passes with new location
            loadISSPasses().then(() => {
                applyFilters();
            });

            // Update maps if they're initialized
            if (typeof updateGIBSMapLocation === 'function') {
                updateGIBSMapLocation();
            }
            // Update custom sky map location
            if (typeof updateSkyMapLocation === 'function') {
                updateSkyMapLocation(location.lat, location.lon);
            }

            locationButton.textContent = '✅ Location Set';
            locationButton.style.opacity = '0.7';
        },
        (error) => {
            // Error - user denied or error occurred
            locationPermissionRequested = false;
            locationButton.disabled = false;
            locationButton.textContent = '📍 Use My Location';

            let errorMessage = 'Unable to get your location. ';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Location access denied. Using default location.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    break;
            }

            alert(errorMessage);
            updateLocationStatus(LA_BREA_COORDS);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // Cache for 5 minutes
        }
    );
}

/**
 * Update location status display
 */
function updateLocationStatus(location) {
    if (!locationStatus) return;

    if (location.name === 'Your Location') {
        locationStatus.textContent = `📍 Using your location: ${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}°`;
        locationStatus.className = 'location-status location-active';
        // Show clear button when using custom location
        if (clearLocationButton) {
            clearLocationButton.style.display = 'block';
        }
    } else {
        locationStatus.textContent = `📍 Using default location: ${location.name}`;
        locationStatus.className = 'location-status';
        // Hide clear button when using default
        if (clearLocationButton) {
            clearLocationButton.style.display = 'none';
        }
    }
}

/**
 * Clear saved location and revert to default
 */
function clearSavedLocation() {
    userLocation = null;
    localStorage.removeItem('userLocation');
    updateLocationStatus(LA_BREA_COORDS);
    
    // Reset location button
    if (locationButton) {
        locationPermissionRequested = false;
        locationButton.disabled = false;
        locationButton.textContent = '📍 Use My Location';
        locationButton.style.opacity = '1';
    }
    
    // Reload ISS passes with default location
    loadISSPasses().then(() => {
        applyFilters();
    });
}

/**
 * Get current location for ISS passes (user location or fallback)
 */
function getCurrentLocation() {
    return userLocation || LA_BREA_COORDS;
}

// Make getCurrentLocation available globally for other scripts
window.getCurrentLocation = getCurrentLocation;
window.allEvents = allEvents;

/**
 * Load ISS passes from WhereTheISS.at API (CORS-enabled)
 */
async function loadISSPasses() {
    try {
        const currentLocation = getCurrentLocation();
        
        // Calculate timestamps for next 10 passes (roughly every 90 minutes)
        const now = Math.floor(Date.now() / 1000);
        const timestamps = [];
        for (let i = 0; i < 10; i++) {
            timestamps.push(now + (i * 90 * 60)); // 90 minutes apart
        }
        
        // Fetch ISS positions for these timestamps
        const url = `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${timestamps.join(',')}`;
        
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`ISS API error! status: ${response.status}`);
        }
        
        const positions = await response.json();
        
        if (!Array.isArray(positions) || positions.length === 0) {
            console.warn('ISS API returned no positions');
            return;
        }
        
        // Convert ISS positions to pass events
        // For simplicity, we'll create events for each position
        // In a real implementation, you'd calculate actual pass times based on observer location
        const issEvents = positions.map((pos, index) => {
            const timestamp = pos.timestamp;
            const risetime = new Date(timestamp * 1000);
            // Estimate duration (ISS passes typically last 2-6 minutes)
            const duration = 240; // 4 minutes average
            const setTime = new Date(risetime.getTime() + duration * 1000);
            
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            
            const currentLocation = getCurrentLocation();
            const locationName = currentLocation.name || `${currentLocation.lat.toFixed(2)}°, ${currentLocation.lon.toFixed(2)}°`;
            
            // Calculate if ISS is visible from observer location
            const distance = calculateDistance(
                currentLocation.lat, currentLocation.lon,
                pos.latitude, pos.longitude
            );
            const isVisible = distance < 2000; // Visible if within 2000km
            
            return {
                id: `iss-pass-${timestamp}`,
                title: `ISS Pass Over ${locationName}`,
                category: 'iss',
                datetime: risetime.toISOString(),
                description: isVisible 
                    ? `The International Space Station will be visible for approximately ${durationText}. Look for a bright, fast-moving point of light crossing the sky. The ISS will be at ${pos.latitude.toFixed(2)}°, ${pos.longitude.toFixed(2)}° at this time.`
                    : `ISS will be passing overhead (${pos.latitude.toFixed(2)}°, ${pos.longitude.toFixed(2)}°). Check visibility from your location.`,
                location: locationName,
                visibility: {
                    direction: 'Variable (check for specific pass)',
                    peak: risetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
                    elevation: pos.altitude ? `${pos.altitude.toFixed(0)} km` : 'Variable',
                    duration: durationText
                },
                issPosition: {
                    lat: pos.latitude,
                    lon: pos.longitude,
                    altitude: pos.altitude
                }
            };
        });
        
        
        // Add ISS events to allEvents array
        allEvents = [...allEvents, ...issEvents];
        
        // Sort all events by datetime (earliest first)
        allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        
        // Update global reference
        window.allEvents = allEvents;
        
        
        return Promise.resolve();
        
    } catch (error) {
        // CORS or network errors are expected in some environments
        const isCorsError = error.message.includes('CORS') || 
                           error.message.includes('NetworkError') || 
                           error.message.includes('Failed to fetch');
        
        if (isCorsError) {
            console.warn('ISS API unavailable (CORS error). ISS passes require the API to be accessible.');
        } else {
            console.warn('Error loading ISS passes:', error.message);
        }
        
        // Don't break the app - just log and continue
        // Return resolved promise so Promise.all doesn't fail
        return Promise.resolve();
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', debounce(() => {
        applyFilters();
    }, 300));

    // Filter checkboxes - auto-apply filters when changed
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            applyFilters(); // Auto-apply filters when checkbox changes
        });
    });

    // Apply filters button (if it exists)
    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', () => {
            applyFilters();
        });
    }

    // Location button
    if (locationButton) {
        locationButton.addEventListener('click', requestUserLocation);
    }

    // Clear location button
    if (clearLocationButton) {
        clearLocationButton.addEventListener('click', clearSavedLocation);
    }

    // Refresh NASA data button
    if (refreshNASAButton) {
        refreshNASAButton.addEventListener('click', () => {
            refreshNASAButton.disabled = true;
            refreshNASAButton.textContent = '🔄 Refreshing...';
            clearNASACache();
            
            // Show progress bar for refresh (only 3 tasks: APOD, NASA Data, Planet Visibility)
            loadingProgress.total = 3;
            loadingProgress.completed = 0;
            loadingProgress.tasks = { apod: false, nasaData: false, planetVisibility: false };
            showLoadingProgress();
            
            Promise.all([
                loadAPOD(true).then(apodEvent => {
                    updateLoadingProgress('apod');
                    if (apodEvent) {
                        // Remove old APOD and add fresh one
                        allEvents = allEvents.filter(e => e.category !== 'apod');
                        allEvents.push(apodEvent);
                        window.allEvents = allEvents;
                        allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
                    }
                    return apodEvent;
                }),
                loadNASADataOther(true).then(() => updateLoadingProgress('nasaData')),
                loadPlanetVisibility(true).then(() => updateLoadingProgress('planetVisibility')) // Also refresh planet visibility
            ]).then(() => {
                refreshNASAButton.disabled = false;
                refreshNASAButton.textContent = '🔄 Refresh NASA Data';
                hideLoadingProgress();
                applyFilters();
            });
        });
    }

    // Close event detail when clicking outside
    document.addEventListener('click', (e) => {
        if (!eventDetailSection.contains(e.target) && 
            !e.target.closest('.event-card')) {
            hideEventDetail();
        }
    });
}

/**
 * Update selected categories from checkboxes
 */
function updateSelectedCategories() {
    selectedCategories.clear();
    
    // Re-query checkboxes in case they were dynamically created
    filterCheckboxes = document.querySelectorAll('.filter-checkbox input[type="checkbox"]');
    
    // If no checkboxes found, preserve default APOD selection (only on initial load)
    if (filterCheckboxes.length === 0) {
        console.warn('No filter checkboxes found! Preserving default APOD selection.');
        selectedCategories.add('apod');
        return;
    }
    
    // Read selected categories directly from checkboxes
    filterCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedCategories.add(checkbox.value);
        }
    });
    
    console.log('Updated selected categories:', Array.from(selectedCategories));
    const apodCheckbox = Array.from(filterCheckboxes).find(cb => cb.value === 'apod');
    console.log('APOD checkbox checked:', apodCheckbox ? apodCheckbox.checked : 'not found');
    console.log('Total checkboxes found:', filterCheckboxes.length);
}

/**
 * Apply filters and render events
 */
function applyFilters() {
    updateSelectedCategories();
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Debug: Show all event categories
    const eventCategories = {};
    allEvents.forEach(event => {
        eventCategories[event.category] = (eventCategories[event.category] || 0) + 1;
    });
    
    console.log('Applying filters - Selected categories:', Array.from(selectedCategories));
    console.log('Total events before filter:', allEvents.length);
    console.log('Events by category:', eventCategories);
    
    // Only default to APOD if NO checkboxes are checked at all (initial state)
    // Don't force APOD if user explicitly unchecked it and selected other categories
    const anyCheckboxChecked = Array.from(document.querySelectorAll('.filter-checkbox input[type="checkbox"]')).some(cb => cb.checked);
    if (selectedCategories.size === 0 && !anyCheckboxChecked) {
        console.warn('No categories selected and no checkboxes checked! Defaulting to APOD.');
        selectedCategories.add('apod');
        // Also ensure the checkbox is checked
        const apodCheckbox = document.querySelector('.filter-checkbox input[type="checkbox"][value="apod"]');
        if (apodCheckbox) {
            apodCheckbox.checked = true;
        }
    }
    
    filteredEvents = allEvents.filter(event => {
        // Category filter
        if (!selectedCategories.has(event.category)) {
            return false;
        }
        
        // Search filter
        if (searchTerm) {
            const searchableText = `
                ${event.title} 
                ${event.description} 
                ${event.location || ''} 
                ${event.category}
            `.toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    
    // Sort events: closest upcoming first, then future, then past (most recent past first)
    filteredEvents = sortEventsByProximity(filteredEvents);
    
    console.log('Filtered events count:', filteredEvents.length);
    console.log('Filtered events by category:', 
        [...new Set(filteredEvents.map(e => e.category))].map(cat => 
            `${cat}: ${filteredEvents.filter(e => e.category === cat).length}`
        ).join(', '));
    
    renderEvents();
}

/**
 * Sort events by proximity: closest upcoming first, then future, then past (most recent first)
 */
function sortEventsByProximity(events) {
    const now = new Date();
    
    // Separate events into upcoming and past
    const upcoming = [];
    const past = [];
    
    events.forEach(event => {
        const eventDate = new Date(event.datetime);
        const diff = eventDate - now;
        
        if (diff >= 0) {
            // Upcoming event - store time until event
            upcoming.push({
                event: event,
                timeUntil: diff
            });
        } else {
            // Past event - store time since event (absolute value)
            past.push({
                event: event,
                timeSince: Math.abs(diff)
            });
        }
    });
    
    // Sort upcoming events by time until event (ascending - closest first)
    upcoming.sort((a, b) => a.timeUntil - b.timeUntil);
    
    // Sort past events by time since event (ascending - most recent first, then older)
    past.sort((a, b) => a.timeSince - b.timeSince);
    
    // Combine: upcoming first, then past
    return [
        ...upcoming.map(item => item.event),
        ...past.map(item => item.event)
    ];
}

/**
 * Render events to the DOM
 */
function renderEvents() {
    if (filteredEvents.length === 0) {
        eventsContainer.innerHTML = `
            <div class="no-events">
                <div class="no-events-icon">🔭</div>
                <p>No events found matching your criteria.</p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.7;">Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }
    
    // Check if ISS events are missing and show a note
    const hasISSEvents = filteredEvents.some(e => e.category === 'iss');
    const issCategorySelected = selectedCategories.has('iss');
    let issNote = '';
    
    if (issCategorySelected && !hasISSEvents && allEvents.length > 0) {
        const hasAnyISS = allEvents.some(e => e.category === 'iss');
        if (!hasAnyISS) {
            issNote = `
                <div style="grid-column: 1 / -1; padding: 1rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem;">
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        <strong>Note:</strong> ISS passes are currently unavailable due to API access restrictions. 
                        Other events are still available.
                    </p>
                </div>
            `;
        }
    }
    
    eventsContainer.innerHTML = issNote + filteredEvents.map(event => createEventCard(event)).join('');
    
    // Attach click handlers to event cards
    document.querySelectorAll('.event-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            // Adjust index if ISS note is present
            const actualIndex = issNote ? index - 1 : index;
            if (actualIndex >= 0 && actualIndex < filteredEvents.length) {
                showEventDetail(filteredEvents[actualIndex]);
            }
        });
    });
    
    // Start countdown timers for all event cards
    startCountdownTimers();
}

/**
 * Start countdown timers for all visible event cards
 */
function startCountdownTimers() {
    // Clear any existing interval
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
    
    // Update countdowns immediately
    updateCountdowns();
    
    // Update countdowns every second
    window.countdownInterval = setInterval(updateCountdowns, 1000);
}

/**
 * Update countdown displays for all visible event cards
 */
function updateCountdowns() {
    document.querySelectorAll('.event-countdown').forEach(countdownEl => {
        const eventDateTime = countdownEl.getAttribute('data-event-datetime');
        if (!eventDateTime) return;
        
        const timeInfo = getTimeUntilEvent(eventDateTime);
        const timeDisplay = formatTimeRemaining(timeInfo.timeRemaining, timeInfo.passed);
        const timeClass = timeInfo.passed ? 'event-time-passed' : 'event-time-upcoming';
        const timeIcon = timeInfo.passed ? '⏰' : '⏳';
        
        // Update the countdown element
        countdownEl.className = `event-countdown ${timeClass}`;
        const textSpan = countdownEl.querySelector('.countdown-text');
        if (textSpan) {
            textSpan.textContent = timeDisplay;
        } else {
            countdownEl.innerHTML = `${timeIcon} <span class="countdown-text">${timeDisplay}</span>`;
        }
        
        // Update parent card class if event passed
        const card = countdownEl.closest('.event-card');
        if (card) {
            if (timeInfo.passed) {
                card.classList.add('event-card-passed');
            } else {
                card.classList.remove('event-card-passed');
            }
        }
    });
}

/**
 * Create HTML for an event card
 */
function createEventCard(event) {
    const date = new Date(event.datetime);
    const formattedDate = formatDateTime(date);
    const categoryClass = `category-${event.category}`;
    const categoryLabel = getCategoryLabel(event.category);
    
    // Add image/video for APOD events
    let imageHtml = '';
    if (event.category === 'apod' && event.imageUrl) {
        if (event.mediaType === 'video') {
            // APOD video: check if it's YouTube or direct video
            const isYouTube = event.imageUrl.includes('youtube.com') || event.imageUrl.includes('youtu.be');
            if (isYouTube) {
                // Extract YouTube video ID
                const videoId = extractYouTubeId(event.imageUrl);
                if (videoId) {
                    // Use thumbnail_url if available, otherwise use YouTube thumbnail
                    const thumbnailUrl = event.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                    const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    // Use YouTube thumbnail as preview, clickable to open video
                    imageHtml = `
                        <div class="event-image-container">
                            <a href="${escapeHtml(event.imageUrl)}" target="_blank" rel="noopener noreferrer" class="event-video-thumbnail">
                                <img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(event.title)}" class="event-image" loading="lazy" onerror="this.src='${escapeHtml(fallbackThumbnail)}'">
                                <div class="video-play-overlay">▶</div>
                            </a>
                            <span class="video-label">Video</span>
                        </div>
                    `;
                } else {
                    // Fallback: just show link
                    imageHtml = `<div class="event-video-link"><a href="${escapeHtml(event.imageUrl)}" target="_blank" rel="noopener noreferrer">Watch Video →</a></div>`;
                }
            } else {
                // Direct video URL - show video player
                imageHtml = `
                    <div class="event-video-container">
                        <video class="event-image" controls preload="metadata" loading="lazy">
                            <source src="${escapeHtml(event.imageUrl)}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
            }
        } else {
            // APOD image: show image
            imageHtml = `<img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.title)}" class="event-image" loading="lazy">`;
        }
    } else if (event.imageUrl && event.mediaType === 'image') {
        // Other events: only show if mediaType is explicitly 'image'
        imageHtml = `<img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.title)}" class="event-image" loading="lazy">`;
    }
    
    // Calculate time until/since event
    const timeInfo = getTimeUntilEvent(event.datetime);
    const timeDisplay = formatTimeRemaining(timeInfo.timeRemaining, timeInfo.passed);
    const timeClass = timeInfo.passed ? 'event-time-passed' : 'event-time-upcoming';
    const timeIcon = timeInfo.passed ? '⏰' : '⏳';
    
    // Add passed indicator badge
    const passedBadge = timeInfo.passed ? '<span class="event-passed-badge">Past Event</span>' : '';
    
    return `
        <article class="event-card ${timeInfo.passed ? 'event-card-passed' : ''}" role="listitem" tabindex="0" aria-label="${event.title}" data-event-datetime="${event.datetime}">
            <div class="event-header">
                <h3 class="event-title">${escapeHtml(event.title)}</h3>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    ${passedBadge}
                    <span class="event-category ${categoryClass}">${categoryLabel}</span>
                </div>
            </div>
            ${imageHtml}
            <div class="event-datetime">
                📅 ${formattedDate}
            </div>
            <div class="event-countdown ${timeClass}" data-event-datetime="${event.datetime}">
                ${timeIcon} <span class="countdown-text">${timeDisplay}</span>
            </div>
            <p class="event-description">${escapeHtml(event.description)}</p>
            ${event.location ? `<div class="event-location">📍 ${escapeHtml(event.location)}</div>` : ''}
            ${event.visibility ? createVisibilityInfo(event.visibility) : ''}
            ${event.source ? `<div class="event-source">Source: ${escapeHtml(event.source)}</div>` : ''}
        </article>
    `;
}

/**
 * Create visibility information HTML
 */
function createVisibilityInfo(visibility) {
    let info = '<div class="event-visibility">';
    
    if (visibility.direction) {
        info += `<div><strong>Direction:</strong> ${escapeHtml(visibility.direction)}</div>`;
    }
    if (visibility.peak) {
        info += `<div><strong>Peak:</strong> ${escapeHtml(visibility.peak)}</div>`;
    }
    if (visibility.elevation) {
        info += `<div><strong>Elevation:</strong> ${escapeHtml(visibility.elevation)}</div>`;
    }
    
    info += '</div>';
    return info;
}

/**
 * Show event detail in the detail section
 */
function showEventDetail(event) {
    const date = new Date(event.datetime);
    const formattedDate = formatDateTime(date);
    const categoryClass = `category-${event.category}`;
    const categoryLabel = getCategoryLabel(event.category);
    
    // Add image/video for APOD events in detail view
    let imageHtml = '';
    if (event.category === 'apod' && event.imageUrl) {
        if (event.mediaType === 'video') {
            // APOD video: check if it's YouTube or direct video
            const isYouTube = event.imageUrl.includes('youtube.com') || event.imageUrl.includes('youtu.be');
            if (isYouTube) {
                // Extract YouTube video ID and create embed
                const videoId = extractYouTubeId(event.imageUrl);
                if (videoId) {
                    // Use YouTube iframe embed with proper attributes to reduce cookie warnings
                    imageHtml = `
                        <div class="event-detail-video">
                            <iframe 
                                src="https://www.youtube.com/embed/${videoId}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen
                                loading="lazy"
                                title="${escapeHtml(event.title)}"
                                referrerpolicy="no-referrer-when-downgrade">
                            </iframe>
                            <a href="${escapeHtml(event.imageUrl)}" target="_blank" rel="noopener noreferrer" class="external-link">Watch on YouTube →</a>
                        </div>
                    `;
                } else {
                    // Fallback: just show link
                    imageHtml = `<div class="event-video-link"><a href="${escapeHtml(event.imageUrl)}" target="_blank" rel="noopener noreferrer">Watch Video on YouTube →</a></div>`;
                }
            } else {
                // Direct video URL - show video player
                imageHtml = `
                    <div class="event-detail-video">
                        <video controls preload="metadata" loading="lazy">
                            <source src="${escapeHtml(event.imageUrl)}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
            }
        } else {
            // APOD image
            imageHtml = `
                <div class="event-detail-image">
                    <img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.title)}" loading="lazy">
                    ${event.hdImageUrl ? `<a href="${escapeHtml(event.hdImageUrl)}" target="_blank" rel="noopener noreferrer" class="hd-link">View HD Image</a>` : ''}
                </div>
            `;
        }
    } else if (event.imageUrl && event.mediaType === 'image') {
        // Other events: only show if mediaType is explicitly 'image'
        imageHtml = `
            <div class="event-detail-image">
                <img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.title)}" loading="lazy">
            </div>
        `;
    }
    
    eventDetailSection.innerHTML = `
        <h2>${escapeHtml(event.title)}</h2>
        <div class="event-header">
            <span class="event-category ${categoryClass}">${categoryLabel}</span>
        </div>
        ${imageHtml}
        <div class="event-datetime">📅 ${formattedDate}</div>
        ${event.location ? `<div class="event-location">📍 ${escapeHtml(event.location)}</div>` : ''}
        <p class="event-description">${escapeHtml(event.description)}</p>
        ${event.visibility ? createVisibilityInfo(event.visibility) : ''}
        ${event.source ? `<div class="event-source">Source: ${escapeHtml(event.source)}</div>` : ''}
    `;
    
    eventDetailSection.classList.add('active');
    eventDetailSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide event detail section
 */
function hideEventDetail() {
    eventDetailSection.classList.remove('active');
}

/**
 * Format datetime to readable string
 */
function formatDateTime(date) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };
    
    return date.toLocaleDateString('en-US', options);
}

/**
 * Calculate time remaining until event (or time since if passed)
 */
function getTimeUntilEvent(eventDate) {
    const now = new Date();
    const event = new Date(eventDate);
    const diff = event - now; // milliseconds
    
    if (diff < 0) {
        // Event has passed
        return {
            passed: true,
            timeRemaining: Math.abs(diff)
        };
    } else {
        // Event is upcoming
        return {
            passed: false,
            timeRemaining: diff
        };
    }
}

/**
 * Format time remaining as human-readable string
 */
function formatTimeRemaining(timeRemaining, passed = false) {
    const seconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (passed) {
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else {
            return 'Just passed';
        }
    } else {
        if (days > 0) {
            const remainingHours = hours % 24;
            if (remainingHours > 0) {
                return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
            }
            return `${days} day${days !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            const remainingMinutes = minutes % 60;
            if (remainingMinutes > 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''}, ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
            }
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (minutes > 0) {
            const remainingSeconds = seconds % 60;
            if (remainingSeconds > 0 && minutes < 10) {
                return `${minutes} minute${minutes !== 1 ? 's' : ''}, ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
            }
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
    }
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url) {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Get human-readable category label
 */
function getCategoryLabel(category) {
    const labels = {
        'meteor': 'Meteor Shower',
        'planet': 'Planet Visibility',
        'iss': 'ISS Pass',
        'apod': 'NASA APOD',
        'solar': 'Solar Event',
        'astronomy': 'Open-Meteo Astronomy'
    };
    return labels[category] || category;
}

/**
 * Update filter checkboxes dynamically based on actual event categories
 */
function updateFilterCheckboxes(actualCategories) {
    const filterOptions = document.querySelector('.filter-options');
    if (!filterOptions) return;
    
    // Category labels mapping
    const categoryLabels = {
        'meteor': 'Meteor Shower',
        'planet': 'Planet Visibility',
        'iss': 'ISS Passes (Real-time predictions)',
        'apod': 'NASA APOD (Daily astronomy image)',
        'solar': 'Solar Events (Flares & CMEs)',
        'astronomy': 'Open-Meteo Astronomy (Moon phases & sun events)',
        'natural': 'Natural Events (Fireballs & aurora)',
        'workshop': 'Workshops (Educational events)'
    };
    
    // Clear existing checkboxes
    filterOptions.innerHTML = '';
    
    // Create checkboxes only for categories that have events
    actualCategories.forEach(category => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = category;
        checkbox.checked = selectedCategories.has(category);
        
        const span = document.createElement('span');
        span.textContent = categoryLabels[category] || category;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        filterOptions.appendChild(label);
    });
    
    // Re-initialize filterCheckboxes reference
    filterCheckboxes = document.querySelectorAll('.filter-checkbox input[type="checkbox"]');
    
    // Re-setup event listeners for new checkboxes
    setupEventListeners();
    
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Switch view (placeholder for future implementation)
 */
function switchView(viewType) {
    // This function can be expanded to support different view modes
    // (e.g., list view, calendar view, map view)
    // Implementation for future views
}

/**
 * Check if cached NASA data is still valid
 */
function isCacheValid(cacheKey, maxAge) {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return false;
    
    try {
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        return age < maxAge;
    } catch (e) {
        return false;
    }
}

/**
 * Get cached NASA data
 */
function getCachedData(cacheKey) {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const data = JSON.parse(cached);
            return data.data;
        }
    } catch (e) {
        console.error('Error reading cache:', e);
    }
    return null;
}

/**
 * Cache NASA data
 */
function setCachedData(cacheKey, data) {
    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Error caching data:', e);
    }
}

/**
 * Clear all NASA API cache
 */
function clearNASACache() {
    localStorage.removeItem('nasa_apod');
    localStorage.removeItem('nasa_donki');
    localStorage.removeItem('nasa_eonet');
}

/**
 * Load NASA APOD (Astronomy Picture of the Day)
 */
async function loadAPOD(forceRefresh = false) {
    const config = getNASAConfig();
    if (!config) return null;
    
    const cacheKey = 'nasa_apod';
    const maxAge = config.cacheSettings.apod;
    
    // Check cache first
    if (!forceRefresh && isCacheValid(cacheKey, maxAge)) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            console.log('Using cached APOD data');
            const event = convertAPODToEvent(cached);
            console.log('Cached APOD event data:', { 
                hasImageUrl: !!event.imageUrl, 
                imageUrl: event.imageUrl, 
                mediaType: event.mediaType,
                category: event.category 
            });
            return event;
        }
    }
    
    try {
        const url = `${config.baseUrl}/planetary/apod?api_key=${config.apiKey}`;
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`APOD API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the data
        setCachedData(cacheKey, data);
        
        const event = convertAPODToEvent(data);
        console.log('Loaded APOD:', data.title);
        console.log('APOD event data:', { 
            hasImageUrl: !!event.imageUrl, 
            imageUrl: event.imageUrl, 
            mediaType: event.mediaType,
            category: event.category 
        });
        return event;
    } catch (error) {
        // Handle CORS and network errors gracefully
        if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
            console.warn('APOD API unavailable (CORS error), using cache if available');
        } else {
            console.error('Error loading APOD:', error);
        }
        
        // Try to use cached data even if expired
        const cached = getCachedData(cacheKey);
        if (cached) {
            console.log('Using cached APOD data due to API unavailability');
            return convertAPODToEvent(cached);
        }
        console.warn('No APOD data available (API failed and no cache)');
        return null;
    }
}

/**
 * Load APOD with priority - show cached immediately, then refresh in background
 * This ensures APOD (the default view) appears as fast as possible
 */
async function loadAPODPriority() {
    const config = getNASAConfig();
    if (!config) return Promise.resolve();
    
    const cacheKey = 'nasa_apod';
    const maxAge = config.cacheSettings.apod;
    
    // Step 1: Show cached APOD immediately if available (even if expired)
    const cached = getCachedData(cacheKey);
    if (cached) {
        const cachedEvent = convertAPODToEvent(cached);
        console.log('Cached APOD event data:', { 
            hasImageUrl: !!cachedEvent.imageUrl, 
            imageUrl: cachedEvent.imageUrl, 
            mediaType: cachedEvent.mediaType,
            category: cachedEvent.category 
        });
        allEvents.push(cachedEvent);
        window.allEvents = allEvents;
        console.log('Showing cached APOD immediately:', cachedEvent.title);
        console.log('APOD event added to allEvents. Total events:', allEvents.length);
        console.log('APOD event details:', { id: cachedEvent.id, category: cachedEvent.category, title: cachedEvent.title });
        
        // Ensure APOD checkbox is checked
        const apodCheckbox = document.querySelector('.filter-checkbox input[type="checkbox"][value="apod"]');
        if (apodCheckbox) {
            apodCheckbox.checked = true;
            selectedCategories.add('apod');
            console.log('APOD checkbox checked and added to selectedCategories');
        }
        
        // Update UI immediately with cached APOD
        // All categories are always shown - no need to update checkboxes
        applyFilters();
    }
    
    // Step 2: Check if cache is still valid
    if (isCacheValid(cacheKey, maxAge) && cached) {
        // Cache is valid, no need to fetch
        console.log('APOD cache is still valid, skipping fetch');
        return Promise.resolve();
    }
    
    // Step 3: Fetch fresh APOD in background (non-blocking)
    return loadAPOD(false).then(apodEvent => {
        if (apodEvent) {
            // Remove old cached APOD event if it exists
            if (cached && cached.date) {
                allEvents = allEvents.filter(e => !(e.category === 'apod' && e.id === `apod-${cached.date}`));
            } else {
                // Fallback: remove all APOD events and add fresh one
                allEvents = allEvents.filter(e => e.category !== 'apod');
            }
            
            // Add fresh APOD event
            allEvents.push(apodEvent);
            window.allEvents = allEvents;
            
            // Sort and update UI
            allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            
            // All categories are always shown - no need to update checkboxes
            applyFilters();
            
            console.log('Updated with fresh APOD:', apodEvent.title);
        }
    }).catch(error => {
        console.error('Error refreshing APOD in background:', error);
        // Don't fail - we already have cached version showing
    });
}

/**
 * Convert APOD data to event format
 */
function convertAPODToEvent(apodData) {
    return {
        id: `apod-${apodData.date}`,
        title: apodData.title || 'NASA Astronomy Picture of the Day',
        category: 'apod',
        datetime: `${apodData.date}T12:00:00Z`, // APOD is published at noon
        description: apodData.explanation || 'Daily astronomy image from NASA.',
        location: 'NASA',
        imageUrl: apodData.url,
        mediaType: apodData.media_type,
        hdImageUrl: apodData.hdurl,
        thumbnailUrl: apodData.thumbnail_url, // For videos, NASA sometimes provides a thumbnail
        source: 'NASA APOD'
    };
}

/**
 * Load NASA DONKI Solar Events (Solar Flares, CMEs, etc.)
 */
async function loadDONKI(forceRefresh = false) {
    const config = getNASAConfig();
    if (!config) return [];
    
    const cacheKey = 'nasa_donki';
    const maxAge = config.cacheSettings.donki;
    
    // Check cache first
    if (!forceRefresh && isCacheValid(cacheKey, maxAge)) {
        const cached = getCachedData(cacheKey);
        if (cached && cached.length > 0) {
            console.log('Using cached DONKI data');
            return convertDONKIToEvents(cached);
        }
    }
    
    try {
        const { startDate, endDate } = config.dateRanges.donki;
        
        // Fetch Solar Flares
        const flrUrl = `${config.baseUrl}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${config.apiKey}`;
        console.log('Fetching DONKI Solar Flares from:', flrUrl);
        const flrResponse = await fetch(flrUrl, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        let solarEvents = [];
        
        if (flrResponse.ok) {
            const flrData = await flrResponse.json();
            console.log('DONKI FLR response:', flrData);
            if (Array.isArray(flrData) && flrData.length > 0) {
                solarEvents = solarEvents.concat(flrData.map(event => ({
                    ...event,
                    type: 'solar_flare'
                })));
            }
        } else {
            console.warn('DONKI FLR failed:', flrResponse.status, flrResponse.statusText);
        }
        
        // Fetch CMEs (Coronal Mass Ejections)
        const cmeUrl = `${config.baseUrl}/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${config.apiKey}`;
        console.log('Fetching DONKI CMEs from:', cmeUrl);
        const cmeResponse = await fetch(cmeUrl, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (cmeResponse.ok) {
            const cmeData = await cmeResponse.json();
            console.log('DONKI CME response:', cmeData);
            if (Array.isArray(cmeData) && cmeData.length > 0) {
                solarEvents = solarEvents.concat(cmeData.map(event => ({
                    ...event,
                    type: 'cme'
                })));
            }
        } else {
            console.warn('DONKI CME failed:', cmeResponse.status, cmeResponse.statusText);
        }
        
        // Cache the data
        if (solarEvents.length > 0) {
            setCachedData(cacheKey, solarEvents);
        }
        
        console.log(`Loaded ${solarEvents.length} solar events from DONKI`);
        return convertDONKIToEvents(solarEvents);
    } catch (error) {
        // Handle CORS and network errors gracefully
        if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
            console.warn('DONKI API unavailable (CORS error), using cache if available');
        } else {
            console.error('Error loading DONKI data:', error);
        }
        
        // Try to use cached data even if expired
        const cached = getCachedData(cacheKey);
        if (cached && cached.length > 0) {
            console.log('Using cached DONKI data due to API unavailability');
            return convertDONKIToEvents(cached);
        }
        return [];
    }
}

/**
 * Convert DONKI data to event format
 */
function convertDONKIToEvents(donkiData) {
    if (!Array.isArray(donkiData) || donkiData.length === 0) {
        return [];
    }
    
    return donkiData.map(event => {
        let datetime, title, description;
        
        if (event.type === 'solar_flare') {
            datetime = event.peakTime || event.beginTime || new Date().toISOString();
            title = `Solar Flare ${event.classType || 'Event'}`;
            description = `Solar flare detected. Class: ${event.classType || 'Unknown'}. Source location: ${event.sourceLocation || 'Unknown'}.`;
        } else if (event.type === 'cme') {
            datetime = event.startTime || new Date().toISOString();
            title = `Coronal Mass Ejection (CME)`;
            description = `CME detected. Speed: ${event.speed || 'Unknown'} km/s. Type: ${event.cmeType || 'Unknown'}.`;
        } else {
            datetime = event.beginTime || new Date().toISOString();
            title = `Solar Event`;
            description = `Solar activity detected by NASA DONKI.`;
        }
        
        return {
            id: `donki-${event.flrID || event.activityID || Date.now()}-${Math.random()}`,
            title: title,
            category: 'solar',
            datetime: datetime,
            description: description,
            location: 'Sun',
            source: 'NASA DONKI',
            eventType: event.type,
            rawData: event
        };
    }).filter(event => event.datetime); // Filter out events without valid datetime
}

/**
 * Load NASA EONET (Natural Events)
 */
async function loadEONET(forceRefresh = false) {
    const config = getNASAConfig();
    if (!config) return [];
    
    const cacheKey = 'nasa_eonet';
    const maxAge = config.cacheSettings.eonet;
    
    // Check cache first
    if (!forceRefresh && isCacheValid(cacheKey, maxAge)) {
        const cached = getCachedData(cacheKey);
        if (cached && cached.events && cached.events.length > 0) {
            console.log('Using cached EONET data');
            return convertEONETToEvents(cached.events);
        }
    }
    
    try {
        // Use proxy to bypass CORS restrictions
        // Note: EONET v3 API doesn't require API key and uses limit/status instead of days
        // Documentation: https://eonet.gsfc.nasa.gov/how-to-guide
        const limit = 100; // Get up to 100 events (we'll filter for astronomy-related ones)
        const proxyUrl = `/api/eonet.js?status=open&limit=${limit}`;
        console.log('Fetching EONET data via proxy:', proxyUrl);
        const response = await fetch(proxyUrl, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            // Try to get error details
            let errorDetails = '';
            try {
                const errorData = await response.json();
                errorDetails = errorData.error || errorData.details || '';
                console.error('EONET proxy error response:', errorData);
            } catch (e) {
                // Response might not be JSON
                console.error('EONET proxy returned non-JSON error');
            }
            
            // 503 means service unavailable - use cache if available
            if (response.status === 503) {
                console.warn('EONET API unavailable (503 - NASA service down), using cache if available');
                console.warn('Error details:', errorDetails || 'No details available');
                const cached = getCachedData(cacheKey);
                if (cached && cached.events && cached.events.length > 0) {
                    console.log('Using expired cached EONET data due to service unavailability');
                    return convertEONETToEvents(cached.events);
                }
            }
            throw new Error(`EONET API error! status: ${response.status}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }
        
        const data = await response.json();
        
        console.log('EONET API response:', {
            totalEvents: data.events ? data.events.length : 0,
            sampleEvent: data.events && data.events.length > 0 ? data.events[0] : null
        });
        
        // Log all category IDs and names we're getting
        if (data.events && data.events.length > 0) {
            const allCategories = new Map();
            data.events.forEach(event => {
                if (event.categories) {
                    event.categories.forEach(cat => {
                        allCategories.set(cat.id, cat.title || cat.name || 'Unknown');
                    });
                }
            });
            console.log('EONET categories found:', Array.from(allCategories.entries()).map(([id, name]) => `${id}: ${name}`).join(', '));
        }
        
        // Filter for astronomy-related events (fireballs, aurora, etc.)
        // EONET v3 uses string category IDs (e.g., "wildfires", "severeStorms")
        // Astronomy-related categories to include:
        // - Fireballs (if available)
        // - Auroras (if available)
        // - Atmospheric events (if available)
        // - Volcanic events (can affect astronomy observations)
        const astronomyCategoryIds = [
            'fireballs',      // Fireballs (if exists)
            'aurora',         // Auroras (if exists)
            'atmospheric',    // Atmospheric events (if exists)
            'volcanoes'       // Volcanic events (can affect sky visibility)
        ];
        
        const astronomyEvents = (data.events || []).filter(event => {
            const categories = event.categories || [];
            const matches = categories.some(cat => {
                const id = String(cat.id || '').toLowerCase();
                const title = (cat.title || cat.name || '').toLowerCase();
                
                // Match by string ID (v3 API uses strings like "wildfires", "volcanoes")
                if (astronomyCategoryIds.some(astroId => id.includes(astroId) || astroId.includes(id))) {
                    return true;
                }
                
                // Match by title/name keywords
                if (title.includes('fireball') || 
                    title.includes('aurora') || 
                    title.includes('atmospheric') ||
                    title.includes('meteor') ||
                    title.includes('asteroid') ||
                    (title.includes('volcano') && title.includes('ash'))) {
                    return true;
                }
                
                return false;
            });
            
            // Only log first few filtered events to avoid spam
            if (!matches && categories.length > 0 && Math.random() < 0.1) {
                console.log(`Event "${event.title}" filtered out - categories:`, categories.map(c => `${c.id} (${c.title || c.name})`).join(', '));
            }
            return matches;
        });
        
        console.log(`Filtered ${astronomyEvents.length} astronomy events from ${data.events ? data.events.length : 0} total events`);
        
        // Cache the data
        if (astronomyEvents.length > 0) {
            setCachedData(cacheKey, { events: astronomyEvents });
        }
        
        console.log(`Loaded ${astronomyEvents.length} natural events from EONET`);
        return convertEONETToEvents(astronomyEvents);
    } catch (error) {
        // Handle errors gracefully
        if (error.message.includes('CORS') || error.message.includes('NetworkError') || error.message.includes('503')) {
            console.warn('EONET API unavailable via proxy, using cache if available');
        } else {
            console.error('Error loading EONET data:', error);
        }
        
        // Try to use cached data even if expired
        const cached = getCachedData(cacheKey);
        if (cached && cached.events && cached.events.length > 0) {
            console.log('Using cached EONET data due to API unavailability');
            return convertEONETToEvents(cached.events);
        }
        return [];
    }
}

/**
 * Convert EONET data to event format
 */
function convertEONETToEvents(eonetData) {
    if (!Array.isArray(eonetData) || eonetData.length === 0) {
        return [];
    }
    
    return eonetData.map(event => {
        const geometry = event.geometry && event.geometry[0];
        const category = event.categories && event.categories[0];
        
        let location = 'Earth';
        if (geometry && geometry.coordinates) {
            location = `${geometry.coordinates[1].toFixed(2)}°, ${geometry.coordinates[0].toFixed(2)}°`;
        }
        
        return {
            id: `eonet-${event.id}`,
            title: event.title || 'Natural Event',
            category: 'natural',
            datetime: geometry ? geometry.date : new Date().toISOString(),
            description: `${category ? category.title + ': ' : ''}${event.title || 'Natural event detected by NASA EONET.'}`,
            location: location,
            source: 'NASA EONET',
            eventType: category ? category.title : 'Natural Event',
            rawData: event
        };
    }).filter(event => event.datetime); // Filter out events without valid datetime
}

/**
 * Load NASA data excluding APOD (DONKI, EONET)
 * APOD is loaded separately with priority via loadAPODPriority()
 */
async function loadNASADataOther(forceRefresh = false) {
    try {
        console.log('=== Loading NASA Data (DONKI, EONET) ===');
        const [donkiEvents, eonetEvents] = await Promise.all([
            loadDONKI(forceRefresh),
            loadEONET(forceRefresh)
        ]);
        
        console.log('NASA API results:', {
            donki: donkiEvents ? `${donkiEvents.length} events` : '✗',
            eonet: eonetEvents ? `${eonetEvents.length} events` : '✗'
        });
        
        const nasaEvents = [];
        
        // Add DONKI events
        if (donkiEvents && donkiEvents.length > 0) {
            nasaEvents.push(...donkiEvents);
            console.log(`Added ${donkiEvents.length} DONKI events`);
        } else {
            console.warn('No DONKI events returned');
        }
        
        // Add EONET events
        if (eonetEvents && eonetEvents.length > 0) {
            nasaEvents.push(...eonetEvents);
            console.log(`Added ${eonetEvents.length} EONET events`);
        } else {
            console.warn('No EONET events returned');
        }
        
        console.log(`Loaded ${nasaEvents.length} total NASA events`);
        console.log('NASA events details:', nasaEvents);
        
        // Add NASA events to allEvents array
        const beforeCount = allEvents.length;
        allEvents = [...allEvents, ...nasaEvents];
        const afterCount = allEvents.length;
        
        console.log(`Events count: ${beforeCount} → ${afterCount} (added ${nasaEvents.length} NASA events)`);
        
        // Sort all events by datetime (earliest first)
        allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        
        // Update global reference
        window.allEvents = allEvents;
        
        // Debug: Log all event categories
        const categories = [...new Set(allEvents.map(e => e.category))];
        console.log('Available event categories:', categories);
        console.log('Total events by category:', 
            categories.map(cat => `${cat}: ${allEvents.filter(e => e.category === cat).length}`).join(', '));
        
        // If this is called after initial load, re-apply filters to show new events
        if (beforeCount > 0) {
            console.log('Re-applying filters after NASA data load...');
            // All categories are always shown - no need to update checkboxes
            applyFilters();
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading NASA data:', error);
        return Promise.resolve(); // Don't fail the whole app if NASA APIs fail
    }
}

// Note: Astronomy API (api.astronomyapi.com) requires server-side proxy due to CORS restrictions
// We've replaced it with Open-Meteo Astronomy API which is free and CORS-enabled
// The old config functions are removed as they're no longer needed

/**
 * Load Open-Meteo Astronomy API data
 */
async function loadAstronomyData(forceRefresh = false) {
    try {
        console.log('=== Loading Open-Meteo Astronomy Data ===');
        
        // Get current location for astronomy calculations
        const location = getCurrentLocation();
        const lat = location.lat || 10.25; // Default to La Brea
        const lon = location.lon || -61.63;
        
        // Load astronomy events (e.g., moon phases, sunrise/sunset, etc.)
        const astronomyEvents = await loadAstronomyEvents(lat, lon, forceRefresh);
        
        if (astronomyEvents && astronomyEvents.length > 0) {
            const beforeCount = allEvents.length;
            allEvents = [...allEvents, ...astronomyEvents];
            const afterCount = allEvents.length;
            
            console.log(`Added ${astronomyEvents.length} Open-Meteo Astronomy events (${beforeCount} → ${afterCount})`);
            console.log('Astronomy events sample:', astronomyEvents.slice(0, 2));
            
            // Sort all events by datetime
            allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            window.allEvents = allEvents;
            
            // Debug: Log all categories after adding astronomy events
            const categories = [...new Set(allEvents.map(e => e.category))];
            console.log('All event categories after adding astronomy:', categories);
            console.log('Astronomy events count:', allEvents.filter(e => e.category === 'astronomy').length);
            
            // Re-apply filters if this is called after initial load
            if (beforeCount > 0) {
                applyFilters();
            }
        } else {
            console.warn('No astronomy events loaded from Open-Meteo. Check API response above.');
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading Open-Meteo Astronomy data:', error);
        return Promise.resolve(); // Don't fail the whole app
    }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate moon phase (0 = new moon, 0.5 = full moon, 1 = new moon)
 * Simple approximation based on days since known new moon
 */
function calculateMoonPhase(date) {
    // Known new moon date: January 11, 2025 00:00 UTC
    const knownNewMoon = new Date('2025-01-11T00:00:00Z');
    const daysSinceNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
    const lunarCycle = 29.53; // days in lunar cycle
    const phase = (daysSinceNewMoon % lunarCycle) / lunarCycle;
    return phase;
}

/**
 * Get moon phase name from phase value (0-1)
 */
function getMoonPhaseName(phase) {
    if (phase === 0 || phase === 1 || phase < 0.01) {
        return 'New Moon';
    } else if (phase < 0.25) {
        return 'Waxing Crescent';
    } else if (phase === 0.25 || (phase > 0.24 && phase < 0.26)) {
        return 'First Quarter';
    } else if (phase < 0.5) {
        return 'Waxing Gibbous';
    } else if (phase === 0.5 || (phase > 0.49 && phase < 0.51)) {
        return 'Full Moon';
    } else if (phase < 0.75) {
        return 'Waning Gibbous';
    } else if (phase === 0.75 || (phase > 0.74 && phase < 0.76)) {
        return 'Last Quarter';
    } else {
        return 'Waning Crescent';
    }
}

/**
 * Load astronomy events from Open-Meteo Astronomy API (CORS-enabled, free)
 */
async function loadAstronomyEvents(lat, lon, forceRefresh = false) {
    const cacheKey = 'openmeteo_astronomy';
    const maxAge = 6 * 60 * 60 * 1000; // 6 hours
    
    // Check cache first
    if (!forceRefresh && isCacheValid(cacheKey, maxAge)) {
        const cached = getCachedData(cacheKey);
        if (cached && cached.length > 0) {
            console.log('Using cached Open-Meteo Astronomy data');
            return cached;
        }
    }
    
    try {
        // Get today's date in YYYY-MM-DD format (required by Open-Meteo)
        const date = new Date().toISOString().split('T')[0];
        const timezone = 'America/Port_of_Spain';
        
        // Build URL with correct endpoint (/v1/forecast) and required date parameters
        // Note: moon_phase is not available in daily forecast endpoint
        // Only sunrise and sunset are supported in daily forecast
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                    `&daily=sunrise,sunset` +
                    `&timezone=${encodeURIComponent(timezone)}` +
                    `&start_date=${date}&end_date=${date}`;
        
        console.log('Fetching astronomy data from Open-Meteo...');
        console.log('URL:', url);
        console.log('Date:', date);
        
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Open-Meteo API error response:', errorText);
            console.error('Response status:', response.status);
            throw new Error(`Open-Meteo API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Open-Meteo Astronomy response:', data);
        
        if (!data || !data.daily) {
            console.warn('No astronomy data returned from Open-Meteo.');
            return [];
        }
        
        // Convert daily data into events
        const daily = data.daily;
        const events = [];
        
        // Calculate moon phase manually (since API doesn't provide it in daily forecast)
        const moonPhase = calculateMoonPhase(new Date(date));
        const moonPhaseName = getMoonPhaseName(moonPhase);
        const moonIllumination = Math.round(moonPhase * 100);
        
        events.push({
            id: `astronomy-moon-${date}`,
            title: `Moon Phase: ${moonPhaseName}`,
            category: 'astronomy',
            datetime: `${date}T12:00:00Z`,
            description: `Current moon phase: ${moonPhaseName}. Illumination: ${moonIllumination}%`,
            location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
            source: 'Open-Meteo Astronomy (calculated)',
            moonPhase: moonPhaseName,
            illumination: moonIllumination,
            moonPhaseValue: moonPhase
        });
        console.log('Astronomy event created: Moon Phase (calculated)');
        
        // Process each field (sunrise, sunset)
        // Note: moon_phase is not available in daily forecast API
        const fields = ['sunrise', 'sunset'];
        fields.forEach(field => {
            if (daily[field] && daily[field].length > 0 && daily[field][0] !== null) {
                const fieldValue = daily[field][0];
                const fieldTitle = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
                
                // For sunrise, sunset - use the actual time value
                events.push({
                    id: `astronomy-${field}-${date}`,
                    title: fieldTitle,
                    category: 'astronomy',
                    datetime: fieldValue || `${date}T00:00:00Z`,
                    description: `${fieldTitle} time for your location: ${fieldValue || 'N/A'}`,
                    location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
                    source: 'Open-Meteo Astronomy'
                });
                console.log(`Astronomy event created: ${fieldTitle}`);
            }
        });
        
        // Cache the events
        if (events.length > 0) {
            setCachedData(cacheKey, events);
        }
        
        console.log(`Loaded ${events.length} events from Open-Meteo Astronomy API`);
        return events;
    } catch (error) {
        console.error('Error loading Open-Meteo Astronomy events:', error);
        
        // Try to use cached data even if expired
        const cached = getCachedData(cacheKey);
        if (cached && cached.length > 0) {
            console.log('Using cached Open-Meteo Astronomy data due to API unavailability');
            return cached;
        }
        
        return [];
    }
}

/**
 * Load current planet visibility data
 * Calculates which planets are currently visible based on current date and location
 */
async function loadPlanetVisibility(forceRefresh = false) {
    try {
        console.log('=== Loading Planet Visibility Data ===');
        
        // Get current location
        const location = getCurrentLocation();
        const lat = location.lat || 10.25; // Default to La Brea
        const lon = location.lon || -61.63;
        
        const cacheKey = 'planet_visibility';
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours (planet positions change slowly)
        
        // Check cache first
        if (!forceRefresh && isCacheValid(cacheKey, maxAge)) {
            const cached = getCachedData(cacheKey);
            if (cached && cached.length > 0) {
                console.log('Using cached planet visibility data');
                const beforeCount = allEvents.length;
                allEvents = [...allEvents, ...cached];
                const afterCount = allEvents.length;
                console.log(`Added ${cached.length} planet visibility events (${beforeCount} → ${afterCount})`);
                return Promise.resolve();
            }
        }
        
        const now = new Date();
        console.log('Calculating planet visibility for date:', now.toISOString());
        const planetEvents = calculatePlanetVisibility(now, lat, lon);
        console.log('Planet events calculated:', planetEvents);
        console.log('Number of planet events:', planetEvents ? planetEvents.length : 0);
        
        if (planetEvents && planetEvents.length > 0) {
            // Remove old static planet events (they're outdated)
            const beforeFilter = allEvents.length;
            allEvents = allEvents.filter(e => e.category !== 'planet' || !e.id.startsWith('planet-'));
            const afterFilter = allEvents.length;
            console.log(`Filtered out old planet events: ${beforeFilter} → ${afterFilter}`);
            
            const beforeCount = allEvents.length;
            allEvents = [...allEvents, ...planetEvents];
            const afterCount = allEvents.length;
            
            // Sort all events by datetime
            allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            window.allEvents = allEvents;
            
            console.log(`Added ${planetEvents.length} current planet visibility events (${beforeCount} → ${afterCount})`);
            console.log('Planet visibility events:', planetEvents);
            console.log('Total events now:', allEvents.length);
            console.log('Planet events in allEvents:', allEvents.filter(e => e.category === 'planet'));
            
            // Cache the events
            setCachedData(cacheKey, planetEvents);
            
            // Re-apply filters if this is called after initial load
            if (beforeCount > 0) {
                applyFilters();
            }
        } else {
            console.warn('No planet visibility events generated.');
            console.warn('planetEvents value:', planetEvents);
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading planet visibility data:', error);
        return Promise.resolve(); // Don't fail the whole app
    }
}

/**
 * Calculate which planets are currently visible
 * Uses approximate calculations based on current date and planetary cycles
 */
function calculatePlanetVisibility(currentDate, lat, lon) {
    console.log('calculatePlanetVisibility called with:', { currentDate, lat, lon });
    const events = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12
    const day = currentDate.getDate();
    
    // Get current date string for event datetime
    const dateStr = currentDate.toISOString().split('T')[0];
    console.log('Date string:', dateStr, 'Month:', month);
    
    // Planet visibility data (approximate, based on 2025 planetary positions)
    // These are general visibility windows - for accurate positions, use a proper astronomy library
    
    // Jupiter - Visible most of the year, best around opposition (varies by year)
    // In 2025, Jupiter is well-placed for evening viewing
    // Always visible - it's one of the brightest objects in the night sky
    const jupiterVisible = true; // Generally visible year-round
    const jupiterBestTime = "Evening to Late Night";
    const jupiterDirection = "East to South";
    const jupiterDescription = "Jupiter is currently visible in the evening sky. Look for it as a bright, steady point of light. Best viewing is in the evening hours when it's high in the sky. Jupiter is one of the brightest objects in the night sky and is visible most nights.";
    
    // Saturn - Visible most of the year, best around opposition
    // In 2025, Saturn is visible in the evening
    // Always visible - though brightness varies
    const saturnVisible = true; // Generally visible year-round
    const saturnBestTime = "Evening to Late Night";
    const saturnDirection = "South to Southwest";
    const saturnDescription = "Saturn is currently visible in the evening sky. It appears as a golden-yellow point of light. Best viewed with a telescope to see its rings. Saturn is visible most nights, though it's dimmer than Jupiter.";
    
    // Mars - Visibility varies significantly throughout the year
    // Check if Mars is in a good viewing window (typically around opposition every ~2 years)
    // In 2025, Mars is not at opposition, so visibility is limited
    const marsVisible = false; // Not well-placed in 2025
    const marsDescription = "Mars is currently not well-placed for viewing. It's too close to the Sun in the sky. Best viewing will be around its next opposition.";
    
    // Venus - Visible as morning or evening star, cycles every ~19 months
    // Check current phase
    const venusVisible = checkVenusVisibility(month);
    const venusDescription = venusVisible 
        ? "Venus is currently visible as a bright 'star' in the " + (month >= 3 && month <= 8 ? "evening" : "morning") + " sky. It's the brightest planet and easy to spot."
        : "Venus is currently too close to the Sun to be easily visible.";
    
    // Mercury - Only visible near greatest elongation (brief windows)
    // Very difficult to see, only visible for short periods
    const mercuryVisible = checkMercuryVisibility(month);
    const mercuryDescription = mercuryVisible
        ? "Mercury may be visible low on the horizon just before sunrise or after sunset. It's challenging to spot and requires clear skies and an unobstructed horizon."
        : "Mercury is currently too close to the Sun to be visible.";
    
    // Add visible planets to events
    if (jupiterVisible) {
        events.push({
            id: `planet-jupiter-${dateStr}`,
            title: "Jupiter Visible Tonight",
            category: 'planet',
            datetime: `${dateStr}T20:00:00Z`, // Evening time
            description: jupiterDescription,
            location: `Look ${jupiterDirection}`,
            visibility: {
                direction: jupiterDirection,
                peak: jupiterBestTime,
                elevation: "High in evening sky"
            },
            source: 'Current Planet Visibility',
            planetName: 'Jupiter',
            magnitude: '-2.5', // Approximate
            updateDate: dateStr
        });
    }
    
    if (saturnVisible) {
        events.push({
            id: `planet-saturn-${dateStr}`,
            title: "Saturn Visible Tonight",
            category: 'planet',
            datetime: `${dateStr}T20:00:00Z`, // Evening time
            description: saturnDescription,
            location: `Look ${saturnDirection}`,
            visibility: {
                direction: saturnDirection,
                peak: saturnBestTime,
                elevation: "Mid to high in evening sky"
            },
            source: 'Current Planet Visibility',
            planetName: 'Saturn',
            magnitude: '0.5', // Approximate
            updateDate: dateStr
        });
    }
    
    if (marsVisible) {
        events.push({
            id: `planet-mars-${dateStr}`,
            title: "Mars Visible Tonight",
            category: 'planet',
            datetime: `${dateStr}T20:00:00Z`,
            description: marsDescription,
            location: "Check current sky charts",
            visibility: {
                direction: "Variable",
                peak: "Evening to Morning",
                elevation: "Variable"
            },
            source: 'Current Planet Visibility',
            planetName: 'Mars',
            magnitude: '1.5', // Approximate
            updateDate: dateStr
        });
    }
    
    if (venusVisible) {
        const isMorningStar = month < 3 || month > 8;
        events.push({
            id: `planet-venus-${dateStr}`,
            title: `Venus Visible ${isMorningStar ? 'Before Sunrise' : 'After Sunset'}`,
            category: 'planet',
            datetime: isMorningStar ? `${dateStr}T06:00:00Z` : `${dateStr}T19:00:00Z`,
            description: venusDescription,
            location: `Look ${isMorningStar ? 'East' : 'West'} near horizon`,
            visibility: {
                direction: isMorningStar ? "East" : "West",
                peak: isMorningStar ? "Before Sunrise" : "After Sunset",
                elevation: "Low on horizon"
            },
            source: 'Current Planet Visibility',
            planetName: 'Venus',
            magnitude: '-4.5', // Very bright
            updateDate: dateStr
        });
    }
    
    if (mercuryVisible) {
        const isMorning = month >= 1 && month <= 6;
        events.push({
            id: `planet-mercury-${dateStr}`,
            title: `Mercury ${isMorning ? 'Morning' : 'Evening'} Visibility Window`,
            category: 'planet',
            datetime: isMorning ? `${dateStr}T06:00:00Z` : `${dateStr}T19:00:00Z`,
            description: mercuryDescription,
            location: `Look ${isMorning ? 'East' : 'West'} very low on horizon`,
            visibility: {
                direction: isMorning ? "East" : "West",
                peak: isMorning ? "Just before sunrise" : "Just after sunset",
                elevation: "Very low on horizon"
            },
            source: 'Current Planet Visibility',
            planetName: 'Mercury',
            magnitude: '0.0', // Variable
            updateDate: dateStr
        });
    }
    
    console.log('calculatePlanetVisibility returning events:', events.length);
    console.log('Planet events details:', events.map(e => `${e.planetName}: ${e.title}`));
    
    if (events.length === 0) {
        console.error('No planet events generated! This should not happen.');
        console.error('Visibility flags:', {
            jupiter: jupiterVisible,
            saturn: saturnVisible,
            mars: marsVisible,
            venus: venusVisible,
            mercury: mercuryVisible,
            month: month
        });
    }
    return events;
}

/**
 * Check if Venus is currently visible (approximate)
 * Venus alternates between morning and evening star
 */
function checkVenusVisibility(month) {
    // Simplified: Venus is generally visible except when too close to Sun
    // In 2025, Venus has good visibility windows
    // This is approximate - for accuracy, use proper astronomical calculations
    return true; // Generally visible most of the time
}

/**
 * Check if Mercury is currently visible (approximate)
 * Mercury is only visible near greatest elongation
 */
function checkMercuryVisibility(month) {
    // Mercury has brief visibility windows around greatest elongation
    // These occur roughly every 3-4 months
    // Simplified check - in reality, need to calculate elongation
    const elongationMonths = [1, 4, 7, 10]; // Approximate months with good visibility
    return elongationMonths.includes(month);
}

/* ============================
   UI ENHANCEMENTS
   ============================ */

/**
 * Setup header condensing on scroll
 */
function setupHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const handleScroll = () => {
        const scrollY = window.scrollY;
        
        if (scrollY > 80) {
            header.classList.add('condensed');
        } else {
            header.classList.remove('condensed');
        }
        
        lastScrollY = scrollY;
        ticking = false;
    };
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }, { passive: true });
}

/**
 * Setup motion toggle for accessibility
 */
function setupMotionToggle() {
    const motionToggle = document.getElementById('motionToggle');
    if (!motionToggle) return;
    
    // ALWAYS ensure animations run by default - remove reduce-motion class first
    document.body.classList.remove('reduce-motion');
    
    // Check saved preference - only reduce motion if explicitly set to 'true'
    const savedMotionPref = localStorage.getItem('reduceMotion');
    console.log('Motion preference:', savedMotionPref);
    
    if (savedMotionPref === 'true') {
        document.body.classList.add('reduce-motion');
        console.log('Reduce motion enabled from saved preference');
    } else {
        // Clear any stale preference
        localStorage.removeItem('reduceMotion');
        console.log('Animations enabled by default');
    }
    
    motionToggle.addEventListener('click', () => {
        document.body.classList.toggle('reduce-motion');
        const isReduced = document.body.classList.contains('reduce-motion');
        localStorage.setItem('reduceMotion', isReduced.toString());
        
        // Announce to screen readers
        const announcement = isReduced ? 'Background animations paused' : 'Background animations resumed';
        announceToScreenReader(announcement);
    });
}

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Setup filter panel mobile behavior
 */
function setupFilterPanel() {
    const filterPanel = document.getElementById('filterPanel');
    const filterToggleMobile = document.getElementById('filterToggleMobile');
    const filterCloseMobile = document.getElementById('filterCloseMobile');
    const selectAllBtn = document.getElementById('selectAllFilters');
    const clearAllBtn = document.getElementById('clearAllFilters');
    
    console.log('Setting up filter panel:', { 
        filterPanel: !!filterPanel, 
        selectAllBtn: !!selectAllBtn, 
        clearAllBtn: !!clearAllBtn 
    });
    
    // Mobile toggle
    if (filterToggleMobile && filterPanel) {
        filterToggleMobile.addEventListener('click', () => {
            filterPanel.classList.add('open');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        });
    }
    
    if (filterCloseMobile && filterPanel) {
        filterCloseMobile.addEventListener('click', () => {
            filterPanel.classList.remove('open');
            document.body.style.overflow = ''; // Restore scroll
        });
    }
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && filterPanel && filterPanel.classList.contains('open')) {
            filterPanel.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
    
    // Select All - use event delegation as backup
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Select All clicked');
            const checkboxes = document.querySelectorAll('.filter-checkbox input[type="checkbox"]');
            console.log('Found checkboxes:', checkboxes.length);
            checkboxes.forEach(cb => {
                cb.checked = true;
            });
            updateFilterCount();
            applyFilters();
        });
    } else {
        console.warn('Select All button not found!');
    }
    
    // Clear All
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clear All clicked');
            const checkboxes = document.querySelectorAll('.filter-checkbox input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = false;
            });
            // Keep at least APOD checked as default
            const apodCheckbox = document.querySelector('.filter-checkbox input[value="apod"]');
            if (apodCheckbox) apodCheckbox.checked = true;
            updateFilterCount();
            applyFilters();
        });
    } else {
        console.warn('Clear All button not found!');
    }
    
    // Update filter count when checkboxes change
    const checkboxes = document.querySelectorAll('.filter-checkbox input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateFilterCount);
    });
}

/**
 * Update filter count badge
 */
function updateFilterCount() {
    const filterCount = document.getElementById('filterCount');
    if (!filterCount) return;
    
    const checkedCount = document.querySelectorAll('.filter-checkbox input[type="checkbox"]:checked').length;
    filterCount.textContent = checkedCount;
    
    // Add visual emphasis if many filters selected
    if (checkedCount > 3) {
        filterCount.style.background = 'var(--accent-secondary)';
    } else {
        filterCount.style.background = 'var(--accent-primary)';
    }
}

/**
 * Setup glossary search functionality
 */
function setupGlossarySearch() {
    const glossarySearch = document.getElementById('glossarySearch');
    if (!glossarySearch) return;
    
    glossarySearch.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const glossaryItems = document.querySelectorAll('.glossary-item');
        const glossaryCategories = document.querySelectorAll('.glossary-category');
        
        if (!searchTerm) {
            // Show all items and categories
            glossaryItems.forEach(item => item.style.display = '');
            glossaryCategories.forEach(cat => cat.style.display = '');
            return;
        }
        
        // Search through items
        glossaryItems.forEach(item => {
            const term = item.querySelector('strong')?.textContent.toLowerCase() || '';
            const definition = item.querySelector('p')?.textContent.toLowerCase() || '';
            
            if (term.includes(searchTerm) || definition.includes(searchTerm)) {
                item.style.display = '';
                // Highlight matching text
                highlightSearchTerm(item, searchTerm);
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide empty categories
        glossaryCategories.forEach(cat => {
            const visibleItems = cat.querySelectorAll('.glossary-item:not([style*="display: none"])');
            cat.style.display = visibleItems.length === 0 ? 'none' : '';
        });
    }, 200));
}

/**
 * Highlight search term in glossary items
 */
function highlightSearchTerm(item, searchTerm) {
    // Simple highlight - could be enhanced with mark.js or similar
    const strongEl = item.querySelector('strong');
    const pEl = item.querySelector('p');
    
    // Reset any previous highlights
    if (strongEl) {
        strongEl.innerHTML = strongEl.textContent;
    }
    if (pEl) {
        pEl.innerHTML = pEl.textContent;
    }
    
    // Add highlight for matching term
    if (searchTerm && searchTerm.length > 1) {
        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
        
        if (strongEl && strongEl.textContent.toLowerCase().includes(searchTerm)) {
            strongEl.innerHTML = strongEl.textContent.replace(regex, '<mark style="background: var(--accent-warning); color: var(--bg-primary); padding: 0 2px; border-radius: 2px;">$1</mark>');
        }
        if (pEl && pEl.textContent.toLowerCase().includes(searchTerm)) {
            pEl.innerHTML = pEl.textContent.replace(regex, '<mark style="background: var(--accent-warning); color: var(--bg-primary); padding: 0 2px; border-radius: 2px;">$1</mark>');
        }
    }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
