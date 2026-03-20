/**
 * AstroCalTT Interactive Sky Map
 * A Stellarium-inspired interactive planetarium
 * Version: 5.0 — Enhanced visuals & features
 */

// ============================================
// CONFIGURATION & STATE
// ============================================

const SkyMap = {
    canvas: null,
    ctx: null,
    initialized: false,
    animationId: null,

    observer: {
        latitude: 10.25,
        longitude: -61.63,
        date: new Date(),
        timeSpeed: 1
    },

    view: {
        azimuth: 180,
        altitude: 45,
        fov: 60,
        minFov: 10,
        maxFov: 120,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        touchStartDist: 0
    },

    options: {
        showStars: true,
        showConstellationLines: true,
        showConstellationNames: true,
        showPlanets: true,
        showMilkyWay: true,
        showGrid: false,
        showHorizon: true,
        showCardinals: true,
        showDSOs: true,
        nightMode: false,
        starScale: 1.0,
        limitingMagnitude: 5.5
    },

    colors: {
        background: '#0a0d1a',
        horizon: '#1a2040',
        grid: 'rgba(100, 150, 255, 0.15)',
        constellationLine: 'rgba(100, 180, 255, 0.25)',
        constellationName: 'rgba(150, 200, 255, 0.6)',
        cardinal: '#ffcc00',
        starDefault: '#ffffff',
        milkyWay: 'rgba(200, 220, 255, 0.08)'
    },

    // Night mode colors (deep red)
    nightColors: {
        background: '#0d0000',
        horizon: '#1a0000',
        grid: 'rgba(255, 50, 50, 0.12)',
        constellationLine: 'rgba(200, 60, 60, 0.25)',
        constellationName: 'rgba(255, 100, 100, 0.5)',
        cardinal: '#ff4444',
        starDefault: '#ff8888',
        milkyWay: 'rgba(255, 100, 100, 0.06)'
    },

    selectedObject: null,
    searchQuery: '',
    searchResults: []
};

// Active color set accessor
function C() {
    return SkyMap.options.nightMode ? SkyMap.nightColors : SkyMap.colors;
}

// ============================================
// STAR CATALOG (Yale Bright Star Catalog subset)
// ============================================

const STARS = [
    ["Sirius", 6.752, -16.716, -1.46, "A"],
    ["Canopus", 6.399, -52.696, -0.74, "F"],
    ["Alpha Centauri", 14.660, -60.834, -0.27, "G"],
    ["Arcturus", 14.261, 19.182, -0.05, "K"],
    ["Vega", 18.616, 38.784, 0.03, "A"],
    ["Capella", 5.278, 45.998, 0.08, "G"],
    ["Rigel", 5.242, -8.202, 0.13, "B"],
    ["Procyon", 7.655, 5.225, 0.34, "F"],
    ["Achernar", 1.629, -57.237, 0.46, "B"],
    ["Betelgeuse", 5.919, 7.407, 0.50, "M"],
    ["Hadar", 14.064, -60.373, 0.61, "B"],
    ["Altair", 19.846, 8.868, 0.76, "A"],
    ["Acrux", 12.443, -63.100, 0.77, "B"],
    ["Aldebaran", 4.599, 16.509, 0.85, "K"],
    ["Antares", 16.490, -26.432, 0.96, "M"],
    ["Spica", 13.420, -11.161, 0.98, "B"],
    ["Pollux", 7.755, 28.026, 1.14, "K"],
    ["Fomalhaut", 22.961, -29.622, 1.16, "A"],
    ["Deneb", 20.690, 45.280, 1.25, "A"],
    ["Mimosa", 12.795, -59.689, 1.25, "B"],
    ["Regulus", 10.140, 11.967, 1.35, "B"],
    ["Adhara", 6.977, -28.972, 1.50, "B"],
    ["Castor", 7.577, 31.889, 1.58, "A"],
    ["Gacrux", 12.519, -57.113, 1.59, "M"],
    ["Shaula", 17.560, -37.104, 1.62, "B"],
    ["Bellatrix", 5.419, 6.350, 1.64, "B"],
    ["Elnath", 5.438, 28.608, 1.65, "B"],
    ["Miaplacidus", 9.220, -69.717, 1.67, "A"],
    ["Alnilam", 5.604, -1.202, 1.69, "B"],
    ["Alnair", 22.137, -46.961, 1.74, "B"],
    ["Alnitak", 5.679, -1.943, 1.77, "O"],
    ["Alioth", 12.900, 55.960, 1.77, "A"],
    ["Dubhe", 11.062, 61.751, 1.79, "K"],
    ["Mirfak", 3.405, 49.861, 1.79, "F"],
    ["Wezen", 7.140, -26.393, 1.84, "F"],
    ["Sargas", 17.622, -42.998, 1.86, "F"],
    ["Kaus Australis", 18.403, -34.385, 1.85, "B"],
    ["Avior", 8.376, -59.509, 1.86, "K"],
    ["Alkaid", 13.792, 49.313, 1.86, "B"],
    ["Menkalinan", 5.992, 44.948, 1.90, "A"],
    ["Atria", 16.811, -69.028, 1.92, "K"],
    ["Alhena", 6.629, 16.399, 1.93, "A"],
    ["Peacock", 20.427, -56.735, 1.94, "B"],
    ["Alsephina", 8.745, -54.709, 1.96, "A"],
    ["Mirzam", 6.378, -17.956, 1.98, "B"],
    ["Polaris", 2.530, 89.264, 1.98, "F"],
    ["Alphard", 9.460, -8.659, 1.98, "K"],
    ["Hamal", 2.120, 23.463, 2.00, "K"],
    ["Diphda", 0.727, -17.987, 2.02, "K"],
    ["Mizar", 13.399, 54.925, 2.04, "A"],
    ["Nunki", 18.921, -26.297, 2.05, "B"],
    ["Menkent", 14.111, -36.370, 2.06, "K"],
    ["Mirach", 1.163, 35.620, 2.07, "M"],
    ["Alpheratz", 0.140, 29.091, 2.07, "B"],
    ["Rasalhague", 17.582, 12.560, 2.08, "A"],
    ["Kochab", 14.845, 74.156, 2.08, "K"],
    ["Saiph", 5.796, -9.670, 2.09, "B"],
    ["Denebola", 11.818, 14.572, 2.14, "A"],
    ["Algol", 3.136, 40.956, 2.12, "B"],
    ["Tiaki", 22.711, -46.885, 2.39, "K"],
    ["Muhlifain", 12.692, -48.960, 2.17, "A"],
    ["Aspidiske", 9.285, -59.275, 2.21, "A"],
    ["Suhail", 9.133, -43.433, 2.21, "K"],
    ["Alphecca", 15.578, 26.715, 2.22, "A"],
    ["Mintaka", 5.533, -0.299, 2.23, "O"],
    ["Sadr", 20.370, 40.257, 2.23, "F"],
    ["Eltanin", 17.944, 51.489, 2.24, "K"],
    ["Schedar", 0.675, 56.537, 2.24, "K"],
    ["Naos", 8.060, -40.003, 2.25, "O"],
    ["Almach", 2.065, 42.330, 2.26, "K"],
    ["Caph", 0.153, 59.150, 2.28, "F"],
    ["Izar", 14.750, 27.074, 2.29, "K"],
    ["Dschubba", 16.006, -22.622, 2.29, "B"],
    ["Larawag", 17.708, -39.030, 2.29, "K"],
    ["Merak", 11.031, 56.382, 2.34, "A"],
    ["Ankaa", 0.438, -42.306, 2.37, "K"],
    ["Girtab", 17.793, -37.043, 2.39, "B"],
    ["Enif", 21.736, 9.875, 2.40, "K"],
    ["Scheat", 23.063, 28.083, 2.42, "M"],
    ["Sabik", 17.173, -15.725, 2.43, "A"],
    ["Phecda", 11.897, 53.695, 2.44, "A"],
    ["Aludra", 7.402, -29.303, 2.45, "B"],
    ["Markeb", 9.368, -55.011, 2.47, "A"],
    ["Navi", 0.945, 60.717, 2.47, "B"],
    ["Markab", 23.079, 15.205, 2.49, "B"],
    ["Aljanah", 20.770, 33.970, 2.48, "K"],
    ["Acrab", 16.091, -19.806, 2.50, "B"],
    ["Megrez", 12.257, 57.032, 3.31, "A"],
    ["Pherkad", 15.345, 71.834, 3.00, "A"],
    ["Ruchbah", 1.430, 60.235, 2.68, "A"],
    ["Segin", 1.907, 63.670, 3.37, "B"],
    ["Alderamin", 21.310, 62.585, 2.45, "A"],
    ["Thuban", 14.073, 64.376, 3.65, "A"],
    ["Rastaban", 17.507, 52.301, 2.79, "G"],
    ["Etamin", 17.944, 51.489, 2.24, "K"],
    ["Grumium", 17.892, 56.873, 3.75, "K"],
    ["Kuma", 17.530, 55.184, 4.57, "F"],
    ["Giausar", 11.523, 69.331, 3.85, "M"],
    ["Edasich", 15.416, 58.966, 3.29, "K"]
];

