/**
 * AstroCalTT Interactive Sky Map
 * A Stellarium-inspired interactive planetarium
 * Version: 3.0
 */

// ============================================
// CONFIGURATION & STATE
// ============================================

const SkyMap = {
    canvas: null,
    ctx: null,
    initialized: false,
    animationId: null,
    
    // Observer location and time
    observer: {
        latitude: 10.25,    // Default: Trinidad
        longitude: -61.63,
        date: new Date(),
        timeSpeed: 1        // 1 = real-time, 0 = paused, 60 = 1 min/sec
    },
    
    // View state
    view: {
        azimuth: 180,       // Looking South by default (0=N, 90=E, 180=S, 270=W)
        altitude: 45,       // Looking 45° above horizon
        fov: 60,            // Field of view in degrees
        minFov: 10,
        maxFov: 120,
    isDragging: false,
        lastX: 0,
        lastY: 0,
        touchStartDist: 0
    },
    
    // Display options
    options: {
        showStars: true,
        showConstellationLines: true,
        showConstellationNames: true,
        showPlanets: true,
        showMilkyWay: true,
        showGrid: false,
        showHorizon: true,
        showCardinals: true,
        starScale: 1.0,
        limitingMagnitude: 5.5
    },
    
    // Colors
    colors: {
        background: '#0a0d1a',
        horizon: '#1a2040',
        grid: 'rgba(100, 150, 255, 0.15)',
        constellationLine: 'rgba(100, 180, 255, 0.4)',
        constellationName: 'rgba(150, 200, 255, 0.7)',
        cardinal: '#ffcc00',
        starDefault: '#ffffff',
        milkyWay: 'rgba(200, 220, 255, 0.08)'
    }
};

// ============================================
// STAR CATALOG (Yale Bright Star Catalog subset)
// ============================================

const STARS = [
    // Format: [name, RA (hours), Dec (degrees), magnitude, spectral type]
    // Magnitude 1 and brighter
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
    
    // Magnitude 1-2
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
    
    // Magnitude 2-3 (selected important stars)
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
    ["2.30", 2.30, 0.0, 2.30, "A"], // Placeholder
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
    
    // Additional stars for constellations (mag 2.5-4)
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
    {
        name: "Orion",
        abbr: "Ori",
        lines: [
            ["Betelgeuse", "Bellatrix"],
            ["Bellatrix", "Mintaka"],
            ["Mintaka", "Alnilam"],
            ["Alnilam", "Alnitak"],
            ["Alnitak", "Saiph"],
            ["Saiph", "Rigel"],
            ["Rigel", "Mintaka"],
            ["Betelgeuse", "Alnilam"],
            ["Alnilam", "Rigel"]
        ],
        center: [5.6, 0]
    },
    {
        name: "Ursa Major",
        abbr: "UMa",
        lines: [
            ["Dubhe", "Merak"],
            ["Merak", "Phecda"],
            ["Phecda", "Megrez"],
            ["Megrez", "Alioth"],
            ["Alioth", "Mizar"],
            ["Mizar", "Alkaid"],
            ["Megrez", "Dubhe"]
        ],
        center: [11.5, 55]
    },
    {
        name: "Cassiopeia",
        abbr: "Cas",
        lines: [
            ["Schedar", "Caph"],
            ["Schedar", "Navi"],
            ["Navi", "Ruchbah"],
            ["Ruchbah", "Segin"]
        ],
        center: [1.0, 60]
    },
    {
        name: "Scorpius",
        abbr: "Sco",
        lines: [
            ["Antares", "Dschubba"],
            ["Dschubba", "Acrab"],
            ["Antares", "Larawag"],
            ["Larawag", "Shaula"],
            ["Shaula", "Sargas"]
        ],
        center: [16.9, -30]
    },
    {
        name: "Leo",
        abbr: "Leo",
        lines: [
            ["Regulus", "Denebola"],
            ["Regulus", "Algieba"],
            ["Denebola", "Zosma"]
        ],
        center: [10.5, 15]
    },
    {
        name: "Cygnus",
        abbr: "Cyg",
        lines: [
            ["Deneb", "Sadr"],
            ["Sadr", "Aljanah"],
            ["Sadr", "Gienah"]
        ],
        center: [20.5, 42]
    },
    {
        name: "Lyra",
        abbr: "Lyr",
        lines: [
            ["Vega", "Sulafat"],
            ["Sulafat", "Sheliak"]
        ],
        center: [18.8, 35]
    },
    {
        name: "Aquila",
        abbr: "Aql",
        lines: [
            ["Altair", "Tarazed"],
            ["Altair", "Alshain"]
        ],
        center: [19.8, 5]
    },
    {
        name: "Crux",
        abbr: "Cru",
        lines: [
            ["Acrux", "Gacrux"],
            ["Mimosa", "Delta Crucis"]
        ],
        center: [12.4, -60]
    },
    {
        name: "Centaurus",
        abbr: "Cen",
        lines: [
            ["Alpha Centauri", "Hadar"],
            ["Hadar", "Menkent"]
        ],
        center: [13.5, -50]
    },
    {
        name: "Canis Major",
        abbr: "CMa",
        lines: [
            ["Sirius", "Mirzam"],
            ["Sirius", "Adhara"],
            ["Adhara", "Wezen"],
            ["Wezen", "Aludra"]
        ],
        center: [6.8, -22]
    },
    {
        name: "Gemini",
        abbr: "Gem",
        lines: [
            ["Castor", "Pollux"],
            ["Castor", "Mebsuta"],
            ["Pollux", "Alhena"]
        ],
        center: [7.1, 25]
    },
    {
        name: "Taurus",
        abbr: "Tau",
        lines: [
            ["Aldebaran", "Elnath"],
            ["Aldebaran", "Ain"]
        ],
        center: [4.5, 18]
    },
    {
        name: "Virgo",
        abbr: "Vir",
        lines: [
            ["Spica", "Porrima"],
            ["Porrima", "Vindemiatrix"]
        ],
        center: [13.0, -5]
    },
    {
        name: "Pegasus",
        abbr: "Peg",
        lines: [
            ["Markab", "Scheat"],
            ["Scheat", "Alpheratz"],
            ["Alpheratz", "Algenib"],
            ["Algenib", "Markab"],
            ["Markab", "Enif"]
        ],
        center: [22.5, 20]
    },
    {
        name: "Andromeda",
        abbr: "And",
        lines: [
            ["Alpheratz", "Mirach"],
            ["Mirach", "Almach"]
        ],
        center: [1.0, 38]
    },
    {
        name: "Perseus",
        abbr: "Per",
        lines: [
            ["Mirfak", "Algol"],
            ["Mirfak", "Delta Persei"]
        ],
        center: [3.5, 45]
    },
    {
        name: "Ursa Minor",
        abbr: "UMi",
        lines: [
            ["Polaris", "Kochab"],
            ["Kochab", "Pherkad"]
        ],
        center: [15.0, 78]
    },
    {
        name: "Draco",
        abbr: "Dra",
        lines: [
            ["Eltanin", "Rastaban"],
            ["Rastaban", "Grumium"],
            ["Eltanin", "Thuban"]
        ],
        center: [17.0, 60]
    },
    {
        name: "Boötes",
        abbr: "Boo",
        lines: [
            ["Arcturus", "Izar"],
            ["Arcturus", "Muphrid"],
            ["Izar", "Alphecca"]
        ],
        center: [14.5, 30]
    },
    {
        name: "Corona Borealis",
        abbr: "CrB",
        lines: [
            ["Alphecca", "Nusakan"]
        ],
        center: [15.8, 30]
    }
];

