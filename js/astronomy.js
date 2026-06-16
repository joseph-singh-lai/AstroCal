import { CACHE_KEYS } from './config.js';
import { allEvents, triggerApplyFilters, syncWindowAllEvents } from './state.js';
import { getCurrentLocation } from './location.js';
import { calculateMoonPhase, getMoonPhaseName } from './utils.js';
import { getCachedData, isCacheValid, setCachedData } from './nasa-api.js';

export async function loadAstronomyEvents(lat, lon, forceRefresh = false) {
    const cacheKey = CACHE_KEYS.astronomy;
    const maxAge = 6 * 60 * 60 * 1000;

    if (!forceRefresh && isCacheValid(cacheKey, maxAge)) {
        const cached = getCachedData(cacheKey);
        if (cached && cached.length > 0) {
            console.log('Using cached Open-Meteo Astronomy data');
            return cached;
        }
    }

    try {
        const date = new Date().toISOString().split('T')[0];
        const timezone = 'America/Port_of_Spain';

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&daily=sunrise,sunset` +
            `&timezone=${encodeURIComponent(timezone)}` +
            `&start_date=${date}&end_date=${date}`;

        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) {
            throw new Error(`Open-Meteo API error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.daily) {
            console.warn('No astronomy data returned from Open-Meteo.');
            return [];
        }

        const daily = data.daily;
        const events = [];

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

        ['sunrise', 'sunset'].forEach(field => {
            if (daily[field] && daily[field].length > 0 && daily[field][0] !== null) {
                const fieldValue = daily[field][0];
                const fieldTitle = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');

                events.push({
                    id: `astronomy-${field}-${date}`,
                    title: fieldTitle,
                    category: 'astronomy',
                    datetime: fieldValue || `${date}T00:00:00Z`,
                    description: `${fieldTitle} time for your location: ${fieldValue || 'N/A'}`,
                    location: `Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°`,
                    source: 'Open-Meteo Astronomy'
                });
            }
        });

        if (events.length > 0) {
            setCachedData(cacheKey, events);
        }

        console.log(`Loaded ${events.length} events from Open-Meteo Astronomy API`);
        return events;
    } catch (error) {
        console.error('Error loading Open-Meteo Astronomy events:', error);

        const cached = getCachedData(cacheKey);
        if (cached && cached.length > 0) {
            return cached;
        }

        return [];
    }
}

export async function loadAstronomyData(forceRefresh = false) {
    try {
        console.log('=== Loading Open-Meteo Astronomy Data ===');

        const location = getCurrentLocation();
        const lat = location.lat || 10.25;
        const lon = location.lon || -61.63;

        const astronomyEvents = await loadAstronomyEvents(lat, lon, forceRefresh);

        if (astronomyEvents && astronomyEvents.length > 0) {
            const beforeCount = allEvents.length;
            allEvents.push(...astronomyEvents);
            allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            syncWindowAllEvents();

            if (beforeCount > 0) {
                triggerApplyFilters();
            }
        } else {
            console.warn('No astronomy events loaded from Open-Meteo.');
        }

        return Promise.resolve();
    } catch (error) {
        console.error('Error loading Open-Meteo Astronomy data:', error);
        return Promise.resolve();
    }
}
