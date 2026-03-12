import 'dart:convert';
import 'package:astrocaltt/data/astro_data.dart';
import 'package:astrocaltt/models/event_model.dart';
import 'package:http/http.dart' as http;

const String _nasaApiKey = 'X2dVwncjWkOz6OrVnWpO16W5eWE6NaAXz3BHH67Q';
const String _nasaBaseUrl = 'https://api.nasa.gov';

/// Fetch NASA APOD (Astronomy Picture of the Day)
Future<AstroEvent?> fetchAPOD() async {
  try {
    final url = Uri.parse('$_nasaBaseUrl/planetary/apod?api_key=$_nasaApiKey');
    final res = await http.get(url).timeout(const Duration(seconds: 15));
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return AstroEvent(
      id: 'apod-${data['date']}',
      title: data['title'] ?? 'NASA Astronomy Picture of the Day',
      category: 'apod',
      datetime: DateTime.parse('${data['date']}T12:00:00Z'),
      description: data['explanation'] ?? 'Daily astronomy image from NASA.',
      location: 'NASA',
      imageUrl: data['url'] as String?,
      hdImageUrl: data['hdurl'] as String?,
      thumbnailUrl: data['thumbnail_url'] as String?,
      mediaType: data['media_type'] as String?,
      source: 'NASA APOD',
    );
  } catch (_) {
    return null;
  }
}

/// Fetch ISS positions and create pass events
Future<List<AstroEvent>> fetchISSPasses(double lat, double lon) async {
  try {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final timestamps = List.generate(10, (i) => now + (i * 90 * 60)).join(',');
    final url = Uri.parse('https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=$timestamps');
    final res = await http.get(url).timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) return [];
    final positions = jsonDecode(res.body) as List;
    final locationName = (lat == laBreaLat && lon == laBrealon) ? 'La Brea, Trinidad & Tobago' : 'Your Location';
    return positions.map<AstroEvent>((p) {
      final ts = p['timestamp'] as int;
      final rise = DateTime.fromMillisecondsSinceEpoch(ts * 1000);
      return AstroEvent(
        id: 'iss-pass-$ts',
        title: 'ISS Pass Over $locationName',
        category: 'iss',
        datetime: rise,
        description: 'The International Space Station will be visible for approximately 4 minutes. Look for a bright, fast-moving point of light.',
        location: locationName,
        visibility: {
          'direction': 'Variable',
          'peak': rise.toIso8601String(),
          'elevation': p['altitude'] != null ? '${(p['altitude'] as num).toInt()} km' : 'Variable',
          'duration': '4 min',
        },
      );
    }).toList();
  } catch (_) {
    return [];
  }
}

/// Fetch NASA DONKI (solar flares, CMEs)
Future<List<AstroEvent>> fetchDONKI() async {
  try {
    final now = DateTime.now();
    final start = now.subtract(const Duration(days: 30));
    final end = now.add(const Duration(days: 30));
    final startDate = '${start.year}-${start.month.toString().padLeft(2, '0')}-${start.day.toString().padLeft(2, '0')}';
    final endDate = '${end.year}-${end.month.toString().padLeft(2, '0')}-${end.day.toString().padLeft(2, '0')}';

    final events = <AstroEvent>[];

    final flrUrl = Uri.parse('$_nasaBaseUrl/DONKI/FLR?startDate=$startDate&endDate=$endDate&api_key=$_nasaApiKey');
    final flrRes = await http.get(flrUrl).timeout(const Duration(seconds: 10));
    if (flrRes.statusCode == 200) {
      final flrData = jsonDecode(flrRes.body);
      if (flrData is List) {
        for (final e in flrData) {
          final dt = e['peakTime'] ?? e['beginTime'] ?? DateTime.now().toUtc().toIso8601String();
          events.add(AstroEvent(
            id: 'donki-flr-${e['flrID'] ?? e.hashCode}',
            title: 'Solar Flare ${e['classType'] ?? 'Event'}',
            category: 'solar',
            datetime: DateTime.parse(dt.toString()),
            description: 'Solar flare detected. Class: ${e['classType'] ?? 'Unknown'}. Source location: ${e['sourceLocation'] ?? 'Unknown'}.',
            location: 'Sun',
            source: 'NASA DONKI',
          ));
        }
      }
    }

    final cmeUrl = Uri.parse('$_nasaBaseUrl/DONKI/CME?startDate=$startDate&endDate=$endDate&api_key=$_nasaApiKey');
    final cmeRes = await http.get(cmeUrl).timeout(const Duration(seconds: 10));
    if (cmeRes.statusCode == 200) {
      final cmeData = jsonDecode(cmeRes.body);
      if (cmeData is List) {
        for (final e in cmeData) {
          final dt = e['startTime'] ?? DateTime.now().toUtc().toIso8601String();
          events.add(AstroEvent(
            id: 'donki-cme-${e['activityID'] ?? e.hashCode}',
            title: 'Coronal Mass Ejection (CME)',
            category: 'solar',
            datetime: DateTime.parse(dt.toString()),
            description: 'CME detected. Speed: ${e['speed'] ?? 'Unknown'} km/s. Type: ${e['cmeType'] ?? 'Unknown'}.',
            location: 'Sun',
            source: 'NASA DONKI',
          ));
        }
      }
    }

    return events;
  } catch (_) {
    return [];
  }
}

