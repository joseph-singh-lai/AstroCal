import 'dart:async';
import 'package:astrocaltt/data/astro_data.dart';
import 'package:astrocaltt/models/event_model.dart';
import 'package:astrocaltt/services/api_service.dart';
import 'package:astrocaltt/services/location_service.dart';
import 'package:astrocaltt/utils/responsive.dart';
import 'package:astrocaltt/widgets/site_footer.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  List<AstroEvent> _allEvents = [];
  List<AstroEvent> _filteredEvents = [];
  final Set<String> _selectedCategories = {'apod', 'meteor', 'iss', 'astronomy'};
  final _searchController = TextEditingController();
  bool _loading = true;
  bool _locationLoading = false;
  int _loadingCompleted = 0;
  static const _loadingTotal = 6;
  Timer? _countdownTimer;

  static const _categoryLabels = {
    'meteor': 'Meteor Shower',
    'planet': 'Planet Visibility',
    'iss': 'ISS Pass',
    'apod': 'NASA APOD',
    'solar': 'Solar Event',
    'astronomy': 'Astronomy',
    'natural': 'Natural Event',
    'workshop': 'Workshops',
  };

  static const _categoryEmojis = {
    'meteor': '☄️',
    'planet': '🪐',
    'iss': '🚀',
    'apod': '📸',
    'solar': '☀️',
    'astronomy': '🌙',
    'natural': '🌋',
    'workshop': '🎓',
  };

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_applyFilters);
    _loadEvents();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _filteredEvents.isNotEmpty) setState(() {});
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

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
      await _loadEvents();
    } catch (_) {}
    if (mounted) setState(() => _locationLoading = false);
  }

  void _resetLocation() {
    LocationService.reset();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _loading = true;
      _loadingCompleted = 0;
    });
    final lat = LocationService.lat;
    final lon = LocationService.lon;

    final generated = [
      ...generateMeteorShowerEvents(),
      ...generateEclipseEvents(),
      ...generateSupermoonEvents(),
      ...generateSeasonalEvents(),
    ];
    if (mounted) setState(() => _loadingCompleted = 1);

    final apod = await fetchAPOD();
    if (mounted) setState(() => _loadingCompleted = 2);

    final iss = await fetchISSPasses(lat, lon);
    if (mounted) setState(() => _loadingCompleted = 3);

    final donki = await fetchDONKI();
    final eonet = await fetchEONET();
    if (mounted) setState(() => _loadingCompleted = 4);

    final openMeteo = await fetchOpenMeteoAstronomy(lat, lon);
    if (mounted) setState(() => _loadingCompleted = 5);

    final planet = fetchPlanetVisibility(lat, lon);
    if (mounted) setState(() => _loadingCompleted = 6);

    final all = <AstroEvent>[
      ...[apod].whereType<AstroEvent>(),
      ...generated,
      ...iss,
      ...donki,
      ...eonet,
      ...openMeteo,
      ...planet,
    ];
    all.sort((a, b) => a.datetime.compareTo(b.datetime));
    if (mounted) {
      setState(() {
        _allEvents = all;
        _loading = false;
        _applyFilters();
      });
    }
  }

  void _selectAllFilters() {
    setState(() {
      _selectedCategories.addAll(['apod', 'meteor', 'iss', 'planet', 'solar', 'natural', 'astronomy', 'workshop']);
      _applyFilters();
    });
  }

  void _clearAllFilters() {
    setState(() {
      _selectedCategories.clear();
      _selectedCategories.add('apod');
      _applyFilters();
    });
  }

  void _applyFilters() {
    var list = _allEvents.where((e) => _selectedCategories.contains(e.category)).toList();
    final q = _searchController.text.toLowerCase().trim();
    if (q.isNotEmpty) {
      list = list.where((e) {
        final text = '${e.title} ${e.description} ${e.location ?? ''} ${e.category}';
        return text.toLowerCase().contains(q);
      }).toList();
    }
    list.sort((a, b) {
      final now = DateTime.now();
      final da = a.datetime.difference(now).inMilliseconds;
      final db = b.datetime.difference(now).inMilliseconds;
      if (da >= 0 && db >= 0) return da.compareTo(db);
      if (da < 0 && db < 0) return db.compareTo(da);
      return da >= 0 ? -1 : 1;
    });
    setState(() => _filteredEvents = list);
  }

  void _toggleCategory(String cat) {
    setState(() {
      if (_selectedCategories.contains(cat)) {
        if (_selectedCategories.length > 1) _selectedCategories.remove(cat);
      } else {
        _selectedCategories.add(cat);
      }
      _applyFilters();
    });
  }

  int get _selectedCategoriesLength => _selectedCategories.length;

  bool get _showIssNote =>
      _selectedCategories.contains('iss') &&
      !_filteredEvents.any((e) => e.category == 'iss') &&
      _allEvents.isNotEmpty;

  void _showFiltersSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Event categories', style: Theme.of(ctx).textTheme.titleMedium),
                    Text('$_selectedCategoriesLength selected', style: Theme.of(ctx).textTheme.bodySmall),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ...['apod', 'meteor', 'iss', 'planet', 'solar', 'natural', 'astronomy', 'workshop']
                        .map((key) => FilterChip(
                              label: Text('${_categoryEmojis[key] ?? ''} ${_categoryLabels[key] ?? key}'),
                              selected: _selectedCategories.contains(key),
                              onSelected: (_) {
                                setState(() => _toggleCategory(key));
                                setSheetState(() {});
                              },
                              showCheckmark: true,
                            )),
                    ActionChip(label: const Text('All'), onPressed: () { Navigator.pop(ctx); _selectAllFilters(); }),
                    ActionChip(label: const Text('Clear'), onPressed: () { Navigator.pop(ctx); _clearAllFilters(); }),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scale = responsiveScale(context);
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(12 * scale, 8 * scale, 12 * scale, 6 * scale),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    style: TextStyle(fontSize: (14 * scale).clamp(12.0, 18.0)),
                    decoration: InputDecoration(
                      hintText: 'Search events...',
                      prefixIcon: Icon(Icons.search, size: 20 * scale),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12 * scale, vertical: 8 * scale),
                    ),
                  ),
                ),
                SizedBox(width: 8 * scale),
                IconButton(
                  icon: _loading ? SizedBox(width: 20 * scale, height: 20 * scale, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(Icons.refresh, size: 22 * scale),
                  onPressed: _loading ? null : _loadEvents,
                  tooltip: 'Refresh',
                ),
                IconButton(
                  icon: Badge(
                    label: Text('$_selectedCategoriesLength', style: TextStyle(fontSize: 10 * scale)),
                    isLabelVisible: true,
                    child: Icon(Icons.filter_list, size: 22 * scale, color: theme.colorScheme.primary),
                  ),
                  onPressed: () => _showFiltersSheet(context),
                  tooltip: 'Filters',
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 12 * scale),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    LocationService.isCustom ? '📍 ${LocationService.name}' : '📍 La Brea, Trinidad & Tobago',
                    style: theme.textTheme.bodySmall?.copyWith(fontSize: (11 * scale).clamp(10.0, 13.0)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                TextButton(
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.symmetric(horizontal: 8 * scale),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: _locationLoading ? null : _requestLocation,
                  child: _locationLoading
                      ? SizedBox(width: 12 * scale, height: 12 * scale, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text('My Location', style: theme.textTheme.labelSmall?.copyWith(fontSize: (12 * scale).clamp(10.0, 14.0))),
                ),
                if (LocationService.isCustom)
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.symmetric(horizontal: 8 * scale),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onPressed: _resetLocation,
                    child: Text('Reset', style: theme.textTheme.labelSmall?.copyWith(fontSize: (12 * scale).clamp(10.0, 14.0))),
                  ),
              ],
            ),
          ),
          SizedBox(height: 4 * scale),
          Expanded(
            child: _loading
                ? Center(
                    child: Padding(
                      padding: EdgeInsets.all(24 * scale),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          LinearProgressIndicator(
                            value: _loadingCompleted / _loadingTotal,
                            backgroundColor: theme.colorScheme.surfaceContainerHighest,
                            valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _loadingCompleted >= _loadingTotal
                                ? 'Loading complete!'
                                : 'Loading events... ($_loadingCompleted/$_loadingTotal)',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  )
                : _filteredEvents.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.visibility_off, size: 64, color: theme.disabledColor),
                            const SizedBox(height: 16),
                            Text('No events found', style: theme.textTheme.titleMedium),
                            const SizedBox(height: 8),
                            Text('Try adjusting filters', style: theme.textTheme.bodyMedium?.copyWith(color: theme.disabledColor)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadEvents,
                        child: ListView.builder(
                          padding: EdgeInsets.all(12 * scale),
                          itemCount: (_showIssNote ? 1 : 0) + _filteredEvents.length + 1,
                          itemBuilder: (context, i) {
                            if (i == (_showIssNote ? 1 : 0) + _filteredEvents.length) {
                              return SiteFooter(scale: scale);
                            }
                            if (_showIssNote && i == 0) {
                              return Container(
                                margin: EdgeInsets.only(bottom: 12 * scale),
                                padding: EdgeInsets.all(12 * scale),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.surfaceContainerHighest,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.3)),
                                ),
                                child: Text(
                                  'Note: ISS passes are currently unavailable due to API access restrictions. Other events are still available.',
                                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                                ),
                              );
                            }
                            final idx = _showIssNote ? i - 1 : i;
                            return _EventCard(event: _filteredEvents[idx], scale: scale);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

/// APOD image with fallback for CORS/web. Uses Image.network on web (better CORS
/// handling) and shows tappable "View Image" when load fails.
/// When [tapToOpenUrl] is set, tapping the image opens that URL (e.g. APOD page).
class _ApodImage extends StatelessWidget {
  final String url;
  final String? hdUrl;
  final double height;
  final ThemeData theme;
  final double borderRadius;
  final String? tapToOpenUrl;

  const _ApodImage({
    required this.url,
    this.hdUrl,
    required this.height,
    required this.theme,
    this.borderRadius = 8,
    this.tapToOpenUrl,
  });

  /// Use CORS proxy on web so NASA images load in-app (direct load blocked by CORS).
  String get _imageUrl {
    if (kIsWeb) {
      return 'https://corsproxy.io/?${Uri.encodeComponent(url)}';
    }
    return url;
  }

  Future<void> _openUrl(BuildContext context, String link) async {
    final uri = Uri.tryParse(link);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Widget _buildImage(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Image.network(
        _imageUrl,
        height: height,
        width: double.infinity,
        fit: BoxFit.cover,
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return Container(
            height: height,
            color: theme.colorScheme.surfaceContainerHighest,
            child: const Center(child: CircularProgressIndicator()),
          );
        },
        errorBuilder: (context, error, stackTrace) => GestureDetector(
          onTap: () => _openUrl(context, tapToOpenUrl ?? hdUrl ?? url),
          child: Container(
            height: height,
            color: theme.colorScheme.surfaceContainerHighest,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.open_in_new, size: 40, color: theme.colorScheme.primary),
                  const SizedBox(height: 8),
                  Text(
                    'View Image',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    'Tap to open in browser',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final content = _buildImage(context);
    if (tapToOpenUrl != null) {
      return GestureDetector(
        onTap: () => _openUrl(context, tapToOpenUrl!),
        child: Stack(
          children: [
            content,
            Positioned(
              bottom: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.open_in_new, size: 14, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(
                      'Tap to open on NASA',
                      style: theme.textTheme.labelSmall?.copyWith(color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }
    return content;
  }
}

class _VisibilityInfo extends StatelessWidget {
  final Map<String, dynamic> visibility;

  const _VisibilityInfo({required this.visibility});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final parts = <Widget>[];
    if (visibility['direction'] != null) {
      parts.add(Text('Direction: ${visibility['direction']}', style: theme.textTheme.bodySmall));
    }
    if (visibility['peak'] != null) {
      parts.add(Text('Peak: ${visibility['peak']}', style: theme.textTheme.bodySmall));
    }
    if (visibility['zhr'] != null) {
      parts.add(Text('ZHR: ~${visibility['zhr']}/hr', style: theme.textTheme.bodySmall));
    }
    if (visibility['elevation'] != null) {
      parts.add(Text('Elevation: ${visibility['elevation']}', style: theme.textTheme.bodySmall));
    }
    if (visibility['duration'] != null) {
      parts.add(Text('Duration: ${visibility['duration']}', style: theme.textTheme.bodySmall));
    }
    if (parts.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Wrap(
        spacing: 12,
        runSpacing: 4,
        children: parts,
      ),
    );
  }
}

bool _isYouTubeUrl(String url) =>
    url.contains('youtube.com') || url.contains('youtu.be');

class _ApodVideoPreview extends StatefulWidget {
  final String url;
  final String? thumbnailUrl;
  final String title;
  final ThemeData theme;
  final double height;

  const _ApodVideoPreview({
    required this.url,
    this.thumbnailUrl,
    required this.title,
    required this.theme,
    required this.height,
  });

  @override
  State<_ApodVideoPreview> createState() => _ApodVideoPreviewState();
}

class _ApodVideoPreviewState extends State<_ApodVideoPreview> {
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    if (!_isYouTubeUrl(widget.url) && _isDirectVideoUrl(widget.url)) {
      _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
      _controller!.initialize().then((_) {
        if (mounted) {
          setState(() {});
          _controller?.play();
        }
      }).catchError((_) {
        if (mounted) {
          _controller?.dispose();
          setState(() => _controller = null);
        }
      });
    }
  }

  bool _isDirectVideoUrl(String url) {
    final lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') ||
        lower.contains('.mp4?') || lower.contains('video/');
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _openUrl(BuildContext context, String link) async {
    final uri = Uri.tryParse(link);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_controller != null && _controller!.value.isInitialized) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          height: widget.height,
          child: Stack(
            alignment: Alignment.center,
            children: [
              AspectRatio(
                aspectRatio: _controller!.value.aspectRatio,
                child: VideoPlayer(_controller!),
              ),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _controller!.value.isPlaying
                        ? _controller!.pause()
                        : _controller!.play();
                  });
                },
                child: Container(
                  color: Colors.transparent,
                  padding: const EdgeInsets.all(24),
                ),
              ),
              Positioned(
                bottom: 8,
                left: 8,
                right: 8,
                child: VideoProgressIndicator(_controller!, allowScrubbing: true),
              ),
            ],
          ),
        ),
      );
    }

    final thumb = widget.thumbnailUrl;
    return GestureDetector(
      onTap: () => _openUrl(context, widget.url),
      child: Container(
        height: widget.height,
        decoration: BoxDecoration(
          color: widget.theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (thumb != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  kIsWeb ? 'https://corsproxy.io/?${Uri.encodeComponent(thumb)}' : thumb,
                  fit: BoxFit.cover,
                  errorBuilder: (_, err, stack) => const SizedBox.shrink(),
                ),
              ),
            Container(
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.play_circle_fill, size: 56, color: widget.theme.colorScheme.primary),
                  const SizedBox(height: 8),
                  Text(
                    'Watch Video',
                    style: widget.theme.textTheme.titleMedium?.copyWith(color: Colors.white),
                  ),
                  Text(
                    'Tap to open',
                    style: widget.theme.textTheme.bodySmall?.copyWith(color: Colors.white70),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final AstroEvent event;
  final double scale;

  const _EventCard({required this.event, this.scale = 1});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final passed = event.isPassed;
    final imgH = (160 * scale).clamp(120.0, 220.0);
    return Card(
      margin: EdgeInsets.only(bottom: 12 * scale),
      child: InkWell(
        onTap: () => _showDetail(context),
        borderRadius: BorderRadius.circular(12 * scale),
        child: Padding(
          padding: EdgeInsets.all(12 * scale),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      event.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        decoration: passed ? TextDecoration.lineThrough : null,
                      ),
                    ),
                  ),
                  if (passed)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: theme.colorScheme.error.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(4)),
                      child: Text('Past', style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.error)),
                    ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _EventsScreenState._categoryLabels[event.category] ?? event.category,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
              if (event.imageUrl != null) ...[
                SizedBox(height: 8 * scale),
                event.mediaType == 'video'
                    ? _ApodVideoPreview(
                        url: event.imageUrl!,
                        thumbnailUrl: event.thumbnailUrl,
                        title: event.title,
                        theme: theme,
                        height: imgH,
                      )
                    : _ApodImage(
                        url: event.imageUrl!,
                        hdUrl: event.hdImageUrl,
                        height: imgH,
                        theme: theme,
                      ),
              ],
              SizedBox(height: 8 * scale),
              Text('📅 ${_formatDateTime(event.datetime)}', style: theme.textTheme.bodySmall),
              SizedBox(height: 4 * scale),
              Text(
                _timeDisplay(event.datetime),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: passed ? theme.colorScheme.error : theme.colorScheme.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: 8 * scale),
              Text(
                event.description,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium,
              ),
              if (event.location != null) ...[
                SizedBox(height: 4 * scale),
                Text('📍 ${event.location}', style: theme.textTheme.bodySmall),
              ],
              if (event.visibility != null && event.visibility!.isNotEmpty) ...[
                SizedBox(height: 4 * scale),
                _VisibilityInfo(visibility: event.visibility!),
              ],
              if (event.source != null) ...[
                SizedBox(height: 4 * scale),
                Text('Source: ${event.source}', style: theme.textTheme.bodySmall?.copyWith(color: theme.disabledColor)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    final scale = responsiveScale(context);
    final detailImgH = (200 * scale).clamp(160.0, 280.0);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scroll) => SingleChildScrollView(
          controller: scroll,
          padding: EdgeInsets.all(20 * scale),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(event.title, style: Theme.of(ctx).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Theme.of(ctx).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _EventsScreenState._categoryLabels[event.category] ?? event.category,
                  style: Theme.of(ctx).textTheme.labelMedium,
                ),
              ),
              const SizedBox(height: 12),
              if (event.imageUrl != null)
                event.mediaType == 'video'
                    ? _ApodVideoPreview(
                        url: event.imageUrl!,
                        thumbnailUrl: event.thumbnailUrl,
                        title: event.title,
                        theme: Theme.of(ctx),
                        height: detailImgH,
                      )
                    : _ApodImage(
                        url: event.imageUrl!,
                        hdUrl: event.hdImageUrl,
                        height: detailImgH,
                        theme: Theme.of(ctx),
                        borderRadius: 12 * scale,
                        tapToOpenUrl: event.category == 'apod'
                            ? 'https://apod.nasa.gov/apod/ap${event.datetime.year.toString().substring(2)}${event.datetime.month.toString().padLeft(2, '0')}${event.datetime.day.toString().padLeft(2, '0')}.html'
                            : null,
                      ),
              const SizedBox(height: 12),
              Text('📅 ${_formatDateTime(event.datetime)}', style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: Theme.of(ctx).colorScheme.primary)),
              if (event.location != null) Text('📍 ${event.location}', style: Theme.of(ctx).textTheme.bodySmall),
              if (event.visibility != null && event.visibility!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: _VisibilityInfo(visibility: event.visibility!),
                ),
              if (event.source != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Source: ${event.source}', style: Theme.of(ctx).textTheme.bodySmall?.copyWith(color: Theme.of(ctx).disabledColor)),
                ),
              const SizedBox(height: 12),
              Text(event.description, style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(height: 1.6)),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dt) =>
      '${_weekday(dt.weekday)}, ${_month(dt.month)} ${dt.day}, ${dt.year} at ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  String _weekday(int w) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][w];
  String _month(int m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];

  String _timeDisplay(DateTime dt) {
    final now = DateTime.now();
    final diff = dt.difference(now);
    if (diff.isNegative) {
      final d = -diff;
      if (d.inDays > 0) return '${d.inDays} day${d.inDays == 1 ? '' : 's'} ago';
      if (d.inHours > 0) return '${d.inHours} hour${d.inHours == 1 ? '' : 's'} ago';
      if (d.inMinutes > 0) return '${d.inMinutes} min ago';
      return 'Just passed';
    } else {
      if (diff.inDays > 0) return 'In ${diff.inDays} day${diff.inDays == 1 ? '' : 's'}';
      if (diff.inHours > 0) return 'In ${diff.inHours} hour${diff.inHours == 1 ? '' : 's'}';
      if (diff.inMinutes > 0) return 'In ${diff.inMinutes} min';
      return 'Soon';
    }
  }
}
