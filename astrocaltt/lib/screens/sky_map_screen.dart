import 'dart:async';
import 'dart:math' as math;
import 'package:astrocaltt/data/sky_map_data.dart';
import 'package:astrocaltt/services/location_service.dart';
import 'package:astrocaltt/utils/responsive.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sensors_plus/sensors_plus.dart';

const double _limitingMagnitude = 5.5;

Color _spectralColor(String spec, {bool night = false}) {
  if (night) {
    switch (spec) {
      case 'O': return const Color(0xFFff6666);
      case 'B': return const Color(0xFFff7777);
      case 'A': return const Color(0xFFff8888);
      case 'F': return const Color(0xFFff9999);
      case 'G': return const Color(0xFFffaaaa);
      case 'K': return const Color(0xFFff8877);
      case 'M': return const Color(0xFFff6655);
      default: return const Color(0xFFff8888);
    }
  }
  switch (spec) {
    case 'O': return const Color(0xFF92b5ff);
    case 'B': return const Color(0xFFa2c0ff);
    case 'A': return const Color(0xFFd5e0ff);
    case 'F': return const Color(0xFFf8f4e8);
    case 'G': return const Color(0xFFfff4d6);
    case 'K': return const Color(0xFFffd2a1);
    case 'M': return const Color(0xFFffb56c);
    default: return const Color(0xFFd5e0ff);
  }
}

String _getDirectionName(double azimuth) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[(_norm360(azimuth) / 22.5).round() % 16];
}

double _norm360(double a) { while (a < 0) a += 360; while (a >= 360) a -= 360; return a; }
double _norm180(double a) { while (a < -180) a += 360; while (a > 180) a -= 360; return a; }

class SkyMapScreen extends StatefulWidget {
  const SkyMapScreen({super.key});
  @override
  State<SkyMapScreen> createState() => _SkyMapScreenState();
}

class _SkyMapScreenState extends State<SkyMapScreen> {
  DateTime _viewTime = DateTime.now();
  double _azimuth = 180, _altitude = 45, _fov = 60;
  bool _useSensorMode = false;
  StreamSubscription<CompassEvent>? _compassSub;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  bool _showStars = true, _showConstellationLines = true, _showConstellationNames = true;
  bool _showPlanets = true, _showMilkyWay = true, _showGrid = false, _showDSOs = true;
  final bool _showHorizon = true, _showCardinals = true;
  bool _nightMode = false;
  double _timeSpeed = 1;
  Timer? _timer;
  Map<String, dynamic>? _selectedObject;

  double _toRad(double deg) => deg * math.pi / 180;
  double _toDeg(double rad) => rad * 180 / math.pi;
  double _julianDate(DateTime d) => d.millisecondsSinceEpoch / 86400000 + 2440587.5;
  double _daysJ2000(DateTime d) => _julianDate(d) - 2451545;

  double _localSiderealTime(DateTime date, double lon) {
    final d = _daysJ2000(date.toUtc());
    var gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * math.pow(d / 36525, 2);
    return _norm360(_norm360(gmst) + lon);
  }

  ({double alt, double az}) _raDecToAltAz(double raH, double dec, DateTime date) {
    final lst = _localSiderealTime(date, LocationService.lon);
    final ha = _norm180(lst - raH * 15);
    final haRad = _toRad(ha), decRad = _toRad(dec), latRad = _toRad(LocationService.lat);
    final sinAlt = math.sin(decRad) * math.sin(latRad) + math.cos(decRad) * math.cos(latRad) * math.cos(haRad);
    final alt = _toDeg(math.asin(sinAlt.clamp(-1.0, 1.0)));
    var cosAz = (math.sin(decRad) - math.sin(_toRad(alt)) * math.sin(latRad)) / (math.cos(_toRad(alt)) * math.cos(latRad) + 1e-10);
    var az = _toDeg(math.acos(cosAz.clamp(-1.0, 1.0)));
    if (math.sin(haRad) > 0) az = 360 - az;
    return (alt: alt, az: az);
  }

  ({double ra, double dec}) _sunPosition(DateTime date) {
    final d = _daysJ2000(date.toUtc());
    final g = _norm360(357.529 + 0.98560028 * d);
    final q = _norm360(280.459 + 0.98564736 * d);
    final lSun = q + 1.915 * math.sin(_toRad(g)) + 0.020 * math.sin(_toRad(2 * g));
    final eps = 23.439 - 0.00000036 * d;
    final ra = _toDeg(math.atan2(math.cos(_toRad(eps)) * math.sin(_toRad(lSun)), math.cos(_toRad(lSun))));
    final dec = _toDeg(math.asin(math.sin(_toRad(eps)) * math.sin(_toRad(lSun))));
    return (ra: _norm360(ra) / 15, dec: dec);
  }

  ({double ra, double dec}) _moonPosition(DateTime date) {
    final d = _daysJ2000(date.toUtc());
    final lMoon = _norm360(218.316 + 13.176396 * d);
    final mMoon = _norm360(134.963 + 13.064993 * d);
    final fMoon = _norm360(93.272 + 13.229350 * d);
    final lon = lMoon + 6.289 * math.sin(_toRad(mMoon));
    final lat = 5.128 * math.sin(_toRad(fMoon));
    final eps = _toRad(23.439);
    final lonRad = _toRad(lon), latRad = _toRad(lat);
    final sinDec = math.sin(latRad) * math.cos(eps) + math.cos(latRad) * math.sin(eps) * math.sin(lonRad);
    final dec = _toDeg(math.asin(sinDec));
    final y = math.sin(lonRad) * math.cos(eps) - math.tan(latRad) * math.sin(eps);
    final x = math.cos(lonRad);
    return (ra: _norm360(_toDeg(math.atan2(y, x))) / 15, dec: dec);
  }