// ============================================
// PLANET DATA (Simplified orbital elements)
// ============================================

const PLANETS = [
    { 
        name: "Mercury", 
        symbol: "☿", 
        color: "#b5a191",
        size: 3,
        // Simplified orbital elements (epoch J2000)
        a: 0.387,    // Semi-major axis (AU)
        e: 0.206,    // Eccentricity
        i: 7.0,      // Inclination (deg)
        L: 252.251,  // Mean longitude (deg)
        w: 77.457,   // Longitude of perihelion (deg)
        O: 48.331,   // Longitude of ascending node (deg)
        n: 4.092     // Mean motion (deg/day)
    },
    { 
        name: "Venus", 
        symbol: "♀", 
        color: "#ffe4b5",
        size: 5,
        a: 0.723, e: 0.007, i: 3.4, L: 181.980, w: 131.563, O: 76.680, n: 1.602
    },
    { 
        name: "Mars", 
        symbol: "♂", 
        color: "#cd5c5c",
        size: 4,
        a: 1.524, e: 0.093, i: 1.8, L: 355.433, w: 336.041, O: 49.558, n: 0.524
    },
    { 
        name: "Jupiter", 
        symbol: "♃", 
        color: "#d4a574",
        size: 8,
        a: 5.203, e: 0.048, i: 1.3, L: 34.351, w: 14.331, O: 100.464, n: 0.083
    },
    { 
        name: "Saturn", 
        symbol: "♄", 
        color: "#f4d59e",
        size: 7,
        a: 9.537, e: 0.054, i: 2.5, L: 50.077, w: 93.057, O: 113.665, n: 0.033
    }
];

// ============================================
// ASTRONOMY CALCULATIONS
// ============================================

