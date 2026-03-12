import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Reference dimensions (typical phone portrait).
const double _refWidth = 375;
const double _refHeight = 667;

/// Scale factor to keep UI ratios consistent across screen sizes.
/// Values are clamped so tiny screens don't get unreadable and large tablets don't get huge.
double responsiveScale(BuildContext context) {
  final size = MediaQuery.sizeOf(context);
  final scaleW = size.width / _refWidth;
  final scaleH = size.height / _refHeight;
  final raw = math.min(scaleW, scaleH);
  return raw.clamp(0.75, 1.5);
}

/// Scaled font size.
double scaledFontSize(BuildContext context, double base) =>
    (base * responsiveScale(context)).roundToDouble();
