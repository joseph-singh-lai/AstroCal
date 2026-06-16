# AstroCalTT Architecture

## Overview

AstroCalTT is a static web app (Vercel) plus a Flutter companion. The web client uses ES modules under `js/` with no bundler.

```mermaid
flowchart TB
    index[index.html] --> app[js/app.js]
    app --> events[js/events-generators.js]
    app --> nasa[js/nasa-api.js]
    app --> iss[js/iss.js]
    app --> planets[js/planets.js]
    app --> astronomy[js/astronomy.js]
    app --> filters[js/filters-ui.js]
    app --> nav[js/navigation.js]
    nav --> sky[sky-map.js lazy]
    nav --> gibs[gibs-map.js lazy]
    nasa --> proxyN[/api/nasa]
    nasa --> eonet[/api/eonet]
    gibs --> proxyG[/api/gibs-tile]
```

## Data sources

| Source | Endpoint | Module |
|--------|----------|--------|
| NASA APOD / DONKI | `/api/nasa` | `js/nasa-api.js` |
| NASA EONET | `/api/eonet` | `js/nasa-api.js` |
| Open-Meteo astronomy | Direct CORS | `js/astronomy.js` |
| ISS positions | WhereTheISS.at | `js/iss.js` |
| Meteor/eclipse/supermoon | `data/astro_constants.js` | `js/events-generators.js` |
| T&T local tips | `data/local_tt.json` | `js/local-tt.js` |

## File map

| Path | Role |
|------|------|
| `js/app.js` | Bootstrap / DOMContentLoaded |
| `js/state.js` | Shared mutable app state |
| `js/config.js` | NASA config helpers, defaults |
| `js/navigation.js` | Section tabs, lazy map loading |
| `sky-map.js` | Canvas planetarium (lazy) |
| `gibs-map.js` | Leaflet Earth Map (lazy) |
| `api/nasa.js` | NASA API key proxy |
| `api/eonet.js` | EONET proxy |
| `api/gibs-tile.js` | GIBS WMTS tile proxy (optional layer) |
| `astrocaltt/` | Flutter app |

## Environment

Set `NASA_API_KEY` in Vercel project settings. Flutter release builds use `--dart-define=NASA_PROXY_URL=https://your-domain/api/nasa`.

## Caching

- NASA responses: `localStorage` via `js/nasa-api.js`
- PWA shell: `sw.js` caches HTML/CSS/JS shell
