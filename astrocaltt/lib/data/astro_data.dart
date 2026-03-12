import 'package:astrocaltt/models/event_model.dart';

// La Brea, Trinidad & Tobago
const double laBreaLat = 10.25;
const double laBrealon = -61.63;

// Meteor Shower Data (IMO)
class MeteorShower {
  final String id;
  final String name;
  final int month;
  final int day;
  final int hour;
  final int zhr;
  final String rating;
  final String direction;
  final String description;
  final String parent;

  const MeteorShower({
    required this.id,
    required this.name,
    required this.month,
    required this.day,
    required this.hour,
    required this.zhr,
    required this.rating,
    required this.direction,
    required this.description,
    required this.parent,
  });
}

const List<MeteorShower> meteorShowers = [
  MeteorShower(id: 'quadrantids', name: 'Quadrantid', month: 1, day: 3, hour: 23, zhr: 120, rating: 'High', direction: 'NE', description: "One of the year's best showers with up to 120 meteors/hour. Short peak window. Best after midnight.", parent: 'Asteroid 2003 EH1'),
  MeteorShower(id: 'lyrids', name: 'Lyrid', month: 4, day: 22, hour: 3, zhr: 18, rating: 'Moderate', direction: 'E', description: "Ancient shower observed for 2,700+ years. About 10-20 meteors/hour with occasional fireballs.", parent: 'Comet C/1861 G1 Thatcher'),
  MeteorShower(id: 'eta-aquariids', name: 'Eta Aquariid', month: 5, day: 6, hour: 4, zhr: 50, rating: 'Moderate-High', direction: 'E', description: "Debris from Halley's Comet. Fast meteors at 66 km/s. Best viewed in pre-dawn hours.", parent: 'Comet 1P/Halley'),
  MeteorShower(id: 'delta-aquariids', name: 'Southern Delta Aquariid', month: 7, day: 30, hour: 2, zhr: 25, rating: 'Moderate', direction: 'S', description: "Southern-hemisphere-friendly shower. Overlaps with early Perseids. About 20-25 meteors/hour.", parent: 'Comet 96P/Machholz'),
  MeteorShower(id: 'perseids', name: 'Perseid', month: 8, day: 12, hour: 22, zhr: 100, rating: 'Very High', direction: 'NE', description: "Most popular annual shower! Up to 100+ meteors/hour with many bright fireballs. Warm summer nights.", parent: 'Comet 109P/Swift-Tuttle'),
  MeteorShower(id: 'draconids', name: 'Draconid', month: 10, day: 8, hour: 20, zhr: 10, rating: 'Variable', direction: 'NW', description: "Best viewed in early evening (unusual for showers). Can produce surprise outbursts.", parent: 'Comet 21P/Giacobini-Zinner'),
  MeteorShower(id: 'orionids', name: 'Orionid', month: 10, day: 21, hour: 23, zhr: 23, rating: 'Moderate', direction: 'SE', description: "Second shower from Halley's Comet debris. Very fast meteors at 66 km/s.", parent: 'Comet 1P/Halley'),
  MeteorShower(id: 'taurids-south', name: 'Southern Taurid', month: 11, day: 5, hour: 23, zhr: 5, rating: 'Low', direction: 'E', description: "Low rates but famous for spectacular fireballs! Slow-moving meteors.", parent: 'Comet 2P/Encke'),
  MeteorShower(id: 'taurids-north', name: 'Northern Taurid', month: 11, day: 12, hour: 23, zhr: 5, rating: 'Low', direction: 'E', description: "Like Southern Taurids - low rates but impressive bright fireballs. Slow meteors.", parent: 'Comet 2P/Encke'),
  MeteorShower(id: 'leonids', name: 'Leonid', month: 11, day: 17, hour: 23, zhr: 15, rating: 'Moderate', direction: 'E', description: "Famous for meteor storms every 33 years. Fast meteors with bright fireballs.", parent: 'Comet 55P/Tempel-Tuttle'),
  MeteorShower(id: 'geminids', name: 'Geminid', month: 12, day: 14, hour: 23, zhr: 150, rating: 'Very High', direction: 'E', description: "King of meteor showers! Up to 150 meteors/hour. Multi-colored meteors, medium speed.", parent: 'Asteroid 3200 Phaethon'),
  MeteorShower(id: 'ursids', name: 'Ursid', month: 12, day: 22, hour: 22, zhr: 10, rating: 'Low-Moderate', direction: 'N', description: "Often overlooked due to holiday timing. Occasional surprise outbursts possible.", parent: 'Comet 8P/Tuttle'),
];

// Eclipse data (NASA predictions)
class EclipseData {
  final int year, month, day;
  final String type;  // solar, lunar
  final String subtype;  // total, partial, penumbral, annular
  final String name;
  final String visibility;

  const EclipseData({required this.year, required this.month, required this.day, required this.type, required this.subtype, required this.name, required this.visibility});
}

