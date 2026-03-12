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

/// Spectral type to star color
Color _spectralColor(String spec) {
  switch (spec) {
    case 'O': case 'B': return const Color(0xFFaaccff);
    case 'A': return const Color(0xFFffffff);
    case 'F': return const Color(0xFFffffcc);
    case 'G': return const Color(0xFFffff99);
    case 'K': return const Color(0xFFffcc66);
    case 'M': return const Color(0xFFff9966);
    default: return const Color(0xFFffffff);
  }
}

String _getDirectionName(double azimuth) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  final idx = (_norm360(azimuth) / 22.5).round() % 16;
  return dirs[idx];
}

double _norm360(double a) {
  while (a < 0) {
    a += 360;
  }
  while (a >= 360) {
    a -= 360;
  }
  return a;
}

double _norm180(double a) {
  while (a < -180) {
    a += 360;
  }
  while (a > 180) {
    a -= 360;
  }
  return a;
}

class SkyMapScreen extends StatefulWidget {
  const SkyMapScreen({super.key});

  @override
  State<SkyMapScreen> createState() => _SkyMapScreenState();
}

class _SkyMapScreenState extends State<SkyMapScreen> {
  DateTime _viewTime = DateTime.now();
  double _azimuth = 180;
  double _altitude = 45;
  double _fov = 60;
  bool _useSensorMode = false;
  StreamSubscription<CompassEvent>? _compassSub;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  bool _showStars = true;
  bool _showConstellationLines = true;
  bool _showConstellationNames = true;
  bool _showPlanets = true;
  bool _showMilkyWay = true;
  bool _showGrid = false;
  final bool _showHorizon = true;
  final bool _showCardinals = true;
  double _timeSpeed = 1; // 1=realtime, 0=pause, 60=1min/sec
  Timer? _timer;

  double _toRad(double deg) => deg * math.pi / 180;
  double _toDeg(double rad) => rad * 180 / math.pi;

  double _julianDate(DateTime d) => d.millisecondsSinceEpoch / 86400000 + 2440587.5;
  double _daysJ2000(DateTime d) => _julianDate(d) - 2451545;

  double _localSiderealTime(DateTime date, double lon) {
    final utc = date.toUtc();
    final d = _daysJ2000(utc);
    var gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * math.pow(d / 36525, 2);
    gmst = _norm360(gmst);
    return _norm360(gmst + lon);
  }

  ({double alt, double az}) _raDecToAltAz(double raH, double dec, DateTime date) {
    final lst = _localSiderealTime(date, LocationService.lon);
    final ha = _norm180(lst - raH * 15);
    final haRad = _toRad(ha);
    final decRad = _toRad(dec);
    final latRad = _toRad(LocationService.lat);
    final sinAlt = math.sin(decRad) * math.sin(latRad) + math.cos(decRad) * math.cos(latRad) * math.cos(haRad);
    final alt = _toDeg(math.asin(sinAlt.clamp(-1.0, 1.0)));
    var cosAz = (math.sin(decRad) - math.sin(_toRad(alt)) * math.sin(latRad)) / (math.cos(_toRad(alt)) * math.cos(latRad) + 1e-10);
    cosAz = cosAz.clamp(-1.0, 1.0);
    var az = _toDeg(math.acos(cosAz));
    if (math.sin(haRad) > 0) az = 360 - az;
    return (alt: alt, az: az);
  }

  ({double ra, double dec}) _sunPosition(DateTime date) {
    final utc = date.toUtc();
    final d = _daysJ2000(utc);
    final g = _norm360(357.529 + 0.98560028 * d);
    final q = _norm360(280.459 + 0.98564736 * d);
    final L = q + 1.915 * math.sin(_toRad(g)) + 0.020 * math.sin(_toRad(2 * g));
    final eps = 23.439 - 0.00000036 * d;
    final ra = _toDeg(math.atan2(math.cos(_toRad(eps)) * math.sin(_toRad(L)), math.cos(_toRad(L))));
    final dec = _toDeg(math.asin(math.sin(_toRad(eps)) * math.sin(_toRad(L))));
    return (ra: _norm360(ra) / 15, dec: dec);
  }