// ============================================
// CONSTELLATION DATA
// ============================================

const CONSTELLATIONS = [
    { name: "Orion", abbr: "Ori", lines: [["Betelgeuse","Bellatrix"],["Bellatrix","Mintaka"],["Mintaka","Alnilam"],["Alnilam","Alnitak"],["Alnitak","Saiph"],["Saiph","Rigel"],["Rigel","Mintaka"],["Betelgeuse","Alnilam"],["Alnilam","Rigel"]], center: [5.6, 0] },
    { name: "Ursa Major", abbr: "UMa", lines: [["Dubhe","Merak"],["Merak","Phecda"],["Phecda","Megrez"],["Megrez","Alioth"],["Alioth","Mizar"],["Mizar","Alkaid"],["Megrez","Dubhe"]], center: [11.5, 55] },
    { name: "Cassiopeia", abbr: "Cas", lines: [["Schedar","Caph"],["Schedar","Navi"],["Navi","Ruchbah"],["Ruchbah","Segin"]], center: [1.0, 60] },
    { name: "Scorpius", abbr: "Sco", lines: [["Antares","Dschubba"],["Dschubba","Acrab"],["Antares","Larawag"],["Larawag","Shaula"],["Shaula","Sargas"]], center: [16.9, -30] },
    { name: "Leo", abbr: "Leo", lines: [["Regulus","Denebola"],["Regulus","Algieba"],["Denebola","Zosma"]], center: [10.5, 15] },
    { name: "Cygnus", abbr: "Cyg", lines: [["Deneb","Sadr"],["Sadr","Aljanah"],["Sadr","Gienah"]], center: [20.5, 42] },
    { name: "Lyra", abbr: "Lyr", lines: [["Vega","Sulafat"],["Sulafat","Sheliak"]], center: [18.8, 35] },
    { name: "Aquila", abbr: "Aql", lines: [["Altair","Tarazed"],["Altair","Alshain"]], center: [19.8, 5] },
    { name: "Crux", abbr: "Cru", lines: [["Acrux","Gacrux"],["Mimosa","Delta Crucis"]], center: [12.4, -60] },
    { name: "Centaurus", abbr: "Cen", lines: [["Alpha Centauri","Hadar"],["Hadar","Menkent"]], center: [13.5, -50] },
    { name: "Canis Major", abbr: "CMa", lines: [["Sirius","Mirzam"],["Sirius","Adhara"],["Adhara","Wezen"],["Wezen","Aludra"]], center: [6.8, -22] },
    { name: "Gemini", abbr: "Gem", lines: [["Castor","Pollux"],["Castor","Mebsuta"],["Pollux","Alhena"]], center: [7.1, 25] },
    { name: "Taurus", abbr: "Tau", lines: [["Aldebaran","Elnath"],["Aldebaran","Ain"]], center: [4.5, 18] },
    { name: "Virgo", abbr: "Vir", lines: [["Spica","Porrima"],["Porrima","Vindemiatrix"]], center: [13.0, -5] },
    { name: "Pegasus", abbr: "Peg", lines: [["Markab","Scheat"],["Scheat","Alpheratz"],["Alpheratz","Algenib"],["Algenib","Markab"],["Markab","Enif"]], center: [22.5, 20] },
    { name: "Andromeda", abbr: "And", lines: [["Alpheratz","Mirach"],["Mirach","Almach"]], center: [1.0, 38] },
    { name: "Perseus", abbr: "Per", lines: [["Mirfak","Algol"],["Mirfak","Delta Persei"]], center: [3.5, 45] },
    { name: "Ursa Minor", abbr: "UMi", lines: [["Polaris","Kochab"],["Kochab","Pherkad"]], center: [15.0, 78] },
    { name: "Draco", abbr: "Dra", lines: [["Eltanin","Rastaban"],["Rastaban","Grumium"],["Eltanin","Thuban"]], center: [17.0, 60] },
    { name: "Boötes", abbr: "Boo", lines: [["Arcturus","Izar"],["Arcturus","Muphrid"],["Izar","Alphecca"]], center: [14.5, 30] },
    { name: "Corona Borealis", abbr: "CrB", lines: [["Alphecca","Nusakan"]], center: [15.8, 30] }
];

// ============================================
// PLANET DATA (Simplified orbital elements)
// ============================================

const PLANETS = [
    { name: "Mercury", symbol: "☿", color: "#b5a191", size: 3, a: 0.387, e: 0.206, i: 7.0, L: 252.251, w: 77.457, O: 48.331, n: 4.092 },
    { name: "Venus", symbol: "♀", color: "#ffe4b5", size: 5, a: 0.723, e: 0.007, i: 3.4, L: 181.980, w: 131.563, O: 76.680, n: 1.602 },
    { name: "Mars", symbol: "♂", color: "#cd5c5c", size: 4, a: 1.524, e: 0.093, i: 1.8, L: 355.433, w: 336.041, O: 49.558, n: 0.524 },
    { name: "Jupiter", symbol: "♃", color: "#d4a574", size: 8, a: 5.203, e: 0.048, i: 1.3, L: 34.351, w: 14.331, O: 100.464, n: 0.083 },
    { name: "Saturn", symbol: "♄", color: "#f4d59e", size: 7, a: 9.537, e: 0.054, i: 2.5, L: 50.077, w: 93.057, O: 113.665, n: 0.033 }
];

// ============================================
// DEEP SKY OBJECTS (Messier catalog subset)
// ============================================

const DSOs = [
    // [name, RA (h), Dec (°), magnitude, type, common name, size (arcmin)]
    ["M31", 0.712, 41.269, 3.4, "galaxy", "Andromeda Galaxy", 190],
    ["M42", 5.588, -5.391, 4.0, "nebula", "Orion Nebula", 85],
    ["M45", 3.791, 24.105, 1.6, "cluster", "Pleiades", 110],
    ["M13", 16.695, 36.461, 5.8, "cluster", "Hercules Cluster", 20],
    ["M44", 8.667, 19.672, 3.7, "cluster", "Beehive Cluster", 95],
    ["M8", 18.063, -24.386, 6.0, "nebula", "Lagoon Nebula", 90],
    ["M57", 18.893, 33.029, 8.8, "nebula", "Ring Nebula", 1.4],
    ["M27", 19.994, 22.721, 7.5, "nebula", "Dumbbell Nebula", 8],
    ["M7", 17.898, -34.793, 3.3, "cluster", "Ptolemy's Cluster", 80],
    ["M6", 17.668, -32.254, 4.2, "cluster", "Butterfly Cluster", 25],
    ["M22", 18.607, -23.905, 5.1, "cluster", "Sagittarius Cluster", 32],
    ["M35", 6.149, 24.333, 5.1, "cluster", "", 28],
    ["M41", 6.768, -20.757, 4.5, "cluster", "", 38],
    ["M47", 7.612, -14.486, 4.4, "cluster", "", 30],
    ["M48", 8.228, -5.800, 5.8, "cluster", "", 54],
    ["M4", 16.393, -26.526, 5.6, "cluster", "", 36],
    ["M11", 18.851, -6.272, 6.3, "cluster", "Wild Duck Cluster", 14],
    ["M17", 18.346, -16.177, 6.0, "nebula", "Omega Nebula", 11],
    ["M20", 18.036, -23.030, 6.3, "nebula", "Trifid Nebula", 28],
    ["M33", 1.564, 30.660, 5.7, "galaxy", "Triangulum Galaxy", 73],
    ["M51", 13.498, 47.195, 8.4, "galaxy", "Whirlpool Galaxy", 11],
    ["M81", 9.926, 69.066, 6.9, "galaxy", "Bode's Galaxy", 27],
    ["M82", 9.928, 69.680, 8.4, "galaxy", "Cigar Galaxy", 11],
    ["M101", 14.054, 54.349, 7.9, "galaxy", "Pinwheel Galaxy", 29],
    ["M104", 12.667, -11.623, 8.0, "galaxy", "Sombrero Galaxy", 9],
    ["NGC 869", 2.322, 57.133, 5.3, "cluster", "Double Cluster h", 30],
    ["NGC 884", 2.373, 57.150, 6.1, "cluster", "Double Cluster χ", 30],
    ["LMC", 5.392, -69.756, 0.9, "galaxy", "Large Magellanic Cloud", 650],
    ["SMC", 0.877, -72.800, 2.7, "galaxy", "Small Magellanic Cloud", 320],
    ["47 Tuc", 0.401, -72.081, 4.1, "cluster", "", 50],
    ["ω Cen", 13.447, -47.479, 3.7, "cluster", "Omega Centauri", 55]
];

