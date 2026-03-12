import 'package:flutter_test/flutter_test.dart';
import 'package:astrocaltt/main.dart';

void main() {
  testWidgets('App loads', (WidgetTester tester) async {
    await tester.pumpWidget(const AstroCalTTApp());
    expect(find.text('AstroCalTT'), findsOneWidget);
  });
}
