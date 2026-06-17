import { LA_BREA_COORDS } from './config.js';
import {
    allEvents,
    selectedCategories,
    userLocation,
    filterCheckboxes,
    initDOMElements,
    syncWindowAllEvents
} from './state.js';
import { loadEvents } from './events-generators.js';
import { loadISSPasses } from './iss.js';
import { loadAPODPriority, loadNASADataOther } from './nasa-api.js';
import { loadAstronomyData } from './astronomy.js';
import { loadPlanetVisibility } from './planets.js';
import {
    updateLocationStatus,
    exportLocationGlobals
} from './location.js';
import {
    applyFilters,
    registerFilters,
    setupEventListeners
} from './filters-ui.js';
import { setupNavigation } from './navigation.js';
import { renderTonightStrip } from './tonight-strip.js';
import { setupCalendarExport } from './calendar-export.js';
import { loadLocalTTContent } from './local-tt.js';
import {
    showLoadingProgress,
    hideLoadingProgress,
    updateLoadingProgress,
    setupHeaderScroll,
    setupMotionToggle,
    setupFilterPanel,
    setupGlossarySearch,
    updateFilterCount,
    setupOnboardingBanner
} from './ui-chrome.js';

window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global Error:', { msg, url, lineNo, columnNo, error });
    return false;
};

console.log('AstroCalTT app.js loaded - v7.0');

function bootstrap() {
    registerFilters();
    exportLocationGlobals();
    syncWindowAllEvents();

    initDOMElements();

    if (!document.getElementById('eventsContainer')) {
        console.error('Events container not found!');
        return;
    }

    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
        try {
            userLocation = JSON.parse(savedLocation);
            window.userLocation = userLocation;
            updateLocationStatus(userLocation);
        } catch (e) {
            console.error('Error parsing saved location:', e);
            updateLocationStatus(LA_BREA_COORDS);
        }
    } else {
        updateLocationStatus(LA_BREA_COORDS);
    }

    filterCheckboxes.forEach(checkbox => {
        checkbox.checked = selectedCategories.has(checkbox.value);
    });

    showLoadingProgress();

    Promise.all([
        loadAPODPriority().then(() => updateLoadingProgress('apod')),
        loadEvents().then(() => updateLoadingProgress('staticEvents')),
        loadISSPasses().then(() => updateLoadingProgress('issPasses')),
        loadNASADataOther(false, true).then(() => updateLoadingProgress('nasaData')),
        loadAstronomyData().then(() => updateLoadingProgress('astronomy')),
        loadPlanetVisibility(true).then(() => updateLoadingProgress('planetVisibility'))
    ]).then(() => {
        hideLoadingProgress();
        applyFilters();
        renderTonightStrip();
    }).catch((error) => {
        console.error('Error loading events:', error);
        hideLoadingProgress();
        if (allEvents.length > 0) {
            applyFilters();
            renderTonightStrip();
        }
    });

    setupEventListeners();
    setupNavigation();
    setupHeaderScroll();
    setupMotionToggle();
    setupFilterPanel();
    setupGlossarySearch();
    updateFilterCount();
    setupOnboardingBanner();
    setupCalendarExport();
    loadLocalTTContent();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
}

document.addEventListener('DOMContentLoaded', bootstrap);
