// Helper function to get NASA API config
function getNASAConfig() {
    if (typeof NASA_API_CONFIG !== 'undefined') {
        return NASA_API_CONFIG;
    }
    if (typeof window !== 'undefined' && window.NASA_API_CONFIG) {
        return window.NASA_API_CONFIG;
    }
    console.error('NASA_API_CONFIG is not defined. Make sure config.js is loaded before script.js');
    return null;
}

// Global state
let allEvents = [];
let filteredEvents = [];
let selectedCategories = new Set(['meteor', 'planet', 'iss', 'apod', 'solar', 'astronomy']);

// Location state
let userLocation = null;
let locationPermissionRequested = false;

// La Brea, Trinidad & Tobago coordinates (fallback)
const LA_BREA_COORDS = {
    lat: 10.25,
    lon: -61.63,
    name: 'La Brea, Trinidad & Tobago'
};

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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Initialize checkboxes to match default selectedCategories
    filterCheckboxes.forEach(checkbox => {
        if (selectedCategories.has(checkbox.value)) {
            checkbox.checked = true;
        }
    });
    
    // Load all events in parallel
    Promise.all([
        loadEvents(),
        loadISSPasses(),
        loadNASAData(),
        loadAstronomyData()
    ]).then(() => {
        console.log('All events loaded. Total:', allEvents.length);
        const actualCategories = [...new Set(allEvents.map(e => e.category))];
        console.log('Event categories:', actualCategories);
        
        // Update filter checkboxes to only show categories that have events
        updateFilterCheckboxes(actualCategories);
        
        applyFilters();
    }).catch((error) => {
        console.error('Error loading events:', error);
        // Even if some fail, show what we have
        if (allEvents.length > 0) {
            const actualCategories = [...new Set(allEvents.map(e => e.category))];
            updateFilterCheckboxes(actualCategories);
            applyFilters();
        }
    });
    
    setupEventListeners();
    setupNavigation();
});

