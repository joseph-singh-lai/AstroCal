import { allEvents } from './state.js';
import { calculateMoonPhase, getMoonPhaseName } from './utils.js';
import { getCurrentLocation } from './location.js';
import { getObservingConditions } from './observing-score.js';

function formatTime(isoOrDate) {
    if (!isoOrDate) return '—';
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function findBestPlanetTonight() {
    const planets = allEvents.filter(e => e.category === 'planet' && e.planetName);
    if (!planets.length) return 'Check filters';
    const jupiter = planets.find(p => p.planetName === 'Jupiter');
    return jupiter?.planetName || planets[0].planetName;
}

function findSunsetTime() {
    const sunset = allEvents.find(e => e.category === 'astronomy' && e.title?.toLowerCase().includes('sunset'));
    if (sunset) return formatTime(sunset.datetime);
    return '—';
}

export async function renderTonightStrip() {
    const container = document.getElementById('tonightStrip');
    if (!container) return;

    const moon = calculateMoonPhase(new Date());
    const moonName = getMoonPhaseName(moon);
    const illum = Math.round(moon * 100);
    const bestPlanet = findBestPlanetTonight();
    const sunset = findSunsetTime();
    const conditions = await getObservingConditions();

    container.innerHTML = `
        <div class="tonight-strip-item">
            <div class="tonight-strip-label">Observing</div>
            <div class="tonight-strip-value">
                <span class="observing-score-badge ${conditions.className}">${conditions.label}</span>
            </div>
        </div>
        <div class="tonight-strip-item">
            <div class="tonight-strip-label">Sunset</div>
            <div class="tonight-strip-value">${sunset}</div>
        </div>
        <div class="tonight-strip-item">
            <div class="tonight-strip-label">Moon</div>
            <div class="tonight-strip-value">${moonName} (${illum}%)</div>
        </div>
        <div class="tonight-strip-item">
            <div class="tonight-strip-label">Best planet</div>
            <div class="tonight-strip-value">${bestPlanet}</div>
        </div>
    `;
    container.setAttribute('aria-live', 'polite');
}
