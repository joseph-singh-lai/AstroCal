# API Integration Guide

## Open Notify API - ISS Passes

The app now integrates with the [Open Notify API](http://api.open-notify.org/) to fetch real-time ISS (International Space Station) pass predictions.

### Implementation Details

**Endpoint Used:**
```
http://api.open-notify.org/iss-pass.json?lat={latitude}&lon={longitude}&n={number_of_passes}
```

**Location:** La Brea, Trinidad & Tobago
- Latitude: 10.25°N
- Longitude: 61.63°W

**Function:** `loadISSPasses()` in `script.js`

### How It Works

1. On page load, the app fetches the next 10 ISS passes for La Brea
2. Each pass is converted to the standard event format
3. ISS events are merged with static events (meteor showers, planet visibility)
4. All events are sorted chronologically and displayed together

### ISS Event Format

ISS passes are converted to match the standard event structure:

```json
{
  "id": "iss-pass-{timestamp}",
  "title": "ISS Pass Over La Brea",
  "category": "iss",
  "datetime": "ISO 8601 timestamp",
  "description": "Duration and visibility details",
  "location": "La Brea, Trinidad & Tobago",
  "visibility": {
    "direction": "Variable",
    "peak": "Rise time",
    "elevation": "Maximum visibility",
    "duration": "Pass duration"
  }
}
```

### API Response Format

The Open Notify API returns:

```json
{
  "message": "success",
  "request": {
    "altitude": 413,
    "datetime": 1234567890,
    "latitude": 10.25,
    "longitude": -61.63,
    "passes": 10
  },
  "response": [
    {
      "duration": 600,
      "risetime": 1234567890
    }
  ]
}
```

### Notes

- **CORS:** The Open Notify API supports CORS, so it works from browsers
- **Rate Limiting:** No API key required, but be respectful of rate limits
- **Data Freshness:** ISS passes are calculated in real-time, so they're always current
- **Error Handling:** If ISS API fails, static events still load and display

### Future Enhancements

Potential improvements:
- Add more ISS pass details (direction, max elevation)
- Cache ISS passes to reduce API calls
- Add refresh button to update ISS passes
- Show ISS current location on a map
- Add other satellite passes (Tiangong, etc.)