  ({double ra, double dec}) _moonPosition(DateTime date) {
    final d = _daysJ2000(date.toUtc());
    final L = _norm360(218.316 + 13.176396 * d);
    final M = _norm360(134.963 + 13.064993 * d);
    final F = _norm360(93.272 + 13.229350 * d);
    final lon = L + 6.289 * math.sin(_toRad(M));
    final lat = 5.128 * math.sin(_toRad(F));
    final eps = _toRad(23.439);
    final lonRad = _toRad(lon);
    final latRad = _toRad(lat);
    final sinDec = math.sin(latRad) * math.cos(eps) + math.cos(latRad) * math.sin(eps) * math.sin(lonRad);
    final dec = _toDeg(math.asin(sinDec));
    final y = math.sin(lonRad) * math.cos(eps) - math.tan(latRad) * math.sin(eps);
    final x = math.cos(lonRad);
    var ra = _toDeg(math.atan2(y, x));
    ra = _norm360(ra) / 15;
    return (ra: ra, dec: dec);
  }

  ({double ra, double dec}) _planetPosition(Map<String, dynamic> p, DateTime date) {
    final d = _daysJ2000(date.toUtc());
    final e = p['e'] as double;
    final meanLon = p['L'] as double;
    final w = p['w'] as double;
    final O = p['O'] as double;
    final n = p['n'] as double; final i = p['i'] as double;

    var L = _norm360(meanLon + n * d);
    var M = _norm360(L - w);
    final mRad = _toRad(M);
    final C = (2 * e - e * e * e / 4) * math.sin(mRad) + (5 / 4) * e * e * math.sin(2 * mRad);
    final lon = _norm360(L + _toDeg(C));
    final lonRad = _toRad(lon);
    final latRad = _toRad(i * math.sin(_toRad(lon - O)));
    final eps = _toRad(23.439);

    final sinDec = math.sin(latRad) * math.cos(eps) + math.cos(latRad) * math.sin(eps) * math.sin(lonRad);
    final dec = _toDeg(math.asin(sinDec));
    final y = math.sin(lonRad) * math.cos(eps) - math.tan(latRad) * math.sin(eps);
    final x = math.cos(lonRad);
    var ra = _toDeg(math.atan2(y, x));
    ra = _norm360(ra) / 15;
    return (ra: ra, dec: dec);
  }

  /// Azimuthal equidistant: full-screen FOV, horizon as circle with observer at center.
  /// Sky fills the rectangle; horizon (alt=0) draws as a circle when visible.
  ({double x, double y, bool visible}) _altAzToScreen(double alt, double az, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;
    final cy = h / 2;
    final a = w / 2;
    final b = h / 2;

    // Angular separation from look direction
    final altRad = _toRad(alt);
    final azRad = _toRad(az);
    final lookAltRad = _toRad(_altitude);
    final lookAzRad = _toRad(_azimuth);
    final cosSep = math.sin(altRad) * math.sin(lookAltRad) +
        math.cos(altRad) * math.cos(lookAltRad) * math.cos(azRad - lookAzRad);
    final sep = _toDeg(math.acos(cosSep.clamp(-1.0, 1.0)));

    if (sep > 95) return (x: 0, y: 0, visible: false);

    // Bearing in tangent plane
    final sinSep = math.sin(_toRad(sep));
    double bearing;
    if (sinSep < 1e-6) {
      bearing = 0;
    } else {
      final sinBear = math.cos(altRad) * math.sin(azRad - lookAzRad) / sinSep;
      final cosBear = (math.sin(altRad) * math.cos(lookAltRad) -
              math.cos(altRad) * math.sin(lookAltRad) * math.cos(azRad - lookAzRad)) /
          sinSep;
      bearing = math.atan2(sinBear, cosBear);
    }

    // Map to full screen (ellipse): FOV fills width and height; objects outside culled
    final edgeSep = _fov / 2;
    if (sep > edgeSep) return (x: 0, y: 0, visible: false);

    final r = sep / edgeSep;
    final rEllipse = (a * b) /
        math.sqrt(b * b * math.cos(bearing) * math.cos(bearing) +
            a * a * math.sin(bearing) * math.sin(bearing) + 1e-10);
    final rScreen = r * rEllipse;
    final x = cx + rScreen * math.sin(bearing);
    final y = cy - rScreen * math.cos(bearing);

    final visible = sep < 90 && x >= 0 && x <= w && y >= 0 && y <= h;
    return (x: x, y: y, visible: visible);
  }

  DateTime? _lastTickTime;

  @override
  void initState() {
    super.initState();
    _startTimeAnimation();
  }

  void _toggleSensorMode() {
    setState(() {
      _useSensorMode = !_useSensorMode;
      if (_useSensorMode) {
        _startSensors();
      } else {
        _stopSensors();
      }
    });
  }

