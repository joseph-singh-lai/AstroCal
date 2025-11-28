# Stellarium Web Engine - Quick Start Guide

## 🚀 Build the Engine

Run the automated build script:

```powershell
.\build-stellarium.ps1
```

This will:
1. Clone Emscripten SDK (if needed)
2. Clone Stellarium Web Engine repository
3. Install dependencies
4. Build the engine
5. Copy files to `stellarium-build/` directory

**Note:** The build process can take 10-30 minutes depending on your system.

## 📁 Files Created

After building, you'll have:
- `stellarium-build/stellarium-web-engine.js` (~2-5 MB)
- `stellarium-build/stellarium-web-engine.wasm` (~5-10 MB)

## 🎯 Using the Engine

### Option 1: Web Engine Version (Full Control)
Open `sky-map-engine.html` - This uses the built Web Engine with full customization.

### Option 2: Iframe Version (Simple)
Open `sky-map.html` - This uses the public Stellarium Web service via iframe.

## ⚙️ Integration Code

The integration is in `stellarium-engine.js`. **Note:** The actual API may differ from the template code once the engine is built. You may need to adjust the function calls based on the actual engine API.

### Common Adjustments Needed:

1. **Module Loading:** The engine may use a different module pattern
2. **Function Names:** API function names may differ (e.g., `setLocation` vs `_setLocation`)
3. **Parameter Format:** Coordinates may need different units (radians vs degrees)

### How to Find the Actual API:

1. Check the built `stellarium-web-engine.js` file for exported functions
2. Look at the `apps/simple-html/` example in the stellarium-web-engine repository
3. Check browser console for available methods on the Module object

## 🔧 Troubleshooting

### Build Fails
- Ensure Python 3.7+ is installed
- Check that Git is available
- Try building in WSL if on Windows

### Engine Doesn't Load
- Check browser console for errors
- Verify files are in `stellarium-build/` directory
- Ensure server is running (files must be served, not opened directly)

### API Errors
- The integration code is a template - adjust based on actual engine API
- Check the simple-html example for correct usage patterns

## 📝 Next Steps

1. **Build the engine:** Run `.\build-stellarium.ps1`
2. **Test the build:** Open `sky-map-engine.html` in a browser
3. **Adjust integration:** Modify `stellarium-engine.js` based on actual API
4. **Update HTML:** Link to `sky-map-engine.html` from main navigation if desired

## 💡 Tips

- The iframe version (`sky-map.html`) works immediately without building
- Use the Web Engine version for full customization
- Keep both versions - iframe as fallback, engine for advanced features
- Check the Stellarium Web Engine repository for API documentation