// Milky Way galactic plane — RA (hours), Dec (°), width (°)
const MILKY_WAY_PATH = [
    [18.5, -30, 25], [18.0, -25, 30], [17.5, -20, 25], [17.0, -15, 20],
    [19.0, -28, 28], [19.5, -20, 22], [20.0, -10, 18], [20.5, 5, 16],
    [20.8, 20, 15], [21.0, 35, 18], [21.2, 45, 20], [21.5, 55, 18],
    [22.0, 58, 16], [22.5, 55, 14], [23.0, 50, 12], [23.5, 55, 14],
    [0.0, 60, 16], [0.5, 62, 18], [1.0, 60, 16], [1.5, 55, 14],
    [2.0, 50, 16], [2.5, 55, 18], [3.0, 50, 16], [3.5, 45, 14],
    [4.0, 35, 12], [4.5, 25, 14], [5.0, 15, 16], [5.5, 5, 18],
    [6.0, -5, 20], [6.5, -15, 22], [7.0, -25, 24], [7.5, -30, 22],
    [8.0, -40, 20], [8.5, -45, 18], [9.0, -50, 16], [10.0, -55, 14],
    [11.0, -60, 12], [12.0, -63, 14], [13.0, -60, 16], [14.0, -55, 18],
    [15.0, -48, 18], [16.0, -40, 20], [17.0, -35, 22], [18.0, -28, 26]
];

// ============================================
// ASTRONOMY CALCULATIONS
// ============================================

const Astro = {
    toRad: (deg) => deg * Math.PI / 180,
    toDeg: (rad) => rad * 180 / Math.PI,
    normalize360: (angle) => { while (angle < 0) angle += 360; while (angle >= 360) angle -= 360; return angle; },
    normalize180: (angle) => { while (angle < -180) angle += 360; while (angle > 180) angle -= 360; return angle; },

    toJulianDate: (date) => date.getTime() / 86400000 + 2440587.5,
    daysSinceJ2000: (date) => Astro.toJulianDate(date) - 2451545.0,

    localSiderealTime: (date, longitude) => {
        const d = Astro.daysSinceJ2000(date);
        let gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * Math.pow(d / 36525, 2);
        gmst = Astro.normalize360(gmst);
        return Astro.normalize360(gmst + longitude);
    },

    raDecToAltAz: (ra, dec, date, lat, lon) => {
        const lst = Astro.localSiderealTime(date, lon);
        const ha = Astro.normalize180(lst - ra * 15);
        const haRad = Astro.toRad(ha), decRad = Astro.toRad(dec), latRad = Astro.toRad(lat);
        const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
        const alt = Astro.toDeg(Math.asin(sinAlt));
        const cosAz = (Math.sin(decRad) - Math.sin(Astro.toRad(alt)) * Math.sin(latRad)) / (Math.cos(Astro.toRad(alt)) * Math.cos(latRad));
        let az = Astro.toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
        if (Math.sin(haRad) > 0) az = 360 - az;
        return { altitude: alt, azimuth: az };
    },

    getPlanetPosition: (planet, date) => {
        const d = Astro.daysSinceJ2000(date);
        let L = Astro.normalize360(planet.L + planet.n * d);
        let M = Astro.normalize360(L - planet.w);
        const MRad = Astro.toRad(M);
        const Cv = (2 * planet.e - planet.e ** 3 / 4) * Math.sin(MRad) + (5/4) * planet.e ** 2 * Math.sin(2 * MRad);
        const lon = Astro.normalize360(L + Astro.toDeg(Cv));
        const lonRad = Astro.toRad(lon);
        const latRad = Astro.toRad(planet.i * Math.sin(Astro.toRad(lon - planet.O)));
        const eps = Astro.toRad(23.439);
        const sinDec = Math.sin(latRad) * Math.cos(eps) + Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad);
        const dec = Astro.toDeg(Math.asin(sinDec));
        const y = Math.sin(lonRad) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps);
        const x = Math.cos(lonRad);
        let ra = Astro.toDeg(Math.atan2(y, x));
        return { ra: Astro.normalize360(ra) / 15, dec };
    },

    getMoonPosition: (date) => {
        const d = Astro.daysSinceJ2000(date);
        const L = Astro.normalize360(218.316 + 13.176396 * d);
        const M = Astro.normalize360(134.963 + 13.064993 * d);
        const F = Astro.normalize360(93.272 + 13.229350 * d);
        const lon = L + 6.289 * Math.sin(Astro.toRad(M));
        const lat = 5.128 * Math.sin(Astro.toRad(F));
        const eps = Astro.toRad(23.439);
        const lonRad = Astro.toRad(lon), latRad = Astro.toRad(lat);
        const sinDec = Math.sin(latRad) * Math.cos(eps) + Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad);
        const dec = Astro.toDeg(Math.asin(sinDec));
        const y = Math.sin(lonRad) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps);
        const x = Math.cos(lonRad);
        return { ra: Astro.normalize360(Astro.toDeg(Math.atan2(y, x))) / 15, dec };
    },

    getMoonPhase: (date) => {
        const d = Astro.daysSinceJ2000(date);
        const sunL = Astro.normalize360(280.459 + 0.98564736 * d);
        const moonL = Astro.normalize360(218.316 + 13.176396 * d);
        const phase = Astro.normalize360(moonL - sunL);
        return phase / 360;
    },

    getSunPosition: (date) => {
        const d = Astro.daysSinceJ2000(date);
        const g = Astro.normalize360(357.529 + 0.98560028 * d);
        const q = Astro.normalize360(280.459 + 0.98564736 * d);
        const L = q + 1.915 * Math.sin(Astro.toRad(g)) + 0.020 * Math.sin(Astro.toRad(2 * g));
        const eps = 23.439 - 0.00000036 * d;
        const ra = Astro.toDeg(Math.atan2(Math.cos(Astro.toRad(eps)) * Math.sin(Astro.toRad(L)), Math.cos(Astro.toRad(L))));
        const dec = Astro.toDeg(Math.asin(Math.sin(Astro.toRad(eps)) * Math.sin(Astro.toRad(L))));
        return { ra: Astro.normalize360(ra) / 15, dec };
    }
};

// ============================================
// STAR COLOR UTILITIES
// ============================================