  void _startSensors() {
    if (kIsWeb) return;
    _compassSub?.cancel();
    _accelSub?.cancel();
    try {
      final compassStream = FlutterCompass.events;
      if (compassStream != null) {
        _compassSub = compassStream.listen((e) {
          if (e.heading != null && mounted && _useSensorMode) {
            setState(() => _azimuth = _norm360(e.heading!));
          }
        }, onError: (_) {});
      }
    } catch (_) {}
    _accelSub = accelerometerEventStream(samplingPeriod: SensorInterval.normalInterval).listen((e) {
      if (!mounted || !_useSensorMode) return;
      final g = math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z);
      if (g < 5) return;
      final ay = e.y / g;
      final alt = _toDeg(math.asin(ay.clamp(-1.0, 1.0)));
      setState(() => _altitude = alt.clamp(0.0, 90.0));
    }, onError: (_) {});
  }

  void _stopSensors() {
    _compassSub?.cancel();
    _accelSub?.cancel();
  }

  void _startTimeAnimation() {
    _timer?.cancel();
    _lastTickTime = DateTime.now();
    _timer = Timer.periodic(const Duration(milliseconds: 50), (_) {
      if (!mounted) return;
      final now = DateTime.now();
      var elapsed = _lastTickTime != null ? now.difference(_lastTickTime!).inMilliseconds : 50;
      elapsed = elapsed.clamp(0, 500); // cap to avoid jump after long pause
      _lastTickTime = now;
      if (_timeSpeed == 0) return;
      setState(() {
        if (_timeSpeed == 1) {
          _viewTime = DateTime.now();
        } else {
          // timeSpeed = sim seconds per real second (e.g. 60 = 1 min/sec)
          // step ms = elapsed_ms * timeSpeed
          final step = (elapsed * _timeSpeed).round();
          _viewTime = _viewTime.add(Duration(milliseconds: step));
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _stopSensors();
    super.dispose();
  }

  void _setView(double az, [double? alt]) => setState(() {
    _azimuth = _norm360(az);
    if (alt != null) _altitude = alt.clamp(-10.0, 90.0);
  });

  void _resetView() => setState(() {
    _azimuth = 180;
    _altitude = 45;
    _fov = 60;
    _viewTime = DateTime.now();
    _timeSpeed = 1;
  });

  void _timeSlower() => setState(() {
    if (_timeSpeed == 1) {
      _timeSpeed = 0;
    } else if (_timeSpeed == 0) {
      _timeSpeed = -60;
    } else if (_timeSpeed > 0) {
      _timeSpeed = math.max(1.0, _timeSpeed / 10);
    } else {
      _timeSpeed *= 10;
    }
  });

  void _timeFaster() => setState(() {
    if (_timeSpeed == 0) {
      _timeSpeed = 60;
    } else if (_timeSpeed == 1) {
      _timeSpeed = 60;
    } else if (_timeSpeed > 0) {
      _timeSpeed = math.min(86400.0, _timeSpeed * 10);
    } else {
      _timeSpeed = math.max(-86400.0, _timeSpeed / 10);
    }
  });

  String _timeSpeedText() {
    final s = _timeSpeed;
    if (s == 0) return '⏸';
    if (s == 1) return '1×';
    if (s == -1) return '-1×';
    if (s.abs() >= 86400) return '${s > 0 ? '' : '-'}${(s.abs() / 86400).round()}d/s';
    if (s.abs() >= 3600) return '${s > 0 ? '' : '-'}${(s.abs() / 3600).round()}h/s';
    if (s.abs() >= 60) return '${s > 0 ? '' : '-'}${(s.abs() / 60).round()}m/s';
    return '$s×';
  }

  void _showLayersSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.98),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Display options', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              _LegendItem(label: 'Stars', on: _showStars, onTap: () { Navigator.pop(ctx); setState(() => _showStars = !_showStars); }),
              _LegendItem(label: 'Constellation lines', on: _showConstellationLines, onTap: () { Navigator.pop(ctx); setState(() => _showConstellationLines = !_showConstellationLines); }),
              _LegendItem(label: 'Constellation names', on: _showConstellationNames, onTap: () { Navigator.pop(ctx); setState(() => _showConstellationNames = !_showConstellationNames); }),
              _LegendItem(label: 'Planets', on: _showPlanets, onTap: () { Navigator.pop(ctx); setState(() => _showPlanets = !_showPlanets); }),
              _LegendItem(label: 'Milky Way', on: _showMilkyWay, onTap: () { Navigator.pop(ctx); setState(() => _showMilkyWay = !_showMilkyWay); }),
              _LegendItem(label: 'Grid', on: _showGrid, onTap: () { Navigator.pop(ctx); setState(() => _showGrid = !_showGrid); }),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scale = responsiveScale(context);
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Sky Map'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(
              _useSensorMode ? Icons.compass_calibration : Icons.explore,
              color: _useSensorMode ? Theme.of(context).colorScheme.primary : null,
            ),
            onPressed: kIsWeb ? null : _toggleSensorMode,
            tooltip: _useSensorMode ? 'Live view (phone points at sky)' : 'Use phone to point at sky',
          ),
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: () async {
              var permission = await Geolocator.checkPermission();
              if (permission == LocationPermission.denied) {
                permission = await Geolocator.requestPermission();
              }
              if (permission != LocationPermission.denied && permission != LocationPermission.deniedForever && mounted) {
                final pos = await Geolocator.getCurrentPosition();
                LocationService.setLocation(pos.latitude, pos.longitude);
                if (mounted) setState(() {});
              }
            },
            tooltip: 'My Location',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _resetView,
            tooltip: 'Reset View',
          ),
        ],
      ),
      body: GestureDetector(
        onScaleStart: (d) {
          if (d.pointerCount == 2) _scaleStart = _fov;
        },
        onScaleUpdate: (d) {
          if (_useSensorMode) return;
          setState(() {
            if (d.pointerCount == 1) {
              _azimuth = _norm360(_azimuth - d.focalPointDelta.dx * 0.4);
              _altitude = (_altitude + d.focalPointDelta.dy * 0.25).clamp(5.0, 85.0);
            } else if (d.pointerCount == 2 && _scaleStart != null) {
              _fov = (_scaleStart! / d.scale).clamp(20.0, 120.0);
            }
          });
        },
        onScaleEnd: (_) => _scaleStart = null,
        child: Listener(
          onPointerSignal: (e) {
            if (_useSensorMode) return;
            if (e is PointerScrollEvent) {
              setState(() => _fov = (_fov * (e.scrollDelta.dy > 0 ? 1.1 : 0.9)).clamp(10.0, 120.0));
            }
          },
          child: Stack(
            children: [
              CustomPaint(
                painter: _SkyPainter(
                  viewTime: _viewTime,
                  azimuth: _azimuth,
                  altitude: _altitude,
                  fov: _fov,
                  lat: LocationService.lat,
                  lon: LocationService.lon,
                  raDecToAltAz: _raDecToAltAz,
                  altAzToScreen: _altAzToScreen,
                  sunPosition: _sunPosition,
                  moonPosition: _moonPosition,
                  planetPosition: _planetPosition,
                  showStars: _showStars,
                  showConstellationLines: _showConstellationLines,
                  showConstellationNames: _showConstellationNames,
                  showPlanets: _showPlanets,
                  showMilkyWay: _showMilkyWay,
                  showGrid: _showGrid,
                  showHorizon: _showHorizon,
                  showCardinals: _showCardinals,
                  toRad: _toRad,
                  norm180: _norm180,
                ),
                size: Size.infinite,
              ),
              // Top-left: direction buttons + zenith
              Positioned(
                top: 8 * scale,
                left: 8 * scale,
                child: _DirectionButtons(
                  onTap: _setView,
                  showZenith: true,
                  scale: scale,
                ),
              ),
              // Top-right: zoom + layers
              Positioned(
                top: 8 * scale,
                right: 8 * scale,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _ZoomButtons(
                      onZoomIn: () => setState(() => _fov = (_fov * 0.8).clamp(10.0, 120.0)),
                      onZoomOut: () => setState(() => _fov = (_fov * 1.25).clamp(10.0, 120.0)),
                      scale: scale,
                    ),
                    SizedBox(height: 4 * scale),
                    Material(
                      color: Colors.black38,
                      borderRadius: BorderRadius.circular(8),
                      child: IconButton(
                        icon: const Icon(Icons.layers),
                        color: Colors.white,
                        onPressed: () => _showLayersSheet(context),
                        tooltip: 'Layers & options',
                        iconSize: 20 * scale,
                      ),
                    ),
                  ],
                ),
              ),
              // Top-left below dir: compact info (positioned below direction pad)
              Positioned(
                top: 165 * scale,
                left: 8 * scale,
                child: _InfoOverlay(
                  lat: LocationService.lat,
                  lon: LocationService.lon,
                  fov: _fov,
                  azimuth: _azimuth,
                  scale: scale,
                ),
              ),
              // Bottom: time controls + clock
              Positioned(
                left: 0,
                right: 0,
                bottom: 8,
                child: SafeArea(
                  child: _TimeBar(
                    viewTime: _viewTime,
                    timeSpeed: _timeSpeed,
                    timeSpeedText: _timeSpeedText(),
                    onSlower: _timeSlower,
                    onNow: () => setState(() {
                      _viewTime = DateTime.now();
                      _timeSpeed = 1;
                    }),
                    onFaster: _timeFaster,
                    scale: scale,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  double? _scaleStart;
}

class _SkyPainter extends CustomPainter {
  final DateTime viewTime;
  final double azimuth, altitude, fov, lat, lon;
  final ({double alt, double az}) Function(double, double, DateTime) raDecToAltAz;
  final ({double x, double y, bool visible}) Function(double, double, Size) altAzToScreen;
  final ({double ra, double dec}) Function(DateTime) sunPosition;
  final ({double ra, double dec}) Function(DateTime) moonPosition;
  final ({double ra, double dec}) Function(Map<String, dynamic>, DateTime) planetPosition;
  final bool showStars, showConstellationLines, showConstellationNames;
  final bool showPlanets, showMilkyWay, showGrid, showHorizon, showCardinals;
  final double Function(double) toRad;
  final double Function(double) norm180;

  _SkyPainter({
    required this.viewTime,
    required this.azimuth,
    required this.altitude,
    required this.fov,
    required this.lat,
    required this.lon,
    required this.raDecToAltAz,
    required this.altAzToScreen,
    required this.sunPosition,
    required this.moonPosition,
    required this.planetPosition,
    this.showStars = true,
    this.showConstellationLines = true,
    this.showConstellationNames = true,
    this.showPlanets = true,
    this.showMilkyWay = true,
    this.showGrid = false,
    this.showHorizon = true,
    this.showCardinals = true,
    required this.toRad,
    required this.norm180,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Sky fills full screen; horizon (drawn below) is a circle with observer at center
    // Sky gradient (dome above)
    final gradient = LinearGradient(
      begin: Alignment.bottomCenter,
      end: Alignment.topCenter,
      colors: [const Color(0xFF1a2040), const Color(0xFF0d1225), const Color(0xFF0a0d1a)],
      stops: const [0, 0.3, 1],
    );
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), Paint()..shader = gradient.createShader(Rect.fromLTWH(0, 0, w, h)));

    if (showMilkyWay) {
      final mw = Paint()
        ..shader = RadialGradient(
          center: Alignment.center,
          radius: 1,
          colors: [
            const Color(0x1ac8dcff),
            const Color(0x0ab4c8f0),
            Colors.transparent,
          ],
          stops: const [0, 0.5, 1],
        ).createShader(Rect.fromLTWH(0, 0, w, h));
      canvas.drawRect(Rect.fromLTWH(0, 0, w, h), mw);
    }

    // Grid (uses same projection as stars)
    if (showGrid) {
      final gridPaint = Paint()
        ..color = const Color(0x266497ff)
        ..strokeWidth = 1
        ..style = PaintingStyle.stroke;
      for (var alt = 0; alt <= 90; alt += 15) {
        final path = Path();
        var started = false;
        for (var az = 0; az <= 360; az += 5) {
          final scr = altAzToScreen(alt.toDouble(), az.toDouble(), size);
          if (scr.visible) {
            if (!started) {
              path.moveTo(scr.x, scr.y);
              started = true;
            } else {
              path.lineTo(scr.x, scr.y);
            }
          } else {
            started = false;
          }
        }
        if (started) canvas.drawPath(path, gridPaint);
      }
      for (var az = 0; az < 360; az += 30) {
        final path = Path();
        var started = false;
        for (var alt = 0; alt <= 90; alt += 5) {
          final scr = altAzToScreen(alt.toDouble(), az.toDouble(), size);
          if (scr.visible) {
            if (!started) {
              path.moveTo(scr.x, scr.y);
              started = true;
            } else {
              path.lineTo(scr.x, scr.y);
            }
          } else {
            started = false;
          }
        }
        if (started) canvas.drawPath(path, gridPaint);
      }
    }

    final starPos = <String, Offset>{};
    for (final s in stars) {
      final name = s[0] as String;
      final ra = s[1] as double;
      final dec = s[2] as double;
      final mag = s[3] as double;
      final spectral = s[4] as String;
      if (mag > _limitingMagnitude) continue;
      final pos = raDecToAltAz(ra, dec, viewTime);
      if (pos.alt < -5) continue;
      final scr = altAzToScreen(pos.alt, pos.az, size);
      if (!scr.visible) continue;
      starPos[name] = Offset(scr.x, scr.y);
      if (showStars) {
        final color = _spectralColor(spectral);
        final r = math.max(0.5, (6 - mag) * 0.8);
        if (mag < 1.5) {
          final glow = Paint()
            ..shader = RadialGradient(
              center: Alignment.center,
              radius: 1,
              colors: [color.withValues(alpha: 0.6), color.withValues(alpha: 0.1), Colors.transparent],
              stops: const [0, 0.3, 1],
            ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: r * 4));
          canvas.drawCircle(Offset(scr.x, scr.y), r * 4, glow);
        }
        canvas.drawCircle(Offset(scr.x, scr.y), r, Paint()..color = color);
      }
    }

    if (showConstellationLines) {
      final linePaint = Paint()
        ..color = const Color(0x6699b8ff)
        ..strokeWidth = 1
        ..style = PaintingStyle.stroke;
      for (final c in constellations) {
        for (final seg in c.lines) {
          final pa = starPos[seg.$1];
          final pb = starPos[seg.$2];
          if (pa != null && pb != null) {
            canvas.drawLine(pa, pb, linePaint);
          }
        }
      }
    }

    if (showConstellationNames && fov < 90) {
      final textPainter = TextPainter(textDirection: TextDirection.ltr);
      for (final c in constellations) {
        final centerAltAz = raDecToAltAz(c.center[0], c.center[1], viewTime);
        if (centerAltAz.alt < 0) continue;
        final scr = altAzToScreen(centerAltAz.alt, centerAltAz.az, size);
        if (!scr.visible) continue;
        textPainter.text = TextSpan(text: c.name, style: GoogleFonts.outfit(color: const Color(0xFF96c8ff), fontSize: 12));
        textPainter.layout();
        textPainter.paint(canvas, Offset(scr.x - textPainter.width / 2, scr.y));
      }
    }

    // Star labels for bright stars
    if (showStars && fov < 80) {
      final textPainter = TextPainter(textDirection: TextDirection.ltr);
      for (final s in stars) {
        final name = s[0] as String;
        final mag = s[3] as double;
        if (mag >= 1.5) continue;
        final p = starPos[name];
        if (p == null) continue;
        textPainter.text = TextSpan(text: name, style: GoogleFonts.outfit(color: const Color(0xB3c8dcff), fontSize: 10));
        textPainter.layout();
        textPainter.paint(canvas, Offset(p.dx + 6, p.dy - 6));
      }
    }

    // Sun
    final sp = sunPosition(viewTime);
    final sunAltAz = raDecToAltAz(sp.ra, sp.dec, viewTime);
    if (sunAltAz.alt > -10) {
      final scr = altAzToScreen(sunAltAz.alt, sunAltAz.az, size);
      if (scr.visible) {
        final glow = Paint()
          ..shader = RadialGradient(
            center: Alignment.center,
            radius: 1,
            colors: [const Color(0xFFffff88), const Color(0x88ffdd44), Colors.transparent],
            stops: const [0, 0.3, 1],
          ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: 20));
        canvas.drawCircle(Offset(scr.x, scr.y), 20, glow);
        canvas.drawCircle(Offset(scr.x, scr.y), 8, Paint()..color = const Color(0xFFffff00));
      }
    }

    // Moon
    final mp = moonPosition(viewTime);
    final moonAltAz = raDecToAltAz(mp.ra, mp.dec, viewTime);
    if (moonAltAz.alt > -5) {
      final scr = altAzToScreen(moonAltAz.alt, moonAltAz.az, size);
      if (scr.visible) {
        final glow = Paint()
          ..shader = RadialGradient(
            center: Alignment.center,
            radius: 1,
            colors: [const Color(0xFFffffee), const Color(0x44ddddcc), Colors.transparent],
            stops: const [0, 0.5, 1],
          ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: 15));
        canvas.drawCircle(Offset(scr.x, scr.y), 15, glow);
        canvas.drawCircle(Offset(scr.x, scr.y), 7, Paint()..color = const Color(0xFFf5f5dc));
      }
    }

    if (showPlanets) {
      for (final p in planets) {
        final pos2d = planetPosition(p, viewTime);
        final altAz = raDecToAltAz(pos2d.ra, pos2d.dec, viewTime);
        if (altAz.alt < -5) continue;
        final scr = altAzToScreen(altAz.alt, altAz.az, size);
        if (!scr.visible) continue;
        final color = Color(p['color'] as int);
        final r = (p['size'] as num).toDouble();
        final glow = Paint()
          ..shader = RadialGradient(
            center: Alignment.center,
            radius: 1,
            colors: [color, color.withValues(alpha: 0.3), Colors.transparent],
            stops: const [0, 0.5, 1],
          ).createShader(Rect.fromCircle(center: Offset(scr.x, scr.y), radius: r * 3));
        canvas.drawCircle(Offset(scr.x, scr.y), r * 3, glow);
        canvas.drawCircle(Offset(scr.x, scr.y), r, Paint()..color = color);
      }
    }

    if (showHorizon) {
      final horizonPaint = Paint()
        ..color = const Color(0x80649380)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;
      final path = Path();
      var started = false;
      for (var az = 0; az <= 360; az += 4) {
        final scr = altAzToScreen(0, az.toDouble(), size);
        if (scr.visible && scr.x >= 0 && scr.x <= w && scr.y >= 0 && scr.y <= h) {
          if (!started) {
            path.moveTo(scr.x, scr.y);
            started = true;
          } else {
            path.lineTo(scr.x, scr.y);
          }
        } else {
          started = false;
        }
      }
        if (started) canvas.drawPath(path, horizonPaint);
    }

    if (showCardinals) {
      final cardinals = [0, 45, 90, 135, 180, 225, 270, 315];
      const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      final textPainter = TextPainter(textDirection: TextDirection.ltr);
      for (var i = 0; i < cardinals.length; i++) {
        final scr = altAzToScreen(2, cardinals[i].toDouble(), size);
        if (scr.visible && scr.x > 20 && scr.x < w - 20 && scr.y > 20 && scr.y < h - 20) {
          textPainter.text = TextSpan(
            text: labels[i],
            style: GoogleFonts.outfit(color: labels[i] == 'N' ? const Color(0xFFff6666) : const Color(0xFFffcc00), fontSize: 14, fontWeight: FontWeight.bold),
          );
          textPainter.layout();
          textPainter.paint(canvas, Offset(scr.x - textPainter.width / 2, scr.y - textPainter.height / 2));
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SkyPainter old) =>
      old.viewTime != viewTime || old.azimuth != azimuth || old.altitude != altitude || old.fov != fov ||
      old.showStars != showStars || old.showConstellationLines != showConstellationLines ||
      old.showConstellationNames != showConstellationNames || old.showPlanets != showPlanets ||
      old.showMilkyWay != showMilkyWay || old.showGrid != showGrid || old.showHorizon != showHorizon || old.showCardinals != showCardinals;
}

class _DirectionButtons extends StatelessWidget {
  final void Function(double, [double?]) onTap;
  final bool showZenith;
  final double scale;

  const _DirectionButtons({required this.onTap, this.showZenith = true, this.scale = 1});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black38,
      borderRadius: BorderRadius.circular(8 * scale),
      child: Padding(
        padding: EdgeInsets.all(4 * scale),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _DirBtn(label: 'N', az: 0, alt: 45, onTap: onTap, scale: scale),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _DirBtn(label: 'NW', az: 315, alt: 45, onTap: onTap, scale: scale),
                if (showZenith)
                  _DirBtn(label: '↑', az: 180, alt: 90, onTap: onTap, scale: scale),
                _DirBtn(label: 'NE', az: 45, alt: 45, onTap: onTap, scale: scale),
              ],
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _DirBtn(label: 'W', az: 270, alt: 45, onTap: onTap, scale: scale),
                SizedBox(width: 32 * scale, height: 32 * scale),
                _DirBtn(label: 'E', az: 90, alt: 45, onTap: onTap, scale: scale),
              ],
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _DirBtn(label: 'SW', az: 225, alt: 45, onTap: onTap, scale: scale),
                if (showZenith) SizedBox(width: 32 * scale, height: 32 * scale),
                _DirBtn(label: 'SE', az: 135, alt: 45, onTap: onTap, scale: scale),
              ],
            ),
            _DirBtn(label: 'S', az: 180, alt: 45, onTap: onTap, scale: scale),
          ],
        ),
      ),
    );
  }
}