  ({double ra, double dec}) _planetPosition(Map<String, dynamic> p, DateTime date) {
    final d = _daysJ2000(date.toUtc());
    final e = p['e'] as double;
    var lP = _norm360((p['L'] as double) + (p['n'] as double) * d);
    var mP = _norm360(lP - (p['w'] as double));
    final mRad = _toRad(mP);
    final cv = (2 * e - e * e * e / 4) * math.sin(mRad) + (5 / 4) * e * e * math.sin(2 * mRad);
    final lon = _norm360(lP + _toDeg(cv));
    final lonRad = _toRad(lon);
    final latRad = _toRad((p['i'] as double) * math.sin(_toRad(lon - (p['O'] as double))));
    final eps = _toRad(23.439);
    final sinDec = math.sin(latRad) * math.cos(eps) + math.cos(latRad) * math.sin(eps) * math.sin(lonRad);
    final dec = _toDeg(math.asin(sinDec));
    final y = math.sin(lonRad) * math.cos(eps) - math.tan(latRad) * math.sin(eps);
    final x = math.cos(lonRad);
    return (ra: _norm360(_toDeg(math.atan2(y, x))) / 15, dec: dec);
  }

  ({double x, double y, bool visible}) _altAzToScreen(double alt, double az, Size size) {
    final w = size.width, h = size.height, cx = w / 2, cy = h / 2;
    final altRad = _toRad(alt), azRad = _toRad(az);
    final lookAltRad = _toRad(_altitude), lookAzRad = _toRad(_azimuth);

    // Spherical angular separation from view center
    final cosSep = math.sin(altRad) * math.sin(lookAltRad) +
        math.cos(altRad) * math.cos(lookAltRad) * math.cos(azRad - lookAzRad);
    final sepDeg = _toDeg(math.acos(cosSep.clamp(-1.0, 1.0)));
    if (sepDeg > 90) return (x: 0, y: 0, visible: false);

    // Bearing (position angle on tangent plane)
    final sinSep = math.sin(_toRad(sepDeg));
    double bearing;
    if (sinSep < 1e-6) {
      bearing = 0;
    } else {
      final sinBear = math.cos(altRad) * math.sin(azRad - lookAzRad) / sinSep;
      final cosBear = (math.sin(altRad) * math.cos(lookAltRad) -
          math.cos(altRad) * math.sin(lookAltRad) * math.cos(azRad - lookAzRad)) / sinSep;
      bearing = math.atan2(sinBear, cosBear);
    }

    // Azimuthal equidistant: uniform pixel-per-degree in all directions
    final pixPerDeg = math.min(w, h) / _fov;
    final x = cx + sepDeg * math.sin(bearing) * pixPerDeg;
    final y = cy - sepDeg * math.cos(bearing) * pixPerDeg;

    final visible = x >= -20 && x <= w + 20 && y >= -20 && y <= h + 20 && sepDeg < 90;
    return (x: x, y: y, visible: visible);
  }

  DateTime? _lastTickTime;

  @override
  void initState() {
    super.initState();
    _startTimeAnimation();
  }

  void _toggleSensorMode() {
    setState(() { _useSensorMode = !_useSensorMode; _useSensorMode ? _startSensors() : _stopSensors(); });
  }