/// Fetch NASA EONET (natural events - fireballs, aurora, volcanoes)
Future<List<AstroEvent>> fetchEONET() async {
  try {
    final url = Uri.parse('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50');
    final res = await http.get(url).timeout(const Duration(seconds: 15));
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final rawEvents = data['events'] as List? ?? [];
    final events = <AstroEvent>[];
    const astroIds = ['fireballs', 'aurora', 'volcanoes', 'severeStorms'];
    for (final e in rawEvents) {
      final categories = e['categories'] as List? ?? [];
      final match = categories.any((c) {
        final id = (c['id'] ?? '').toString().toLowerCase();
        final title = (c['title'] ?? c['name'] ?? '').toString().toLowerCase();
        return astroIds.any((a) => id.contains(a) || title.contains('fireball') || title.contains('aurora'));
      });
      if (!match) continue;
      final geometry = e['geometry'] as List?;
      final geom = geometry?.isNotEmpty == true ? geometry!.first : null;
      final coords = geom?['coordinates'];
      final dt = geom?['date'] ?? DateTime.now().toUtc().toIso8601String();
      final location = coords != null && coords is List
          ? '${(coords[1] as num).toStringAsFixed(2)}°, ${(coords[0] as num).toStringAsFixed(2)}°'
          : 'Earth';
      final cat = categories.isNotEmpty ? categories.first : null;
      events.add(AstroEvent(
        id: 'eonet-${e['id']}',
        title: e['title'] ?? 'Natural Event',
        category: 'natural',
        datetime: DateTime.parse(dt.toString()),
        description: '${cat?['title'] ?? ''}: ${e['title'] ?? 'Natural event detected by NASA EONET.'}',
        location: location,
        source: 'NASA EONET',
      ));
    }
    return events;
  } catch (_) {
    return [];
  }
}

double _moonPhase(DateTime d) {
  final knownNewMoon = DateTime.utc(2025, 1, 11);
  final days = d.difference(knownNewMoon).inDays.toDouble();
  return (days % 29.53) / 29.53;
}

String _moonPhaseName(double p) {
  if (p < 0.01) return 'New Moon';
  if (p < 0.25) return 'Waxing Crescent';
  if (p < 0.26) return 'First Quarter';
  if (p < 0.5) return 'Waxing Gibbous';
  if (p < 0.51) return 'Full Moon';
  if (p < 0.75) return 'Waning Gibbous';
  if (p < 0.76) return 'Last Quarter';
  return 'Waning Crescent';
}

