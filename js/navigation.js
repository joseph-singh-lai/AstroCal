const loaded = {
    leaflet: false,
    gibs: false,
    sky: false
};

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const GIBS_SCRIPT = 'gibs-map.js?v=5.0';
const SKY_SCRIPT = 'sky-map.js?v=6.1';

function loadStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = reject;
        document.head.appendChild(link);
    });
}

function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

async function ensureLeaflet() {
    if (loaded.leaflet) return;
    await loadStylesheet(LEAFLET_CSS);
    await loadScript(LEAFLET_JS);
    loaded.leaflet = true;
}

async function ensureGibsMap() {
    await ensureLeaflet();
    if (!loaded.gibs) {
        await loadScript(GIBS_SCRIPT);
        loaded.gibs = true;
    }
}

async function ensureSkyMap() {
    if (!loaded.sky) {
        await loadScript(SKY_SCRIPT);
        loaded.sky = true;
    }
}

function initGibsSection() {
    setTimeout(async () => {
        try {
            await ensureGibsMap();
        } catch (err) {
            console.error('Failed to load GIBS map scripts:', err);
            return;
        }

        const mapContainer = document.getElementById('gibs-map');
        if (!mapContainer) {
            console.error('GIBS map container not found');
            return;
        }

        if (typeof initGIBSMap !== 'function') {
            console.error('initGIBSMap not available after script load');
            return;
        }

        if (!window.gibsMap) {
            initGIBSMap();
            return;
        }

        if (typeof L === 'undefined' || !(window.gibsMap instanceof L.Map) || typeof window.gibsMap.invalidateSize !== 'function') {
            window.gibsMap = null;
            if (typeof window.gibsMapInitialized !== 'undefined') {
                window.gibsMapInitialized = false;
            }
            initGIBSMap();
            return;
        }

        try {
            window.gibsMap.invalidateSize();
            if (typeof updateGIBSMapLocation === 'function') {
                updateGIBSMapLocation();
            }
            setTimeout(() => {
                try {
                    if (window.gibsMap && window.gibsMap.invalidateSize) {
                        window.gibsMap.invalidateSize();
                        if (window.gibsMap.getCenter && window.gibsMap.getZoom && window.gibsMap.setView) {
                            const currentCenter = window.gibsMap.getCenter();
                            const currentZoom = window.gibsMap.getZoom();
                            window.gibsMap.setView(currentCenter, currentZoom);
                        }
                    }
                } catch (e) {
                    console.error('Error in map re-render:', e);
                }
            }, 200);
        } catch (e) {
            console.error('Error during map re-render:', e);
        }
    }, 100);
}

function initSkySection() {
    setTimeout(async () => {
        try {
            await ensureSkyMap();
        } catch (err) {
            console.error('Failed to load sky map script:', err);
            return;
        }

        if (typeof window.forceSkyMapRender === 'function') {
            window.forceSkyMapRender();
        } else if (!window.skyMapInitialized && typeof initSkyMap === 'function') {
            initSkyMap();
        } else if (window.skyMapInitialized && typeof renderSkyMap === 'function') {
            renderSkyMap();
        }
    }, 150);
}

export function activateSection(sectionId) {
    const navButtons = document.querySelectorAll('.nav-button');
    const sections = document.querySelectorAll('.content-section');

    navButtons.forEach(btn => {
        const active = btn.getAttribute('data-section') === sectionId;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    sections.forEach(section => section.classList.remove('active'));
    const targetElement = document.getElementById(`${sectionId}-section`);
    if (targetElement) {
        targetElement.classList.add('active');
    }

    if (sectionId === 'gibs') initGibsSection();
    if (sectionId === 'sky') initSkySection();
}

export async function navigateToSkyMap(targetName) {
    activateSection('sky');
    await ensureSkyMap();
    setTimeout(() => {
        if (typeof window.searchSkyObjects === 'function') {
            window.searchSkyObjects(targetName);
        }
    }, 300);
}

export function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    const sections = document.querySelectorAll('.content-section');
    const nav = document.querySelector('.main-nav');

    if (nav) {
        nav.setAttribute('role', 'tablist');
        nav.setAttribute('aria-label', 'Main sections');
    }

    navButtons.forEach((button, index) => {
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', button.classList.contains('active') ? 'true' : 'false');
        button.setAttribute('tabindex', button.classList.contains('active') ? '0' : '-1');

        button.addEventListener('click', () => {
            try {
                const targetSection = button.getAttribute('data-section');
                activateSection(targetSection);
                navButtons.forEach(btn => btn.setAttribute('tabindex', '-1'));
                button.setAttribute('tabindex', '0');
            } catch (err) {
                console.error('Error in navigation handler:', err);
            }
        });

        button.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const dir = e.key === 'ArrowRight' ? 1 : -1;
                const next = navButtons[(index + dir + navButtons.length) % navButtons.length];
                next.focus();
                next.click();
            }
        });
    });
}
