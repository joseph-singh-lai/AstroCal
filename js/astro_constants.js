export const METEOR_SHOWERS = [
    {
        id: 'quadrantids',
        name: 'Quadrantid',
        month: 1, day: 3, hour: 23,
        zhr: 120,
        rating: 'High',
        direction: 'NE',
        description: 'One of the year\'s best showers with up to 120 meteors/hour. Short peak window. Best after midnight.',
        parent: 'Asteroid 2003 EH1'
    },
    {
        id: 'lyrids',
        name: 'Lyrid',
        month: 4, day: 22, hour: 3,
        zhr: 18,
        rating: 'Moderate',
        direction: 'E',
        description: 'Ancient shower observed for 2,700+ years. About 10-20 meteors/hour with occasional fireballs.',
        parent: 'Comet C/1861 G1 Thatcher'
    },
    {
        id: 'eta-aquariids',
        name: 'Eta Aquariid',
        month: 5, day: 6, hour: 4,
        zhr: 50,
        rating: 'Moderate-High',
        direction: 'E',
        description: 'Debris from Halley\'s Comet. Fast meteors at 66 km/s. Best viewed in pre-dawn hours.',
        parent: 'Comet 1P/Halley'
    },
    {
        id: 'delta-aquariids',
        name: 'Southern Delta Aquariid',
        month: 7, day: 30, hour: 2,
        zhr: 25,
        rating: 'Moderate',
        direction: 'S',
        description: 'Southern-hemisphere-friendly shower. Overlaps with early Perseids. About 20-25 meteors/hour.',
        parent: 'Comet 96P/Machholz'
    },
    {
        id: 'perseids',
        name: 'Perseid',
        month: 8, day: 12, hour: 22,
        zhr: 100,
        rating: 'Very High',
        direction: 'NE',
        description: 'Most popular annual shower! Up to 100+ meteors/hour with many bright fireballs. Warm summer nights.',
        parent: 'Comet 109P/Swift-Tuttle'
    },
    {
        id: 'draconids',
        name: 'Draconid',
        month: 10, day: 8, hour: 20,
        zhr: 10,
        rating: 'Variable',
        direction: 'NW',
        description: 'Best viewed in early evening (unusual for showers). Can produce surprise outbursts.',
        parent: 'Comet 21P/Giacobini-Zinner'
    },
    {
        id: 'orionids',
        name: 'Orionid',
        month: 10, day: 21, hour: 23,
        zhr: 23,
        rating: 'Moderate',
        direction: 'SE',
        description: 'Second shower from Halley\'s Comet debris. Very fast meteors at 66 km/s.',
        parent: 'Comet 1P/Halley'
    },
    {
        id: 'taurids-south',
        name: 'Southern Taurid',
        month: 11, day: 5, hour: 23,
        zhr: 5,
        rating: 'Low',
        direction: 'E',
        description: 'Low rates but famous for spectacular fireballs! Slow-moving meteors.',
        parent: 'Comet 2P/Encke'
    },
    {
        id: 'taurids-north',
        name: 'Northern Taurid',
        month: 11, day: 12, hour: 23,
        zhr: 5,
        rating: 'Low',
        direction: 'E',
        description: 'Like Southern Taurids - low rates but impressive bright fireballs. Slow meteors.',
        parent: 'Comet 2P/Encke'
    },
    {
        id: 'leonids',
        name: 'Leonid',
        month: 11, day: 17, hour: 23,
        zhr: 15,
        rating: 'Moderate',
        direction: 'E',
        description: 'Famous for meteor storms every 33 years. Fast meteors with bright fireballs.',
        parent: 'Comet 55P/Tempel-Tuttle'
    },
    {
        id: 'geminids',
        name: 'Geminid',
        month: 12, day: 14, hour: 23,
        zhr: 150,
        rating: 'Very High',
        direction: 'E',
        description: 'King of meteor showers! Up to 150 meteors/hour. Multi-colored meteors, medium speed.',
        parent: 'Asteroid 3200 Phaethon'
    },
    {
        id: 'ursids',
        name: 'Ursid',
        month: 12, day: 22, hour: 22,
        zhr: 10,
        rating: 'Low-Moderate',
        direction: 'N',
        description: 'Often overlooked due to holiday timing. Occasional surprise outbursts possible.',
        parent: 'Comet 8P/Tuttle'
    }
];

