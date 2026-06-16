import { LA_BREA_COORDS } from './config.js';
import { allEvents, userLocation, syncWindowAllEvents } from './state.js';

const EARTH_RADIUS_KM = 6371;

/**
 * Compute elevation (degrees) and azimuth (degrees from north) from observer to satellite.
 */
export function computeSatelliteLookAngles(observerLat, observerLon, satLat, satLon, satAltKm = 408) {
    const latObs = observerLat * Math.PI / 180;
    const lonObs = observerLon * Math.PI / 180;
    const latSat = satLat * Math.PI / 180;
    const lonSat = satLon * Math.PI / 180;

    const satRadius = EARTH_RADIUS_KM + satAltKm;
    const dLon = lonSat - lonObs;

    const cosCentral = Math.sin(latObs) * Math.sin(latSat) +
        Math.cos(latObs) * Math.cos(latSat) * Math.cos(dLon);
    const centralAngle = Math.acos(Math.min(1, Math.max(-1, cosCentral)));

    const slantRange = Math.sqrt(
        EARTH_RADIUS_KM * EARTH_RADIUS_KM +
        satRadius * satRadius -
        2 * EARTH_RADIUS_KM * satRadius * Math.cos(centralAngle)
    );

    const elevationRad = Math.asin(Math.min(1, Math.max(-1,
        (satRadius * Math.sin(centralAngle)) / slantRange
    )));
    const elevation = elevationRad * 180 / Math.PI;

    const y = Math.sin(dLon) * Math.cos(latSat);
    const x = Math.cos(latObs) * Math.sin(latSat) -
        Math.sin(latObs) * Math.cos(latSat) * Math.cos(dLon);
    let azimuth = Math.atan2(y, x) * 180 / Math.PI;
    azimuth = (azimuth + 360) % 360;

    return {
        elevation,
        azimuth,
        slantRangeKm: slantRange,
        isVisible: elevation > 10
    };
}

function azimuthToDirection(azimuth) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(azimuth / 45) % 8;
    return directions[index];
}

export async function loadISSPasses() {
    try {
        const currentLocation = userLocation || LA_BREA_COORDS;

        const now = Math.floor(Date.now() / 1000);
        const timestamps = [];
        for (let i = 0; i < 10; i++) {
            timestamps.push(now + (i * 90 * 60));
        }

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

        const locationName = currentLocation.name ||
            `${currentLocation.lat.toFixed(2)}°, ${currentLocation.lon.toFixed(2)}°`;

        const issEvents = positions.map((pos) => {
            const timestamp = pos.timestamp;
            const risetime = new Date(timestamp * 1000);
            const duration = 240;
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

            const satAltKm = pos.altitude || 408;
            const look = computeSatelliteLookAngles(
                currentLocation.lat,
                currentLocation.lon,
                pos.latitude,
                pos.longitude,
                satAltKm
            );

            const direction = azimuthToDirection(look.azimuth);
            const elevationText = `${look.elevation.toFixed(1)}°`;

            return {
                id: `iss-pass-${timestamp}`,
                title: `ISS Position Snapshot — ${locationName}`,
                category: 'iss',
                approximate: true,
                datetime: risetime.toISOString(),
                description: look.isVisible
                    ? `The International Space Station will be visible for approximately ${durationText}. Look toward ${direction} at ${elevationText} elevation. The ISS appears as a bright, fast-moving point of light.`
                    : `ISS pass at ${pos.latitude.toFixed(2)}°, ${pos.longitude.toFixed(2)}° (below local horizon at ${elevationText}).`,
                location: locationName,
                visibility: {
                    direction,
                    peak: risetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
                    elevation: elevationText,
                    azimuth: `${look.azimuth.toFixed(0)}°`,
                    duration: durationText
                },
                issPosition: {
                    lat: pos.latitude,
                    lon: pos.longitude,
                    altitude: pos.altitude
                }
            };
        }).filter(event => {
            const elev = parseFloat(event.visibility?.elevation);
            return !Number.isNaN(elev) && elev > 10;
        });

        const kept = allEvents.filter(e => e.category !== 'iss');
        allEvents.length = 0;
        allEvents.push(...kept, ...issEvents);
        allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        syncWindowAllEvents();

        return Promise.resolve();
    } catch (error) {
        const isCorsError = error.message.includes('CORS') ||
            error.message.includes('NetworkError') ||
            error.message.includes('Failed to fetch');

        if (isCorsError) {
            console.warn('ISS API unavailable (CORS error). ISS passes require the API to be accessible.');
        } else {
            console.warn('Error loading ISS passes:', error.message);
        }

        return Promise.resolve();
    }
}