  void _startSensors() {
    if (kIsWeb) return;
    _compassSub?.cancel(); _accelSub?.cancel();
    try {
      final cs = FlutterCompass.events;
      if (cs != null) _compassSub = cs.listen((e) { if (e.heading != null && mounted && _useSensorMode) setState(() => _azimuth = _norm360(e.heading!)); }, onError: (_) {});
    } catch (_) {}
    _accelSub = accelerometerEventStream(samplingPeriod: SensorInterval.normalInterval).listen((e) {
      if (!mounted || !_useSensorMode) return;
      final g = math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z); if (g < 5) return;
      setState(() => _altitude = _toDeg(math.asin((e.y / g).clamp(-1.0, 1.0))).clamp(0.0, 90.0));
    }, onError: (_) {});
  }

  void _stopSensors() { _compassSub?.cancel(); _accelSub?.cancel(); }

  void _startTimeAnimation() {
    _timer?.cancel(); _lastTickTime = DateTime.now();
    _timer = Timer.periodic(const Duration(milliseconds: 50), (_) {
      if (!mounted) return;
      final now = DateTime.now();
      var elapsed = _lastTickTime != null ? now.difference(_lastTickTime!).inMilliseconds : 50;
      elapsed = elapsed.clamp(0, 500);
      _lastTickTime = now;
      if (_timeSpeed == 0) return;
      setState(() { _timeSpeed == 1 ? _viewTime = DateTime.now() : _viewTime = _viewTime.add(Duration(milliseconds: (elapsed * _timeSpeed).round())); });
    });
  }

  @override
  void dispose() { _timer?.cancel(); _stopSensors(); super.dispose(); }

  void _setView(double az, [double? alt]) => setState(() { _azimuth = _norm360(az); if (alt != null) _altitude = alt.clamp(-10.0, 90.0); });
  void _resetView() => setState(() { _azimuth = 180; _altitude = 45; _fov = 60; _viewTime = DateTime.now(); _timeSpeed = 1; _selectedObject = null; });

  void _timeSlower() => setState(() {
    if (_timeSpeed == 1) _timeSpeed = 0;
    else if (_timeSpeed == 0) _timeSpeed = -60;
    else if (_timeSpeed > 0) _timeSpeed = math.max(1.0, _timeSpeed / 10);
    else _timeSpeed *= 10;
  });

  void _timeFaster() => setState(() {
    if (_timeSpeed == 0) _timeSpeed = 60;
    else if (_timeSpeed == 1) _timeSpeed = 60;
    else if (_timeSpeed > 0) _timeSpeed = math.min(86400.0, _timeSpeed * 10);
    else _timeSpeed = math.max(-86400.0, _timeSpeed / 10);
  });

  String _timeSpeedText() {
    final s = _timeSpeed;
    if (s == 0) return '⏸'; if (s == 1) return '1×'; if (s == -1) return '-1×';
    if (s.abs() >= 86400) return '${s > 0 ? '' : '-'}${(s.abs() / 86400).round()}d/s';
    if (s.abs() >= 3600) return '${s > 0 ? '' : '-'}${(s.abs() / 3600).round()}h/s';
    if (s.abs() >= 60) return '${s > 0 ? '' : '-'}${(s.abs() / 60).round()}m/s';
    return '$s×';
  }

  void _handleTap(TapUpDetails details, Size canvasSize) {
    final dx = details.localPosition.dx, dy = details.localPosition.dy;
    double closest = double.infinity;
    Map<String, dynamic>? found;

    for (final s in stars) {
      final ra = s[1] as double, dec = s[2] as double, mag = s[3] as double;
      if (mag > _limitingMagnitude) continue;
      final pos = _raDecToAltAz(ra, dec, _viewTime);
      if (pos.alt < -5) continue;
      final scr = _altAzToScreen(pos.alt, pos.az, canvasSize);
      if (!scr.visible) continue;
      final d = math.sqrt(math.pow(dx - scr.x, 2) + math.pow(dy - scr.y, 2));
      final hitR = math.max(12.0, (6 - mag) * 3);
      if (d < hitR && d < closest) {
        closest = d;
        found = {'title': s[0], 'type': 'Star (${s[4]}-class)', 'mag': mag.toStringAsFixed(2), 'ra': '${ra.toStringAsFixed(3)}h', 'dec': '${dec.toStringAsFixed(2)}°', 'alt': '${pos.alt.toStringAsFixed(1)}°', 'az': '${pos.az.toStringAsFixed(1)}°'};
      }
    }
    for (final p in planets) {
      final pos2d = _planetPosition(p, _viewTime);
      final altAz = _raDecToAltAz(pos2d.ra, pos2d.dec, _viewTime);
      if (altAz.alt < -5) continue;
      final scr = _altAzToScreen(altAz.alt, altAz.az, canvasSize);
      if (!scr.visible) continue;
      final d = math.sqrt(math.pow(dx - scr.x, 2) + math.pow(dy - scr.y, 2));
      if (d < 20 && d < closest) {
        closest = d;
        found = {'title': '${p['symbol']} ${p['name']}', 'type': 'Planet', 'alt': '${altAz.alt.toStringAsFixed(1)}°', 'az': '${altAz.az.toStringAsFixed(1)}°'};
      }
    }
    for (final dso in dsos) {
      final ra = dso[1] as double, dec = dso[2] as double, mag = dso[3] as double;
      final pos = _raDecToAltAz(ra, dec, _viewTime);
      if (pos.alt < 0) continue;
      final scr = _altAzToScreen(pos.alt, pos.az, canvasSize);
      if (!scr.visible) continue;
      final d = math.sqrt(math.pow(dx - scr.x, 2) + math.pow(dy - scr.y, 2));
      if (d < 20 && d < closest) {
        closest = d;
        final common = dso[5] as String;
        found = {'title': common.isNotEmpty ? '${dso[0]} — $common' : dso[0] as String, 'type': (dso[4] as String)[0].toUpperCase() + (dso[4] as String).substring(1), 'mag': mag.toStringAsFixed(1), 'size': '${dso[6]}′', 'alt': '${pos.alt.toStringAsFixed(1)}°', 'az': '${pos.az.toStringAsFixed(1)}°'};
      }
    }
    setState(() => _selectedObject = found);
  }

  void _showLayersSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: (_nightMode ? const Color(0xFF1a0500) : Theme.of(context).colorScheme.surface).withValues(alpha: 0.98),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: SafeArea(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Display options', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: _nightMode ? const Color(0xFFff9977) : null)),
            const SizedBox(height: 12),
            _LegendItem(label: 'Stars', on: _showStars, onTap: () { setState(() => _showStars = !_showStars); setSheetState(() {}); }),
            _LegendItem(label: 'Constellation lines', on: _showConstellationLines, onTap: () { setState(() => _showConstellationLines = !_showConstellationLines); setSheetState(() {}); }),
            _LegendItem(label: 'Constellation names', on: _showConstellationNames, onTap: () { setState(() => _showConstellationNames = !_showConstellationNames); setSheetState(() {}); }),
            _LegendItem(label: 'Planets', on: _showPlanets, onTap: () { setState(() => _showPlanets = !_showPlanets); setSheetState(() {}); }),
            _LegendItem(label: 'Deep Sky Objects', on: _showDSOs, onTap: () { setState(() => _showDSOs = !_showDSOs); setSheetState(() {}); }),
            _LegendItem(label: 'Milky Way', on: _showMilkyWay, onTap: () { setState(() => _showMilkyWay = !_showMilkyWay); setSheetState(() {}); }),
            _LegendItem(label: 'Grid', on: _showGrid, onTap: () { setState(() => _showGrid = !_showGrid); setSheetState(() {}); }),
          ])),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scale = responsiveScale(context);
    final nm = _nightMode;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Sky Map'),
        backgroundColor: nm ? const Color(0xFF1a0500) : Theme.of(context).colorScheme.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.nightlight_round, color: nm ? const Color(0xFFff6644) : Colors.white70, size: 20),
            onPressed: () => setState(() => _nightMode = !_nightMode),
            tooltip: 'Night mode',
          ),
          IconButton(
            icon: Icon(_useSensorMode ? Icons.compass_calibration : Icons.explore, color: _useSensorMode ? Theme.of(context).colorScheme.primary : null),
            onPressed: kIsWeb ? null : _toggleSensorMode,
            tooltip: _useSensorMode ? 'Live view' : 'Sensor mode',
          ),
          IconButton(icon: const Icon(Icons.my_location), onPressed: () async {
            var permission = await Geolocator.checkPermission();
            if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
            if (permission != LocationPermission.denied && permission != LocationPermission.deniedForever && mounted) {
              final pos = await Geolocator.getCurrentPosition();
              LocationService.setLocation(pos.latitude, pos.longitude);
              if (mounted) setState(() {});
            }
          }, tooltip: 'My Location'),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _resetView, tooltip: 'Reset'),
        ],
      ),
      body: LayoutBuilder(builder: (context, constraints) {
        final canvasSize = Size(constraints.maxWidth, constraints.maxHeight);
        return GestureDetector(
          onTapUp: (d) => _handleTap(d, canvasSize),
          onScaleStart: (d) { if (d.pointerCount == 2) _scaleStart = _fov; },
          onScaleUpdate: (d) {
            if (_useSensorMode) return;
            setState(() {
              if (d.pointerCount == 1) {
                final sens = _fov / math.min(constraints.maxWidth, constraints.maxHeight);
                _azimuth = _norm360(_azimuth - d.focalPointDelta.dx * sens);
                _altitude = (_altitude + d.focalPointDelta.dy * sens).clamp(-10.0, 90.0);
              } else if (d.pointerCount == 2 && _scaleStart != null) {
                _fov = (_scaleStart! / d.scale).clamp(20.0, 120.0);
              }
            });
          },
          onScaleEnd: (_) => _scaleStart = null,
          child: Listener(
            onPointerSignal: (e) { if (!_useSensorMode && e is PointerScrollEvent) setState(() => _fov = (_fov * (e.scrollDelta.dy > 0 ? 1.1 : 0.9)).clamp(10.0, 120.0)); },
            child: Stack(children: [
              CustomPaint(
                painter: _SkyPainter(
                  viewTime: _viewTime, azimuth: _azimuth, altitude: _altitude, fov: _fov,
                  lat: LocationService.lat, lon: LocationService.lon,
                  raDecToAltAz: _raDecToAltAz, altAzToScreen: _altAzToScreen,
                  sunPosition: _sunPosition, moonPosition: _moonPosition, planetPosition: _planetPosition,
                  showStars: _showStars, showConstellationLines: _showConstellationLines,
                  showConstellationNames: _showConstellationNames, showPlanets: _showPlanets,
                  showMilkyWay: _showMilkyWay, showGrid: _showGrid, showHorizon: _showHorizon,
                  showCardinals: _showCardinals, showDSOs: _showDSOs, nightMode: _nightMode,
                  toRad: _toRad, toDeg: _toDeg, norm180: _norm180,
                ),
                size: Size.infinite,
              ),
              Positioned(top: 8 * scale, left: 8 * scale, child: _DirectionButtons(onTap: _setView, scale: scale)),
              Positioned(top: 8 * scale, right: 8 * scale, child: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
                _ZoomButtons(onZoomIn: () => setState(() => _fov = (_fov * 0.8).clamp(10.0, 120.0)), onZoomOut: () => setState(() => _fov = (_fov * 1.25).clamp(10.0, 120.0)), scale: scale),
                SizedBox(height: 4 * scale),
                Material(color: nm ? const Color(0x66330000) : Colors.black38, borderRadius: BorderRadius.circular(8), child: IconButton(icon: const Icon(Icons.layers), color: Colors.white, onPressed: () => _showLayersSheet(context), iconSize: 20 * scale)),
              ])),
              Positioned(top: 165 * scale, left: 8 * scale, child: _InfoOverlay(lat: LocationService.lat, lon: LocationService.lon, fov: _fov, azimuth: _azimuth, scale: scale, nightMode: nm)),
              if (_selectedObject != null) Positioned(
                bottom: 70 * scale, left: 12, right: 12,
                child: _ObjectInfoCard(obj: _selectedObject!, nightMode: nm, onClose: () => setState(() => _selectedObject = null)),
              ),
              Positioned(left: 0, right: 0, bottom: 8, child: SafeArea(child: _TimeBar(viewTime: _viewTime, timeSpeed: _timeSpeed, timeSpeedText: _timeSpeedText(), onSlower: _timeSlower, onNow: () => setState(() { _viewTime = DateTime.now(); _timeSpeed = 1; }), onFaster: _timeFaster, scale: scale, nightMode: nm))),
            ]),
          ),
        );
      }),
    );
  }

  double? _scaleStart;
}