const Astro = {
    // Convert degrees to radians
    toRad: (deg) => deg * Math.PI / 180,
    
    // Convert radians to degrees
    toDeg: (rad) => rad * 180 / Math.PI,
    
    // Normalize angle to 0-360
    normalize360: (angle) => {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    },
    
    // Normalize angle to -180 to 180
    normalize180: (angle) => {
        while (angle < -180) angle += 360;
        while (angle > 180) angle -= 360;
        return angle;
    },
    
    // Julian Date from JavaScript Date
    toJulianDate: (date) => {
        return date.getTime() / 86400000 + 2440587.5;
    },
    
    // Days since J2000.0 epoch
    daysSinceJ2000: (date) => {
        return Astro.toJulianDate(date) - 2451545.0;
    },
    
    // Local Sidereal Time (in degrees)
    localSiderealTime: (date, longitude) => {
        const d = Astro.daysSinceJ2000(date);
        const ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        // Greenwich Mean Sidereal Time
        let gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * Math.pow(d / 36525, 2);
        gmst = Astro.normalize360(gmst);
        // Local Sidereal Time
        let lst = gmst + longitude;
        return Astro.normalize360(lst);
    },
    
    // Convert RA/Dec to Altitude/Azimuth
    raDecToAltAz: (ra, dec, date, lat, lon) => {
        const lst = Astro.localSiderealTime(date, lon);
        // Hour angle
        const ha = Astro.normalize180(lst - ra * 15); // RA is in hours, convert to degrees
        
        const haRad = Astro.toRad(ha);
        const decRad = Astro.toRad(dec);
        const latRad = Astro.toRad(lat);
        
        // Altitude
        const sinAlt = Math.sin(decRad) * Math.sin(latRad) + 
                       Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
        const alt = Astro.toDeg(Math.asin(sinAlt));
        
        // Azimuth
        const cosAz = (Math.sin(decRad) - Math.sin(Astro.toRad(alt)) * Math.sin(latRad)) / 
                      (Math.cos(Astro.toRad(alt)) * Math.cos(latRad));
        let az = Astro.toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
        
        if (Math.sin(haRad) > 0) {
            az = 360 - az;
        }
        
        return { altitude: alt, azimuth: az };
    },
    
    // Calculate planet position (simplified)
    getPlanetPosition: (planet, date) => {
        const d = Astro.daysSinceJ2000(date);
        
        // Mean longitude
        let L = Astro.normalize360(planet.L + planet.n * d);
        
        // Mean anomaly
        let M = Astro.normalize360(L - planet.w);
        const MRad = Astro.toRad(M);
        
        // Equation of center (simplified)
        const C = (2 * planet.e - planet.e * planet.e * planet.e / 4) * Math.sin(MRad) +
                  (5/4) * planet.e * planet.e * Math.sin(2 * MRad);
        
        // True longitude
        const lon = Astro.normalize360(L + Astro.toDeg(C));
        
        // Heliocentric distance
        const r = planet.a * (1 - planet.e * planet.e) / (1 + planet.e * Math.cos(Astro.toRad(M + Astro.toDeg(C))));
        
        // Convert to ecliptic coordinates then to RA/Dec (simplified)
        // This is a rough approximation - for accurate positions you'd need proper ephemeris
        const lonRad = Astro.toRad(lon);
        const latRad = Astro.toRad(planet.i * Math.sin(Astro.toRad(lon - planet.O)));
        
        // Obliquity of ecliptic
        const eps = Astro.toRad(23.439);
        
        // Convert to RA/Dec
        const sinDec = Math.sin(latRad) * Math.cos(eps) + Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad);
        const dec = Astro.toDeg(Math.asin(sinDec));
        
        const y = Math.sin(lonRad) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps);
        const x = Math.cos(lonRad);
        let ra = Astro.toDeg(Math.atan2(y, x));
        ra = Astro.normalize360(ra) / 15; // Convert to hours
        
        return { ra, dec };
    },
    
    // Get Moon position (very simplified)
    getMoonPosition: (date) => {
        const d = Astro.daysSinceJ2000(date);
        
        // Simplified moon calculation
        const L = Astro.normalize360(218.316 + 13.176396 * d); // Mean longitude
        const M = Astro.normalize360(134.963 + 13.064993 * d); // Mean anomaly
        const F = Astro.normalize360(93.272 + 13.229350 * d);  // Argument of latitude
        
        const lon = L + 6.289 * Math.sin(Astro.toRad(M));
        const lat = 5.128 * Math.sin(Astro.toRad(F));
        
        const eps = Astro.toRad(23.439);
        const lonRad = Astro.toRad(lon);
        const latRad = Astro.toRad(lat);
        
        const sinDec = Math.sin(latRad) * Math.cos(eps) + Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad);
        const dec = Astro.toDeg(Math.asin(sinDec));
        
        const y = Math.sin(lonRad) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps);
        const x = Math.cos(lonRad);
        let ra = Astro.toDeg(Math.atan2(y, x));
        ra = Astro.normalize360(ra) / 15;
        
        return { ra, dec };
    },
    
    // Get Sun position
    getSunPosition: (date) => {
        const d = Astro.daysSinceJ2000(date);
        
        const g = Astro.normalize360(357.529 + 0.98560028 * d); // Mean anomaly
        const q = Astro.normalize360(280.459 + 0.98564736 * d); // Mean longitude
        
        const L = q + 1.915 * Math.sin(Astro.toRad(g)) + 0.020 * Math.sin(Astro.toRad(2 * g));
        const eps = 23.439 - 0.00000036 * d;
        
        const ra = Astro.toDeg(Math.atan2(Math.cos(Astro.toRad(eps)) * Math.sin(Astro.toRad(L)), Math.cos(Astro.toRad(L))));
        const dec = Astro.toDeg(Math.asin(Math.sin(Astro.toRad(eps)) * Math.sin(Astro.toRad(L))));
        
        return { ra: Astro.normalize360(ra) / 15, dec };
    }
};

// ============================================
// RENDERING
// ============================================

