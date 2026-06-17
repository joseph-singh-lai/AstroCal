/**
 * AstroCalTT Satellite Imagery Module
 * Uses reliable, CORS-friendly satellite and map tile sources
 * Version: 3.0
 */

let gibsMap = null;
let currentLayer = null;
let baseLayer = null;
window.gibsMapInitialized = false;

const GOES_TILE_BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

const WEATHER_CHANNELS = {
    vis: { label: 'Visible', channel: 'ch02', opacity: 0.92, baseLayer: 'esri_satellite' },
    ir: { label: 'Infrared', channel: 'ch13', opacity: 0.88, baseLayer: 'carto_dark' }
};

// Regional GOES sectors — sorted in the Earth Map dropdown by `sortOrder`
const WEATHER_REGIONS = [
    {
        id: 'auto',
        label: 'Your Location',
        sortOrder: 0,
        dynamic: true,
        description: 'Automatically selects the best GOES satellite sector for your coordinates'
    },
    {
        id: 'caribbean',
        label: 'Caribbean & Trinidad and Tobago',
        sortOrder: 10,
        priority: 1,
        satellite: 'east',
        sector: 'puertorico',
        suggestedZoom: 7,
        bounds: { minLat: 5, maxLat: 28, minLon: -92, maxLon: -55 },
        description: 'High-resolution GOES-East Puerto Rico sector — best for T&T and the wider Caribbean'
    },
    {
        id: 'hawaii',
        label: 'Hawaii & Central Pacific',
        sortOrder: 20,
        priority: 2,
        satellite: 'west',
        sector: 'hawaii',
        suggestedZoom: 8,
        bounds: { minLat: 10, maxLat: 32, minLon: -175, maxLon: -140 },
        description: 'GOES-West Hawaii sector'
    },
    {
        id: 'alaska',
        label: 'Alaska & North Pacific',
        sortOrder: 30,
        priority: 3,
        satellite: 'west',
        sector: 'alaska',
        suggestedZoom: 5,
        bounds: { minLat: 48, maxLat: 72, minLon: -180, maxLon: -125 },
        description: 'GOES-West Alaska sector'
    },
    {
        id: 'north_america',
        label: 'United States & Canada',
        sortOrder: 40,
        priority: 4,
        suggestedZoom: 5,
        center: [39, -98],
        bounds: { minLat: 24, maxLat: 55, minLon: -130, maxLon: -65 },
        resolveTile: (lat, lon) => ({
            satellite: lon < -105 ? 'west' : 'east',
            sector: 'conus'
        }),
        description: 'GOES CONUS sector — eastern or western satellite chosen by longitude'
    },
    {
        id: 'central_america',
        label: 'Mexico & Central America',
        sortOrder: 50,
        priority: 5,
        satellite: 'east',
        sector: 'puertorico',
        suggestedZoom: 6,
        bounds: { minLat: 5, maxLat: 32, minLon: -120, maxLon: -75 },
        description: 'GOES-East sector covering Mexico and Central America'
    },
    {
        id: 'south_america',
        label: 'South America',
        sortOrder: 60,
        priority: 6,
        satellite: 'east',
        sector: 'fulldisk',
        suggestedZoom: 4,
        center: [-15, -60],
        bounds: { minLat: -58, maxLat: 12, minLon: -82, maxLon: -30 },
        description: 'GOES-East full disk centered on South America'
    },
    {
        id: 'europe_africa',
        label: 'Europe & Africa',
        sortOrder: 70,
        priority: 7,
        satellite: 'east',
        sector: 'fulldisk',
        suggestedZoom: 3,
        center: [20, 10],
        bounds: { minLat: -35, maxLat: 72, minLon: -25, maxLon: 55 },
        description: 'GOES-East full disk — western Europe, Africa, and eastern Atlantic'
    },
    {
        id: 'asia_pacific',
        label: 'Asia, Oceania & Australia',
        sortOrder: 80,
        priority: 8,
        satellite: 'west',
        sector: 'fulldisk',
        suggestedZoom: 3,
        center: [10, 120],
        bounds: { minLat: -50, maxLat: 60, minLon: 55, maxLon: 180 },
        description: 'GOES-West full disk — East Asia, Oceania, and Australia'
    },
    {
        id: 'pacific',
        label: 'Eastern Pacific',
        sortOrder: 90,
        priority: 9,
        satellite: 'west',
        sector: 'fulldisk',
        suggestedZoom: 3,
        center: [15, -140],
        bounds: { minLat: -50, maxLat: 50, minLon: -180, maxLon: -100 },
        description: 'GOES-West full disk — eastern Pacific Ocean'
    },
    {
        id: 'global_americas',
        label: 'Americas & Atlantic (wide view)',
        sortOrder: 100,
        priority: 99,
        satellite: 'east',
        sector: 'fulldisk',
        suggestedZoom: 2,
        center: [10, -60],
        description: 'GOES-East full disk — Americas, Caribbean, and Atlantic'
    },
    {
        id: 'global_pacific',
        label: 'Pacific & Asia (wide view)',
        sortOrder: 110,
        priority: 99,
        satellite: 'west',
        sector: 'fulldisk',
        suggestedZoom: 2,
        center: [0, 160],
        description: 'GOES-West full disk — Pacific and Asia'
    }
];

