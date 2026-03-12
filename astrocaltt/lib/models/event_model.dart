/// Event model matching the web app structure.
class AstroEvent {
  final String id;
  final String title;
  final String category;
  final DateTime datetime;
  final String description;
  final String? location;
  final String? imageUrl;
  final String? hdImageUrl;
  final String? thumbnailUrl;
  final String? mediaType;
  final Map<String, dynamic>? visibility;
  final String? source;
  final String? eventType;

  const AstroEvent({
    required this.id,
    required this.title,
    required this.category,
    required this.datetime,
    required this.description,
    this.location,
    this.imageUrl,
    this.hdImageUrl,
    this.thumbnailUrl,
    this.mediaType,
    this.visibility,
    this.source,
    this.eventType,
  });

  bool get isPassed => datetime.isBefore(DateTime.now());
}
