import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:astrocaltt/utils/responsive.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:astrocaltt/screens/events_screen.dart';
import 'package:astrocaltt/screens/glossary_screen.dart';
import 'package:astrocaltt/screens/satellite_screen.dart';
import 'package:astrocaltt/screens/sky_map_screen.dart';
import 'package:astrocaltt/services/location_service.dart';
import 'package:astrocaltt/widgets/cosmic_background.dart';

void main() {
  runApp(const AstroCalTTApp());
}

class AstroCalTTApp extends StatelessWidget {
  const AstroCalTTApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AstroCalTT',
      debugShowCheckedModeBanner: false,
      theme: () {
        final scheme = ColorScheme.fromSeed(
          seedColor: const Color(0xFF6b8dd6),
          brightness: Brightness.dark,
          primary: const Color(0xFF6b8dd6),
          secondary: const Color(0xFF9d7ce8),
        );
        final baseDark = ThemeData.dark().textTheme;
        const symbolFallback = ['NotoSansSymbols2'];
        TextStyle addSymbolFallback(TextStyle s) =>
            s.copyWith(fontFamilyFallback: symbolFallback);
        final outfit = GoogleFonts.outfitTextTheme(baseDark);
        return ThemeData(
          colorScheme: scheme,
          useMaterial3: true,
          textTheme: TextTheme(
            displayLarge: addSymbolFallback(outfit.displayLarge ?? baseDark.displayLarge!),
            displayMedium: addSymbolFallback(outfit.displayMedium ?? baseDark.displayMedium!),
            displaySmall: addSymbolFallback(outfit.displaySmall ?? baseDark.displaySmall!),
            headlineLarge: addSymbolFallback(GoogleFonts.orbitron(textStyle: baseDark.headlineLarge, fontSize: 24, fontWeight: FontWeight.w600)),
            headlineMedium: addSymbolFallback(GoogleFonts.orbitron(textStyle: baseDark.headlineMedium, fontSize: 20, fontWeight: FontWeight.w600)),
            headlineSmall: addSymbolFallback(GoogleFonts.orbitron(textStyle: baseDark.headlineSmall, fontSize: 18, fontWeight: FontWeight.w600)),
            titleLarge: addSymbolFallback(GoogleFonts.orbitron(textStyle: baseDark.titleLarge, fontSize: 22, fontWeight: FontWeight.w600)),
            titleMedium: addSymbolFallback((outfit.titleMedium ?? baseDark.titleMedium!).copyWith(fontSize: 16, fontWeight: FontWeight.w600)),
            titleSmall: addSymbolFallback((outfit.titleSmall ?? baseDark.titleSmall!).copyWith(fontSize: 14, fontWeight: FontWeight.w500)),
            bodyLarge: addSymbolFallback((outfit.bodyLarge ?? baseDark.bodyLarge!).copyWith(fontSize: 16, height: 1.6)),
            bodyMedium: addSymbolFallback((outfit.bodyMedium ?? baseDark.bodyMedium!).copyWith(fontSize: 14, height: 1.6)),
            bodySmall: addSymbolFallback((outfit.bodySmall ?? baseDark.bodySmall!).copyWith(fontSize: 12, height: 1.5)),
            labelLarge: addSymbolFallback((outfit.labelLarge ?? baseDark.labelLarge!).copyWith(fontSize: 14, fontWeight: FontWeight.w500)),
            labelMedium: addSymbolFallback((outfit.labelMedium ?? baseDark.labelMedium!).copyWith(fontSize: 12, fontWeight: FontWeight.w500)),
            labelSmall: addSymbolFallback((outfit.labelSmall ?? baseDark.labelSmall!).copyWith(fontSize: 11)),
          ).apply(
            bodyColor: scheme.onSurface,
            displayColor: scheme.onSurface,
          ),
          chipTheme: ChipThemeData(
            backgroundColor: scheme.surfaceContainerHighest,
            selectedColor: scheme.primaryContainer,
            checkmarkColor: scheme.onPrimaryContainer,
            labelStyle: addSymbolFallback(GoogleFonts.outfit(fontSize: 12, color: scheme.onSurfaceVariant)),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          appBarTheme: AppBarTheme(
            titleTextStyle: addSymbolFallback(GoogleFonts.orbitron(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: scheme.onSurface,
            )),
          ),
        );
      }(),
      home: const _MainNav(),
    );
  }
}

class _MainNav extends StatefulWidget {
  const _MainNav();

  @override
  State<_MainNav> createState() => _MainNavState();
}

class _MainNavState extends State<_MainNav> {
  int _index = 0;

  static const _screens = [
    EventsScreen(),
    SatelliteScreen(),
    SkyMapScreen(),
    GlossaryScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CosmicBackground(
        child: Column(
          children: [
            const _SiteHeader(),
            Expanded(
              child: IndexedStack(
                index: _index,
                children: _screens,
              ),
            ),
            NavigationBar(
              selectedIndex: _index,
              onDestinationSelected: (i) => setState(() => _index = i),
              backgroundColor: Theme.of(context).colorScheme.surface.withValues(alpha: 0.95),
              destinations: const [
                NavigationDestination(icon: Icon(Icons.event), label: 'Events'),
                NavigationDestination(icon: Icon(Icons.satellite_alt), label: 'Satellite'),
                NavigationDestination(icon: Icon(Icons.nightlight_round), label: 'Sky Map'),
                NavigationDestination(icon: Icon(Icons.menu_book), label: 'Glossary'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SiteHeader extends StatelessWidget {
  const _SiteHeader();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final scale = responsiveScale(context);
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: 16 * scale, vertical: 8 * scale),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1a1f3a),
            Color(0xFF252b4a),
            Color(0xFF1e2438),
          ],
          stops: [0.0, 0.5, 1.0],
        ),
        border: Border(
          bottom: BorderSide(color: scheme.primary.withValues(alpha: 0.3)),
        ),
        boxShadow: [
          BoxShadow(
            color: scheme.primary.withValues(alpha: 0.15),
            blurRadius: 30,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SvgPicture.asset(
              'assets/logo.svg',
              width: 20 * scale,
              height: 20 * scale,
              fit: BoxFit.contain,
            ),
            SizedBox(width: 8 * scale),
            ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: [Color(0xFFf0f4ff), Color(0xFF6b8dd6), Color(0xFF9d7ce8)],
                stops: [0.0, 0.5, 1.0],
              ).createShader(bounds),
              child: Text(
                'ASTROCALTT',
                style: GoogleFonts.orbitron(
                  fontSize: (18 * scale).clamp(14.0, 22.0),
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2,
                  color: Colors.white,
                ),
              ),
            ),
            SizedBox(width: 12 * scale),
            Container(
              width: 6 * scale,
              height: 6 * scale,
              decoration: BoxDecoration(
                color: const Color(0xFF4ecdc4),
                shape: BoxShape.circle,
              ),
            ),
            SizedBox(width: 6 * scale),
            Expanded(
              child: Text(
                LocationService.name,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontSize: (12 * scale).clamp(10.0, 14.0),
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w400,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
