import { LA_BREA_COORDS } from './config.js';
import {
    allEvents,
    userLocation,
    locationPermissionRequested,
    locationButton,
    locationStatus,
    clearLocationButton,
    triggerApplyFilters
} from './state.js';
import { loadISSPasses } from './iss.js';

export function getCurrentLocation() {
    return userLocation || LA_BREA_COORDS;
}

export function updateLocationStatus(location) {
    if (!locationStatus) return;

    if (location.name === 'Your Location') {
        locationStatus.textContent = `📍 Using your location: ${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}°`;
        locationStatus.className = 'location-status location-active';
        if (clearLocationButton) {
            clearLocationButton.style.display = 'block';
        }
    } else {
        locationStatus.textContent = `📍 Using default location: ${location.name}`;
        locationStatus.className = 'location-status';
        if (clearLocationButton) {
            clearLocationButton.style.display = 'none';
        }
    }
}

export function requestUserLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser. Using default location.');
        return;
    }

    const isSecure = window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.vercel.app');

    if (!isSecure && window.location.protocol !== 'file:') {
        console.warn('Geolocation may not work without HTTPS');
    }

    if (locationPermissionRequested) {
        return;
    }

    locationPermissionRequested = true;
    locationButton.disabled = true;
    locationButton.textContent = '📍 Requesting...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
                name: 'Your Location'
            };

            localStorage.setItem('userLocation', JSON.stringify(userLocation));
            window.userLocation = userLocation;

            updateLocationStatus(userLocation);

            loadISSPasses().then(() => {
                triggerApplyFilters();
            });

            if (typeof updateGIBSMapLocation === 'function') {
                updateGIBSMapLocation();
            }
            if (typeof updateSkyMapLocation === 'function') {
                updateSkyMapLocation(userLocation.lat, userLocation.lon);
            } else if (typeof window.setSkyMapLocation === 'function') {
                window.setSkyMapLocation(userLocation.lat, userLocation.lon);
            }

            locationButton.textContent = '✅ Location Set';
            locationButton.style.opacity = '0.7';
        },
        (error) => {
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
            maximumAge: 300000
        }
    );
}

export function clearSavedLocation() {
    userLocation = null;
    window.userLocation = null;
    localStorage.removeItem('userLocation');
    updateLocationStatus(LA_BREA_COORDS);

    if (locationButton) {
        locationPermissionRequested = false;
        locationButton.disabled = false;
        locationButton.textContent = '📍 Use My Location';
        locationButton.style.opacity = '1';
    }

    loadISSPasses().then(() => {
        triggerApplyFilters();
    });
}

export function exportLocationGlobals() {
    window.getCurrentLocation = getCurrentLocation;
}
