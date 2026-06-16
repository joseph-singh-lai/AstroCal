import { CACHE_KEYS } from './config.js';
import { allEvents, triggerApplyFilters, syncWindowAllEvents } from './state.js';
import { getCurrentLocation } from './location.js';
import { getCachedData, isCacheValid, setCachedData } from './nasa-api.js';

export function checkVenusVisibility(month) {
    return true;
}

export function checkMercuryVisibility(month) {
    const elongationMonths = [1, 4, 7, 10];
    return elongationMonths.includes(month);
}

export function calculatePlanetVisibility(currentDate, lat, lon) {
    const events = [];
    const month = currentDate.getMonth() + 1;
    const dateStr = currentDate.toISOString().split('T')[0];

    const jupiterVisible = true;
    const saturnVisible = true;
    const marsVisible = false;
    const venusVisible = checkVenusVisibility(month);
    const mercuryVisible = checkMercuryVisibility(month);

    if (jupiterVisible) {
        events.push({
            id: `planet-jupiter-${dateStr}`,
            title: 'Jupiter Visible Tonight',
            category: 'planet',
            datetime: `${dateStr}T20:00:00Z`,
            description: 'Jupiter is currently visible in the evening sky. Look for it as a bright, steady point of light. Best viewing is in the evening hours when it\'s high in the sky.',
            location: 'Look East to South',
            visibility: {
                direction: 'East to South',
                peak: 'Evening to Late Night',
                elevation: 'High in evening sky'
            },
            visibilityWindow: { rise: '7:00 PM', set: '11:30 PM', bestTime: '8:30 PM – 11:00 PM' },
            source: 'Current Planet Visibility',
            planetName: 'Jupiter',
            magnitude: '-2.5',
            updateDate: dateStr
        });
    }

    if (saturnVisible) {
        events.push({
            id: `planet-saturn-${dateStr}`,
            title: 'Saturn Visible Tonight',
            category: 'planet',
            datetime: `${dateStr}T20:00:00Z`,
            description: 'Saturn is currently visible in the evening sky. It appears as a golden-yellow point of light. Best viewed with a telescope to see its rings.',
            location: 'Look South to Southwest',
            visibility: {
                direction: 'South to Southwest',
                peak: 'Evening to Late Night',
                elevation: 'Mid to high in evening sky'
            },
            visibilityWindow: { rise: '7:30 PM', set: '11:00 PM', bestTime: '8:45 PM – 10:30 PM' },
            source: 'Current Planet Visibility',
            planetName: 'Saturn',
            magnitude: '0.5',
            updateDate: dateStr
        });
    }

    if (marsVisible) {
        events.push({
            id: `planet-mars-${dateStr}`,
            title: 'Mars Visible Tonight',
            category: 'planet',
            datetime: `${dateStr}T20:00:00Z`,
            description: 'Mars visibility event.',
            location: 'Check current sky charts',
            visibility: { direction: 'Variable', peak: 'Evening to Morning', elevation: 'Variable' },
            source: 'Current Planet Visibility',
            planetName: 'Mars',
            magnitude: '1.5',
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
            description: venusVisible
                ? `Venus is currently visible as a bright 'star' in the ${isMorningStar ? 'morning' : 'evening'} sky.`
                : 'Venus is currently too close to the Sun to be easily visible.',
            location: `Look ${isMorningStar ? 'East' : 'West'} near horizon`,
            visibility: {
                direction: isMorningStar ? 'East' : 'West',
                peak: isMorningStar ? 'Before Sunrise' : 'After Sunset',
                elevation: 'Low on horizon'
            },
            visibilityWindow: { rise: isMorningStar ? '5:00 AM' : '6:30 PM', set: isMorningStar ? '6:30 AM' : '8:30 PM', bestTime: isMorningStar ? '5:30 AM – 6:15 AM' : '7:00 PM – 8:00 PM' },
            source: 'Current Planet Visibility',
            planetName: 'Venus',
            magnitude: '-4.5',
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
            description: 'Mercury may be visible low on the horizon just before sunrise or after sunset.',
            location: `Look ${isMorning ? 'East' : 'West'} very low on horizon`,
            visibility: {
                direction: isMorning ? 'East' : 'West',
                peak: isMorning ? 'Just before sunrise' : 'Just after sunset',
                elevation: 'Very low on horizon'
            },
            source: 'Current Planet Visibility',
            planetName: 'Mercury',
            magnitude: '0.0',
            updateDate: dateStr
        });
    }

    return events;
}

export async function loadPlanetVisibility(forceRefresh = false) {
    try {
        console.log('=== Loading Planet Visibility Data ===');

        const location = getCurrentLocation();
        const lat = location.lat || 10.25;
        const lon = location.lon || -61.63;

        const cacheKey = CACHE_KEYS.planetVisibility;
        const maxAge = 24 * 60 * 60 * 1000;

        if (!forceRefresh && isCacheValid(cacheKey, maxAge)) {
            const cached = getCachedData(cacheKey);
            if (cached && cached.length > 0) {
                console.log('Using cached planet visibility data');
                allEvents.push(...cached);
                syncWindowAllEvents();
                return Promise.resolve();
            }
        }

        const now = new Date();
        const planetEvents = calculatePlanetVisibility(now, lat, lon);

        if (planetEvents && planetEvents.length > 0) {
            const kept = allEvents.filter(e => e.category !== 'planet' || !e.id.startsWith('planet-'));
            allEvents.length = 0;
            allEvents.push(...kept, ...planetEvents);
            allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            syncWindowAllEvents();
            setCachedData(cacheKey, planetEvents);

            if (kept.length > 0) {
                triggerApplyFilters();
            }
        }

        return Promise.resolve();
    } catch (error) {
        console.error('Error loading planet visibility data:', error);
        return Promise.resolve();
    }
}