function pointInWeatherBounds(lat, lon, region) {
    if (!region.bounds) return false;
    const { minLat, maxLat, minLon, maxLon } = region.bounds;
    return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}

function resolveWeatherRegion(lat, lon, regionId = null) {
    if (regionId && regionId !== 'auto') {
        return WEATHER_REGIONS.find((region) => region.id === regionId) || WEATHER_REGIONS.find((r) => r.id === 'global_americas');
    }

    const staticRegions = WEATHER_REGIONS
        .filter((region) => !region.dynamic && region.bounds)
        .sort((a, b) => (a.priority || 100) - (b.priority || 100));

    for (const region of staticRegions) {
        if (pointInWeatherBounds(lat, lon, region)) {
            return region;
        }
    }

    if (lon >= 55) return WEATHER_REGIONS.find((r) => r.id === 'asia_pacific');
    if (lon >= -25 && lon < 55) return WEATHER_REGIONS.find((r) => r.id === 'europe_africa');
    if (lon < -100) return WEATHER_REGIONS.find((r) => r.id === 'pacific');
    return WEATHER_REGIONS.find((r) => r.id === 'global_americas');
}

function buildGoesTileUrl(satellite, sector, channel) {
    return `${GOES_TILE_BASE}/goes_${satellite}_${sector}_${channel}/{z}/{x}/{y}.png`;
}

function buildResolvedGoesConfig(config, lat, lon) {
    const channelKey = config.channel || 'vis';
    const channel = WEATHER_CHANNELS[channelKey];
    const region = resolveWeatherRegion(
        lat,
        lon,
        config.type === 'goes_overlay_dynamic' ? null : config.regionId
    );
    const tileInfo = region.resolveTile
        ? region.resolveTile(lat, lon)
        : { satellite: region.satellite, sector: region.sector };

    return {
        ...config,
        type: 'goes_overlay',
        url: buildGoesTileUrl(tileInfo.satellite, tileInfo.sector, channel.channel),
        baseLayer: channel.baseLayer,
        opacity: channel.opacity,
        attribution: `© Iowa Environmental Mesonet / NOAA GOES-${tileInfo.satellite === 'west' ? 'West' : 'East'}`,
        maxZoom: 10,
        resolvedRegion: region,
        description: region.description
    };
}

function registerRegionalWeatherLayers() {
    WEATHER_REGIONS.forEach((region) => {
        Object.entries(WEATHER_CHANNELS).forEach(([channelKey, channel]) => {
            const layerKey = `weather_${region.id}_${channelKey}`;
            const isAuto = region.dynamic;
            const name = isAuto
                ? (channelKey === 'vis' ? 'Live Weather (Recommended)' : 'Infrared (Your Region)')
                : channel.label;

            SATELLITE_LAYERS[layerKey] = {
                name,
                type: isAuto ? 'goes_overlay_dynamic' : 'goes_overlay',
                regionId: region.id,
                channel: channelKey,
                url: region.sector
                    ? buildGoesTileUrl(region.satellite, region.sector, channel.channel)
                    : undefined,
                baseLayer: channel.baseLayer,
                opacity: channel.opacity,
                attribution: '© Iowa Environmental Mesonet / NOAA',
                maxZoom: 10,
                category: `weather_region_${region.id}`,
                regionLabel: region.label,
                sortOrder: region.sortOrder,
                suggestedZoom: region.suggestedZoom,
                center: region.center,
                description: region.description
            };
        });
    });
}

