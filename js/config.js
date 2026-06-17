export const DEFAULT_CATEGORIES = ['apod', 'meteor', 'planet', 'astronomy'];

export const LA_BREA_COORDS = {
    lat: 10.25,
    lon: -61.63,
    name: 'La Brea, Trinidad & Tobago'
};

export const CACHE_KEYS = {
    apod: 'nasa_apod',
    donki: 'nasa_donki',
    eonet: 'nasa_eonet',
    astronomy: 'openmeteo_astronomy',
    planetVisibility: 'planet_visibility'
};

/** @returns {typeof window.NASA_API_CONFIG | null} */
export function getNASAConfig() {
    if (typeof NASA_API_CONFIG !== 'undefined') {
        return NASA_API_CONFIG;
    }
    if (typeof window !== 'undefined' && window.NASA_API_CONFIG) {
        return window.NASA_API_CONFIG;
    }
    console.error('NASA_API_CONFIG is not defined. Config should be inlined in index.html');
    return null;
}
