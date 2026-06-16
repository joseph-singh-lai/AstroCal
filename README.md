# AstroCalTT

Trinidad & Tobago astronomy hub: events calendar, live NASA data, interactive sky map, and earth imagery — web + Flutter companion.

## Quick start

```bash
python -m http.server 8000
# open http://localhost:8000
```

For NASA APOD/DONKI locally, use `vercel dev` so `/api/nasa` works.

## Project structure

```
AstroCal/
├── index.html
├── js/                  # ES modules (entry: app.js)
├── data/
│   ├── astro_constants.js
│   └── local_tt.json
├── api/                 # Vercel serverless proxies
├── sky-map.js           # Lazy-loaded planetarium
├── gibs-map.js          # Lazy-loaded Earth Map (Leaflet)
├── astrocaltt/          # Flutter app
├── ARCHITECTURE.md
└── PARITY.md
```

## Features

- **Events**: Meteor showers, planets, ISS snapshots, NASA APOD/DONKI/EONET, Open-Meteo astronomy
- **Tonight strip**: Moon phase, sunset, best planet, observing score
- **Earth Map**: ESRI/OSM/CARTO layers + optional NASA GIBS night band
- **Sky Map**: Azimuthal equidistant projection; link from planet events
- **PWA**: Offline shell via service worker
- **NASA proxy**: API key stays server-side (`NASA_API_KEY` on Vercel)

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for production setup.