const Renderer = {
    // Convert Alt/Az to screen coordinates
    altAzToScreen: (alt, az) => {
        const canvas = SkyMap.canvas;
        const view = SkyMap.view;
        
        // Calculate angular distance from view center
        const centerAlt = view.altitude;
        const centerAz = view.azimuth;
        
        // Project onto screen using simple stereographic-like projection
        const scale = Math.min(canvas.width, canvas.height) / view.fov;
        
        // Difference in azimuth (handle wrap-around)
        let dAz = Astro.normalize180(az - centerAz);
        let dAlt = alt - centerAlt;
        
        // Apply cosine correction for altitude
        const cosAlt = Math.cos(Astro.toRad(centerAlt));
        dAz *= cosAlt;
        
        const x = canvas.width / 2 + dAz * scale;
        const y = canvas.height / 2 - dAlt * scale; // Invert Y
        
        return { x, y, visible: Math.abs(dAz) < view.fov && Math.abs(dAlt) < view.fov };
    },
    
    // Clear and draw background
    drawBackground: () => {
        const ctx = SkyMap.ctx;
        const canvas = SkyMap.canvas;
        
        // Create gradient from horizon to zenith
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, SkyMap.colors.horizon);
        gradient.addColorStop(0.3, '#0d1225');
        gradient.addColorStop(1, SkyMap.colors.background);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Milky Way band if enabled
        if (SkyMap.options.showMilkyWay) {
            Renderer.drawMilkyWay();
        }
    },
    
    // Draw simplified Milky Way band
    drawMilkyWay: () => {
        const ctx = SkyMap.ctx;
        const date = SkyMap.observer.date;
        const lat = SkyMap.observer.latitude;
        const lon = SkyMap.observer.longitude;
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        // Draw Milky Way as a band across the sky
        // Milky Way roughly follows galactic equator
        const gradient = ctx.createRadialGradient(
            SkyMap.canvas.width / 2, SkyMap.canvas.height / 2, 0,
            SkyMap.canvas.width / 2, SkyMap.canvas.height / 2, SkyMap.canvas.width
        );
        gradient.addColorStop(0, 'rgba(200, 220, 255, 0.1)');
        gradient.addColorStop(0.5, 'rgba(180, 200, 240, 0.05)');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SkyMap.canvas.width, SkyMap.canvas.height);
        
        ctx.restore();
    },
    
    // Draw horizon line and cardinal directions
    drawHorizon: () => {
        if (!SkyMap.options.showHorizon) return;
        
        const ctx = SkyMap.ctx;
        const canvas = SkyMap.canvas;
        
        // Find horizon line position
        const horizonLeft = Renderer.altAzToScreen(0, SkyMap.view.azimuth - SkyMap.view.fov);
        const horizonRight = Renderer.altAzToScreen(0, SkyMap.view.azimuth + SkyMap.view.fov);
        
        if (horizonLeft.y < canvas.height && horizonLeft.y > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(100, 150, 100, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(0, horizonLeft.y);
            ctx.lineTo(canvas.width, horizonLeft.y);
            ctx.stroke();
            ctx.restore();
        }
        
        // Draw cardinal directions
        if (SkyMap.options.showCardinals) {
            const cardinals = [
                { az: 0, label: 'N' },
                { az: 45, label: 'NE' },
                { az: 90, label: 'E' },
                { az: 135, label: 'SE' },
                { az: 180, label: 'S' },
                { az: 225, label: 'SW' },
                { az: 270, label: 'W' },
                { az: 315, label: 'NW' }
            ];
            
            ctx.save();
            ctx.font = 'bold 16px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            cardinals.forEach(card => {
                const pos = Renderer.altAzToScreen(2, card.az);
                if (pos.visible) {
                    // Background glow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillText(card.label, pos.x + 1, pos.y + 1);
                    
                    // Main text
                    ctx.fillStyle = card.label === 'N' ? '#ff6666' : SkyMap.colors.cardinal;
                    ctx.fillText(card.label, pos.x, pos.y);
                }
            });
            
            ctx.restore();
        }
    },
    
    // Draw coordinate grid
    drawGrid: () => {
        if (!SkyMap.options.showGrid) return;
        
        const ctx = SkyMap.ctx;
        ctx.save();
        ctx.strokeStyle = SkyMap.colors.grid;
        ctx.lineWidth = 1;
        
        // Altitude lines
        for (let alt = 0; alt <= 90; alt += 15) {
            ctx.beginPath();
            for (let az = 0; az <= 360; az += 5) {
                const pos = Renderer.altAzToScreen(alt, az);
                if (az === 0) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            }
            ctx.stroke();
        }
        
        // Azimuth lines
        for (let az = 0; az < 360; az += 30) {
            ctx.beginPath();
            for (let alt = 0; alt <= 90; alt += 5) {
                const pos = Renderer.altAzToScreen(alt, az);
                if (alt === 0) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            }
            ctx.stroke();
        }
        
        ctx.restore();
    },
    
    // Draw stars
    drawStars: () => {
        if (!SkyMap.options.showStars) return;
        
        const ctx = SkyMap.ctx;
        const date = SkyMap.observer.date;
        const lat = SkyMap.observer.latitude;
        const lon = SkyMap.observer.longitude;
        
        STARS.forEach(star => {
            const [name, ra, dec, mag, spectral] = star;
            
            if (mag > SkyMap.options.limitingMagnitude) return;
            
            const altAz = Astro.raDecToAltAz(ra, dec, date, lat, lon);
            
            // Only draw if above horizon
            if (altAz.altitude < -5) return;
            
            const pos = Renderer.altAzToScreen(altAz.altitude, altAz.azimuth);
            
            if (!pos.visible) return;
            
            // Star size based on magnitude
            const size = Math.max(0.5, (6 - mag) * 0.8) * SkyMap.options.starScale;
            
            // Star color based on spectral type
            let color = SkyMap.colors.starDefault;
            switch (spectral) {
                case 'O': case 'B': color = '#aaccff'; break;
                case 'A': color = '#ffffff'; break;
                case 'F': color = '#ffffcc'; break;
                case 'G': color = '#ffff99'; break;
                case 'K': color = '#ffcc66'; break;
                case 'M': color = '#ff9966'; break;
            }
            
            // Draw star
            ctx.save();
            
            // Glow for bright stars
            if (mag < 1.5) {
                const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 4);
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.3, color.replace('ff', '88'));
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Star core
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Star label for bright stars
            if (mag < 1.5 && SkyMap.view.fov < 80) {
                ctx.font = '11px "Outfit", sans-serif';
                ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
                ctx.textAlign = 'left';
                ctx.fillText(name, pos.x + size + 4, pos.y + 3);
            }
            
            ctx.restore();
        });
    },
    
    // Draw constellation lines
    drawConstellations: () => {
        if (!SkyMap.options.showConstellationLines && !SkyMap.options.showConstellationNames) return;
        
        const ctx = SkyMap.ctx;
        const date = SkyMap.observer.date;
        const lat = SkyMap.observer.latitude;
        const lon = SkyMap.observer.longitude;
        
        // Create star lookup map
        const starMap = new Map();
        STARS.forEach(star => {
            starMap.set(star[0], { ra: star[1], dec: star[2] });
        });
        
        CONSTELLATIONS.forEach(constellation => {
            // Draw lines
            if (SkyMap.options.showConstellationLines) {
                ctx.save();
                ctx.strokeStyle = SkyMap.colors.constellationLine;
                ctx.lineWidth = 1;
                
                constellation.lines.forEach(line => {
                    const star1 = starMap.get(line[0]);
                    const star2 = starMap.get(line[1]);
                    
                    if (!star1 || !star2) return;
                    
                    const altAz1 = Astro.raDecToAltAz(star1.ra, star1.dec, date, lat, lon);
                    const altAz2 = Astro.raDecToAltAz(star2.ra, star2.dec, date, lat, lon);
                    
                    if (altAz1.altitude < 0 && altAz2.altitude < 0) return;
                    
                    const pos1 = Renderer.altAzToScreen(altAz1.altitude, altAz1.azimuth);
                    const pos2 = Renderer.altAzToScreen(altAz2.altitude, altAz2.azimuth);
                    
                    if (!pos1.visible && !pos2.visible) return;
                    
                    ctx.beginPath();
                    ctx.moveTo(pos1.x, pos1.y);
                    ctx.lineTo(pos2.x, pos2.y);
                    ctx.stroke();
                });
                
                ctx.restore();
            }
            
            // Draw constellation name
            if (SkyMap.options.showConstellationNames && SkyMap.view.fov < 90) {
                const centerAltAz = Astro.raDecToAltAz(constellation.center[0], constellation.center[1], date, lat, lon);
                
                if (centerAltAz.altitude > 0) {
                    const pos = Renderer.altAzToScreen(centerAltAz.altitude, centerAltAz.azimuth);
                    
                    if (pos.visible) {
                        ctx.save();
                        ctx.font = '13px "Outfit", sans-serif';
                        ctx.fillStyle = SkyMap.colors.constellationName;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(constellation.name, pos.x, pos.y);
                        ctx.restore();
                    }
                }
            }
        });
    },
    
    // Draw planets
    drawPlanets: () => {
        if (!SkyMap.options.showPlanets) return;
        
        const ctx = SkyMap.ctx;
        const date = SkyMap.observer.date;
        const lat = SkyMap.observer.latitude;
        const lon = SkyMap.observer.longitude;
        
        // Draw Sun
        const sunPos = Astro.getSunPosition(date);
        const sunAltAz = Astro.raDecToAltAz(sunPos.ra, sunPos.dec, date, lat, lon);
        
        if (sunAltAz.altitude > -10) {
            const pos = Renderer.altAzToScreen(sunAltAz.altitude, sunAltAz.azimuth);
            if (pos.visible) {
                ctx.save();
                const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 20);
                gradient.addColorStop(0, '#ffff88');
                gradient.addColorStop(0.3, '#ffdd44');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.font = 'bold 12px "Outfit", sans-serif';
                ctx.fillStyle = '#ffdd00';
                ctx.textAlign = 'center';
                ctx.fillText('☉ Sun', pos.x, pos.y + 25);
                ctx.restore();
            }
        }
        
        // Draw Moon
        const moonPos = Astro.getMoonPosition(date);
        const moonAltAz = Astro.raDecToAltAz(moonPos.ra, moonPos.dec, date, lat, lon);
        
        if (moonAltAz.altitude > -5) {
            const pos = Renderer.altAzToScreen(moonAltAz.altitude, moonAltAz.azimuth);
            if (pos.visible) {
                ctx.save();
                const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 15);
                gradient.addColorStop(0, '#ffffee');
                gradient.addColorStop(0.5, '#ddddcc');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#f5f5dc';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.font = 'bold 12px "Outfit", sans-serif';
                ctx.fillStyle = '#ddddaa';
                ctx.textAlign = 'center';
                ctx.fillText('☽ Moon', pos.x, pos.y + 22);
                ctx.restore();
            }
        }
        
        // Draw planets
        PLANETS.forEach(planet => {
            const pos2d = Astro.getPlanetPosition(planet, date);
            const altAz = Astro.raDecToAltAz(pos2d.ra, pos2d.dec, date, lat, lon);
            
            if (altAz.altitude < -5) return;
            
            const pos = Renderer.altAzToScreen(altAz.altitude, altAz.azimuth);
            
            if (!pos.visible) return;
            
            ctx.save();
            
            // Planet glow
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, planet.size * 3);
            gradient.addColorStop(0, planet.color);
            gradient.addColorStop(0.5, planet.color + '44');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, planet.size * 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Planet disc
            ctx.fillStyle = planet.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, planet.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Label
            ctx.font = '11px "Outfit", sans-serif';
            ctx.fillStyle = planet.color;
            ctx.textAlign = 'center';
            ctx.fillText(planet.symbol + ' ' + planet.name, pos.x, pos.y + planet.size + 12);
            
            ctx.restore();
        });
    },
    
    // Draw info overlay
    drawOverlay: () => {
        const ctx = SkyMap.ctx;
        const canvas = SkyMap.canvas;
        
        ctx.save();
        
        // View info in corner
        ctx.font = '12px "Outfit", sans-serif';
        ctx.fillStyle = 'rgba(150, 180, 255, 0.8)';
        ctx.textAlign = 'left';
        
        const date = SkyMap.observer.date;
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const lines = [
            `📍 ${SkyMap.observer.latitude.toFixed(2)}°, ${SkyMap.observer.longitude.toFixed(2)}°`,
            `🕐 ${timeStr} • ${dateStr}`,
            `🔭 FOV: ${SkyMap.view.fov.toFixed(0)}° • Looking: ${getDirectionName(SkyMap.view.azimuth)}`
        ];
        
        lines.forEach((line, i) => {
            ctx.fillText(line, 15, 25 + i * 18);
        });
        
        // Instructions
        ctx.fillStyle = 'rgba(150, 180, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText('Drag to pan • Scroll to zoom', canvas.width - 15, canvas.height - 15);
        
        ctx.restore();
    },
    
    // Main render function
    render: () => {
        if (!SkyMap.canvas || !SkyMap.ctx) return;
        
        Renderer.drawBackground();
        Renderer.drawGrid();
        Renderer.drawConstellations();
        Renderer.drawStars();
        Renderer.drawPlanets();
        Renderer.drawHorizon();
        Renderer.drawOverlay();
    }
};