const List<EclipseData> eclipses = [
  EclipseData(year: 2026, month: 2, day: 17, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Americas, Europe, Africa'),
  EclipseData(year: 2026, month: 3, day: 3, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Antarctica, Atlantic Ocean'),
  EclipseData(year: 2026, month: 8, day: 12, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'Arctic, North Atlantic, Europe'),
  EclipseData(year: 2026, month: 8, day: 28, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia'),
  EclipseData(year: 2027, month: 2, day: 6, type: 'solar', subtype: 'annular', name: 'Annular Solar Eclipse', visibility: 'South America, Antarctica'),
  EclipseData(year: 2027, month: 2, day: 20, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Americas, Europe, Africa'),
  EclipseData(year: 2027, month: 7, day: 18, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Asia, Australia, Pacific'),
  EclipseData(year: 2027, month: 8, day: 2, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Africa, Europe, Middle East'),
  EclipseData(year: 2028, month: 1, day: 12, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Americas, Europe, Africa'),
  EclipseData(year: 2028, month: 1, day: 26, type: 'solar', subtype: 'annular', name: 'Annular Solar Eclipse', visibility: 'South America'),
  EclipseData(year: 2028, month: 7, day: 6, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia'),
  EclipseData(year: 2028, month: 7, day: 22, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Australia, New Zealand'),
  EclipseData(year: 2028, month: 12, day: 31, type: 'lunar', subtype: 'total', name: 'Total Lunar Eclipse', visibility: 'Europe, Africa, Asia, Australia'),
  EclipseData(year: 2029, month: 1, day: 14, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'North America, Central America'),
  EclipseData(year: 2029, month: 6, day: 12, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'Arctic, Scandinavia, Russia'),
  EclipseData(year: 2029, month: 6, day: 26, type: 'lunar', subtype: 'total', name: 'Total Lunar Eclipse', visibility: 'Americas, Europe, Africa'),
  EclipseData(year: 2029, month: 12, day: 5, type: 'solar', subtype: 'partial', name: 'Partial Solar Eclipse', visibility: 'Antarctica, South Pacific'),
  EclipseData(year: 2029, month: 12, day: 20, type: 'lunar', subtype: 'total', name: 'Total Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia'),
  EclipseData(year: 2030, month: 6, day: 1, type: 'solar', subtype: 'annular', name: 'Annular Solar Eclipse', visibility: 'Europe, North Africa, Russia'),
  EclipseData(year: 2030, month: 6, day: 15, type: 'lunar', subtype: 'partial', name: 'Partial Lunar Eclipse', visibility: 'Europe, Africa, Asia, Australia'),
  EclipseData(year: 2030, month: 11, day: 25, type: 'solar', subtype: 'total', name: 'Total Solar Eclipse', visibility: 'Southern Africa, Australia'),
  EclipseData(year: 2030, month: 12, day: 9, type: 'lunar', subtype: 'penumbral', name: 'Penumbral Lunar Eclipse', visibility: 'Americas, Europe, Africa, Asia'),
];

// Supermoon data
class SupermoonData {
  final int year, month, day;
  final String name;

  const SupermoonData({required this.year, required this.month, required this.day, required this.name});
}

const List<SupermoonData> supermoons = [
  SupermoonData(year: 2026, month: 4, day: 26, name: 'Pink Supermoon'),
  SupermoonData(year: 2026, month: 5, day: 26, name: 'Flower Supermoon'),
  SupermoonData(year: 2026, month: 11, day: 17, name: 'Beaver Supermoon'),
  SupermoonData(year: 2026, month: 12, day: 17, name: 'Cold Supermoon'),
  SupermoonData(year: 2027, month: 4, day: 16, name: 'Pink Supermoon'),
  SupermoonData(year: 2027, month: 5, day: 15, name: 'Flower Supermoon'),
  SupermoonData(year: 2027, month: 11, day: 6, name: 'Beaver Supermoon'),
  SupermoonData(year: 2027, month: 12, day: 6, name: 'Cold Supermoon'),
  SupermoonData(year: 2028, month: 5, day: 3, name: 'Flower Supermoon'),
  SupermoonData(year: 2028, month: 10, day: 25, name: "Hunter's Supermoon"),
  SupermoonData(year: 2028, month: 11, day: 24, name: 'Beaver Supermoon'),
  SupermoonData(year: 2029, month: 3, day: 22, name: 'Worm Supermoon'),
  SupermoonData(year: 2029, month: 4, day: 20, name: 'Pink Supermoon'),
  SupermoonData(year: 2029, month: 10, day: 14, name: "Hunter's Supermoon"),
  SupermoonData(year: 2029, month: 11, day: 13, name: 'Beaver Supermoon'),
  SupermoonData(year: 2030, month: 3, day: 11, name: 'Worm Supermoon'),
  SupermoonData(year: 2030, month: 4, day: 10, name: 'Pink Supermoon'),
  SupermoonData(year: 2030, month: 10, day: 3, name: 'Harvest Supermoon'),
  SupermoonData(year: 2030, month: 11, day: 2, name: 'Beaver Supermoon'),
];

/// Generate meteor shower events for current and next year
List<AstroEvent> generateMeteorShowerEvents() {
  final events = <AstroEvent>[];
  final now = DateTime.now();
  for (final year in [now.year, now.year + 1]) {
    for (final shower in meteorShowers) {
      final eventDate = DateTime(year, shower.month, shower.day, shower.hour, 0, 0);
      final daysDiff = eventDate.difference(now).inDays;
      if (daysDiff < -60 || daysDiff > 400) continue;
      events.add(AstroEvent(
        id: 'meteor-${shower.id}-$year',
        title: '${shower.name} Meteor Shower Peak',
        category: 'meteor',
        datetime: eventDate,
        description: '${shower.description} Expected rate: ~${shower.zhr} meteors/hour (ZHR). Parent body: ${shower.parent}.',
        location: 'Dark-sky site for best viewing',
        visibility: {'direction': shower.direction, 'peak': shower.rating, 'zhr': shower.zhr.toString()},
      ));
    }
  }
  return events;
}

/// Generate eclipse events
List<AstroEvent> generateEclipseEvents() {
  final events = <AstroEvent>[];
  final now = DateTime.now();
  for (final e in eclipses) {
    final eventDate = DateTime(e.year, e.month, e.day, 12, 0, 0);
    final daysDiff = eventDate.difference(now).inDays;
    if (daysDiff < -30) continue;
    final emoji = e.type == 'solar' ? '🌑' : '🌕';
    final typeDesc = e.type == 'solar' ? 'Solar' : 'Lunar';
    final subtypeCap = e.subtype[0].toUpperCase() + e.subtype.substring(1);
    events.add(AstroEvent(
      id: 'eclipse-${e.type}-${e.year}-${e.month}',
      title: '$emoji ${e.name}',
      category: 'astronomy',
      datetime: eventDate,
      description: '$subtypeCap ${typeDesc.toLowerCase()} eclipse. Visibility: ${e.visibility}. ${e.type == 'solar' ? '⚠️ Never look directly at a solar eclipse without proper eye protection!' : 'Safe to view with naked eye.'}',
      location: e.visibility,
      eventType: '${e.subtype}_${e.type}_eclipse',
    ));
  }
  return events;
}

/// Generate supermoon events
List<AstroEvent> generateSupermoonEvents() {
  final events = <AstroEvent>[];
  final now = DateTime.now();
  for (final m in supermoons) {
    final eventDate = DateTime(m.year, m.month, m.day, 22, 0, 0);
    final daysDiff = eventDate.difference(now).inDays;
    if (daysDiff < -30) continue;
    events.add(AstroEvent(
      id: 'supermoon-${m.year}-${m.month}',
      title: '🌕 ${m.name}',
      category: 'astronomy',
      datetime: eventDate,
      description: "Supermoon! The full moon appears ~14% larger and ~30% brighter than average as it coincides with lunar perigee (closest approach to Earth). Great night for moon photography!",
      location: 'Visible worldwide (weather permitting)',
      eventType: 'supermoon',
    ));
  }
  return events;
}

/// Equinox/solstice approximations
List<Map<String, dynamic>> _equinoxSolsticeData(int year) => [
  {'name': 'March Equinox (Spring)', 'date': DateTime(year, 3, 20, 9, 0), 'desc': 'Day and night are approximately equal. Marks the start of astronomical spring in the Northern Hemisphere.'},
  {'name': 'June Solstice (Summer)', 'date': DateTime(year, 6, 21, 4, 0), 'desc': 'Longest day in Northern Hemisphere, shortest in Southern. Sun reaches highest point in the sky.'},
  {'name': 'September Equinox (Autumn)', 'date': DateTime(year, 9, 22, 20, 0), 'desc': 'Day and night are approximately equal. Marks the start of astronomical autumn in the Northern Hemisphere.'},
  {'name': 'December Solstice (Winter)', 'date': DateTime(year, 12, 21, 15, 0), 'desc': 'Shortest day in Northern Hemisphere, longest in Southern. Sun at lowest point in the sky.'},
];

List<AstroEvent> generateSeasonalEvents() {
  final events = <AstroEvent>[];
  final now = DateTime.now();
  for (final year in [now.year, now.year + 1]) {
    for (final item in _equinoxSolsticeData(year)) {
      final date = item['date'] as DateTime;
      final daysDiff = date.difference(now).inDays;
      if (daysDiff < -30 || daysDiff > 400) continue;
      final emoji = (item['name'] as String).contains('Solstice') ? '☀️' : '🌗';
      events.add(AstroEvent(
        id: 'season-$year-${date.month}',
        title: '$emoji ${item['name']}',
        category: 'astronomy',
        datetime: date,
        description: item['desc'] as String,
        location: 'Worldwide',
        eventType: 'seasonal',
      ));
    }
  }
  return events;
}
