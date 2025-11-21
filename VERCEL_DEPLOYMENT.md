# Vercel Deployment Guide

## ✅ Deployment Checklist

### Files Configured
- ✅ `vercel.json` - Routing and security headers
- ✅ `config.js` - API key configuration (can use env vars)
- ✅ `.gitignore` - Protects API keys
- ✅ All static files ready for deployment

### Security Considerations

1. **API Key Protection**
   - `config.js` is in `.gitignore` (not committed)
   - For production, consider using Vercel Environment Variables:
     - Go to Vercel Dashboard → Project Settings → Environment Variables
     - Add: `NASA_API_KEY` = `X2dVwncjWkOz6OrVnWpO16W5eWE6NaAXz3BHH67Q`
   - Update `config.js` to read from `process.env.NASA_API_KEY` if using serverless functions

2. **HTTPS**
   - ✅ Vercel provides automatic HTTPS
   - ✅ Geolocation will work (requires HTTPS)
   - ✅ CORS issues should be resolved with HTTPS

### Potential Issues & Fixes

1. **ISS API CORS**
   - Should work better on Vercel (HTTPS)
   - If still blocked, consider using a serverless function as proxy

2. **NASA EONET API**
   - May still have CORS issues
   - App gracefully falls back to cached data

3. **File Paths**
   - ✅ All paths are relative (should work on Vercel)
   - ✅ `vercel.json` configured for SPA routing

4. **Static Assets**
   - ✅ All assets in correct locations
   - ✅ CDN will serve them efficiently

### Environment Variables (Optional)

If you want to use Vercel Environment Variables:

1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. Add:
   - `NASA_API_KEY` = `X2dVwncjWkOz6OrVnWpO16W5eWE6NaAXz3BHH67Q`

Then update `config.js` to:
```javascript
const NASA_API_CONFIG = {
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
    // ...
};
```

### Testing After Deployment

1. ✅ Check HTTPS is working
2. ✅ Test geolocation (should work on HTTPS)
3. ✅ Verify NASA APIs load (CORS should be better)
4. ✅ Test ISS API (may work now with HTTPS)
5. ✅ Check all three sections (Events, Satellite, Sky Map)
6. ✅ Test responsive design on mobile

### Performance

- Static files are served via CDN
- No build process needed (pure HTML/CSS/JS)
- Leaflet and other libraries loaded from CDN
- Images and data cached in browser

### Custom Domain

If using a custom domain:
- Ensure DNS is configured in Vercel
- SSL certificate is automatic
- All features should work the same