function spectralColor(type, nightMode) {
    if (nightMode) {
        switch (type) {
            case 'O': return '#ff6666';
            case 'B': return '#ff7777';
            case 'A': return '#ff8888';
            case 'F': return '#ff9999';
            case 'G': return '#ffaaaa';
            case 'K': return '#ff8877';
            case 'M': return '#ff6655';
            default: return '#ff8888';
        }
    }
    switch (type) {
        case 'O': return '#92b5ff';
        case 'B': return '#a2c0ff';
        case 'A': return '#d5e0ff';
        case 'F': return '#f8f4e8';
        case 'G': return '#fff4d6';
        case 'K': return '#ffd2a1';
        case 'M': return '#ffb56c';
        default: return '#d5e0ff';
    }
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

// ============================================
// RENDERING
// ============================================

const Renderer = {
    altAzToScreen: (alt, az) => {
        const canvas = SkyMap.canvas;
        const view = SkyMap.view;
        const cx = canvas.width / 2, cy = canvas.height / 2;

        const altRad = Astro.toRad(alt), azRad = Astro.toRad(az);
        const cAltRad = Astro.toRad(view.altitude), cAzRad = Astro.toRad(view.azimuth);

        // Spherical angular separation from view center
        const cosSep = Math.sin(altRad) * Math.sin(cAltRad) +
                       Math.cos(altRad) * Math.cos(cAltRad) * Math.cos(azRad - cAzRad);
        const sepRad = Math.acos(Math.max(-1, Math.min(1, cosSep)));
        const sepDeg = Astro.toDeg(sepRad);

        if (sepDeg > 90) return { x: 0, y: 0, visible: false };

        // Bearing (position angle on tangent plane)
        const sinSep = Math.sin(sepRad);
        let bearing = 0;
        if (sinSep > 1e-8) {
            const sinB = Math.cos(altRad) * Math.sin(azRad - cAzRad) / sinSep;
            const cosB = (Math.sin(altRad) * Math.cos(cAltRad) -
                         Math.cos(altRad) * Math.sin(cAltRad) * Math.cos(azRad - cAzRad)) / sinSep;
            bearing = Math.atan2(sinB, cosB);
        }

        // Azimuthal equidistant: uniform pixel-per-degree in all directions
        const pixPerDeg = Math.min(canvas.width, canvas.height) / view.fov;
        const x = cx + sepDeg * Math.sin(bearing) * pixPerDeg;
        const y = cy - sepDeg * Math.cos(bearing) * pixPerDeg;

        const maxVisDeg = Math.max(canvas.width, canvas.height) / pixPerDeg / 2;
        const visible = sepDeg < maxVisDeg * 1.1;

        return { x, y, visible };
    },

    drawBackground: () => {
        const ctx = SkyMap.ctx;
        const canvas = SkyMap.canvas;
        const c = C();

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, c.horizon);
        gradient.addColorStop(0.3, SkyMap.options.nightMode ? '#0a0000' : '#0d1225');
        gradient.addColorStop(1, c.background);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vignette
        const vignette = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.25,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.75
        );
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, SkyMap.options.nightMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.35)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle noise grain
        if (!SkyMap.options.nightMode) {
            ctx.save();
            ctx.globalAlpha = 0.015;
            for (let i = 0; i < 600; i++) {
                const nx = Math.random() * canvas.width;
                const ny = Math.random() * canvas.height;
                const size = Math.random() * 1.2;
                ctx.fillStyle = `rgba(200,220,255,${Math.random() * 0.5 + 0.1})`;
                ctx.fillRect(nx, ny, size, size);
            }
            ctx.restore();
        }

        if (SkyMap.options.showMilkyWay) Renderer.drawMilkyWay();
    },

    drawMilkyWay: () => {
        const ctx = SkyMap.ctx;
        const date = SkyMap.observer.date;
        const lat = SkyMap.observer.latitude;
        const lon = SkyMap.observer.longitude;
        const nm = SkyMap.options.nightMode;

        ctx.save();
        MILKY_WAY_PATH.forEach(pt => {
            const [ra, dec, width] = pt;
            const altAz = Astro.raDecToAltAz(ra, dec, date, lat, lon);
            if (altAz.altitude < -10) return;
            const pos = Renderer.altAzToScreen(altAz.altitude, altAz.azimuth);
            if (!pos.visible) return;

            const scale = Math.min(SkyMap.canvas.width, SkyMap.canvas.height) / SkyMap.view.fov;
            const r = width * scale * 0.5;

            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
            if (nm) {
                grad.addColorStop(0, 'rgba(80,20,20,0.12)');
                grad.addColorStop(0.4, 'rgba(60,15,15,0.06)');
                grad.addColorStop(1, 'transparent');
            } else {
                grad.addColorStop(0, 'rgba(180,200,240,0.12)');
                grad.addColorStop(0.3, 'rgba(160,180,220,0.07)');
                grad.addColorStop(0.6, 'rgba(140,165,210,0.03)');
                grad.addColorStop(1, 'transparent');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    },

    drawHorizon: () => {
        if (!SkyMap.options.showHorizon) return;
        const ctx = SkyMap.ctx;
        const canvas = SkyMap.canvas;
        const nm = SkyMap.options.nightMode;

        const horizonPos = Renderer.altAzToScreen(0, SkyMap.view.azimuth);
        if (horizonPos.y < 0 || horizonPos.y > canvas.height) return;

        // Gradient fade below horizon
        const belowGrad = ctx.createLinearGradient(0, horizonPos.y, 0, horizonPos.y + 80);
        belowGrad.addColorStop(0, nm ? 'rgba(20,5,0,0.0)' : 'rgba(15,25,15,0.0)');
        belowGrad.addColorStop(0.3, nm ? 'rgba(20,5,0,0.3)' : 'rgba(10,20,10,0.25)');
        belowGrad.addColorStop(1, nm ? 'rgba(15,2,0,0.6)' : 'rgba(5,15,5,0.5)');
        ctx.fillStyle = belowGrad;
        ctx.fillRect(0, horizonPos.y, canvas.width, canvas.height - horizonPos.y);

        // Atmospheric extinction glow along horizon
        const atmosGrad = ctx.createLinearGradient(0, horizonPos.y - 40, 0, horizonPos.y + 10);
        atmosGrad.addColorStop(0, 'transparent');
        atmosGrad.addColorStop(0.5, nm ? 'rgba(60,15,0,0.08)' : 'rgba(60,80,60,0.06)');
        atmosGrad.addColorStop(1, nm ? 'rgba(40,10,0,0.12)' : 'rgba(40,60,40,0.1)');
        ctx.fillStyle = atmosGrad;
        ctx.fillRect(0, horizonPos.y - 40, canvas.width, 50);

        // Thin horizon line
        ctx.save();
        ctx.strokeStyle = nm ? 'rgba(120,40,30,0.4)' : 'rgba(80,130,80,0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, horizonPos.y);
        ctx.lineTo(canvas.width, horizonPos.y);
        ctx.stroke();
        ctx.restore();

        // Cardinal directions
        if (SkyMap.options.showCardinals) {
            const cardinals = [
                { az: 0, label: 'N', color: nm ? '#ff4444' : '#ff6666' },
                { az: 45, label: 'NE' }, { az: 90, label: 'E' },
                { az: 135, label: 'SE' }, { az: 180, label: 'S' },
                { az: 225, label: 'SW' }, { az: 270, label: 'W' },
                { az: 315, label: 'NW' }
            ];
            ctx.save();
            ctx.font = 'bold 15px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            cardinals.forEach(card => {
                const pos = Renderer.altAzToScreen(1, card.az);
                if (!pos.visible) return;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillText(card.label, pos.x + 1, pos.y + 1);
                ctx.fillStyle = card.color || C().cardinal;
                ctx.fillText(card.label, pos.x, pos.y);
            });
            ctx.restore();
        }
    },

    drawGrid: () => {
        if (!SkyMap.options.showGrid) return;
        const ctx = SkyMap.ctx;
        ctx.save();
        ctx.strokeStyle = C().grid;
        ctx.lineWidth = 0.5;
        for (let alt = 0; alt <= 90; alt += 15) {
            ctx.beginPath();
            for (let az = 0; az <= 360; az += 5) {
                const pos = Renderer.altAzToScreen(alt, az);
                az === 0 ? ctx.moveTo(pos.x, pos.y) : ctx.lineTo(pos.x, pos.y);
            }
            ctx.stroke();
            if (alt > 0 && alt < 90) {
                const labelPos = Renderer.altAzToScreen(alt, SkyMap.view.azimuth);
                if (labelPos.visible) {
                    ctx.fillStyle = C().grid.replace('0.15', '0.35');
                    ctx.font = '10px "Outfit", sans-serif';
                    ctx.fillText(`${alt}°`, labelPos.x + 4, labelPos.y - 4);
                }
            }
        }
        for (let az = 0; az < 360; az += 30) {
            ctx.beginPath();
            for (let alt = 0; alt <= 90; alt += 5) {
                const pos = Renderer.altAzToScreen(alt, az);
                alt === 0 ? ctx.moveTo(pos.x, pos.y) : ctx.lineTo(pos.x, pos.y);
            }
            ctx.stroke();
        }
        ctx.restore();
    },

    drawStars: () => {
        if (!SkyMap.options.showStars) return;
        const ctx = SkyMap.ctx;
        const { date, latitude: lat, longitude: lon } = SkyMap.observer;
        const nm = SkyMap.options.nightMode;
        const starScale = SkyMap.options.starScale;
        const now = Date.now() * 0.001;

        STARS.forEach(star => {
            const [name, ra, dec, mag, spectral] = star;
            if (mag > SkyMap.options.limitingMagnitude) return;
            const altAz = Astro.raDecToAltAz(ra, dec, date, lat, lon);
            if (altAz.altitude < -5) return;
            const pos = Renderer.altAzToScreen(altAz.altitude, altAz.azimuth);
            if (!pos.visible) return;

            // Atmospheric dimming near horizon
            const atmFactor = altAz.altitude < 15 ? 0.4 + 0.6 * (altAz.altitude / 15) : 1.0;

            // Enhanced magnitude scaling
            const baseSize = Math.max(0.3, (6.5 - mag) * 0.9) * starScale;
            const size = baseSize * atmFactor;
            const color = spectralColor(spectral, nm);
            const { r, g, b } = hexToRgb(color);

            ctx.save();
            ctx.globalAlpha = Math.min(1, (0.3 + (6 - mag) * 0.14)) * atmFactor;

            // Outer halo for bright stars (mag < 2.0)
            if (mag < 2.0) {
                const haloR = size * (mag < 0.5 ? 8 : mag < 1.0 ? 6 : 4.5);
                const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, haloR);
                halo.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
                halo.addColorStop(0.3, `rgba(${r},${g},${b},0.10)`);
                halo.addColorStop(0.7, `rgba(${r},${g},${b},0.03)`);
                halo.addColorStop(1, 'transparent');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, haloR, 0, Math.PI * 2);
                ctx.fill();
            }

            // 4-point diffraction spikes for very bright stars (mag < 0.5)
            if (mag < 0.5 && !nm) {
                const spikeLen = size * (mag < -0.5 ? 18 : 12);
                ctx.strokeStyle = `rgba(${r},${g},${b},0.15)`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(pos.x - spikeLen, pos.y);
                ctx.lineTo(pos.x + spikeLen, pos.y);
                ctx.moveTo(pos.x, pos.y - spikeLen);
                ctx.lineTo(pos.x, pos.y + spikeLen);
                ctx.stroke();
            }

            // Inner glow
            if (mag < 2.5) {
                const innerR = size * 2.5;
                const inner = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, innerR);
                inner.addColorStop(0, `rgba(${r},${g},${b},0.6)`);
                inner.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
                inner.addColorStop(1, 'transparent');
                ctx.fillStyle = inner;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, innerR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Star core
            ctx.globalAlpha = Math.min(1, 0.5 + (6 - mag) * 0.1) * atmFactor;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Bright white center for mag < 1
            if (mag < 1.0) {
                ctx.fillStyle = nm ? '#ffcccc' : '#ffffff';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Label for bright stars
            if (mag < 1.8 && SkyMap.view.fov < 90) {
                ctx.globalAlpha = 0.75 * atmFactor;
                ctx.font = `${mag < 0.5 ? '12' : '11'}px "Outfit", sans-serif`;
                ctx.fillStyle = C().constellationName;
                ctx.textAlign = 'left';
                ctx.fillText(name, pos.x + size + 5, pos.y + 3);
            }

            ctx.restore();

            // Store screen position for click detection
            star._screenX = pos.x;
            star._screenY = pos.y;
            star._screenR = Math.max(size * 3, 8);
        });
    },

    drawConstellations: () => {
        if (!SkyMap.options.showConstellationLines && !SkyMap.options.showConstellationNames) return;
        const ctx = SkyMap.ctx;
        const { date, latitude: lat, longitude: lon } = SkyMap.observer;
        const c = C();

        const starMap = new Map();
        STARS.forEach(s => starMap.set(s[0], { ra: s[1], dec: s[2] }));

        CONSTELLATIONS.forEach(constellation => {
            if (SkyMap.options.showConstellationLines) {
                ctx.save();
                ctx.lineWidth = 0.6;
                ctx.lineCap = 'round';

                constellation.lines.forEach(line => {
                    const s1 = starMap.get(line[0]), s2 = starMap.get(line[1]);
                    if (!s1 || !s2) return;
                    const a1 = Astro.raDecToAltAz(s1.ra, s1.dec, date, lat, lon);
                    const a2 = Astro.raDecToAltAz(s2.ra, s2.dec, date, lat, lon);
                    if (a1.altitude < 0 && a2.altitude < 0) return;
                    const p1 = Renderer.altAzToScreen(a1.altitude, a1.azimuth);
                    const p2 = Renderer.altAzToScreen(a2.altitude, a2.azimuth);
                    if (!p1.visible && !p2.visible) return;

                    // Gradient line
                    const lineGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                    lineGrad.addColorStop(0, c.constellationLine.replace('0.25', '0.18'));
                    lineGrad.addColorStop(0.5, c.constellationLine);
                    lineGrad.addColorStop(1, c.constellationLine.replace('0.25', '0.18'));
                    ctx.strokeStyle = lineGrad;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                });
                ctx.restore();
            }

            if (SkyMap.options.showConstellationNames && SkyMap.view.fov < 100) {
                const cAltAz = Astro.raDecToAltAz(constellation.center[0], constellation.center[1], date, lat, lon);
                if (cAltAz.altitude > 0) {
                    const pos = Renderer.altAzToScreen(cAltAz.altitude, cAltAz.azimuth);
                    if (pos.visible) {
                        ctx.save();
                        ctx.font = '12px "Outfit", sans-serif';
                        ctx.fillStyle = c.constellationName;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.letterSpacing = '1px';
                        ctx.fillText(constellation.name, pos.x, pos.y);
                        ctx.restore();
                    }
                }
            }
        });
    },

    drawPlanets: () => {
        if (!SkyMap.options.showPlanets) return;
        const ctx = SkyMap.ctx;
        const { date, latitude: lat, longitude: lon } = SkyMap.observer;
        const nm = SkyMap.options.nightMode;

        // Sun
        const sunPos = Astro.getSunPosition(date);
        const sunAltAz = Astro.raDecToAltAz(sunPos.ra, sunPos.dec, date, lat, lon);
        if (sunAltAz.altitude > -10) {
            const pos = Renderer.altAzToScreen(sunAltAz.altitude, sunAltAz.azimuth);
            if (pos.visible) {
                ctx.save();
                const outerGlow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 30);
                outerGlow.addColorStop(0, nm ? 'rgba(200,60,0,0.4)' : 'rgba(255,255,150,0.5)');
                outerGlow.addColorStop(0.4, nm ? 'rgba(180,40,0,0.15)' : 'rgba(255,220,80,0.15)');
                outerGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = outerGlow;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = nm ? '#cc4400' : '#ffee44';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = nm ? '#ff6600' : '#ffffaa';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = 'bold 11px "Outfit", sans-serif';
                ctx.fillStyle = nm ? '#cc6633' : '#ffdd00';
                ctx.textAlign = 'center';
                ctx.fillText('☉ Sun', pos.x, pos.y + 20);
                ctx.restore();
            }
        }

        // Moon
        const moonPos = Astro.getMoonPosition(date);
        const moonAltAz = Astro.raDecToAltAz(moonPos.ra, moonPos.dec, date, lat, lon);
        if (moonAltAz.altitude > -5) {
            const pos = Renderer.altAzToScreen(moonAltAz.altitude, moonAltAz.azimuth);
            if (pos.visible) {
                ctx.save();
                const phase = Astro.getMoonPhase(date);

                // Outer glow
                const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 20);
                glow.addColorStop(0, nm ? 'rgba(150,60,40,0.3)' : 'rgba(255,255,240,0.35)');
                glow.addColorStop(0.5, nm ? 'rgba(120,40,30,0.1)' : 'rgba(230,230,210,0.1)');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
                ctx.fill();

                // Moon disc
                ctx.fillStyle = nm ? '#aa6644' : '#f0edd8';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
                ctx.fill();

                // Phase shadow
                if (phase > 0.02 && phase < 0.98) {
                    ctx.fillStyle = nm ? 'rgba(10,2,0,0.6)' : 'rgba(10,15,30,0.6)';
                    ctx.beginPath();
                    const shadowDir = phase < 0.5 ? 1 : -1;
                    const illumination = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
                    ctx.arc(pos.x + shadowDir * 3 * (1 - illumination), pos.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.font = 'bold 11px "Outfit", sans-serif';
                ctx.fillStyle = nm ? '#aa7755' : '#ddddaa';
                ctx.textAlign = 'center';
                ctx.fillText('☽ Moon', pos.x, pos.y + 18);
                ctx.restore();
            }
        }

        // Planets
        PLANETS.forEach(planet => {
            const pos2d = Astro.getPlanetPosition(planet, date);
            const altAz = Astro.raDecToAltAz(pos2d.ra, pos2d.dec, date, lat, lon);
            if (altAz.altitude < -5) return;
            const pos = Renderer.altAzToScreen(altAz.altitude, altAz.azimuth);
            if (!pos.visible) return;

            const pColor = nm ? '#ff8866' : planet.color;
            const { r, g, b } = hexToRgb(pColor);

            ctx.save();

            // Outer glow
            const glowR = planet.size * 4;
            const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
            glow.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
            glow.addColorStop(0.4, `rgba(${r},${g},${b},0.10)`);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Planet disc
            ctx.fillStyle = pColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, planet.size, 0, Math.PI * 2);
            ctx.fill();

            // Bright center
            ctx.fillStyle = `rgba(255,255,255,0.4)`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, planet.size * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // Saturn's rings
            if (planet.name === 'Saturn') {
                ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y, planet.size * 2.2, planet.size * 0.6, -0.3, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Jupiter's bands
            if (planet.name === 'Jupiter' && SkyMap.view.fov < 40) {
                ctx.strokeStyle = `rgba(${r * 0.7},${g * 0.6},${b * 0.5},0.3)`;
                ctx.lineWidth = 0.5;
                for (let dy of [-2, 2]) {
                    ctx.beginPath();
                    ctx.moveTo(pos.x - planet.size * 0.8, pos.y + dy);
                    ctx.lineTo(pos.x + planet.size * 0.8, pos.y + dy);
                    ctx.stroke();
                }
            }

            // Mars reddish tint overlay
            if (planet.name === 'Mars') {
                const marsGlow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, planet.size * 2);
                marsGlow.addColorStop(0, 'rgba(255,80,60,0.15)');
                marsGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = marsGlow;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, planet.size * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Label
            ctx.font = '11px "Outfit", sans-serif';
            ctx.fillStyle = pColor;
            ctx.textAlign = 'center';
            ctx.fillText(`${planet.symbol} ${planet.name}`, pos.x, pos.y + planet.size + 14);

            ctx.restore();

            // Store for click detection
            planet._screenX = pos.x;
            planet._screenY = pos.y;
            planet._screenR = Math.max(planet.size * 3, 12);
        });
    },

    drawDSOs: () => {
        if (!SkyMap.options.showDSOs) return;
        const ctx = SkyMap.ctx;
        const { date, latitude: lat, longitude: lon } = SkyMap.observer;
        const nm = SkyMap.options.nightMode;

        DSOs.forEach(dso => {
            const [name, ra, dec, mag, type, common, arcmin] = dso;
            if (mag > SkyMap.options.limitingMagnitude + 1.5) return;
            const altAz = Astro.raDecToAltAz(ra, dec, date, lat, lon);
            if (altAz.altitude < 0) return;
            const pos = Renderer.altAzToScreen(altAz.altitude, altAz.azimuth);
            if (!pos.visible) return;

            const scale = Math.min(SkyMap.canvas.width, SkyMap.canvas.height) / SkyMap.view.fov;
            const angularSize = Math.max(arcmin / 60, 0.3);
            const r = Math.max(angularSize * scale * 0.5, 4);

            ctx.save();
            ctx.globalAlpha = Math.max(0.3, Math.min(0.8, (8 - mag) * 0.12));

            if (type === 'galaxy') {
                const gGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
                gGrad.addColorStop(0, nm ? 'rgba(200,80,60,0.5)' : 'rgba(255,230,180,0.5)');
                gGrad.addColorStop(0.3, nm ? 'rgba(160,50,40,0.2)' : 'rgba(220,200,160,0.2)');
                gGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = gGrad;
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y, r, r * 0.5, Math.PI * 0.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'nebula') {
                const nGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
                nGrad.addColorStop(0, nm ? 'rgba(200,60,80,0.5)' : 'rgba(180,120,200,0.5)');
                nGrad.addColorStop(0.3, nm ? 'rgba(160,40,60,0.2)' : 'rgba(120,180,200,0.2)');
                nGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = nGrad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Open/globular cluster — dotted circle
                ctx.strokeStyle = nm ? 'rgba(200,80,60,0.4)' : 'rgba(200,220,255,0.4)';
                ctx.lineWidth = 0.8;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Few dots inside
                const dotCount = Math.min(6, Math.max(3, Math.floor(r / 2)));
                for (let i = 0; i < dotCount; i++) {
                    const angle = (Math.PI * 2 * i) / dotCount + 0.3;
                    const dist = r * 0.5 * (0.4 + Math.random() * 0.5);
                    ctx.fillStyle = nm ? 'rgba(200,80,60,0.5)' : 'rgba(200,220,255,0.5)';
                    ctx.beginPath();
                    ctx.arc(pos.x + Math.cos(angle) * dist, pos.y + Math.sin(angle) * dist, 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Label
            if (SkyMap.view.fov < 70 && mag < 7) {
                ctx.globalAlpha = 0.6;
                ctx.font = '10px "Outfit", sans-serif';
                ctx.fillStyle = nm ? 'rgba(200,100,80,0.7)' : 'rgba(180,200,240,0.7)';
                ctx.textAlign = 'left';
                const label = common || name;
                ctx.fillText(label, pos.x + r + 4, pos.y + 3);
            }

            ctx.restore();

            dso._screenX = pos.x;
            dso._screenY = pos.y;
            dso._screenR = Math.max(r, 8);
        });
    },

    drawOverlay: () => {
        const ctx = SkyMap.ctx;
        const canvas = SkyMap.canvas;
        const c = C();

        ctx.save();
        ctx.font = '12px "Outfit", sans-serif';
        ctx.fillStyle = SkyMap.options.nightMode ? 'rgba(200,100,80,0.8)' : 'rgba(150, 180, 255, 0.8)';
        ctx.textAlign = 'left';

        const date = SkyMap.observer.date;
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const lines = [
            `📍 ${SkyMap.observer.latitude.toFixed(2)}°, ${SkyMap.observer.longitude.toFixed(2)}°`,
            `🕐 ${timeStr} • ${dateStr}`,
            `🔭 FOV: ${SkyMap.view.fov.toFixed(0)}° • Looking: ${getDirectionName(SkyMap.view.azimuth)}`
        ];
        lines.forEach((line, i) => ctx.fillText(line, 15, 25 + i * 18));

        ctx.fillStyle = SkyMap.options.nightMode ? 'rgba(200,100,80,0.4)' : 'rgba(150, 180, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText('Drag to pan • Scroll to zoom', canvas.width - 15, canvas.height - 15);
        ctx.restore();
    },

    drawSelectedObject: () => {
        if (!SkyMap.selectedObject) return;
        const ctx = SkyMap.ctx;
        const canvas = SkyMap.canvas;
        const obj = SkyMap.selectedObject;
        const nm = SkyMap.options.nightMode;

        // Selection ring on the object
        if (obj._screenX !== undefined) {
            ctx.save();
            ctx.strokeStyle = nm ? '#ff6644' : '#7dd3fc';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(obj._screenX, obj._screenY, (obj._screenR || 10) + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Info panel (bottom-left)
        const panelW = 280, panelH = obj.lines ? obj.lines.length * 18 + 50 : 140;
        const px = 12, py = canvas.height - panelH - 30;

        ctx.save();
        ctx.fillStyle = nm ? 'rgba(30,8,5,0.92)' : 'rgba(10,15,35,0.92)';
        ctx.strokeStyle = nm ? 'rgba(200,80,60,0.4)' : 'rgba(100,150,255,0.4)';
        ctx.lineWidth = 1;

        // Rounded rect
        const rr = 10;
        ctx.beginPath();
        ctx.moveTo(px + rr, py);
        ctx.lineTo(px + panelW - rr, py);
        ctx.quadraticCurveTo(px + panelW, py, px + panelW, py + rr);
        ctx.lineTo(px + panelW, py + panelH - rr);
        ctx.quadraticCurveTo(px + panelW, py + panelH, px + panelW - rr, py + panelH);
        ctx.lineTo(px + rr, py + panelH);
        ctx.quadraticCurveTo(px, py + panelH, px, py + panelH - rr);
        ctx.lineTo(px, py + rr);
        ctx.quadraticCurveTo(px, py, px + rr, py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Title
        ctx.font = 'bold 14px "Outfit", sans-serif';
        ctx.fillStyle = nm ? '#ff9977' : '#e0eaff';
        ctx.textAlign = 'left';
        ctx.fillText(obj.title, px + 14, py + 24);

        // Details
        ctx.font = '11px "Outfit", sans-serif';
        ctx.fillStyle = nm ? '#cc8866' : '#a0b8e0';
        let ly = py + 46;
        if (obj.details) {
            obj.details.forEach(d => {
                ctx.fillText(d, px + 14, ly);
                ly += 18;
            });
        }

        ctx.restore();
    },

    drawSearchHighlights: () => {
        if (!SkyMap.searchQuery || SkyMap.searchResults.length === 0) return;
        const ctx = SkyMap.ctx;
        const nm = SkyMap.options.nightMode;

        SkyMap.searchResults.forEach(res => {
            if (res._screenX === undefined) return;
            ctx.save();
            ctx.strokeStyle = nm ? '#ff8844' : '#4ade80';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(res._screenX, res._screenY, (res._screenR || 10) + 8, 0, Math.PI * 2);
            ctx.stroke();

            // Pulsing ring
            const t = (Date.now() % 2000) / 2000;
            ctx.globalAlpha = 0.5 * (1 - t);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(res._screenX, res._screenY, (res._screenR || 10) + 8 + t * 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    },

    render: () => {
        if (!SkyMap.canvas || !SkyMap.ctx) return;
        Renderer.drawBackground();
        Renderer.drawGrid();
        Renderer.drawConstellations();
        Renderer.drawDSOs();
        Renderer.drawStars();
        Renderer.drawPlanets();
        Renderer.drawHorizon();
        Renderer.drawOverlay();
        Renderer.drawSelectedObject();
        Renderer.drawSearchHighlights();
    }
};

// ============================================
// HELPERS
// ============================================

function getDirectionName(azimuth) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(Astro.normalize360(azimuth) / 22.5) % 16];
}

// ============================================
// CLICK / TAP DETECTION
// ============================================

function handleSkyClick(clientX, clientY) {
    const rect = SkyMap.canvas.getBoundingClientRect();
    const mx = (clientX - rect.left) * (SkyMap.canvas.width / rect.width);
    const my = (clientY - rect.top) * (SkyMap.canvas.height / rect.height);

    let closest = null, closestDist = Infinity;

    // Check planets first (larger targets)
    PLANETS.forEach(p => {
        if (p._screenX === undefined) return;
        const d = Math.hypot(mx - p._screenX, my - p._screenY);
        if (d < (p._screenR || 12) + 5 && d < closestDist) {
            closestDist = d;
            const pos2d = Astro.getPlanetPosition(p, SkyMap.observer.date);
            const altAz = Astro.raDecToAltAz(pos2d.ra, pos2d.dec, SkyMap.observer.date, SkyMap.observer.latitude, SkyMap.observer.longitude);
            closest = {
                title: `${p.symbol} ${p.name}`,
                _screenX: p._screenX, _screenY: p._screenY, _screenR: p._screenR,
                details: [
                    `Type: Planet`,
                    `RA: ${pos2d.ra.toFixed(2)}h  Dec: ${pos2d.dec.toFixed(1)}°`,
                    `Alt: ${altAz.altitude.toFixed(1)}°  Az: ${altAz.azimuth.toFixed(1)}°`,
                    `Orbital period: ${p.name === 'Mercury' ? '88d' : p.name === 'Venus' ? '225d' : p.name === 'Mars' ? '687d' : p.name === 'Jupiter' ? '12y' : '29y'}`
                ]
            };
        }
    });

    // Check stars
    STARS.forEach(s => {
        if (s._screenX === undefined) return;
        const d = Math.hypot(mx - s._screenX, my - s._screenY);
        if (d < (s._screenR || 8) + 5 && d < closestDist) {
            closestDist = d;
            const altAz = Astro.raDecToAltAz(s[1], s[2], SkyMap.observer.date, SkyMap.observer.latitude, SkyMap.observer.longitude);
            closest = {
                title: s[0],
                _screenX: s._screenX, _screenY: s._screenY, _screenR: s._screenR,
                details: [
                    `Type: Star (${s[4]}-class)`,
                    `Magnitude: ${s[3].toFixed(2)}`,
                    `RA: ${s[1].toFixed(3)}h  Dec: ${s[2].toFixed(2)}°`,
                    `Alt: ${altAz.altitude.toFixed(1)}°  Az: ${altAz.azimuth.toFixed(1)}°`
                ]
            };
        }
    });

    // Check DSOs
    DSOs.forEach(dso => {
        if (dso._screenX === undefined) return;
        const d = Math.hypot(mx - dso._screenX, my - dso._screenY);
        if (d < (dso._screenR || 8) + 5 && d < closestDist) {
            closestDist = d;
            const altAz = Astro.raDecToAltAz(dso[1], dso[2], SkyMap.observer.date, SkyMap.observer.latitude, SkyMap.observer.longitude);
            closest = {
                title: dso[5] ? `${dso[0]} — ${dso[5]}` : dso[0],
                _screenX: dso._screenX, _screenY: dso._screenY, _screenR: dso._screenR,
                details: [
                    `Type: ${dso[4].charAt(0).toUpperCase() + dso[4].slice(1)}`,
                    `Magnitude: ${dso[3].toFixed(1)}`,
                    `Angular size: ${dso[6]}′`,
                    `RA: ${dso[1].toFixed(3)}h  Dec: ${dso[2].toFixed(2)}°`,
                    `Alt: ${altAz.altitude.toFixed(1)}°  Az: ${altAz.azimuth.toFixed(1)}°`
                ]
            };
        }
    });

    SkyMap.selectedObject = closest;
    updateDetailPanel(closest);
    Renderer.render();
}

function updateDetailPanel(obj) {
    const panel = document.getElementById('sky-detail-panel');
    if (!panel) return;
    if (!obj) {
        panel.classList.remove('active');
        return;
    }
    panel.classList.add('active');
    const title = panel.querySelector('.sky-detail-title');
    const body = panel.querySelector('.sky-detail-body');
    if (title) title.textContent = obj.title;
    if (body && obj.details) body.innerHTML = obj.details.map(d => `<div class="sky-detail-row">${d}</div>`).join('');
}

// ============================================
// SEARCH
// ============================================

function searchSkyObjects(query) {
    SkyMap.searchQuery = query;
    if (!query || query.length < 2) {
        SkyMap.searchResults = [];
        return;
    }
    const q = query.toLowerCase();
    const results = [];

    STARS.forEach(s => { if (s[0].toLowerCase().includes(q)) results.push(s); });
    PLANETS.forEach(p => { if (p.name.toLowerCase().includes(q)) results.push(p); });
    DSOs.forEach(d => { if (d[0].toLowerCase().includes(q) || (d[5] && d[5].toLowerCase().includes(q))) results.push(d); });
    CONSTELLATIONS.forEach(c => { if (c.name.toLowerCase().includes(q)) results.push(c); });

    SkyMap.searchResults = results;

    // Pan to first result if found
    if (results.length > 0) {
        const r = results[0];
        let ra, dec;
        if (Array.isArray(r) && r.length === 5) { ra = r[1]; dec = r[2]; }
        else if (Array.isArray(r) && r.length === 7) { ra = r[1]; dec = r[2]; }
        else if (r.center) { ra = r.center[0]; dec = r.center[1]; }
        else if (r.name && r.a) {
            const pos = Astro.getPlanetPosition(r, SkyMap.observer.date);
            ra = pos.ra; dec = pos.dec;
        }
        if (ra !== undefined) {
            const altAz = Astro.raDecToAltAz(ra, dec, SkyMap.observer.date, SkyMap.observer.latitude, SkyMap.observer.longitude);
            SkyMap.view.azimuth = altAz.azimuth;
            SkyMap.view.altitude = Math.max(5, altAz.altitude);
        }
    }
    Renderer.render();
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupSkyMapEventListeners() {
    const canvas = SkyMap.canvas;
    if (!canvas) return;

    let clickStartX = 0, clickStartY = 0, clickStartTime = 0;

    canvas.addEventListener('mousedown', (e) => {
        SkyMap.view.isDragging = true;
        SkyMap.view.lastX = e.clientX;
        SkyMap.view.lastY = e.clientY;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
        clickStartTime = Date.now();
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!SkyMap.view.isDragging) return;
        const dx = e.clientX - SkyMap.view.lastX;
        const dy = e.clientY - SkyMap.view.lastY;
        const sensitivity = SkyMap.view.fov / Math.min(canvas.width, canvas.height);
        SkyMap.view.azimuth -= dx * sensitivity;
        SkyMap.view.altitude += dy * sensitivity;
        SkyMap.view.altitude = Math.max(-10, Math.min(90, SkyMap.view.altitude));
        SkyMap.view.azimuth = Astro.normalize360(SkyMap.view.azimuth);
        SkyMap.view.lastX = e.clientX;
        SkyMap.view.lastY = e.clientY;
        Renderer.render();
    });

    canvas.addEventListener('mouseup', (e) => {
        SkyMap.view.isDragging = false;
        canvas.style.cursor = 'grab';
        const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
        const elapsed = Date.now() - clickStartTime;
        if (dist < 5 && elapsed < 300) handleSkyClick(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseleave', () => {
        SkyMap.view.isDragging = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        SkyMap.view.fov = Math.max(SkyMap.view.minFov, Math.min(SkyMap.view.maxFov, SkyMap.view.fov * zoomFactor));
        Renderer.render();
    }, { passive: false });

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            SkyMap.view.isDragging = true;
            SkyMap.view.lastX = e.touches[0].clientX;
            SkyMap.view.lastY = e.touches[0].clientY;
            clickStartX = e.touches[0].clientX;
            clickStartY = e.touches[0].clientY;
            clickStartTime = Date.now();
        } else if (e.touches.length === 2) {
            SkyMap.view.touchStartDist = getTouchDistance(e.touches);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && SkyMap.view.isDragging) {
            const dx = e.touches[0].clientX - SkyMap.view.lastX;
            const dy = e.touches[0].clientY - SkyMap.view.lastY;
            const sensitivity = SkyMap.view.fov / Math.min(canvas.width, canvas.height);
            SkyMap.view.azimuth -= dx * sensitivity;
            SkyMap.view.altitude += dy * sensitivity;
            SkyMap.view.altitude = Math.max(-10, Math.min(90, SkyMap.view.altitude));
            SkyMap.view.azimuth = Astro.normalize360(SkyMap.view.azimuth);
            SkyMap.view.lastX = e.touches[0].clientX;
            SkyMap.view.lastY = e.touches[0].clientY;
            Renderer.render();
        } else if (e.touches.length === 2) {
            const dist = getTouchDistance(e.touches);
            const scale = SkyMap.view.touchStartDist / dist;
            SkyMap.view.fov = Math.max(SkyMap.view.minFov, Math.min(SkyMap.view.maxFov, SkyMap.view.fov * scale));
            SkyMap.view.touchStartDist = dist;
            Renderer.render();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
            const t = e.changedTouches[0];
            const dist = Math.hypot(t.clientX - clickStartX, t.clientY - clickStartY);
            const elapsed = Date.now() - clickStartTime;
            if (dist < 10 && elapsed < 400) handleSkyClick(t.clientX, t.clientY);
        }
        SkyMap.view.isDragging = false;
    });

    window.addEventListener('resize', () => { resizeCanvas(); Renderer.render(); });
}

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// ============================================
// INITIALIZATION & PUBLIC API
// ============================================

function resizeCanvas() {
    const container = SkyMap.canvas.parentElement;
    if (!container) return;
    SkyMap.canvas.width = container.clientWidth || 800;
    SkyMap.canvas.height = container.clientHeight || 500;
}

function initSkyMap() {
    console.log('Initializing AstroCalTT Sky Map v5.0');
    SkyMap.canvas = document.getElementById('skyCanvas');
    if (!SkyMap.canvas) { console.error('Sky canvas not found'); return false; }
    SkyMap.ctx = SkyMap.canvas.getContext('2d');
    if (!SkyMap.ctx) { console.error('Could not get canvas 2D context'); return false; }
    if (window.userLocation) {
        SkyMap.observer.latitude = window.userLocation.lat;
        SkyMap.observer.longitude = window.userLocation.lon;
    }
    resizeCanvas();
    setupSkyMapEventListeners();
    SkyMap.initialized = true;
    window.skyMapInitialized = true;
    startAnimation();
    console.log('Sky map v5.0 initialized');
    return true;
}

let lastAnimationTime = 0;
const MIN_FRAME_INTERVAL = 1000 / 30;

function startAnimation() {
    function animate(currentTime) {
        const elapsed = currentTime - lastAnimationTime;
        if (elapsed >= MIN_FRAME_INTERVAL) {
            lastAnimationTime = currentTime;
            if (SkyMap.observer.timeSpeed !== 0) {
                const now = new Date();
                if (SkyMap.observer.timeSpeed === 1) {
                    SkyMap.observer.date = now;
                } else {
                    const timeStep = (elapsed / 1000) * SkyMap.observer.timeSpeed * 1000;
                    SkyMap.observer.date = new Date(SkyMap.observer.date.getTime() + timeStep);
                }
            }
            updateClockDisplay();
            Renderer.render();
        }
        SkyMap.animationId = requestAnimationFrame(animate);
    }
    animate(0);
}

function stopAnimation() {
    if (SkyMap.animationId) { cancelAnimationFrame(SkyMap.animationId); SkyMap.animationId = null; }
}

// Public API
window.SkyMap = SkyMap;
window.initSkyMap = initSkyMap;
window.skyMapInitialized = false;

window.forceSkyMapRender = function() {
    if (!SkyMap.initialized) initSkyMap();
    else { resizeCanvas(); Renderer.render(); }
};

window.setSkyMapLocation = function(lat, lon) {
    SkyMap.observer.latitude = lat;
    SkyMap.observer.longitude = lon;
    Renderer.render();
};

window.setSkyMapTime = function(date) { SkyMap.observer.date = date; Renderer.render(); };
window.setSkyMapTimeSpeed = function(speed) { SkyMap.observer.timeSpeed = speed; };

window.toggleSkyMapOption = function(option) {
    if (SkyMap.options.hasOwnProperty(option)) {
        SkyMap.options[option] = !SkyMap.options[option];
        Renderer.render();
        return SkyMap.options[option];
    }
    return null;
};

window.lookAt = function(azimuth, altitude) {
    SkyMap.view.azimuth = azimuth;
    SkyMap.view.altitude = altitude || 45;
    Renderer.render();
};

window.searchSkyObjects = searchSkyObjects;

// ============================================
// UI CONTROL HANDLERS
// ============================================

let controlsInitialized = false;

function setupUIControls() {
    if (controlsInitialized) return;

    // Location button
    const locationBtn = document.getElementById('sky-use-location');
    if (locationBtn) {
        locationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (navigator.geolocation) {
                locationBtn.innerHTML = '<span>⏳</span> Locating...';
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        SkyMap.observer.latitude = pos.coords.latitude;
                        SkyMap.observer.longitude = pos.coords.longitude;
                        locationBtn.innerHTML = '<span>📍</span> My Location';
                        Renderer.render();
                    },
                    () => {
                        locationBtn.innerHTML = '<span>📍</span> My Location';
                        alert('Could not get your location. Using default.');
                    }
                );
            }
        });
    }

    // Reset view
    const resetBtn = document.getElementById('sky-reset-view');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            SkyMap.view.azimuth = 180;
            SkyMap.view.altitude = 45;
            SkyMap.view.fov = 60;
            SkyMap.observer.date = new Date();
            SkyMap.observer.timeSpeed = 1;
            SkyMap.selectedObject = null;
            updateDetailPanel(null);
            updateTimeSpeedIndicator();
            Renderer.render();
        });
    }

    // Direction buttons
    document.querySelectorAll('.sky-dir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            SkyMap.view.azimuth = parseFloat(btn.dataset.az);
            SkyMap.view.altitude = parseFloat(btn.dataset.alt);
            Renderer.render();
        });
    });

    // Display toggles
    const toggles = {
        'sky-show-constellations': 'showConstellationLines',
        'sky-show-constellation-names': 'showConstellationNames',
        'sky-show-planets': 'showPlanets',
        'sky-show-grid': 'showGrid',
        'sky-show-dsos': 'showDSOs'
    };
    Object.entries(toggles).forEach(([id, option]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = SkyMap.options[option];
            checkbox.addEventListener('change', () => {
                SkyMap.options[option] = checkbox.checked;
                Renderer.render();
            });
        }
    });

    // Night mode toggle
    const nightBtn = document.getElementById('sky-night-mode');
    if (nightBtn) {
        nightBtn.addEventListener('click', (e) => {
            e.preventDefault();
            SkyMap.options.nightMode = !SkyMap.options.nightMode;
            nightBtn.classList.toggle('active', SkyMap.options.nightMode);
            document.querySelector('.sky-map-container')?.classList.toggle('night-mode', SkyMap.options.nightMode);
            Renderer.render();
        });
    }

    // Time controls
    const timeSlower = document.getElementById('sky-time-slower');
    const timeNow = document.getElementById('sky-time-now');
    const timeFaster = document.getElementById('sky-time-faster');

    if (timeSlower) {
        timeSlower.addEventListener('click', (e) => {
            e.preventDefault();
            if (SkyMap.observer.timeSpeed === 1) SkyMap.observer.timeSpeed = 0;
            else if (SkyMap.observer.timeSpeed === 0) SkyMap.observer.timeSpeed = -60;
            else if (SkyMap.observer.timeSpeed > 0) SkyMap.observer.timeSpeed = Math.max(1, SkyMap.observer.timeSpeed / 10);
            else SkyMap.observer.timeSpeed *= 10;
            updateTimeSpeedIndicator();
        });
    }
    if (timeNow) {
        timeNow.addEventListener('click', (e) => {
            e.preventDefault();
            SkyMap.observer.date = new Date();
            SkyMap.observer.timeSpeed = 1;
            updateTimeSpeedIndicator();
            updateClockDisplay();
            Renderer.render();
        });
    }
    if (timeFaster) {
        timeFaster.addEventListener('click', (e) => {
            e.preventDefault();
            if (SkyMap.observer.timeSpeed === 0) SkyMap.observer.timeSpeed = 60;
            else if (SkyMap.observer.timeSpeed === 1) SkyMap.observer.timeSpeed = 60;
            else if (SkyMap.observer.timeSpeed > 0) SkyMap.observer.timeSpeed = Math.min(86400, SkyMap.observer.timeSpeed * 10);
            else SkyMap.observer.timeSpeed = Math.min(-1, SkyMap.observer.timeSpeed / 10);
            updateTimeSpeedIndicator();
        });
    }

    // Time slider
    const timeSlider = document.getElementById('sky-time-slider');
    if (timeSlider) {
        timeSlider.addEventListener('input', () => {
            const val = parseInt(timeSlider.value);
            const now = new Date();
            const offset = val * 60 * 1000;
            SkyMap.observer.date = new Date(now.getTime() + offset);
            SkyMap.observer.timeSpeed = 0;
            updateTimeSpeedIndicator();
            updateClockDisplay();
            Renderer.render();
        });
        timeSlider.addEventListener('dblclick', () => {
            timeSlider.value = 0;
            SkyMap.observer.date = new Date();
            SkyMap.observer.timeSpeed = 1;
            updateTimeSpeedIndicator();
            updateClockDisplay();
            Renderer.render();
        });
    }

    // Search input
    const searchInput = document.getElementById('sky-search-input');
    if (searchInput) {
        let debounce = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => searchSkyObjects(searchInput.value.trim()), 250);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchSkyObjects('');
            }
        });
    }

    // Zoom controls
    const zoomIn = document.getElementById('sky-zoom-in');
    const zoomOut = document.getElementById('sky-zoom-out');
    if (zoomIn) zoomIn.addEventListener('click', () => { SkyMap.view.fov = Math.max(SkyMap.view.minFov, SkyMap.view.fov * 0.8); Renderer.render(); });
    if (zoomOut) zoomOut.addEventListener('click', () => { SkyMap.view.fov = Math.min(SkyMap.view.maxFov, SkyMap.view.fov * 1.25); Renderer.render(); });

    controlsInitialized = true;
}