// Helper function for direction name
function getDirectionName(azimuth) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(Astro.normalize360(azimuth) / 22.5) % 16;
    return dirs[index];
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupSkyMapEventListeners() {
    const canvas = SkyMap.canvas;
    
    // Guard: Don't set up if canvas not ready
    if (!canvas) {
        console.log('Canvas not ready for event listeners, will set up later');
        return;
    }
    
    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
        SkyMap.view.isDragging = true;
        SkyMap.view.lastX = e.clientX;
        SkyMap.view.lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!SkyMap.view.isDragging) return;
        
        const dx = e.clientX - SkyMap.view.lastX;
        const dy = e.clientY - SkyMap.view.lastY;
        
        // Pan view
        const sensitivity = SkyMap.view.fov / canvas.width;
        SkyMap.view.azimuth -= dx * sensitivity;
        SkyMap.view.altitude += dy * sensitivity;
        
        // Clamp altitude
        SkyMap.view.altitude = Math.max(-10, Math.min(90, SkyMap.view.altitude));
        SkyMap.view.azimuth = Astro.normalize360(SkyMap.view.azimuth);
        
        SkyMap.view.lastX = e.clientX;
        SkyMap.view.lastY = e.clientY;
        
        Renderer.render();
    });
    
    canvas.addEventListener('mouseup', () => {
        SkyMap.view.isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        SkyMap.view.isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    // Wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        SkyMap.view.fov = Math.max(SkyMap.view.minFov, 
                                    Math.min(SkyMap.view.maxFov, 
                                             SkyMap.view.fov * zoomFactor));
        
        Renderer.render();
    }, { passive: false });
    
    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            SkyMap.view.isDragging = true;
            SkyMap.view.lastX = e.touches[0].clientX;
            SkyMap.view.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            SkyMap.view.touchStartDist = getTouchDistance(e.touches);
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && SkyMap.view.isDragging) {
            const dx = e.touches[0].clientX - SkyMap.view.lastX;
            const dy = e.touches[0].clientY - SkyMap.view.lastY;
            
            const sensitivity = SkyMap.view.fov / canvas.width;
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
            SkyMap.view.fov = Math.max(SkyMap.view.minFov, 
                                        Math.min(SkyMap.view.maxFov, 
                                                 SkyMap.view.fov * scale));
            SkyMap.view.touchStartDist = dist;
            Renderer.render();
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => {
        SkyMap.view.isDragging = false;
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        Renderer.render();
    });
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
    
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    
    SkyMap.canvas.width = width;
    SkyMap.canvas.height = height;
}