// Available Satellite & Map Layers - All CORS-friendly
const SATELLITE_LAYERS = {
    // === SATELLITE IMAGERY ===
    "esri_satellite": {
        name: "ESRI World Imagery",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
        category: "satellite",
        description: "High-resolution satellite imagery worldwide"
    },
    "nasa_gibs_viirs": {
        name: "NASA VIIRS Day/Night Band (GIBS)",
        type: "gibs_proxy",
        gibsLayer: "VIIRS_SNPP_DayNightBand_ENCC",
        attribution: '© NASA GIBS',
        maxZoom: 8,
        category: "nasa",
        description: "NASA night lights imagery via GIBS proxy (optional overlay)"
    },
    "esri_satellite_labels": {
        name: "ESRI Satellite + Labels",
        type: "dual",
        baseUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        overlayUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 19,
        category: "satellite",
        description: "Satellite imagery with place names"
    },
    "esri_terrain": {
        name: "ESRI World Terrain",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 13,
        category: "terrain",
        description: "Terrain and topography"
    },
    "esri_topo": {
        name: "ESRI Topographic",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 19,
        category: "terrain",
        description: "Detailed topographic map"
    },
    "esri_natgeo": {
        name: "National Geographic",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri, National Geographic',
        maxZoom: 16,
        category: "terrain",
        description: "National Geographic style map"
    },
    "esri_ocean": {
        name: "ESRI Ocean Basemap",
        type: "tile",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: '© Esri',
        maxZoom: 13,
        category: "ocean",
        description: "Ocean bathymetry and features"
    },
    
    // === US-ONLY WEATHER TOOLS ===
    "radar_us": {
        name: "Weather Radar (US only)",
        type: "overlay",
        url: "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png",
        attribution: '© Iowa Environmental Mesonet / NOAA',
        maxZoom: 8,
        category: "weather_us_tools",
        description: "Live NEXRAD radar reflectivity — continental United States only"
    },

    // === BASE MAPS ===
    "osm": {
        name: "OpenStreetMap",
        type: "tile",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '© OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        category: "base",
        description: "Standard street map"
    },
    "carto_light": {
        name: "Light Map",
        type: "tile",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: '© CARTO © OpenStreetMap',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        category: "base",
        description: "Clean light theme"
    },
    "carto_dark": {
        name: "Dark Map",
        type: "tile",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '© CARTO © OpenStreetMap',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        category: "base",
        description: "Dark theme for night viewing"
    },
    "carto_voyager": {
        name: "Voyager (Colorful)",
        type: "tile",
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution: '© CARTO © OpenStreetMap',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        category: "base",
        description: "Colorful detailed map"
    },
    "outdoors_hiking": {
        name: "Outdoors / Hiking",
        type: "dual",
        baseUrl: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        overlayUrl: "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
        attribution: '© OpenTopoMap © Waymarked Trails © OpenStreetMap',
        subdomains: ['a', 'b', 'c'],
        overlayOpacity: 0.9,
        maxZoom: 17,
        category: "terrain",
        description: "Topographic map with hiking trail overlays (no API key required)"
    },
    "opentopomap": {
        name: "OpenTopoMap",
        type: "tile",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: '© OpenTopoMap (CC-BY-SA)',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 17,
        category: "terrain",
        description: "Topographic contour map"
    }
};

registerRegionalWeatherLayers();