/**
 * Setup navigation between sections
 */
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    const sections = document.querySelectorAll('.content-section');

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
                    
                    // Ensure container is visible and has dimensions
                    const containerVisible = mapContainer.offsetWidth > 0 && mapContainer.offsetHeight > 0;
                    console.log('Map container dimensions:', {
                        width: mapContainer.offsetWidth,
                        height: mapContainer.offsetHeight,
                        visible: containerVisible
                    });
                    
                    if (typeof initGIBSMap === 'function') {
                        if (!window.gibsMap) {
                            console.log('Initializing GIBS map for the first time...');
                            initGIBSMap();
                        } else {
                            console.log('GIBS map already exists, forcing re-render...');
                            
                            // Check if map object is valid
                            if (!window.gibsMap) {
                                console.error('window.gibsMap is null or undefined');
                                // Try to re-initialize
                                initGIBSMap();
                                return;
                            }
                            
                            console.log('Map object exists, type:', typeof window.gibsMap);
                            console.log('Map object:', window.gibsMap);
                            console.log('Is Leaflet Map?', window.gibsMap instanceof L.Map);
                            console.log('Map has invalidateSize:', typeof window.gibsMap.invalidateSize);
                            
                            // If map is not a proper Leaflet map, re-initialize it
                            if (!(window.gibsMap instanceof L.Map) || typeof window.gibsMap.invalidateSize !== 'function') {
                                console.warn('Map object is not a valid Leaflet map, re-initializing...');
                                // Clear the invalid map object
                                window.gibsMap = null;
                                if (typeof window.gibsMapInitialized !== 'undefined') {
                                    window.gibsMapInitialized = false;
                                }
                                // Re-initialize
                                initGIBSMap();
                                return;
                            }
                            
                            try {
                                // Force map to re-render by invalidating size multiple times
                                if (window.gibsMap.invalidateSize) {
                                    console.log('Calling invalidateSize()...');
                                    window.gibsMap.invalidateSize();
                                    console.log('First invalidateSize() completed');
                                    
                                    // Update location if available
                                    if (typeof updateGIBSMapLocation === 'function') {
                                        console.log('Updating map location...');
                                        updateGIBSMapLocation();
                                    }
                                    
                                    // Force multiple invalidations to ensure tiles reload
                                    setTimeout(() => {
                                        try {
                                            if (window.gibsMap) {
                                                console.log('Second invalidateSize() call...');
                                                window.gibsMap.invalidateSize();
                                                
                                                // Trigger a view change to force tile reload
                                                if (window.gibsMap.getCenter && window.gibsMap.getZoom) {
                                                    const currentCenter = window.gibsMap.getCenter();
                                                    const currentZoom = window.gibsMap.getZoom();
                                                    console.log('Current map state - center:', currentCenter, 'zoom:', currentZoom);
                                                    
                                                    if (window.gibsMap.setView) {
                                                        window.gibsMap.setView(currentCenter, currentZoom);
                                                        console.log('Map view refreshed');
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.error('Error in second invalidateSize timeout:', e);
                                        }
                                    }, 200);
                                    
                                    setTimeout(() => {
                                        try {
                                            if (window.gibsMap) {
                                                console.log('Third invalidateSize() call...');
                                                window.gibsMap.invalidateSize();
                                                console.log('Final map size invalidation complete');
                                                
                                                // Check if tiles are loading
                                                if (window.gibsMap._layers) {
                                                    const layers = Object.values(window.gibsMap._layers);
                                                    console.log('Total layers on map:', layers.length);
                                                    
                                                    const tileLayers = layers.filter(l => l._url || l._tileUrl || (l.options && l.options.getTileUrl));
                                                    console.log('Active tile layers found:', tileLayers.length);
                                                    
                                                    tileLayers.forEach((layer, idx) => {
                                                        console.log(`Layer ${idx} type:`, layer.constructor.name);
                                                        if (layer._tiles) {
                                                            const tiles = Object.values(layer._tiles);
                                                            const loaded = tiles.filter(t => t.complete && t.naturalWidth > 0).length;
                                                            const total = tiles.length;
                                                            console.log(`Layer ${idx}: ${loaded}/${total} tiles loaded`);
                                                            
                                                            if (loaded === 0 && total > 0) {
                                                                console.warn(`Layer ${idx} has no loaded tiles!`);
                                                            }
                                                        } else {
                                                            console.log(`Layer ${idx} has no _tiles property`);
                                                        }
                                                    });
                                                } else {
                                                    console.warn('Map has no _layers property');
                                                }
                                            }
                                        } catch (e) {
                                            console.error('Error in third invalidateSize timeout:', e);
                                        }
                                    }, 500);
                                } else {
                                    console.error('Map does not have invalidateSize method');
                                }
                            } catch (e) {
                                console.error('Error during map re-render:', e);
                                console.error('Error stack:', e.stack);
                            }
                        }
                    } else {
                        console.error('initGIBSMap function not found');
                    }
                }, 100); // Minimal delay - container should be visible immediately when section is active
            }

            if (targetSection === 'sky') {
                setTimeout(() => {
                    if (typeof initSkyMap === 'function') {
                        if (!window.skyMapInitialized) {
                            initSkyMap();
                        } else if (typeof renderSkyMap === 'function' && typeof updateVisibleEvents === 'function') {
                            renderSkyMap();
                            updateVisibleEvents();
                        }
                    }
                }, 100);
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
        
        console.log(`Loaded ${staticEvents.length} static events`);
        
        // Store static events (ISS passes will be added separately)
        allEvents = staticEvents;
        
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
            if (typeof renderSkyMap === 'function') {
                renderSkyMap();
                updateVisibleEvents();
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
        
        console.log('Fetching ISS passes from WhereTheISS.at...');
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
        
        console.log(`Loaded ${issEvents.length} ISS passes from WhereTheISS.at`);
        
        // Add ISS events to allEvents array
        allEvents = [...allEvents, ...issEvents];
        
        // Sort all events by datetime (earliest first)
        allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        
        // Update global reference
        window.allEvents = allEvents;
        
        console.log(`Total events after ISS merge: ${allEvents.length}`);
        
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

    // Filter checkboxes
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedCategories();
        });
    });

    // Apply filters button
    applyFiltersButton.addEventListener('click', () => {
        applyFilters();
    });

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
            loadNASAData(true).then(() => {
                refreshNASAButton.disabled = false;
                refreshNASAButton.textContent = '🔄 Refresh NASA Data';
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
    const checkedBoxes = [];
    filterCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedCategories.add(checkbox.value);
            checkedBoxes.push(checkbox.value);
        }
    });
    console.log('Checkbox states:', Array.from(filterCheckboxes).map(cb => ({ value: cb.value, checked: cb.checked })));
    console.log('Selected categories from checkboxes:', checkedBoxes);
}

/**
 * Apply filters and render events
 */
function applyFilters() {
    updateSelectedCategories();
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    console.log('Applying filters...');
    console.log('Selected categories:', Array.from(selectedCategories));
    console.log('Total events before filter:', allEvents.length);
    
    // Debug: Show all event categories
    const eventCategories = {};
    allEvents.forEach(event => {
        eventCategories[event.category] = (eventCategories[event.category] || 0) + 1;
    });
    console.log('Events by category:', eventCategories);
    console.log('Sample events:', allEvents.slice(0, 3).map(e => ({ title: e.title, category: e.category })));
    
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
    
    console.log('Filtered events count:', filteredEvents.length);
    console.log('Filtered events by category:', 
        [...new Set(filteredEvents.map(e => e.category))].map(cat => 
            `${cat}: ${filteredEvents.filter(e => e.category === cat).length}`
        ).join(', '));
    
    renderEvents();
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
}