function initSkyMap() {
    console.log('Initializing AstroCalTT Sky Map v4.0');
    
    SkyMap.canvas = document.getElementById('skyCanvas');
    if (!SkyMap.canvas) {
        console.error('Sky canvas element not found');
        return false;
    }
    
    SkyMap.ctx = SkyMap.canvas.getContext('2d');
    if (!SkyMap.ctx) {
        console.error('Could not get canvas 2D context');
        return false;
    }
    
    // Set initial observer location from geolocation if available
    if (window.userLocation) {
        SkyMap.observer.latitude = window.userLocation.lat;
        SkyMap.observer.longitude = window.userLocation.lon;
    }
    
    resizeCanvas();
    setupSkyMapEventListeners();
    
    SkyMap.initialized = true;
    window.skyMapInitialized = true;
    
    // Start animation loop for real-time updates
    startAnimation();
    
    console.log('Sky map initialized successfully');
    return true;
}

let lastAnimationTime = 0;
const MIN_FRAME_INTERVAL = 1000 / 30; // Cap at 30fps for performance

function startAnimation() {
    function animate(currentTime) {
        // Throttle to ~30fps to reduce CPU usage and prevent glitches
        const elapsed = currentTime - lastAnimationTime;
        
        if (elapsed >= MIN_FRAME_INTERVAL) {
            lastAnimationTime = currentTime;
            
            if (SkyMap.observer.timeSpeed !== 0) {
                // Update time
                const now = new Date();
                if (SkyMap.observer.timeSpeed === 1) {
                    SkyMap.observer.date = now;
                } else {
                    // Accelerated time - scale by actual elapsed time for smooth animation
                    const timeStep = (elapsed / 1000) * SkyMap.observer.timeSpeed * 1000;
                    SkyMap.observer.date = new Date(SkyMap.observer.date.getTime() + timeStep);
                }
            }
            
            // Update clock display
            updateClockDisplay();
            
            Renderer.render();
        }
        
        SkyMap.animationId = requestAnimationFrame(animate);
    }
    
    animate(0);
}