class _SkyPainter extends CustomPainter {
  final DateTime viewTime;
  final double azimuth, altitude, fov, lat, lon;
  final ({double alt, double az}) Function(double, double, DateTime) raDecToAltAz;
  final ({double x, double y, bool visible}) Function(double, double, Size) altAzToScreen;
  final ({double ra, double dec}) Function(DateTime) sunPosition, moonPosition;
  final ({double ra, double dec}) Function(Map<String, dynamic>, DateTime) planetPosition;
  final bool showStars, showConstellationLines, showConstellationNames;
  final bool showPlanets, showMilkyWay, showGrid, showHorizon, showCardinals, showDSOs, nightMode;
  final double Function(double) toRad, toDeg, norm180;

  _SkyPainter({
    required this.viewTime, required this.azimuth, required this.altitude, required this.fov,
    required this.lat, required this.lon, required this.raDecToAltAz, required this.altAzToScreen,
    required this.sunPosition, required this.moonPosition, required this.planetPosition,
    this.showStars = true, this.showConstellationLines = true, this.showConstellationNames = true,
    this.showPlanets = true, this.showMilkyWay = true, this.showGrid = false,
    this.showHorizon = true, this.showCardinals = true, this.showDSOs = true, this.nightMode = false,
    required this.toRad, required this.toDeg, required this.norm180,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final nm = nightMode;

    // Background gradient
    final bgGrad = LinearGradient(
      begin: Alignment.bottomCenter, end: Alignment.topCenter,
      colors: nm ? [const Color(0xFF1a0000), const Color(0xFF0a0000), const Color(0xFF0d0000)]
                  : [const Color(0xFF1a2040), const Color(0xFF0d1225), const Color(0xFF0a0d1a)],
      stops: const [0, 0.3, 1],
    );
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), Paint()..shader = bgGrad.createShader(Rect.fromLTWH(0, 0, w, h)));