/**
 * Create HTML for an event card
 */
function createEventCard(event) {
    const date = new Date(event.datetime);
    const formattedDate = formatDateTime(date);
    const categoryClass = `category-${event.category}`;
    const categoryLabel = getCategoryLabel(event.category);
    
    // Add image for APOD events
    let imageHtml = '';
    if (event.imageUrl && event.mediaType === 'image') {
        imageHtml = `<img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.title)}" class="event-image" loading="lazy">`;
    }
    
    return `
        <article class="event-card" role="listitem" tabindex="0" aria-label="${event.title}">
            <div class="event-header">
                <h3 class="event-title">${escapeHtml(event.title)}</h3>
                <span class="event-category ${categoryClass}">${categoryLabel}</span>
            </div>
            ${imageHtml}
            <div class="event-datetime">
                📅 ${formattedDate}
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
    
    // Add image for APOD events
    let imageHtml = '';
    if (event.imageUrl && event.mediaType === 'image') {
        imageHtml = `
            <div class="event-detail-image">
                <img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.title)}" loading="lazy">
                ${event.hdImageUrl ? `<a href="${escapeHtml(event.hdImageUrl)}" target="_blank" class="hd-link">View HD Image</a>` : ''}
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
    
    console.log(`Updated filter checkboxes for ${actualCategories.length} categories:`, actualCategories);
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
    console.log(`Switching to ${viewType} view`);
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
    console.log('NASA cache cleared');
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
            console.log('APOD event created:', event);
            return event;
        }
    }
    
    try {
        const url = `${config.baseUrl}/planetary/apod?api_key=${config.apiKey}`;
        console.log('Fetching APOD from:', url);
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`APOD API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('APOD API response:', data);
        
        // Cache the data
        setCachedData(cacheKey, data);
        
        const event = convertAPODToEvent(data);
        console.log('Loaded APOD:', data.title, 'Event:', event);
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
        return null;
    }
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
        const url = `${config.baseUrl}/EONET/events?days=${config.dateRanges.eonet.days}&api_key=${config.apiKey}`;
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            // 503 means service unavailable - use cache if available
            if (response.status === 503) {
                console.warn('EONET API unavailable (503), using cache if available');
                const cached = getCachedData(cacheKey);
                if (cached && cached.events && cached.events.length > 0) {
                    console.log('Using expired cached EONET data due to service unavailability');
                    return convertEONETToEvents(cached.events);
                }
            }
            throw new Error(`EONET API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter for astronomy-related events (fireballs, aurora, etc.)
        const astronomyEvents = (data.events || []).filter(event => {
            const categories = event.categories || [];
            return categories.some(cat => 
                cat.id === 18 || // Fireballs
                cat.id === 19 || // Auroras
                cat.id === 20    // Atmospheric events
            );
        });
        
        // Cache the data
        if (astronomyEvents.length > 0) {
            setCachedData(cacheKey, { events: astronomyEvents });
        }
        
        console.log(`Loaded ${astronomyEvents.length} natural events from EONET`);
        return convertEONETToEvents(astronomyEvents);
    } catch (error) {
        // CORS errors or service unavailability - handle gracefully
        // Note: NASA EONET has disabled CORS for browser access, so this will always fail
        if (error.message.includes('CORS') || error.message.includes('NetworkError') || error.message.includes('503')) {
            console.warn('EONET API unavailable (CORS disabled by NASA - requires server-side proxy), using cache if available');
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
 * Load all NASA data (APOD, DONKI, EONET)
 */
async function loadNASAData(forceRefresh = false) {
    try {
        console.log('=== Loading NASA Data ===');
        const [apodEvent, donkiEvents, eonetEvents] = await Promise.all([
            loadAPOD(forceRefresh),
            loadDONKI(forceRefresh),
            loadEONET(forceRefresh)
        ]);
        
        console.log('NASA API results:', {
            apod: apodEvent ? '✓' : '✗',
            donki: donkiEvents ? `${donkiEvents.length} events` : '✗',
            eonet: eonetEvents ? `${eonetEvents.length} events` : '✗'
        });
        
        const nasaEvents = [];
        
        // Add APOD if available
        if (apodEvent) {
            nasaEvents.push(apodEvent);
            console.log('Added APOD event:', apodEvent.title);
        } else {
            console.warn('No APOD event returned');
        }
        
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
        const events = [];
        
        // Get today's date in YYYY-MM-DD format (required by Open-Meteo)
        const today = new Date().toISOString().split('T')[0];
        
        // Get timezone (Trinidad & Tobago)
        const timezone = 'America/Port_of_Spain';
        
        // Build URL with correct endpoint (/v1/astro) and required date parameters
        const url = `https://api.open-meteo.com/v1/astro?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset,moonrise,moonset,moon_phase&timezone=${timezone}&start_date=${today}&end_date=${today}`;
        
        console.log('Fetching astronomy data from Open-Meteo...');
        console.log('URL:', url);
        console.log('Date:', today);
        
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
        console.log('Daily data available:', !!data.daily);
        
        if (data.daily && data.daily.time && data.daily.time.length > 0) {
            // Process today's data (first entry)
            const daily = data.daily;
            const todayIndex = 0;
            const date = data.daily.time[todayIndex];
            
            // Sunrise Event
            if (daily.sunrise && daily.sunrise[todayIndex]) {
                const sunriseEvent = {
                    id: `astronomy-sunrise-${date}`,
                    title: 'Sunrise',
                    category: 'astronomy',
                    datetime: daily.sunrise[todayIndex],
                    description: 'Local sunrise time for your location.',
                    location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
                    source: 'Open-Meteo Astronomy'
                };
                events.push(sunriseEvent);
                console.log('Astronomy event created: Sunrise');
            }
            
            // Sunset Event
            if (daily.sunset && daily.sunset[todayIndex]) {
                const sunsetEvent = {
                    id: `astronomy-sunset-${date}`,
                    title: 'Sunset',
                    category: 'astronomy',
                    datetime: daily.sunset[todayIndex],
                    description: 'Local sunset time for your location.',
                    location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
                    source: 'Open-Meteo Astronomy'
                };
                events.push(sunsetEvent);
                console.log('Astronomy event created: Sunset');
            }
            
            // Moon Phase Event
            if (daily.moon_phase && daily.moon_phase[todayIndex] !== undefined) {
                const moonPhase = daily.moon_phase[todayIndex];
                
                // Determine phase name based on moon phase value (0-1)
                let phaseName = 'New Moon';
                let illumination = 0;
                
                if (moonPhase === 0 || moonPhase === 1) {
                    phaseName = 'New Moon';
                    illumination = 0;
                } else if (moonPhase > 0 && moonPhase < 0.25) {
                    phaseName = 'Waxing Crescent';
                    illumination = (moonPhase / 0.25) * 50;
                } else if (moonPhase === 0.25) {
                    phaseName = 'First Quarter';
                    illumination = 50;
                } else if (moonPhase > 0.25 && moonPhase < 0.5) {
                    phaseName = 'Waxing Gibbous';
                    illumination = 50 + ((moonPhase - 0.25) / 0.25) * 50;
                } else if (moonPhase === 0.5) {
                    phaseName = 'Full Moon';
                    illumination = 100;
                } else if (moonPhase > 0.5 && moonPhase < 0.75) {
                    phaseName = 'Waning Gibbous';
                    illumination = 100 - ((moonPhase - 0.5) / 0.25) * 50;
                } else if (moonPhase === 0.75) {
                    phaseName = 'Last Quarter';
                    illumination = 50;
                } else if (moonPhase > 0.75 && moonPhase < 1) {
                    phaseName = 'Waning Crescent';
                    illumination = 50 - ((moonPhase - 0.75) / 0.25) * 50;
                }
                
                const moonPhaseEvent = {
                    id: `astronomy-moon-${date}`,
                    title: `Moon Phase: ${phaseName}`,
                    category: 'astronomy',
                    datetime: `${date}T12:00:00Z`,
                    description: `Current moon phase: ${phaseName}. Illumination: ${illumination.toFixed(1)}%`,
                    location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
                    source: 'Open-Meteo Astronomy',
                    moonPhase: phaseName,
                    illumination: illumination,
                    moonPhaseValue: moonPhase
                };
                events.push(moonPhaseEvent);
                console.log('Astronomy event created: Moon Phase');
            }
            
            // Moonrise Event
            if (daily.moonrise && daily.moonrise[todayIndex]) {
                const moonriseEvent = {
                    id: `astronomy-moonrise-${date}`,
                    title: 'Moonrise',
                    category: 'astronomy',
                    datetime: daily.moonrise[todayIndex],
                    description: 'Local moonrise time for your location.',
                    location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
                    source: 'Open-Meteo Astronomy'
                };
                events.push(moonriseEvent);
                console.log('Astronomy event created: Moonrise');
            }
            
            // Moonset Event
            if (daily.moonset && daily.moonset[todayIndex]) {
                const moonsetEvent = {
                    id: `astronomy-moonset-${date}`,
                    title: 'Moonset',
                    category: 'astronomy',
                    datetime: daily.moonset[todayIndex],
                    description: 'Local moonset time for your location.',
                    location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
                    source: 'Open-Meteo Astronomy'
                };
                events.push(moonsetEvent);
                console.log('Astronomy event created: Moonset');
            }
        }
        
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

