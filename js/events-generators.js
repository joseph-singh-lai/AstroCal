import { METEOR_SHOWERS, ECLIPSES, SUPERMOONS } from '../data/astro_constants.js';
import { allEvents, eventsContainer, syncWindowAllEvents } from './state.js';

function generateEquinoxSolsticeEvents(year) {
    return [
        {
            date: new Date(year, 2, 20, 9, 0),
            name: 'March Equinox (Spring)',
            description: 'Day and night are approximately equal. Marks the start of astronomical spring in the Northern Hemisphere.'
        },
        {
            date: new Date(year, 5, 21, 4, 0),
            name: 'June Solstice (Summer)',
            description: 'Longest day in Northern Hemisphere, shortest in Southern. Sun reaches highest point in the sky.'
        },
        {
            date: new Date(year, 8, 22, 20, 0),
            name: 'September Equinox (Autumn)',
            description: 'Day and night are approximately equal. Marks the start of astronomical autumn in the Northern Hemisphere.'
        },
        {
            date: new Date(year, 11, 21, 15, 0),
            name: 'December Solstice (Winter)',
            description: 'Shortest day in Northern Hemisphere, longest in Southern. Sun at lowest point in the sky.'
        }
    ];
}

export function generateEclipseEvents() {
    const events = [];
    const now = new Date();

    ECLIPSES.forEach(eclipse => {
        const eventDate = new Date(eclipse.year, eclipse.month - 1, eclipse.day, 12, 0, 0);
        const daysDiff = (eventDate - now) / (1000 * 60 * 60 * 24);
        if (daysDiff < -30) return;

        const emoji = eclipse.type === 'solar' ? '🌑' : '🌕';
        const typeDesc = eclipse.type === 'solar' ? 'Solar' : 'Lunar';

        events.push({
            id: `eclipse-${eclipse.type}-${eclipse.year}-${eclipse.month}`,
            title: `${emoji} ${eclipse.name}`,
            category: 'astronomy',
            datetime: eventDate.toISOString(),
            description: `${eclipse.subtype.charAt(0).toUpperCase() + eclipse.subtype.slice(1)} ${typeDesc.toLowerCase()} eclipse. Visibility: ${eclipse.visibility}. ${eclipse.type === 'solar' ? '⚠️ Never look directly at a solar eclipse without proper eye protection!' : 'Safe to view with naked eye.'}`,
            location: eclipse.visibility,
            eventType: `${eclipse.subtype}_${eclipse.type}_eclipse`,
            isEclipse: true
        });
    });

    return events;
}

export function generateSupermoonEvents() {
    const events = [];
    const now = new Date();

    SUPERMOONS.forEach(moon => {
        const eventDate = new Date(moon.year, moon.month - 1, moon.day, 22, 0, 0);
        const daysDiff = (eventDate - now) / (1000 * 60 * 60 * 24);
        if (daysDiff < -30) return;

        events.push({
            id: `supermoon-${moon.year}-${moon.month}`,
            title: `🌕 ${moon.name}`,
            category: 'astronomy',
            datetime: eventDate.toISOString(),
            description: 'Supermoon! The full moon appears ~14% larger and ~30% brighter than average as it coincides with lunar perigee (closest approach to Earth). Great night for moon photography!',
            location: 'Visible worldwide (weather permitting)',
            eventType: 'supermoon'
        });
    });

    return events;
}

export function generateSeasonalEvents() {
    const events = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    [currentYear, currentYear + 1].forEach(year => {
        generateEquinoxSolsticeEvents(year).forEach(event => {
            const daysDiff = (event.date - now) / (1000 * 60 * 60 * 24);
            if (daysDiff < -30) return;
            if (daysDiff > 400) return;

            const emoji = event.name.includes('Solstice') ? '☀️' : '🌗';

            events.push({
                id: `season-${year}-${event.date.getMonth()}`,
                title: `${emoji} ${event.name}`,
                category: 'astronomy',
                datetime: event.date.toISOString(),
                description: event.description,
                location: 'Worldwide',
                eventType: 'seasonal'
            });
        });
    });

    return events;
}

export function generateMeteorShowerEvents() {
    const events = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    [currentYear, currentYear + 1].forEach(year => {
        METEOR_SHOWERS.forEach(shower => {
            const eventDate = new Date(year, shower.month - 1, shower.day, shower.hour, 0, 0);
            const daysDiff = (eventDate - now) / (1000 * 60 * 60 * 24);
            if (daysDiff < -60) return;
            if (daysDiff > 400) return;

            events.push({
                id: `meteor-${shower.id}-${year}`,
                title: `${shower.name} Meteor Shower Peak`,
                category: 'meteor',
                datetime: eventDate.toISOString(),
                description: `${shower.description} Expected rate: ~${shower.zhr} meteors/hour (ZHR). Parent body: ${shower.parent}.`,
                visibility: {
                    direction: shower.direction,
                    peak: shower.rating,
                    zhr: shower.zhr.toString()
                },
                location: 'Dark-sky site for best viewing'
            });
        });
    });

    return events;
}

export async function loadEvents() {
    try {
        if (eventsContainer) {
            eventsContainer.innerHTML = '<div class="loading">Loading events</div>';
        }

        const meteorEvents = generateMeteorShowerEvents();
        const eclipseEvents = generateEclipseEvents();
        const supermoonEvents = generateSupermoonEvents();
        const seasonalEvents = generateSeasonalEvents();

        const allGeneratedEvents = [
            ...meteorEvents,
            ...eclipseEvents,
            ...supermoonEvents,
            ...seasonalEvents
        ];

        console.log(`Generated ${allGeneratedEvents.length} astronomical events:`);
        console.log(`  - ${meteorEvents.length} meteor showers`);
        console.log(`  - ${eclipseEvents.length} eclipses`);
        console.log(`  - ${supermoonEvents.length} supermoons`);
        console.log(`  - ${seasonalEvents.length} equinoxes/solstices`);

        const kept = allEvents.filter(e =>
            e.category !== 'meteor' &&
            !e.isEclipse &&
            e.eventType !== 'supermoon' &&
            e.eventType !== 'seasonal'
        );
        allEvents.length = 0;
        allEvents.push(...kept, ...allGeneratedEvents);

        allEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        syncWindowAllEvents();

        return Promise.resolve();
    } catch (error) {
        console.error('Error generating astronomical events:', error);
        return Promise.resolve();
    }
}