function updateTimeSpeedIndicator() {
    const indicator = document.getElementById('sky-time-speed');
    if (!indicator) return;
    const speed = SkyMap.observer.timeSpeed;
    let text;
    if (speed === 0) text = '⏸';
    else if (speed === 1) text = '1×';
    else if (speed === -1) text = '-1×';
    else if (Math.abs(speed) >= 86400) text = (speed > 0 ? '' : '-') + Math.round(Math.abs(speed) / 86400) + 'd/s';
    else if (Math.abs(speed) >= 3600) text = (speed > 0 ? '' : '-') + Math.round(Math.abs(speed) / 3600) + 'h/s';
    else if (Math.abs(speed) >= 60) text = (speed > 0 ? '' : '-') + Math.round(Math.abs(speed) / 60) + 'm/s';
    else text = speed + '×';
    indicator.textContent = text;
}

let lastClockTime = '', lastClockDate = '', lastClockColor = '';

function updateClockDisplay() {
    const timeEl = document.getElementById('sky-clock-time');
    const dateEl = document.getElementById('sky-clock-date');
    if (!timeEl || !dateEl) return;

    const date = SkyMap.observer.date;
    const timeStr = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}:${date.getSeconds().toString().padStart(2,'0')}`;
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeDiff = Math.abs(date.getTime() - new Date().getTime());
    const colorMode = timeDiff > 60000 ? 'future' : 'present';

    if (timeStr !== lastClockTime) { timeEl.textContent = timeStr; lastClockTime = timeStr; }
    if (dateStr !== lastClockDate) { dateEl.textContent = dateStr; lastClockDate = dateStr; }
    if (colorMode !== lastClockColor) {
        if (colorMode === 'future') {
            timeEl.style.color = SkyMap.options.nightMode ? '#ff8844' : '#fbbf24';
            dateEl.style.color = SkyMap.options.nightMode ? 'rgba(255,136,68,0.7)' : 'rgba(251,191,36,0.7)';
        } else {
            timeEl.style.color = SkyMap.options.nightMode ? '#ff6644' : '#7dd3fc';
            dateEl.style.color = SkyMap.options.nightMode ? 'rgba(255,100,68,0.8)' : 'rgba(150,180,220,0.8)';
        }
        lastClockColor = colorMode;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => { initSkyMap(); setupUIControls(); }, 200));
} else {
    setTimeout(() => { initSkyMap(); setupUIControls(); }, 200);
}