/**
 * Eclipse Data - Solar and Lunar eclipses (calculated astronomically)
 * Data from NASA Eclipse predictions
 */
export const ECLIPSES = [
    // 2026
    { year: 2026, month: 2, day: 17, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Americas, Europe, Africa' },
    { year: 2026, month: 3, day: 3, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Antarctica, Atlantic Ocean' },
    { year: 2026, month: 8, day: 12, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'Arctic, North Atlantic, Europe' },
    { year: 2026, month: 8, day: 28, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia' },
    // 2027
    { year: 2027, month: 2, day: 6, type: 'solar', subtype: 'annular', name: 'Annular Solar Eclipse', visibility: 'South America, Antarctica' },
    { year: 2027, month: 2, day: 20, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Americas, Europe, Africa' },
    { year: 2027, month: 7, day: 18, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Asia, Australia, Pacific' },
    { year: 2027, month: 8, day: 2, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Africa, Europe, Middle East' },
    // 2028
    { year: 2028, month: 1, day: 12, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Americas, Europe, Africa' },
    { year: 2028, month: 1, day: 26, type: 'solar', subtype: 'annular', name: 'Annular Solar Eclipse', visibility: 'South America' },
    { year: 2028, month: 7, day: 6, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia' },
    { year: 2028, month: 7, day: 22, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Australia, New Zealand' },
    { year: 2028, month: 12, day: 31, type: 'lunar', subtype: 'total', name: 'Total Lunar Eclipse', visibility: 'Europe, Africa, Asia, Australia' },
    // 2029
    { year: 2029, month: 1, day: 14, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'North America, Central America' },
    { year: 2029, month: 6, day: 12, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'Arctic, Scandinavia, Russia' },
    { year: 2029, month: 6, day: 26, type: 'lunar', subtype: 'total', name: 'Total Lunar Eclipse', visibility: 'Americas, Europe, Africa' },
    { year: 2029, month: 12, day: 5, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'Antarctica, South Pacific' },
    { year: 2029, month: 12, day: 20, type: 'lunar', subtype: 'total', name: 'Total Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia' },
    // 2030
    { year: 2030, month: 6, day: 1, type: 'solar', subtype: 'annular', name: 'Annular Solar Eclipse', visibility: 'Europe, North Africa, Russia' },
    { year: 2030, month: 6, day: 15, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Europe, Africa, Asia, Australia' },
    { year: 2030, month: 11, day: 25, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Southern Africa, Australia' },
    { year: 2030, month: 12, day: 9, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia' }
];

/**
 * Supermoon dates - when full moon coincides with lunar perigee
 * (Moon appears ~14% larger and 30% brighter)
 */
export const SUPERMOONS = [
    // 2026
    { year: 2026, month: 4, day: 26, name: 'Pink Supermoon' },
    { year: 2026, month: 5, day: 26, name: 'Flower Supermoon' },
    { year: 2026, month: 11, day: 17, name: 'Beaver Supermoon' },
    { year: 2026, month: 12, day: 17, name: 'Cold Supermoon' },
    // 2027
    { year: 2027, month: 4, day: 16, name: 'Pink Supermoon' },
    { year: 2027, month: 5, day: 15, name: 'Flower Supermoon' },
    { year: 2027, month: 11, day: 6, name: 'Beaver Supermoon' },
    { year: 2027, month: 12, day: 6, name: 'Cold Supermoon' },
    // 2028
    { year: 2028, month: 5, day: 3, name: 'Flower Supermoon' },
    { year: 2028, month: 10, day: 25, name: 'Hunter\'s Supermoon' },
    { year: 2028, month: 11, day: 24, name: 'Beaver Supermoon' },
    // 2029
    { year: 2029, month: 3, day: 22, name: 'Worm Supermoon' },
    { year: 2029, month: 4, day: 20, name: 'Pink Supermoon' },
    { year: 2029, month: 10, day: 14, name: 'Hunter\'s Supermoon' },
    { year: 2029, month: 11, day: 13, name: 'Beaver Supermoon' },
    // 2030
    { year: 2030, month: 3, day: 11, name: 'Worm Supermoon' },
    { year: 2030, month: 4, day: 10, name: 'Pink Supermoon' },
    { year: 2030, month: 10, day: 3, name: 'Harvest Supermoon' },
    { year: 2030, month: 11, day: 2, name: 'Beaver Supermoon' }
];
