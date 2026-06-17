import 'package:flutter/material.dart';

class GlossaryScreen extends StatefulWidget {
  const GlossaryScreen({super.key});

  @override
  State<GlossaryScreen> createState() => _GlossaryScreenState();
}

class _GlossaryScreenState extends State<GlossaryScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  static const _categories = [
    _GlossaryCategory(
      title: 'NASA APIs & Services',
      items: [
        _GlossaryItem('APOD', 'Astronomy Picture of the Day - A daily image or video of our fascinating universe, along with a brief explanation written by a professional astronomer.'),
        _GlossaryItem('DONKI', 'Space Weather Database Of Notifications, Knowledge, Information - NASA\'s comprehensive database for space weather events including solar flares and coronal mass ejections.'),
        _GlossaryItem('EONET', 'Earth Observatory Natural Event Tracker - A system that tracks natural events on Earth such as wildfires, storms, and volcanic activity that may be visible from space.'),
        _GlossaryItem('Earth Map Layers', 'Interactive map layers including ESRI satellite imagery, terrain, and live GOES weather sorted by region worldwide — with an automatic layer for your location.'),
        _GlossaryItem('GIBS', 'Global Imagery Browse Services — NASA\'s catalogue of satellite imagery. AstroCalTT can overlay VIIRS day/night band data on the Earth Map for night-lights views.'),
      ],
    ),
    _GlossaryCategory(
      title: 'Observing & Sky Tools',
      items: [
        _GlossaryItem('Sky Map', 'An interactive planetarium for your location — stars, constellation lines, planets, and deep-sky objects on an azimuthal equidistant sky chart. Pan, zoom, scrub time, and search objects by name.'),
        _GlossaryItem('Observing Score', 'A quick stargazing rating (Excellent / Good / Fair / Poor) based on moon brightness, cloud cover from Open-Meteo, and your set location. Higher scores mean darker, clearer skies.'),
        _GlossaryItem('Hand Measure', 'A way to estimate angles in the sky using your outstretched arm: pinky width ~1°, three fingers ~5°, closed fist ~10°, spread hand (thumb to pinky) ~25°. See the guide below the Sky Map to practice.'),
      ],
    ),
    _GlossaryCategory(
      title: 'Space Weather Terms',
      items: [
        _GlossaryItem('CME', 'Coronal Mass Ejection - A massive burst of solar wind and magnetic fields rising above the solar corona or being released into space. CMEs can affect Earth\'s magnetosphere and cause geomagnetic storms.'),
        _GlossaryItem('Solar Flare', 'A sudden flash of increased brightness on the Sun, usually observed near its surface and in close proximity to a sunspot group. Flares are classified by their X-ray intensity (A, B, C, M, or X class).'),
        _GlossaryItem('FLR', 'Solar Flare - The abbreviation used in NASA\'s DONKI database for solar flare events.'),
      ],
    ),
    _GlossaryCategory(
      title: 'Spacecraft & Stations',
      items: [
        _GlossaryItem('ISS', 'International Space Station — a modular space station in low Earth orbit and the largest human-made object in space. AstroCalTT lists predicted passes with approximate elevation and azimuth; look for max elevation above 20° for the best naked-eye views.'),
      ],
    ),
    _GlossaryCategory(
      title: 'Astronomy Terms',
      items: [
        _GlossaryItem('Magnitude', 'A measure of the brightness of a celestial object. Lower numbers indicate brighter objects. The brightest stars have negative magnitudes.'),
        _GlossaryItem('Zenith', 'The point in the sky directly above you — 90° elevation. The farther an object is from the zenith, the more atmosphere you look through (more dimming and twinkling).'),
        _GlossaryItem('Elevation', 'The angle between the object and the observer\'s local horizon. Objects at 0° are on the horizon, while 90° is directly overhead (zenith).'),
        _GlossaryItem('Azimuth', 'The compass direction of an object, measured in degrees from north (0°) through east (90°), south (180°), and west (270°).'),
        _GlossaryItem('Constellation', 'A recognized pattern of stars in the sky, often named after myths or shapes (e.g. Orion, Ursa Major). Used for finding directions and locating other objects.'),
        _GlossaryItem('DSO', 'Deep Sky Object — a nebula, galaxy, star cluster, or similar target beyond the solar system. Examples on the Sky Map include the Orion Nebula (M42) and the Andromeda Galaxy (M31).'),
        _GlossaryItem('Meteor Shower', 'A celestial event where numerous meteors are observed to radiate from one point in the night sky. These meteors are caused by streams of cosmic debris entering Earth\'s atmosphere.'),
        _GlossaryItem('Planet Visibility', 'When a planet is above the horizon and dark enough to see from your location. Event cards may show rise, set, and best viewing windows based on the planet\'s position relative to the Sun.'),
      ],
    ),
    _GlossaryCategory(
      title: 'Technical Terms',
      items: [
        _GlossaryItem('CORS', 'Cross-Origin Resource Sharing - A security feature that allows web pages to request resources from a different domain. Some APIs require server-side proxies to bypass CORS restrictions.'),
        _GlossaryItem('GOES', 'Geostationary Operational Environmental Satellite — NOAA weather satellites in fixed orbits above the equator. Live GOES visible and infrared cloud imagery powers the regional weather layers on the Earth Map.'),
        _GlossaryItem('Open-Meteo', 'A free, open-source weather API that provides astronomical data including sunrise/sunset times and moon phases without requiring an API key.'),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() => _query = _searchController.text.toLowerCase().trim()));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Glossary'),
        backgroundColor: theme.colorScheme.surface.withValues(alpha: 0.9),
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: '🔍 Search terms...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.only(left: 12, right: 12, bottom: 24),
              children: _categories.map((cat) {
                final filteredItems = _query.isEmpty
                    ? cat.items
                    : cat.items.where((i) =>
                        i.term.toLowerCase().contains(_query) ||
                        i.definition.toLowerCase().contains(_query)).toList();
                if (filteredItems.isEmpty) return const SizedBox.shrink();
                return _CategorySection(
                  title: cat.title,
                  items: filteredItems,
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _GlossaryCategory {
  final String title;
  final List<_GlossaryItem> items;
  const _GlossaryCategory({required this.title, required this.items});
}

class _GlossaryItem {
  final String term;
  final String definition;
  const _GlossaryItem(this.term, this.definition);
}

class _CategorySection extends StatelessWidget {
  final String title;
  final List<_GlossaryItem> items;

  const _CategorySection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        ...items.map((item) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.term,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  item.definition,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        )),
      ],
    );
  }
}
