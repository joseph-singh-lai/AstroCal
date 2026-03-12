import 'package:astrocaltt/data/astro_data.dart';
import 'package:astrocaltt/services/location_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

const _layers = [
  ('ESRI Satellite', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
  ('OpenStreetMap', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  ('CARTO Dark', 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
  ('CARTO Light', 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'),
];

class SatelliteScreen extends StatefulWidget {
  const SatelliteScreen({super.key});

  @override
  State<SatelliteScreen> createState() => _SatelliteScreenState();
}

class _SatelliteScreenState extends State<SatelliteScreen> {
  int _layerIndex = 0;
  bool _locationLoading = false;
  final _mapController = MapController();

  Future<void> _requestLocation() async {
    if (_locationLoading) return;
    setState(() => _locationLoading = true);
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final req = await Geolocator.requestPermission();
        if (req == LocationPermission.denied || req == LocationPermission.deniedForever) {
          if (mounted) setState(() => _locationLoading = false);
          return;
        }
      }
      final pos = await Geolocator.getCurrentPosition();
      LocationService.setLocation(pos.latitude, pos.longitude, 'Your Location');
      _mapController.move(LatLng(pos.latitude, pos.longitude), 12);
      if (mounted) setState(() {});
    } catch (_) {}
    if (mounted) setState(() => _locationLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final lat = LocationService.lat;
    final lon = LocationService.lon;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Satellite & Maps'),
        backgroundColor: Theme.of(context).colorScheme.surface.withValues(alpha: 0.9),
        elevation: 0,
        actions: [
          PopupMenuButton<int>(
            icon: const Icon(Icons.layers),
            tooltip: 'Map layer',
            onSelected: (i) => setState(() => _layerIndex = i),
            itemBuilder: (_) => _layers.asMap().entries.map((e) => PopupMenuItem(
              value: e.key,
              child: Text(e.value.$1),
            )).toList(),
          ),
        ],
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: LatLng(lat, lon),
          initialZoom: 8,
        ),
        children: [
          TileLayer(
            urlTemplate: _layers[_layerIndex].$2,
            subdomains: const ['a', 'b', 'c', 'd'],
            userAgentPackageName: 'com.astrocaltt.app',
          ),
          MarkerLayer(
            markers: [
              Marker(
                point: LatLng(lat, lon),
                width: 40,
                height: 40,
                child: const Icon(Icons.location_on, color: Colors.red, size: 40),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(_layers[_layerIndex].$1, style: Theme.of(context).textTheme.bodySmall),
              Row(
                children: [
                  TextButton.icon(
                    icon: _locationLoading ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.my_location, size: 18),
                    label: const Text('My Location'),
                    onPressed: _locationLoading ? null : _requestLocation,
                  ),
                  TextButton.icon(
                    icon: const Icon(Icons.home, size: 18),
                    label: const Text('La Brea'),
                    onPressed: () {
                      LocationService.reset();
                      _mapController.move(LatLng(laBreaLat, laBrealon), 8);
                      setState(() {});
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