    // Vignette
    final vigPaint = Paint()..shader = RadialGradient(
      center: Alignment.center, radius: 0.9,
      colors: [Colors.transparent, nm ? const Color(0x66000000) : const Color(0x59000000)],
      stops: const [0.35, 1.0],
    ).createShader(Rect.fromLTWH(0, 0, w, h));
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), vigPaint);

    // Milky Way band
    if (showMilkyWay) {
      for (final pt in milkyWayPath) {
        final ra = pt[0], dec = pt[1], mwWidth = pt[2];
        final pos = raDecToAltAz(ra, dec, viewTime);
        if (pos.alt < -10) continue;
        final scr = altAzToScreen(pos.alt, pos.az, size);
        if (!scr.visible) continue;
        final scale = math.min(w, h) / fov;
        final r = mwWidth * scale * 0.5;
        final grad = RadialGradient(
          center: Alignment.center, radius: 1,
          colors: nm
            ? [const Color(0x1F501414), const Color(0x0F3C0F0F), Colors.transparent]
            : [const Color(0x1FB4C8F0), const Color(0x0FA0B4DC), Colors.transparent],
          stops: const [0, 0.4, 1],
        );
        canvas.drawCircle(Offset(scr.x, scr.y), r, Paint()..shader = grad.createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: r)));
      }
    }

    // Grid
    if (showGrid) {
      final gridPaint = Paint()..color = nm ? const Color(0x1Fff3333) : const Color(0x266497ff)..strokeWidth = 0.5..style = PaintingStyle.stroke;
      for (var alt = 0; alt <= 90; alt += 15) {
        final path = Path(); var started = false;
        for (var az = 0; az <= 360; az += 5) {
          final scr = altAzToScreen(alt.toDouble(), az.toDouble(), size);
          if (scr.visible) { started ? path.lineTo(scr.x, scr.y) : path.moveTo(scr.x, scr.y); started = true; } else { started = false; }
        }
        if (started) canvas.drawPath(path, gridPaint);
      }
      for (var az = 0; az < 360; az += 30) {
        final path = Path(); var started = false;
        for (var alt = 0; alt <= 90; alt += 5) {
          final scr = altAzToScreen(alt.toDouble(), az.toDouble(), size);
          if (scr.visible) { started ? path.lineTo(scr.x, scr.y) : path.moveTo(scr.x, scr.y); started = true; } else { started = false; }
        }
        if (started) canvas.drawPath(path, gridPaint);
      }
    }

    // Constellations
    final starPos = <String, Offset>{};
    for (final s in stars) {
      final name = s[0] as String, ra = s[1] as double, dec = s[2] as double, mag = s[3] as double;
      if (mag > _limitingMagnitude) continue;
      final pos = raDecToAltAz(ra, dec, viewTime);
      if (pos.alt < -5) continue;
      final scr = altAzToScreen(pos.alt, pos.az, size);
      if (!scr.visible) continue;
      starPos[name] = Offset(scr.x, scr.y);
    }

    if (showConstellationLines) {
      final linePaint = Paint()..color = nm ? const Color(0x40cc4444) : const Color(0x4064b4ff)..strokeWidth = 0.6..style = PaintingStyle.stroke..strokeCap = StrokeCap.round;
      for (final c in constellations) {
        for (final seg in c.lines) {
          final pa = starPos[seg.$1], pb = starPos[seg.$2];
          if (pa != null && pb != null) canvas.drawLine(pa, pb, linePaint);
        }
      }
    }

    if (showConstellationNames && fov < 100) {
      final tp = TextPainter(textDirection: TextDirection.ltr);
      for (final c in constellations) {
        final cAlt = raDecToAltAz(c.center[0], c.center[1], viewTime);
        if (cAlt.alt < 0) continue;
        final scr = altAzToScreen(cAlt.alt, cAlt.az, size);
        if (!scr.visible) continue;
        tp.text = TextSpan(text: c.name, style: GoogleFonts.outfit(color: nm ? const Color(0x99ff6644) : const Color(0x9996c8ff), fontSize: 11));
        tp.layout();
        tp.paint(canvas, Offset(scr.x - tp.width / 2, scr.y));
      }
    }

    // Stars (enhanced rendering)
    if (showStars) {
      for (final s in stars) {
        final name = s[0] as String, ra = s[1] as double, dec = s[2] as double, mag = s[3] as double, spectral = s[4] as String;
        if (mag > _limitingMagnitude) continue;
        final p = starPos[name]; if (p == null) continue;
        final pos = raDecToAltAz(ra, dec, viewTime);
        final atmFactor = pos.alt < 15 ? 0.4 + 0.6 * (pos.alt / 15) : 1.0;
        final color = _spectralColor(spectral, night: nm);
        final r = math.max(0.3, (6.5 - mag) * 0.9) * atmFactor;

        // Outer halo for bright stars
        if (mag < 2.0) {
          final haloR = r * (mag < 0.5 ? 8 : mag < 1.0 ? 6 : 4.5);
          canvas.drawCircle(p, haloR, Paint()..shader = RadialGradient(
            center: Alignment.center, radius: 1,
            colors: [color.withValues(alpha: 0.25 * atmFactor), color.withValues(alpha: 0.05 * atmFactor), Colors.transparent],
            stops: const [0, 0.4, 1],
          ).createShader(Rect.fromCircle(center: p, radius: haloR)));
        }

        // Diffraction spikes for mag < 0.5
        if (mag < 0.5 && !nm) {
          final spikeLen = r * (mag < -0.5 ? 18 : 12);
          final spikePaint = Paint()..color = color.withValues(alpha: 0.15 * atmFactor)..strokeWidth = 0.8..style = PaintingStyle.stroke;
          canvas.drawLine(Offset(p.dx - spikeLen, p.dy), Offset(p.dx + spikeLen, p.dy), spikePaint);
          canvas.drawLine(Offset(p.dx, p.dy - spikeLen), Offset(p.dx, p.dy + spikeLen), spikePaint);
        }

        // Inner glow
        if (mag < 2.5) {
          final innerR = r * 2.5;
          canvas.drawCircle(p, innerR, Paint()..shader = RadialGradient(
            center: Alignment.center, radius: 1,
            colors: [color.withValues(alpha: 0.5 * atmFactor), color.withValues(alpha: 0.1 * atmFactor), Colors.transparent],
            stops: const [0, 0.5, 1],
          ).createShader(Rect.fromCircle(center: p, radius: innerR)));
        }

        // Core
        canvas.drawCircle(p, r, Paint()..color = color.withValues(alpha: math.min(1, 0.5 + (6 - mag) * 0.1) * atmFactor));

        // White center for mag < 1
        if (mag < 1.0) canvas.drawCircle(p, r * 0.4, Paint()..color = (nm ? const Color(0xFFffcccc) : Colors.white).withValues(alpha: 0.8 * atmFactor));

        // Label
        if (mag < 1.8 && fov < 90) {
          final tp = TextPainter(textDirection: TextDirection.ltr);
          tp.text = TextSpan(text: name, style: GoogleFonts.outfit(color: nm ? const Color(0xB3ff6644) : const Color(0xB3c8dcff), fontSize: mag < 0.5 ? 12 : 11));
          tp.layout();
          tp.paint(canvas, Offset(p.dx + r + 5, p.dy - 6));
        }
      }
    }

    // DSOs
    if (showDSOs) {
      for (final dso in dsos) {
        final ra = dso[1] as double, dec = dso[2] as double, mag = dso[3] as double;
        final type = dso[4] as String, common = dso[5] as String, arcmin = (dso[6] as num).toDouble();
        if (mag > _limitingMagnitude + 1.5) continue;
        final pos = raDecToAltAz(ra, dec, viewTime);
        if (pos.alt < 0) continue;
        final scr = altAzToScreen(pos.alt, pos.az, size);
        if (!scr.visible) continue;
        final sc = math.min(w, h) / fov;
        final angSize = math.max(arcmin / 60, 0.3);
        final r = math.max(angSize * sc * 0.5, 4.0);
        final alpha = math.max(0.3, math.min(0.8, (8 - mag) * 0.12));

        if (type == 'galaxy') {
          canvas.save();
          canvas.translate(scr.x, scr.y);
          canvas.rotate(0.2 * math.pi);
          canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: r * 2, height: r), Paint()..shader = RadialGradient(
            center: Alignment.center, radius: 1,
            colors: [nm ? Color.fromRGBO(200, 80, 60, 0.5 * alpha) : Color.fromRGBO(255, 230, 180, 0.5 * alpha),
                     nm ? Color.fromRGBO(160, 50, 40, 0.2 * alpha) : Color.fromRGBO(220, 200, 160, 0.2 * alpha), Colors.transparent],
            stops: const [0, 0.4, 1],
          ).createShader(Rect.fromCenter(center: Offset.zero, width: r * 2, height: r)));
          canvas.restore();
        } else if (type == 'nebula') {
          canvas.drawCircle(Offset(scr.x, scr.y), r, Paint()..shader = RadialGradient(
            center: Alignment.center, radius: 1,
            colors: [nm ? Color.fromRGBO(200, 60, 80, 0.5 * alpha) : Color.fromRGBO(180, 120, 200, 0.5 * alpha),
                     nm ? Color.fromRGBO(160, 40, 60, 0.2 * alpha) : Color.fromRGBO(120, 180, 200, 0.2 * alpha), Colors.transparent],
            stops: const [0, 0.4, 1],
          ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: r)));
        } else {
          final clusterPaint = Paint()..color = (nm ? const Color(0x66cc4444) : const Color(0x66c8dcff))..strokeWidth = 0.8..style = PaintingStyle.stroke;
          canvas.drawCircle(Offset(scr.x, scr.y), r, clusterPaint);
        }

        if (fov < 70 && mag < 7) {
          final label = common.isNotEmpty ? common : dso[0] as String;
          final tp = TextPainter(textDirection: TextDirection.ltr);
          tp.text = TextSpan(text: label, style: GoogleFonts.outfit(color: nm ? const Color(0xB3cc6644) : const Color(0xB3b4c8f0), fontSize: 10));
          tp.layout();
          tp.paint(canvas, Offset(scr.x + r + 4, scr.y - 4));
        }
      }
    }

    // Sun
    final sp = sunPosition(viewTime);
    final sunAltAz = raDecToAltAz(sp.ra, sp.dec, viewTime);
    if (sunAltAz.alt > -10) {
      final scr = altAzToScreen(sunAltAz.alt, sunAltAz.az, size);
      if (scr.visible) {
        canvas.drawCircle(Offset(scr.x, scr.y), 30, Paint()..shader = RadialGradient(
          center: Alignment.center, radius: 1,
          colors: nm ? [const Color(0x66cc4400), const Color(0x22b03000), Colors.transparent] : [const Color(0x80ffff98), const Color(0x44ffdd50), Colors.transparent],
          stops: const [0, 0.4, 1],
        ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: 30)));
        canvas.drawCircle(Offset(scr.x, scr.y), 8, Paint()..color = nm ? const Color(0xFFcc4400) : const Color(0xFFffee44));
        canvas.drawCircle(Offset(scr.x, scr.y), 4, Paint()..color = nm ? const Color(0xFFff6600) : const Color(0xFFffffaa));
      }
    }

    // Moon
    final mp = moonPosition(viewTime);
    final moonAltAz = raDecToAltAz(mp.ra, mp.dec, viewTime);
    if (moonAltAz.alt > -5) {
      final scr = altAzToScreen(moonAltAz.alt, moonAltAz.az, size);
      if (scr.visible) {
        canvas.drawCircle(Offset(scr.x, scr.y), 20, Paint()..shader = RadialGradient(
          center: Alignment.center, radius: 1,
          colors: nm ? [const Color(0x4D963C28), const Color(0x1A783C1E), Colors.transparent] : [const Color(0x59fffff0), const Color(0x1Ae6e6d2), Colors.transparent],
          stops: const [0, 0.5, 1],
        ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: 20)));
        canvas.drawCircle(Offset(scr.x, scr.y), 7, Paint()..color = nm ? const Color(0xFFaa6644) : const Color(0xFFf0edd8));
      }
    }

    // Planets
    if (showPlanets) {
      for (final p in planets) {
        final pos2d = planetPosition(p, viewTime);
        final altAz = raDecToAltAz(pos2d.ra, pos2d.dec, viewTime);
        if (altAz.alt < -5) continue;
        final scr = altAzToScreen(altAz.alt, altAz.az, size);
        if (!scr.visible) continue;
        final pColor = nm ? const Color(0xFFff8866) : Color(p['color'] as int);
        final r = (p['size'] as num).toDouble();

        canvas.drawCircle(Offset(scr.x, scr.y), r * 4, Paint()..shader = RadialGradient(
          center: Alignment.center, radius: 1,
          colors: [pColor.withValues(alpha: 0.35), pColor.withValues(alpha: 0.08), Colors.transparent],
          stops: const [0, 0.4, 1],
        ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: r * 4)));
        canvas.drawCircle(Offset(scr.x, scr.y), r, Paint()..color = pColor);
        canvas.drawCircle(Offset(scr.x, scr.y), r * 0.35, Paint()..color = Colors.white.withValues(alpha: 0.35));

        // Saturn rings
        if (p['name'] == 'Saturn') {
          canvas.save();
          canvas.translate(scr.x, scr.y);
          canvas.rotate(-0.3);
          canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: r * 4.4, height: r * 1.2), Paint()..color = pColor.withValues(alpha: 0.4)..style = PaintingStyle.stroke..strokeWidth = 1.5);
          canvas.restore();
        }

        // Jupiter bands
        if (p['name'] == 'Jupiter' && fov < 40) {
          final bandPaint = Paint()..color = pColor.withValues(alpha: 0.25)..strokeWidth = 0.5..style = PaintingStyle.stroke;
          canvas.drawLine(Offset(scr.x - r * 0.8, scr.y - 2), Offset(scr.x + r * 0.8, scr.y - 2), bandPaint);
          canvas.drawLine(Offset(scr.x - r * 0.8, scr.y + 2), Offset(scr.x + r * 0.8, scr.y + 2), bandPaint);
        }

        // Label
        final tp = TextPainter(textDirection: TextDirection.ltr);
        tp.text = TextSpan(text: '${p['symbol']} ${p['name']}', style: GoogleFonts.outfit(color: pColor, fontSize: 11));
        tp.layout();
        tp.paint(canvas, Offset(scr.x - tp.width / 2, scr.y + r + 8));
      }
    }

    // Horizon gradient
    if (showHorizon) {
      final horizonPath = Path();
      var started = false;
      for (var az = 0; az <= 360; az += 4) {
        final scr = altAzToScreen(0, az.toDouble(), size);
        if (scr.visible && scr.x >= 0 && scr.x <= w && scr.y >= 0 && scr.y <= h) {
          started ? horizonPath.lineTo(scr.x, scr.y) : horizonPath.moveTo(scr.x, scr.y); started = true;
        } else { started = false; }
      }
      if (started) canvas.drawPath(horizonPath, Paint()..color = nm ? const Color(0x66783C1E) : const Color(0x59649380)..strokeWidth = 1..style = PaintingStyle.stroke);
    }

    if (showCardinals) {
      const cardinals = [0, 45, 90, 135, 180, 225, 270, 315];
      const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      final tp = TextPainter(textDirection: TextDirection.ltr);
      for (var i = 0; i < cardinals.length; i++) {
        final scr = altAzToScreen(1, cardinals[i].toDouble(), size);
        if (scr.visible && scr.x > 20 && scr.x < w - 20 && scr.y > 20 && scr.y < h - 20) {
          tp.text = TextSpan(text: labels[i], style: GoogleFonts.outfit(
            color: labels[i] == 'N' ? (nm ? const Color(0xFFff4444) : const Color(0xFFff6666)) : (nm ? const Color(0xFFff4444) : const Color(0xFFffcc00)),
            fontSize: 14, fontWeight: FontWeight.bold,
          ));
          tp.layout();
          tp.paint(canvas, Offset(scr.x - tp.width / 2, scr.y - tp.height / 2));
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SkyPainter old) =>
      old.viewTime != viewTime || old.azimuth != azimuth || old.altitude != altitude || old.fov != fov ||
      old.showStars != showStars || old.showConstellationLines != showConstellationLines ||
      old.showConstellationNames != showConstellationNames || old.showPlanets != showPlanets ||
      old.showMilkyWay != showMilkyWay || old.showGrid != showGrid || old.showHorizon != showHorizon ||
      old.showCardinals != showCardinals || old.showDSOs != showDSOs || old.nightMode != nightMode;
}

// UI Widgets

class _DirectionButtons extends StatelessWidget {
  final void Function(double, [double?]) onTap;
  final double scale;
  const _DirectionButtons({required this.onTap, this.scale = 1});
  @override
  Widget build(BuildContext context) {
    return Material(color: Colors.black38, borderRadius: BorderRadius.circular(8 * scale), child: Padding(padding: EdgeInsets.all(4 * scale), child: Column(mainAxisSize: MainAxisSize.min, children: [
      _DirBtn(label: 'N', az: 0, alt: 45, onTap: onTap, scale: scale),
      Row(mainAxisSize: MainAxisSize.min, children: [_DirBtn(label: 'NW', az: 315, alt: 45, onTap: onTap, scale: scale), _DirBtn(label: '↑', az: 180, alt: 90, onTap: onTap, scale: scale), _DirBtn(label: 'NE', az: 45, alt: 45, onTap: onTap, scale: scale)]),
      Row(mainAxisSize: MainAxisSize.min, children: [_DirBtn(label: 'W', az: 270, alt: 45, onTap: onTap, scale: scale), SizedBox(width: 32 * scale, height: 32 * scale), _DirBtn(label: 'E', az: 90, alt: 45, onTap: onTap, scale: scale)]),
      Row(mainAxisSize: MainAxisSize.min, children: [_DirBtn(label: 'SW', az: 225, alt: 45, onTap: onTap, scale: scale), SizedBox(width: 32 * scale, height: 32 * scale), _DirBtn(label: 'SE', az: 135, alt: 45, onTap: onTap, scale: scale)]),
      _DirBtn(label: 'S', az: 180, alt: 45, onTap: onTap, scale: scale),
    ])));
  }
}

class _DirBtn extends StatelessWidget {
  final String label; final double az, alt; final void Function(double, [double?]) onTap; final double scale;
  const _DirBtn({required this.label, required this.az, required this.alt, required this.onTap, this.scale = 1});
  @override
  Widget build(BuildContext context) {
    final sz = 28 * scale;
    return InkWell(onTap: () => onTap(az, alt), borderRadius: BorderRadius.circular(4), child: SizedBox(width: sz, height: sz, child: Center(child: Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold, fontSize: (11 * scale).clamp(9, 14))))));
  }
}