function stopAnimation() {
    if (SkyMap.animationId) {
        cancelAnimationFrame(SkyMap.animationId);
        SkyMap.animationId = null;
    }
}

// Public API
window.SkyMap = SkyMap;
window.initSkyMap = initSkyMap;
window.skyMapInitialized = false;

window.forceSkyMapRender = function() {
    if (!SkyMap.initialized) {
        initSkyMap();
    } else {
        resizeCanvas();
        Renderer.render();
    }
};

// Control functions
window.setSkyMapLocation = function(lat, lon) {
    SkyMap.observer.latitude = lat;
    SkyMap.observer.longitude = lon;
    Renderer.render();
};

window.setSkyMapTime = function(date) {
    SkyMap.observer.date = date;
    Renderer.render();
};

window.setSkyMapTimeSpeed = function(speed) {
    SkyMap.observer.timeSpeed = speed;
};

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

// ============================================
// UI CONTROL HANDLERS
// ============================================

let controlsInitialized = false;

function setupUIControls() {
    if (controlsInitialized) {
        console.log('Sky map controls already initialized');
        return;
    }
    
    console.log('Setting up sky map UI controls...');
    
    // Location button
    const locationBtn = document.getElementById('sky-use-location');
    console.log('Location button found:', !!locationBtn);
    if (locationBtn) {
        locationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Location button clicked');
            if (navigator.geolocation) {
                locationBtn.innerHTML = '<span>⏳</span> Locating...';
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        SkyMap.observer.latitude = pos.coords.latitude;
                        SkyMap.observer.longitude = pos.coords.longitude;
                        locationBtn.innerHTML = '<span>📍</span> My Location';
                        Renderer.render();
                    },
                    (err) => {
                        console.error('Geolocation error:', err);
                        locationBtn.innerHTML = '<span>📍</span> My Location';
                        alert('Could not get your location. Using default.');
                    }
                );
            }
        });
    }
    
    // Reset view button
    const resetBtn = document.getElementById('sky-reset-view');
    console.log('Reset button found:', !!resetBtn);
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Reset button clicked');
            SkyMap.view.azimuth = 180;
            SkyMap.view.altitude = 45;
            SkyMap.view.fov = 60;
            SkyMap.observer.date = new Date();
            SkyMap.observer.timeSpeed = 1;
            updateTimeSpeedIndicator();
            Renderer.render();
        });
    }
    
    // Direction buttons
    const dirButtons = document.querySelectorAll('.sky-dir');
    console.log('Direction buttons found:', dirButtons.length);
    dirButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const az = parseFloat(btn.dataset.az);
            const alt = parseFloat(btn.dataset.alt);
            console.log('Direction clicked:', az, alt);
            SkyMap.view.azimuth = az;
            SkyMap.view.altitude = alt;
            Renderer.render();
        });
    });
    
    // Display toggles
    const toggles = {
        'sky-show-constellations': 'showConstellationLines',
        'sky-show-constellation-names': 'showConstellationNames',
        'sky-show-planets': 'showPlanets',
        'sky-show-grid': 'showGrid'
    };
    
    Object.entries(toggles).forEach(([id, option]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            // Set initial state
            checkbox.checked = SkyMap.options[option];
            
            checkbox.addEventListener('change', () => {
                SkyMap.options[option] = checkbox.checked;
                Renderer.render();
            });
        }
    });
    
    // Time controls
    const timeSlower = document.getElementById('sky-time-slower');
    const timeNow = document.getElementById('sky-time-now');
    const timeFaster = document.getElementById('sky-time-faster');
    console.log('Time controls found:', !!timeSlower, !!timeNow, !!timeFaster);
    
    if (timeSlower) {
        timeSlower.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Time slower clicked');
            if (SkyMap.observer.timeSpeed === 1) {
                SkyMap.observer.timeSpeed = 0;
            } else if (SkyMap.observer.timeSpeed === 0) {
                SkyMap.observer.timeSpeed = -60;
            } else if (SkyMap.observer.timeSpeed > 0) {
                SkyMap.observer.timeSpeed = Math.max(1, SkyMap.observer.timeSpeed / 10);
            } else {
                SkyMap.observer.timeSpeed *= 10;
            }
            updateTimeSpeedIndicator();
        });
    }
    
    if (timeNow) {
        timeNow.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Time now clicked');
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
            console.log('Time faster clicked');
            if (SkyMap.observer.timeSpeed === 0) {
                SkyMap.observer.timeSpeed = 60;
            } else if (SkyMap.observer.timeSpeed === 1) {
                SkyMap.observer.timeSpeed = 60;
            } else if (SkyMap.observer.timeSpeed > 0) {
                SkyMap.observer.timeSpeed = Math.min(86400, SkyMap.observer.timeSpeed * 10);
            } else {
                SkyMap.observer.timeSpeed = Math.min(-1, SkyMap.observer.timeSpeed / 10);
            }
            updateTimeSpeedIndicator();
        });
    }
    
    // Zoom controls
    const zoomIn = document.getElementById('sky-zoom-in');
    const zoomOut = document.getElementById('sky-zoom-out');
    
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            SkyMap.view.fov = Math.max(SkyMap.view.minFov, SkyMap.view.fov * 0.8);
            Renderer.render();
        });
    }
    
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            SkyMap.view.fov = Math.min(SkyMap.view.maxFov, SkyMap.view.fov * 1.25);
            Renderer.render();
        });
    }
}