class _DirBtn extends StatelessWidget {
  final String label;
  final double az;
  final double alt;
  final void Function(double, [double?]) onTap;
  final double scale;

  const _DirBtn({required this.label, required this.az, required this.alt, required this.onTap, this.scale = 1});

  @override
  Widget build(BuildContext context) {
    final sz = 28 * scale;
    return InkWell(
      onTap: () => onTap(az, alt),
      borderRadius: BorderRadius.circular(4),
      child: SizedBox(
        width: sz,
        height: sz,
        child: Center(child: Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold, fontSize: (11 * scale).clamp(9, 14)))),
      ),
    );
  }
}

class _ZoomButtons extends StatelessWidget {
  final VoidCallback onZoomIn;
  final VoidCallback onZoomOut;
  final double scale;

  const _ZoomButtons({required this.onZoomIn, required this.onZoomOut, this.scale = 1});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black38,
      borderRadius: BorderRadius.circular(8 * scale),
      child: Padding(
        padding: EdgeInsets.all(4 * scale),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(icon: const Icon(Icons.add), onPressed: onZoomIn, iconSize: 20 * scale, color: Colors.white),
            IconButton(icon: const Icon(Icons.remove), onPressed: onZoomOut, iconSize: 20 * scale, color: Colors.white),
          ],
        ),
      ),
    );
  }
}

