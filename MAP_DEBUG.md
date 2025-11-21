# Map Debugging Guide

## Common Issues

### 1. GIBS Map Not Loading

**Possible Causes:**
- CORS restrictions (NASA GIBS may block localhost)
- Incorrect tile URL format
- Leaflet library not loaded
- Map container not visible when initialized

**Solutions:**
1. Check browser console (F12) for errors
2. Verify Leaflet is loaded: `typeof L !== 'undefined'`
3. Check if map container exists: `document.getElementById('gibsMap')`
4. Try the fallback OpenStreetMap layer

### 2. Sky Map Not Interactive

**Possible Causes:**
- Canvas not initialized
- getCurrentLocation() not available
- JavaScript errors in calculations

**Solutions:**
1. Check console for errors
2. Verify canvas exists: `document.getElementById('skyCanvas')`
3. Check if getCurrentLocation is available: `typeof getCurrentLocation !== 'undefined'`

## Testing Steps

1. Open browser console (F12)
2. Navigate to Satellite Imagery tab
3. Check for errors
4. Try clicking on map controls
5. Check Network tab for failed tile requests

## Fallback Options

If GIBS doesn't work, the map will fallback to OpenStreetMap tiles.