class _ZoomButtons extends StatelessWidget {
  final VoidCallback onZoomIn, onZoomOut; final double scale;
  const _ZoomButtons({required this.onZoomIn, required this.onZoomOut, this.scale = 1});
  @override
  Widget build(BuildContext context) => Material(color: Colors.black38, borderRadius: BorderRadius.circular(8 * scale), child: Padding(padding: EdgeInsets.all(4 * scale), child: Column(mainAxisSize: MainAxisSize.min, children: [
    IconButton(icon: const Icon(Icons.add), onPressed: onZoomIn, iconSize: 20 * scale, color: Colors.white),
    IconButton(icon: const Icon(Icons.remove), onPressed: onZoomOut, iconSize: 20 * scale, color: Colors.white),
  ])));
}

class _InfoOverlay extends StatelessWidget {
  final double lat, lon, fov, azimuth, scale;
  final bool nightMode;
  const _InfoOverlay({required this.lat, required this.lon, required this.fov, required this.azimuth, this.scale = 1, this.nightMode = false});
  @override
  Widget build(BuildContext context) {
    final fs = (12 * scale).clamp(10.0, 16.0);
    final color = nightMode ? const Color(0xFFcc6644) : const Color(0xFF96b8ff);
    return Material(color: nightMode ? const Color(0x88330000) : Colors.black54, borderRadius: BorderRadius.circular(8 * scale), child: Padding(padding: EdgeInsets.all(8 * scale), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      Text('📍 ${lat.toStringAsFixed(2)}°, ${lon.toStringAsFixed(2)}°', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: color, fontSize: fs)),
      Text('🔭 ${fov.toStringAsFixed(0)}° • ${_getDirectionName(azimuth)}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: color, fontSize: fs)),
    ])));
  }
}