class _InfoOverlay extends StatelessWidget {
  final double lat, lon, fov, azimuth;
  final double scale;

  const _InfoOverlay({required this.lat, required this.lon, required this.fov, required this.azimuth, this.scale = 1});

  @override
  Widget build(BuildContext context) {
    final fs = (12 * scale).clamp(10.0, 16.0);
    return Material(
      color: Colors.black54,
      borderRadius: BorderRadius.circular(8 * scale),
      child: Padding(
        padding: EdgeInsets.all(8 * scale),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('📍 ${lat.toStringAsFixed(2)}°, ${lon.toStringAsFixed(2)}°', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF96b8ff), fontSize: fs)),
            Text('🔭 ${fov.toStringAsFixed(0)}° • ${_getDirectionName(azimuth)}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF96b8ff), fontSize: fs)),
          ],
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final String label;
  final bool on;
  final VoidCallback onTap;

  const _LegendItem({required this.label, required this.on, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(on ? Icons.check_box : Icons.check_box_outline_blank, size: 16, color: on ? Colors.white70 : Colors.white38),
            const SizedBox(width: 6),
            Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: on ? Colors.white : Colors.white54, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _TimeBar extends StatelessWidget {
  final DateTime viewTime;
  final double timeSpeed;
  final String timeSpeedText;
  final VoidCallback onSlower;
  final VoidCallback onNow;
  final VoidCallback onFaster;
  final double scale;

  const _TimeBar({
    required this.viewTime,
    required this.timeSpeed,
    required this.timeSpeedText,
    required this.onSlower,
    required this.onNow,
    required this.onFaster,
    this.scale = 1,
  });

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isLive = (viewTime.difference(now).inSeconds.abs() < 60);
    final timeColor = isLive ? const Color(0xFF7dd3fc) : const Color(0xFFfbbf24);
    final fs = (12 * scale).clamp(10.0, 14.0);

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12 * scale, vertical: 6 * scale),
      decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(8 * scale)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(icon: const Icon(Icons.replay_10), onPressed: onSlower, tooltip: 'Slow', color: Colors.white, iconSize: 20 * scale),
          Text(timeSpeedText, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70, fontSize: fs), textAlign: TextAlign.center),
          IconButton(icon: const Icon(Icons.access_time), onPressed: onNow, tooltip: 'Now', color: Colors.white, iconSize: 20 * scale),
          IconButton(icon: const Icon(Icons.forward_10), onPressed: onFaster, tooltip: 'Fast', color: Colors.white, iconSize: 20 * scale),
          SizedBox(width: 8 * scale),
          Text(
            '${viewTime.hour.toString().padLeft(2, '0')}:${viewTime.minute.toString().padLeft(2, '0')}:${viewTime.second.toString().padLeft(2, '0')}',
            style: GoogleFonts.orbitron(color: timeColor, fontSize: (14 * scale).clamp(12.0, 18.0), fontWeight: FontWeight.w600),
          ),
          SizedBox(width: 4 * scale),
          Text(
            '${viewTime.month.toString().padLeft(2, '0')}/${viewTime.day.toString().padLeft(2, '0')}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: timeColor.withValues(alpha: 0.8), fontSize: fs),
          ),
        ],
      ),
    );
  }
}
