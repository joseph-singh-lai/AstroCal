import 'package:astrocaltt/data/astro_data.dart';

/// Simple location holder for the app. Use getCurrentLocation() for lat/lon.
class LocationService {
  static double _lat = laBreaLat;
  static double _lon = laBrealon;
  static String _name = 'La Brea, Trinidad & Tobago';

  static double get lat => _lat;
  static double get lon => _lon;
  static String get name => _name;
  static bool get isCustom => _name != 'La Brea, Trinidad & Tobago';

  static void setLocation(double lat, double lon, [String name = 'Your Location']) {
    _lat = lat;
    _lon = lon;
    _name = name;
  }

  static void reset() {
    _lat = laBreaLat;
    _lon = laBrealon;
    _name = 'La Brea, Trinidad & Tobago';
  }
}
