# Satellite Imagery Options Assessment

## Current Situation
- **GIBS (NASA)**: Currently implemented but not working (tile errors)
- **OpenStreetMap**: Was working but removed
- **Need**: Working satellite imagery solution

## Option 1: Fix GIBS (NASA) ⚠️
**Pros:**
- Already partially implemented
- High-quality satellite imagery
- Multiple layers (MODIS, VIIRS, GOES-East)
- Free and public

**Cons:**
- Currently broken (CORS/tile format issues)
- Complex WMTS format
- May require proxy server
- Some layers have data delays

**Effort:** Medium - Need to fix tile URLs and use proxy

## Option 2: Restore OpenStreetMap ✅ EASIEST
**Pros:**
- Was working before
- Simple implementation
- Reliable
- No CORS issues
- Fast loading

**Cons:**
- Not satellite imagery (just map tiles)
- Doesn't show actual Earth imagery
- Less "astronomy" focused

**Effort:** Low - Just restore the OSM layer code

## Option 3: NOAA GOES Satellite Imagery 🆕
**Pros:**
- Real satellite imagery (GOES-16/GOES-18)
- Near real-time data
- Weather-focused (good for astronomy context)
- Public access
- May have better CORS support than GIBS

**Cons:**
- Need to research exact tile URLs
- May require different format than GIBS
- Coverage may be limited to certain regions
- May need API key or registration

**Effort:** Medium-High - Need to research and implement

## Option 4: Hybrid Approach (RECOMMENDED) ⭐
**Implementation:**
1. **Primary**: Try NOAA GOES satellite imagery
2. **Fallback**: OpenStreetMap if NOAA fails
3. **Future**: Keep GIBS code but disabled until fixed

**Pros:**
- Best of both worlds
- Always have a working map
- Can switch between satellite and map view
- Progressive enhancement

**Effort:** Medium - Implement NOAA, add OSM fallback

## Recommendation

**Short-term (Quick Fix):**
- Restore OpenStreetMap as working base layer
- Keep it simple and reliable

**Medium-term (Better Solution):**
- Research and implement NOAA GOES satellite imagery
- Add OSM as fallback
- Keep GIBS code commented for future use

**Long-term:**
- Fix GIBS implementation if needed
- Allow users to choose between different imagery sources

## Next Steps

1. **If choosing OSM**: Restore the OSM layer code (5 minutes)
2. **If choosing NOAA**: Research exact tile URLs and implement (30-60 minutes)
3. **If choosing Hybrid**: Implement NOAA with OSM fallback (45 minutes)

## NOAA GOES Research Needed

Need to find:
- Exact tile URL format for GOES-16/GOES-18
- WMTS endpoint if available
- CORS policy
- Coverage area
- Update frequency
- Any authentication requirements