/// Fetch Open-Meteo astronomy (sunrise, sunset, moon phase)
Future<List<AstroEvent>> fetchOpenMeteoAstronomy(double lat, double lon) async {
  try {
    final date = DateTime.now().toIso8601String().split('T')[0];
    final url = Uri.parse(
      'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon'
      '&daily=sunrise,sunset'
      '&timezone=America/Port_of_Spain'
      '&start_date=$date&end_date=$date',
    );
    final res = await http.get(url).timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final daily = data['daily'];
    if (daily == null) return [];

    final events = <AstroEvent>[];
    final moonPhase = _moonPhase(DateTime.now());
    final moonName = _moonPhaseName(moonPhase);
    events.add(AstroEvent(
      id: 'astronomy-moon-$date',
      title: 'Moon Phase: $moonName',
      category: 'astronomy',
      datetime: DateTime.parse('${date}T12:00:00Z'),
      description: 'Current moon phase: $moonName. Illumination: ${(moonPhase * 100).round()}%',
      location: 'Lat: ${lat.toStringAsFixed(2)}°, Lon: ${lon.toStringAsFixed(2)}°',
      source: 'Open-Meteo Astronomy',
    ));

    for (final field in ['sunrise', 'sunset']) {
      final values = daily[field];
      if (values is List && values.isNotEmpty && values[0] != null) {
        final timeStr = values[0].toString();
        events.add(AstroEvent(
          id: 'astronomy-$field-$date',
          title: field == 'sunrise' ? 'Sunrise' : 'Sunset',
          category: 'astronomy',
          datetime: DateTime.tryParse(timeStr) ?? DateTime.parse('${date}T12:00:00Z'),
          description: '${field == 'sunrise' ? 'Sunrise' : 'Sunset'} time for your location: $timeStr',
          location: 'Lat: ${lat.toStringAsFixed(2)}°, Lon: ${lon.toStringAsFixed(2)}°',
          source: 'Open-Meteo Astronomy',
        ));
      }
    }
    return events;
  } catch (_) {
    return [];
  }
}

/// Generate planet visibility events (simplified)
List<AstroEvent> fetchPlanetVisibility(double lat, double lon) {
  final now = DateTime.now();
  final dateStr = now.toIso8601String().split('T')[0];
  final month = now.month;
  final events = <AstroEvent>[];

  events.add(AstroEvent(
    id: 'planet-jupiter-$dateStr',
    title: 'Jupiter Visible Tonight',
    category: 'planet',
    datetime: DateTime.parse('${dateStr}T20:00:00Z'),
    description: 'Jupiter is currently visible in the evening sky. Look for it as a bright, steady point of light. Best viewing in the evening when high in the sky.',
    location: 'Look East to South',
    visibility: {'direction': 'East to South', 'peak': 'Evening to Late Night', 'elevation': 'High'},
    source: 'Current Planet Visibility',
  ));
  events.add(AstroEvent(
    id: 'planet-saturn-$dateStr',
    title: 'Saturn Visible Tonight',
    category: 'planet',
    datetime: DateTime.parse('${dateStr}T20:00:00Z'),
    description: 'Saturn is currently visible in the evening sky. It appears as a golden-yellow point of light. Best viewed with a telescope to see its rings.',
    location: 'Look South to Southwest',
    visibility: {'direction': 'South to Southwest', 'peak': 'Evening to Late Night', 'elevation': 'Mid to high'},
    source: 'Current Planet Visibility',
  ));
  final venusMorning = month < 3 || month > 8;
  events.add(AstroEvent(
    id: 'planet-venus-$dateStr',
    title: 'Venus Visible ${venusMorning ? 'Before Sunrise' : 'After Sunset'}',
    category: 'planet',
    datetime: venusMorning ? DateTime.parse('${dateStr}T06:00:00Z') : DateTime.parse('${dateStr}T19:00:00Z'),
    description: "Venus is currently visible as a bright 'star' in the ${venusMorning ? 'morning' : 'evening'} sky. It's the brightest planet and easy to spot.",
    location: venusMorning ? 'Look East near horizon' : 'Look West near horizon',
    visibility: {'direction': venusMorning ? 'East' : 'West', 'peak': venusMorning ? 'Before Sunrise' : 'After Sunset', 'elevation': 'Low'},
    source: 'Current Planet Visibility',
  ));
  return events;
}
