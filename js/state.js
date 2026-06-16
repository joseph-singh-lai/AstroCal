import { DEFAULT_CATEGORIES } from './config.js';

export let allEvents = [];
export let filteredEvents = [];
export let selectedCategories = new Set(DEFAULT_CATEGORIES);

export let userLocation = null;
export let locationPermissionRequested = false;

export let eventsContainer;
export let searchInput;
export let applyFiltersButton;
export let eventDetailSection;
export let filterCheckboxes;
export let locationButton;
export let locationStatus;
export let clearLocationButton;
export let refreshNASAButton;
export let loadingProgressContainer;
export let loadingProgressFill;
export let loadingProgressText;

export let loadingProgress = {
    total: 6,
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

/** @type {(() => void) | null} */
let applyFiltersCallback = null;

export function setApplyFiltersCallback(fn) {
    applyFiltersCallback = fn;
}

export function triggerApplyFilters() {
    if (applyFiltersCallback) {
        applyFiltersCallback();
    }
}

export function syncWindowAllEvents() {
    window.allEvents = allEvents;
}

export function initDOMElements() {
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
}
