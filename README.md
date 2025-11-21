# Astronomy Explorer

A comprehensive, interactive web app for astronomy enthusiasts featuring event browsing, NASA satellite imagery, and an interactive sky map. Built for La Brea, Trinidad & Tobago with global location support.

## 🚀 Quick Start

### Running the App

**Important:** You must run a local server. Opening `index.html` directly won't work due to browser security restrictions.

#### Option 1: Python (Recommended)
```bash
python -m http.server 8000
```
Then open: **http://localhost:8000** (use `http://` not `https://`)

#### Option 2: PowerShell Script
```powershell
.\start-server.ps1
```

#### Option 3: Node.js
```bash
npx http-server -p 8000
```

### ⚠️ Troubleshooting

**"Secure connection failed" error:**
- Make sure you're using `http://localhost:8000` (not `https://`)
- Type `http://` explicitly in the address bar
- Try `http://127.0.0.1:8000` instead

**Events not showing:**
- Check the browser console (F12) for errors
- Make sure the server is running
- Verify `data/events.json` exists and is valid JSON

## 📁 Project Structure

```
AstroCal/
├── index.html          # Main HTML file
├── styles.css          # Styling
├── script.js           # JavaScript logic
├── data/
│   └── events.json     # Event data
└── assets/             # Images/icons (optional)
```

## 🌟 Features

- **Events Browser**: View astronomy events (meteor showers, planet visibility, ISS passes, NASA APOD, solar events)
- **Interactive Sky Map**: Explore the night sky with zoom, pan, and click interactions
- **Satellite Imagery**: Browse NASA GIBS satellite imagery and OpenStreetMap
- **Geolocation Support**: Automatic location detection with user permission
- **NASA API Integration**: Real-time data from APOD, DONKI, and EONET
- **Smart Caching**: Offline support with localStorage caching
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Optimized for night-time astronomy viewing

## 📅 Event Data

The app includes:
- Major meteor showers (Quadrantids, Perseids, Geminids, etc.)
- Planet visibility events (Jupiter, Saturn)
- Events span the full year 2025

## 🛠️ Development

- Pure vanilla JavaScript (no frameworks)
- Semantic HTML5
- CSS with custom properties
- Responsive design (mobile-first)