class _ObjectInfoCard extends StatelessWidget {
  final Map<String, dynamic> obj;
  final bool nightMode;
  final VoidCallback onClose;
  const _ObjectInfoCard({required this.obj, required this.nightMode, required this.onClose});
  @override
  Widget build(BuildContext context) {
    final nm = nightMode;
    return Material(
      color: nm ? const Color(0xEE1a0500) : const Color(0xEE0a0f23),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: nm ? const Color(0x66cc4444) : const Color(0x666497ff)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            Expanded(child: Text(obj['title'] ?? '', style: GoogleFonts.orbitron(color: nm ? const Color(0xFFff9977) : const Color(0xFFe0eaff), fontSize: 14, fontWeight: FontWeight.w600))),
            IconButton(icon: Icon(Icons.close, size: 18, color: nm ? const Color(0xFFcc6644) : Colors.white54), onPressed: onClose, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
          ]),
          const SizedBox(height: 4),
          ...obj.entries.where((e) => e.key != 'title').map((e) => Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text('${e.key[0].toUpperCase()}${e.key.substring(1)}: ${e.value}', style: GoogleFonts.outfit(color: nm ? const Color(0xFFcc8866) : const Color(0xFFa0b8e0), fontSize: 12)),
          )),
        ]),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final String label; final bool on; final VoidCallback onTap;
  const _LegendItem({required this.label, required this.on, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, child: Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(on ? Icons.check_box : Icons.check_box_outline_blank, size: 16, color: on ? Colors.white70 : Colors.white38),
    const SizedBox(width: 6),
    Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: on ? Colors.white : Colors.white54, fontSize: 12)),
  ])));
}

