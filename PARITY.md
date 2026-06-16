# Web / Flutter Parity Checklist

| Item | Web | Flutter | Status |
|------|-----|---------|--------|
| Default filters (apod, meteor, planet, astronomy) | `js/config.js` | `events_screen.dart` | ✅ |
| NASA refresh on load | `js/nasa-api.js` stale-while-revalidate | `events_screen.dart` `_loadEvents` | ✅ |
| Header logo | `assets/logo_header.svg` | `assets/logo_header.png` | ✅ |
| Earth Map naming | Nav label "Earth Map" | Nav label "Earth Map" | ✅ |
| Workshop filter removed | — | — | ✅ |
| NASA API proxy | `/api/nasa` | `api_service.dart` `_nasaGet` | ✅ |
| ISS labeling (approximate snapshot) | `js/iss.js` | `api_service.dart` | ✅ |
| Planet viewing windows | `visibilityWindow` in `js/planets.js` | Partial (visibility map) | ⚠️ |
| Tonight highlights strip | `js/tonight-strip.js` | Not yet | ❌ |
| T&T local content panel | `data/local_tt.json` | Not yet | ❌ |
| Sky map projection | Azimuthal equidistant | Azimuthal equidistant | ✅ |
| Events → Sky Map link | `js/navigation.js` | Not yet | ❌ |
| PWA install | `manifest.webmanifest` + `sw.js` | N/A | ✅ web only |
| Observing score | `js/observing-score.js` | Not yet | ❌ |
| Optional NASA GIBS layer | `gibs-map.js` | Not yet | ✅ web only |

Update this file when porting web features to Flutter.
