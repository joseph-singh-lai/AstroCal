import 'package:flutter/material.dart';
import 'package:astrocaltt/services/location_service.dart';

/// Footer shown at the bottom of scrollable content (e.g. Events list), matching the site layout.
class SiteFooter extends StatelessWidget {
  const SiteFooter({super.key, this.scale = 1});

  final double scale;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(vertical: 20 * scale, horizontal: 16 * scale),
      margin: EdgeInsets.only(top: 16 * scale),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF1a1f3a),
            Color(0xFF252b4a),
            Color(0xFF0a0e27),
          ],
          stops: [0.0, 0.5, 1.0],
        ),
        borderRadius: BorderRadius.circular(12 * scale),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            'assets/logo_footer.png',
            height: (64 * scale).clamp(52.0, 80.0),
            fit: BoxFit.contain,
          ),
          SizedBox(height: 8 * scale),
          Text(
            '${LocationService.name} 🇹🇹',
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: (12 * scale).clamp(10.0, 14.0),
              color: scheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 4 * scale),
          Text(
            'Created by Joseph Singh, utilizing AI tools with Flutter',
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: (12 * scale).clamp(10.0, 14.0),
              color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 2 * scale),
          Text(
            'Powered by NASA APIs • Open-Meteo • Flutter Map',
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: (11 * scale).clamp(10.0, 13.0),
              color: scheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