function updateTimeSpeedIndicator() {
    const indicator = document.getElementById('sky-time-speed');
    if (!indicator) return;
    
    const speed = SkyMap.observer.timeSpeed;
    let text;
    
    if (speed === 0) {
        text = '⏸';
    } else if (speed === 1) {
        text = '1×';
    } else if (speed === -1) {
        text = '-1×';
    } else if (Math.abs(speed) >= 86400) {
        text = (speed > 0 ? '' : '-') + Math.round(Math.abs(speed) / 86400) + 'd/s';
    } else if (Math.abs(speed) >= 3600) {
        text = (speed > 0 ? '' : '-') + Math.round(Math.abs(speed) / 3600) + 'h/s';
    } else if (Math.abs(speed) >= 60) {
        text = (speed > 0 ? '' : '-') + Math.round(Math.abs(speed) / 60) + 'm/s';
    } else {
        text = speed + '×';
    }
    
    indicator.textContent = text;
}

// Track last displayed values to avoid unnecessary DOM updates
let lastClockTime = '';
let lastClockDate = '';
let lastClockColor = '';

function updateClockDisplay() {
    const timeEl = document.getElementById('sky-clock-time');
    const dateEl = document.getElementById('sky-clock-date');
    
    if (!timeEl || !dateEl) return;
    
    const date = SkyMap.observer.date;
    
    // Format time as HH:MM:SS
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;
    
    // Format date
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = date.toLocaleDateString('en-US', options);
    
    // Determine color based on time difference
    const now = new Date();
    const timeDiff = Math.abs(date.getTime() - now.getTime());
    const colorMode = timeDiff > 60000 ? 'future' : 'present';
    
    // Only update DOM if values changed (prevents layout thrashing)
    if (timeStr !== lastClockTime) {
        timeEl.textContent = timeStr;
        lastClockTime = timeStr;
    }
    
    if (dateStr !== lastClockDate) {
        dateEl.textContent = dateStr;
        lastClockDate = dateStr;
    }
    
    if (colorMode !== lastClockColor) {
        if (colorMode === 'future') {
            timeEl.style.color = '#fbbf24'; // Yellow/gold for past/future
            dateEl.style.color = 'rgba(251, 191, 36, 0.7)';
        } else {
            timeEl.style.color = '#7dd3fc'; // Cyan for present
            dateEl.style.color = 'rgba(150, 180, 220, 0.8)';
        }
        lastClockColor = colorMode;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initSkyMap();
            setupUIControls();
        }, 200);
    });
    } else {
    setTimeout(() => {
        initSkyMap();
        setupUIControls();
    }, 200);
}
