import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Cosmic background matching the web design: dark navy, starfield,
/// central pulsing sun, and 6 orbiting planets.
class CosmicBackground extends StatefulWidget {
  final Widget child;
  final bool animate;

  const CosmicBackground({super.key, required this.child, this.animate = true});

  @override
  State<CosmicBackground> createState() => _CosmicBackgroundState();
}

class _CosmicBackgroundState extends State<CosmicBackground>
    with TickerProviderStateMixin {
  AnimationController? _starController;
  AnimationController? _sunController;

  @override
  void initState() {
    super.initState();
    _starController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 60),
    )..repeat();
    _sunController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _starController?.dispose();
    _sunController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final starCtrl = _starController;
    final sunCtrl = _sunController;
    return Stack(
      fit: StackFit.expand,
      children: [
        // Base gradient
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFF0a0e27),
                Color(0xFF1a1f3a),
                Color(0xFF0a0e27),
              ],
            ),
          ),
        ),
        // Starfield
        if (widget.animate && starCtrl != null)
          AnimatedBuilder(
            animation: starCtrl,
            builder: (context, child) => CustomPaint(
              painter: _StarfieldPainter(starCtrl.value),
              size: Size.infinite,
            ),
          )
        else
          CustomPaint(
            painter: _StarfieldPainter(0),
            size: Size.infinite,
          ),
        // Orbital container (center) - Sun + Planets
        Center(
          child: SizedBox(
            width: 900,
            height: 900,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                // Central sun (pulsing)
                if (sunCtrl != null)
                AnimatedBuilder(
                  animation: sunCtrl,
                  builder: (context, child) {
                    final scale = 0.9 + sunCtrl.value * 0.1;
                    final opacity = 0.85 + sunCtrl.value * 0.1;
                    return Transform.scale(
                      scale: scale,
                      child: Opacity(
                        opacity: opacity,
                        child: Container(
                          width: 90,
                          height: 90,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                Color.fromRGBO(255, 255, 200, 0.9),
                                Color.fromRGBO(255, 220, 100, 0.8),
                                Color.fromRGBO(255, 180, 50, 0.7),
                                Color.fromRGBO(255, 140, 0, 0.6),
                                Color.fromRGBO(255, 100, 0, 0.5),
                                Color.fromRGBO(200, 80, 0, 0.4),
                              ],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Color.fromRGBO(255, 255, 200, 0.6),
                                blurRadius: 40,
                                spreadRadius: 5,
                              ),
                              BoxShadow(
                                color: Color.fromRGBO(255, 180, 50, 0.3),
                                blurRadius: 80,
                                spreadRadius: 10,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
                // 6 orbiting planets
                if (widget.animate && starCtrl != null) ...[
                  _OrbitingPlanet(
                    controller: starCtrl,
                    radius: 125,
                    orbitSeconds: 20,
                    delayFraction: 0,
                    size: 60,
                    colors: [
                      Color.fromRGBO(255, 215, 0, 0.7),
                      Color.fromRGBO(255, 140, 0, 0.5),
                      Color.fromRGBO(255, 100, 0, 0.3),
                    ],
                    glowColor: Color.fromRGBO(255, 215, 0, 0.6),
                  ),
                  _OrbitingPlanet(
                    controller: starCtrl,
                    radius: 160,
                    orbitSeconds: 25,
                    delayFraction: -3 / 25,
                    size: 45,
                    colors: [
                      Color.fromRGBO(157, 124, 232, 0.8),
                      Color.fromRGBO(107, 141, 214, 0.6),
                      Color.fromRGBO(99, 102, 241, 0.4),
                    ],
                    glowColor: Color.fromRGBO(157, 124, 232, 0.7),
                  ),
                  _OrbitingPlanet(
                    controller: starCtrl,
                    radius: 200,
                    orbitSeconds: 30,
                    delayFraction: -6 / 30,
                    size: 75,
                    colors: [
                      Color.fromRGBO(107, 141, 214, 0.7),
                      Color.fromRGBO(99, 102, 241, 0.5),
                      Color.fromRGBO(79, 70, 229, 0.3),
                    ],
                    glowColor: Color.fromRGBO(107, 141, 214, 0.6),
                  ),
                  _OrbitingPlanet(
                    controller: starCtrl,
                    radius: 140,
                    orbitSeconds: 22,
                    delayFraction: -9 / 22,
                    size: 50,
                    colors: [
                      Color.fromRGBO(255, 215, 0, 0.6),
                      Color.fromRGBO(255, 200, 0, 0.4),
                      Color.fromRGBO(255, 180, 0, 0.3),
                    ],
                    glowColor: Color.fromRGBO(255, 215, 0, 0.5),
                  ),
                  _OrbitingPlanet(
                    controller: starCtrl,
                    radius: 100,
                    orbitSeconds: 18,
                    delayFraction: -12 / 18,
                    size: 40,
                    colors: [
                      Color.fromRGBO(236, 72, 153, 0.7),
                      Color.fromRGBO(219, 39, 119, 0.5),
                      Color.fromRGBO(190, 24, 93, 0.3),
                    ],
                    glowColor: Color.fromRGBO(236, 72, 153, 0.6),
                  ),
                  _OrbitingPlanet(
                    controller: starCtrl,
                    radius: 180,
                    orbitSeconds: 24,
                    delayFraction: -15 / 24,
                    size: 55,
                    colors: [
                      Color.fromRGBO(34, 197, 94, 0.6),
                      Color.fromRGBO(22, 163, 74, 0.4),
                      Color.fromRGBO(21, 128, 61, 0.3),
                    ],
                    glowColor: Color.fromRGBO(34, 197, 94, 0.5),
                  ),
                ],
              ],
            ),
          ),
        ),
        // Content
        widget.child,
      ],
    );
  }
}

class _OrbitingPlanet extends StatelessWidget {
  final AnimationController controller;
  final double radius;
  final double orbitSeconds;
  final double delayFraction;
  final double size;
  final List<Color> colors;
  final Color glowColor;

  const _OrbitingPlanet({
    required this.controller,
    required this.radius,
    required this.orbitSeconds,
    required this.delayFraction,
    required this.size,
    required this.colors,
    required this.glowColor,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        // angle = full rotations based on 60s master clock
        final rotations = (controller.value * 60 / orbitSeconds) + delayFraction;
        final angle = (rotations % 1) * 2 * math.pi;
        final x = math.cos(angle) * radius;
        final y = math.sin(angle) * radius;
        return Transform.translate(
          offset: Offset(x, y),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                center: const Alignment(-0.3, -0.3),
                colors: colors,
              ),
              boxShadow: [
                BoxShadow(
                  color: glowColor.withValues(alpha: 0.6),
                  blurRadius: size * 0.5,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StarfieldPainter extends CustomPainter {
  final double phase;

  _StarfieldPainter(this.phase);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final rnd = math.Random(42);

    for (var i = 0; i < 80; i++) {
      final x = (rnd.nextDouble() * w + phase * w * 0.3) % (w * 1.2) - w * 0.1;
      final y = (rnd.nextDouble() * h + phase * h * 0.2) % (h * 1.2) - h * 0.1;
      final rad = rnd.nextDouble() * 1.5 + 0.5;
      final alpha = 0.5 + rnd.nextDouble() * 0.5;
      final isBlue = rnd.nextBool();
      final color = isBlue
          ? Color.fromRGBO(107, 141, 214, alpha)
          : Color.fromRGBO(255, 255, 255, alpha);
      canvas.drawCircle(
        Offset(x, y),
        rad,
        Paint()..color = color,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _StarfieldPainter old) => old.phase != phase;
}