class _TimeBar extends StatelessWidget {
  final DateTime viewTime; final double timeSpeed; final String timeSpeedText;
  final VoidCallback onSlower, onNow, onFaster; final double scale; final bool nightMode;
  const _TimeBar({required this.viewTime, required this.timeSpeed, required this.timeSpeedText, required this.onSlower, required this.onNow, required this.onFaster, this.scale = 1, this.nightMode = false});
  @override
  Widget build(BuildContext context) {
    final isLive = (viewTime.difference(DateTime.now()).inSeconds.abs() < 60);
    final nm = nightMode;
    final timeColor = isLive ? (nm ? const Color(0xFFff6644) : const Color(0xFF7dd3fc)) : (nm ? const Color(0xFFff8844) : const Color(0xFFfbbf24));
    final fs = (12 * scale).clamp(10.0, 14.0);
    return Center(child: Container(
      padding: EdgeInsets.symmetric(horizontal: 12 * scale, vertical: 6 * scale),
      decoration: BoxDecoration(color: nm ? const Color(0x88330000) : Colors.black54, borderRadius: BorderRadius.circular(8 * scale)),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
        IconButton(icon: const Icon(Icons.replay_10), onPressed: onSlower, color: Colors.white, iconSize: 20 * scale),
        Text(timeSpeedText, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70, fontSize: fs)),
        IconButton(icon: const Icon(Icons.access_time), onPressed: onNow, color: Colors.white, iconSize: 20 * scale),
        IconButton(icon: const Icon(Icons.forward_10), onPressed: onFaster, color: Colors.white, iconSize: 20 * scale),
        SizedBox(width: 8 * scale),
        Text('${viewTime.hour.toString().padLeft(2, '0')}:${viewTime.minute.toString().padLeft(2, '0')}:${viewTime.second.toString().padLeft(2, '0')}',
          style: GoogleFonts.orbitron(color: timeColor, fontSize: (14 * scale).clamp(12.0, 18.0), fontWeight: FontWeight.w600)),
        SizedBox(width: 4 * scale),
        Text('${viewTime.month.toString().padLeft(2, '0')}/${viewTime.day.toString().padLeft(2, '0')}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: timeColor.withValues(alpha: 0.8), fontSize: fs)),
      ]),
    ));
  }
}