// Create NASA GIBS layer via serverless tile proxy
function createGibsProxyLayer(config) {
    const date = new Date().toISOString().split('T')[0];
    return L.tileLayer('', {
        attribution: config.attribution,
        maxZoom: config.maxZoom || 8,
        crossOrigin: 'anonymous',
        getTileUrl: (coords) => {
            const direct = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${config.gibsLayer}/default/${date}/GoogleMapsCompatible_L9/${coords.z}/${coords.y}/${coords.x}.jpg`;
            return `/api/gibs-tile?url=${encodeURIComponent(direct)}`;
        }
    });
}

// Create a tile layer from config
function createTileLayer(config) {
    return L.tileLayer(config.url, {
        attribution: config.attribution,
        subdomains: config.subdomains || [],
        maxZoom: config.maxZoom || 18,
        crossOrigin: 'anonymous'
    });
}

// Create GOES weather overlay (regional IEM XYZ tiles — includes Caribbean puertorico sector)
function createGoesOverlayLayers(config) {
    const baseKey = config.baseLayer || 'carto_dark';
    const baseConfig = SATELLITE_LAYERS[baseKey];
    const base = L.tileLayer(baseConfig.url, {
        attribution: baseConfig.attribution,
        subdomains: baseConfig.subdomains || [],
        maxZoom: baseConfig.maxZoom || 19,
        crossOrigin: 'anonymous'
    });

    const overlay = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom || 10,
        opacity: config.opacity ?? 0.92,
        crossOrigin: 'anonymous'
    });

    return { base, overlay };
}

// Create overlay layer (with dark base underneath)
function createOverlayLayers(config) {
    const base = L.tileLayer(SATELLITE_LAYERS['carto_dark'].url, {
        attribution: SATELLITE_LAYERS['carto_dark'].attribution,
        subdomains: SATELLITE_LAYERS['carto_dark'].subdomains,
        maxZoom: 19
    });
    
    // Use fallback URL if available (for weather layers that need API keys)
    const overlayUrl = config.fallbackUrl || config.url;
    const overlay = L.tileLayer(overlayUrl, {
        attribution: config.attribution,
        maxZoom: config.maxZoom || 8,
        opacity: 0.7,
        crossOrigin: 'anonymous'
    });
    
    return { base, overlay };
}

// Create dual layer (base + overlay)
function createDualLayers(config) {
    const base = L.tileLayer(config.baseUrl, {
        attribution: config.attribution,
        subdomains: config.subdomains || [],
        maxZoom: config.maxZoom || 18,
        crossOrigin: 'anonymous'
    });

    const labels = L.tileLayer(config.overlayUrl, {
        attribution: config.overlayAttribution || '',
        maxZoom: config.maxZoom || 18,
        opacity: config.overlayOpacity ?? 1,
        crossOrigin: 'anonymous',
        pane: 'overlayPane'
    });

    return { base, labels };
}

// Initialize the map
function initGIBSMap() {
    console.log('Initializing Satellite Map...');
    
    const container = document.getElementById('gibs-map');
    if (!container) {
        console.error('Map container not found');
        return;
    }
    
    // Check if already initialized
    if (gibsMap && gibsMap instanceof L.Map) {
        console.log('Map already initialized');
        gibsMap.invalidateSize();
        return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Default location (La Brea, Trinidad)
    const defaultLat = window.userLocation?.lat || 10.25;
    const defaultLon = window.userLocation?.lon || -61.63;
    
    try {
        // Create map
        gibsMap = L.map(container, {
            center: [defaultLat, defaultLon],
            zoom: 4,
            minZoom: 2,
            maxZoom: 19,
            worldCopyJump: true
        });
        
        // Add default base layer (ESRI Satellite)
        const defaultConfig = SATELLITE_LAYERS["esri_satellite"];
        baseLayer = createTileLayer(defaultConfig);
        baseLayer.addTo(gibsMap);
        
        // Set up layer control
        setupLayerControl();
        
        // Update layer info
        updateLayerInfo(defaultConfig);
        
        // Add scale
        L.control.scale({ position: 'bottomleft' }).addTo(gibsMap);
        
        window.gibsMap = gibsMap;
        window.gibsMapInitialized = true;
        
        console.log('Satellite map initialized successfully');
        
        // Force size update after a moment
        setTimeout(() => {
            if (gibsMap) {
                gibsMap.invalidateSize();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error initializing map:', error);
        container.innerHTML = `<div style="padding: 20px; color: #ff6b6b;">Error loading map: ${error.message}</div>`;
    }
}

// Setup layer selection dropdown
function setupLayerControl() {
    const select = document.getElementById('gibs-layer-select');
    if (!select) return;

    const previousValue = select.value;
    select.innerHTML = '';

    const lat = window.userLocation?.lat || 10.25;
    const lon = window.userLocation?.lon || -61.63;
    const recommendedRegion = resolveWeatherRegion(lat, lon);

    const staticCategories = {
        satellite: { label: '🛰️ Satellite Imagery', layers: [] },
        terrain: { label: '⛰️ Terrain & Topography', layers: [] },
        ocean: { label: '🌊 Ocean', layers: [] },
        nasa: { label: '🛰️ NASA GIBS', layers: [] },
        base: { label: '🗺️ Street Maps', layers: [] }
    };

    const weatherByRegion = new Map();
    const usTools = [];

    Object.entries(SATELLITE_LAYERS).forEach(([key, config]) => {
        const cat = config.category || 'base';

        if (cat === 'weather_us_tools') {
            usTools.push({ key, ...config });
            return;
        }

        if (cat.startsWith('weather_region_')) {
            const regionId = config.regionId || cat.replace('weather_region_', '');
            if (!weatherByRegion.has(regionId)) {
                const region = WEATHER_REGIONS.find((r) => r.id === regionId);
                weatherByRegion.set(regionId, {
                    sortOrder: region?.sortOrder ?? 999,
                    label: region?.label || regionId,
                    layers: []
                });
            }
            weatherByRegion.get(regionId).layers.push({ key, ...config });
            return;
        }

        if (staticCategories[cat]) {
            staticCategories[cat].layers.push({ key, ...config });
        }
    });

    const appendOptgroup = (label, layers, defaultKey = 'esri_satellite') => {
        if (layers.length === 0) return;

        const optgroup = document.createElement('optgroup');
        optgroup.label = label;

        layers.forEach((layer) => {
            const option = document.createElement('option');
            option.value = layer.key;
            option.textContent = layer.name;
            if (layer.key === defaultKey) {
                option.selected = true;
            }
            optgroup.appendChild(option);
        });

        select.appendChild(optgroup);
    };

    const weatherGroups = Array.from(weatherByRegion.entries())
        .sort((a, b) => a[1].sortOrder - b[1].sortOrder);

    weatherGroups.forEach(([regionId, group]) => {
        const isRecommended = regionId === 'auto' || regionId === recommendedRegion.id;
        const prefix = isRecommended ? '★ ' : '';
        appendOptgroup(`🌦️ ${prefix}${group.label}`, group.layers);
    });

    if (usTools.length > 0) {
        appendOptgroup('🌦️ US-only tools', usTools);
    }

    Object.entries(staticCategories).forEach(([, category]) => {
        appendOptgroup(category.label, category.layers);
    });

    if (previousValue && SATELLITE_LAYERS[previousValue]) {
        select.value = previousValue;
    }
    
    select.onchange = (e) => setGibsLayer(e.target.value);
}

// Set the active layer
function setGibsLayer(layerKey) {
    if (!gibsMap) {
        console.error('Map not initialized');
        return;
    }
    
    const config = SATELLITE_LAYERS[layerKey];
    if (!config) {
        console.error('Layer not found:', layerKey);
        return;
    }
    
    console.log('Switching to layer:', config.name);
    
    // Remove current layers
    if (currentLayer) {
        gibsMap.removeLayer(currentLayer);
        currentLayer = null;
    }
    if (baseLayer) {
        gibsMap.removeLayer(baseLayer);
        baseLayer = null;
    }
    
    // Show loading indicator
    showLoadingIndicator(true);
    
    // Create layer based on type
    if (config.type === 'goes_overlay' || config.type === 'goes_overlay_dynamic') {
        const lat = window.userLocation?.lat ?? gibsMap.getCenter().lat;
        const lon = window.userLocation?.lon ?? gibsMap.getCenter().lng;
        const resolvedConfig = config.type === 'goes_overlay_dynamic'
            ? buildResolvedGoesConfig(config, lat, lon)
            : config;

        const layers = createGoesOverlayLayers(resolvedConfig);
        baseLayer = layers.base;
        currentLayer = layers.overlay;

        baseLayer.addTo(gibsMap);
        currentLayer.addTo(gibsMap);

        currentLayer.on('load', () => showLoadingIndicator(false));
        currentLayer.on('tileerror', handleTileError);

        const region = resolvedConfig.resolvedRegion
            || WEATHER_REGIONS.find((r) => r.id === resolvedConfig.regionId);
        const center = config.type === 'goes_overlay_dynamic'
            ? [lat, lon]
            : (region?.center || [lat, lon]);
        const zoom = Math.max(gibsMap.getZoom(), region?.suggestedZoom || resolvedConfig.suggestedZoom || 5);
        gibsMap.setView(center, zoom);

        updateLayerInfo({ ...resolvedConfig, name: config.name });
        return;
    } else if (config.type === 'overlay') {
        // Weather/overlay layers need a base map underneath
        const layers = createOverlayLayers(config);
        baseLayer = layers.base;
        currentLayer = layers.overlay;
        
        baseLayer.addTo(gibsMap);
        currentLayer.addTo(gibsMap);
        
        currentLayer.on('load', () => showLoadingIndicator(false));
        currentLayer.on('tileerror', handleTileError);
        
    } else if (config.type === 'gibs_proxy') {
        const darkBase = L.tileLayer(SATELLITE_LAYERS['carto_dark'].url, {
            attribution: SATELLITE_LAYERS['carto_dark'].attribution,
            subdomains: SATELLITE_LAYERS['carto_dark'].subdomains,
            maxZoom: 19
        });
        baseLayer = darkBase;
        currentLayer = createGibsProxyLayer(config);
        baseLayer.addTo(gibsMap);
        currentLayer.addTo(gibsMap);
        currentLayer.on('load', () => showLoadingIndicator(false));
        currentLayer.on('tileerror', handleTileError);
    } else if (config.type === 'dual') {
        // Dual layers (satellite + labels)
        const layers = createDualLayers(config);
        baseLayer = layers.base;
        currentLayer = layers.labels;
        
        baseLayer.addTo(gibsMap);
        currentLayer.addTo(gibsMap);
        
        baseLayer.on('load', () => showLoadingIndicator(false));
        baseLayer.on('tileerror', handleTileError);
        
    } else {
        // Standard tile layer
        baseLayer = createTileLayer(config);
        baseLayer.addTo(gibsMap);
        
        baseLayer.on('load', () => showLoadingIndicator(false));
        baseLayer.on('tileerror', handleTileError);
    }
    
    // Update layer info
    updateLayerInfo(config);
}

// Handle tile loading errors
function handleTileError(e) {
    console.warn('Tile error (may be normal for edge tiles):', e.coords);
}

// Show/hide loading indicator
function showLoadingIndicator(show) {
    let indicator = document.getElementById('map-loading');
    
    if (show) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'map-loading';
            indicator.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                            background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 8px; 
                            color: white; z-index: 1000; display: flex; align-items: center; gap: 10px;">
                    <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #666; 
                                                border-top-color: #fff; border-radius: 50%; 
                                                animation: spin 1s linear infinite;"></div>
                    Loading imagery...
                </div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
            const container = document.getElementById('gibs-map');
            if (container) {
                container.style.position = 'relative';
                container.appendChild(indicator);
            }
        }
    } else if (indicator) {
        indicator.remove();
    }
}

// Update layer information display
function updateLayerInfo(config) {
    const infoEl = document.getElementById('layer-info');
    if (!infoEl) return;
    
    let extraInfo = '';
    if (config.category?.startsWith('weather_region_') || config.resolvedRegion) {
        const regionLabel = config.resolvedRegion?.label || config.regionLabel || 'Regional GOES';
        extraInfo = `<br><small>⚡ Live GOES satellite · ${regionLabel}</small>`;
    } else if (config.category === 'weather_us_tools') {
        extraInfo = '<br><small>⚡ Live data · Continental US coverage only</small>';
    }
    
    infoEl.innerHTML = `
        <strong>${config.name}</strong>
        <span style="color: #8892b0; margin-left: 0.5rem;">— ${config.description || ''}</span>
        ${extraInfo}
    `;
}

// Center map on location
function centerGIBSMap(lat, lon, zoom = 8) {
    if (!gibsMap) return;
    gibsMap.setView([lat, lon], zoom);
}

// Update map location (called from main script)
function updateGIBSMapLocation() {
    if (!gibsMap) return;
    
    const lat = window.userLocation?.lat || 10.25;
    const lon = window.userLocation?.lon || -61.63;
    
    centerGIBSMap(lat, lon);
    setupLayerControl();
}

// Setup map control buttons
function setupMapControls() {
    // Center on user location
    const centerBtn = document.getElementById('centerMapButton');
    if (centerBtn) {
        centerBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                centerBtn.innerHTML = '⏳ Locating...';
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        centerGIBSMap(pos.coords.latitude, pos.coords.longitude, 10);
                        centerBtn.innerHTML = '📍 My Location';
                    },
                    (err) => {
                        console.error('Geolocation error:', err);
                        centerBtn.innerHTML = '📍 My Location';
                        alert('Could not get location. Please enable location access.');
                    }
                );
            }
        });
    }
    
    // Center on default location
    const defaultBtn = document.getElementById('centerDefaultButton');
    if (defaultBtn) {
        defaultBtn.addEventListener('click', () => {
            centerGIBSMap(10.25, -61.63, 8);
        });
    }
}

// Expose functions globally
window.initGIBSMap = initGIBSMap;
window.setGibsLayer = setGibsLayer;
window.centerGIBSMap = centerGIBSMap;
window.updateGIBSMapLocation = updateGIBSMapLocation;

// Initialize controls when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMapControls);
} else {
    setupMapControls();
}
