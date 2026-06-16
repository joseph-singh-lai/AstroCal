# Vercel Deployment Guide

## Deployment Checklist

- `vercel.json` — routing and security headers
- `index.html` — loads `js/app.js` (ES modules)
- `api/nasa.js` — NASA APOD/DONKI proxy (**requires env var**)
- `api/eonet.js` — EONET proxy
- `api/gibs-tile.js` — optional GIBS tile proxy

## Required environment variable

1. Vercel Dashboard → Project Settings → Environment Variables
2. Add **`NASA_API_KEY`** with your NASA API key (from https://api.nasa.gov/)
3. Redeploy after adding the variable

The web app calls `/api/nasa?path=planetary/apod` etc. No API key is exposed in the browser.

## Flutter release builds

Pass the deployed proxy URL:

```bash
flutter build apk --dart-define=NASA_PROXY_URL=https://your-app.vercel.app/api/nasa
```

## Local development

- Static files: `npx serve .` or `python -m http.server`
- NASA/EONET proxies only work when run via Vercel CLI (`vercel dev`) or on deployed Vercel

## PWA

`manifest.webmanifest` and `sw.js` are served from the project root. Install works on HTTPS deployments.
