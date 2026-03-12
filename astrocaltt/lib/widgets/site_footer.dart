import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
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
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SvgPicture.asset(
                'assets/logo.svg',
                width: 22 * scale,
                height: 22 * scale,
                fit: BoxFit.contain,
              ),
              SizedBox(width: 6 * scale),
              Text(
                'ASTROCALTT',
                style: GoogleFonts.orbitron(
                  fontSize: (14 * scale).clamp(12.0, 18.0),
                  letterSpacing: 2,
                  fontWeight: FontWeight.w700,
                  color: scheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          SizedBox(height: 4 * scale),
          Text(
            '• ${LocationService.name}',
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
