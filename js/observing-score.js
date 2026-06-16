import { getCurrentLocation } from './location.js';
import { calculateMoonPhase } from './utils.js';

/**
 * Compute observing conditions score from cloud cover, moon illumination, and optional hints.
 * @returns {{ score: number, label: string, className: string }}
 */
export function computeObservingScore(cloudCoverPercent = null, moonIllumination = null) {
    const moon = moonIllumination ?? calculateMoonPhase(new Date());
    const moonPenalty = moon * 40;
    const cloudPenalty = cloudCoverPercent != null ? (cloudCoverPercent / 100) * 50 : 15;
    const score = Math.round(Math.max(0, Math.min(100, 100 - moonPenalty - cloudPenalty)));

    if (score >= 75) return { score, label: 'Excellent', className: 'observing-score-excellent' };
    if (score >= 55) return { score, label: 'Good', className: 'observing-score-good' };
    if (score >= 35) return { score, label: 'Fair', className: 'observing-score-fair' };
    return { score, label: 'Poor', className: 'observing-score-poor' };
}

export async function fetchCloudCover(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover&timezone=auto`;
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.current?.cloud_cover ?? null;
    } catch {
        return null;
    }
}

export async function getObservingConditions() {
    const loc = getCurrentLocation();
    const cloud = await fetchCloudCover(loc.lat, loc.lon);
    return computeObservingScore(cloud);
}
