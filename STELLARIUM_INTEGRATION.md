# Stellarium Web Engine Integration Guide

## Current Status

We're currently using **Stellarium Web** (stellarium-web.org) via iframe, which is simple but has limitations:
- ✅ Works immediately, no build required
- ✅ No API keys needed
- ❌ Limited customization
- ❌ Iframe restrictions

## Option 1: Keep Iframe (Current - Simplest)

**Pros:**
- Works immediately
- No build process
- No dependencies

**Cons:**
- Limited customization
- Iframe restrictions

## Option 2: Build Stellarium Web Engine (Full Control)

**Pros:**
- Full control over rendering
- Customizable UI
- No iframe restrictions
- Better performance

**Cons:**
- Requires emscripten build setup
- Larger file sizes (.wasm + .js)
- More complex integration

### Build Requirements

1. **Install Emscripten SDK:**
   ```bash
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ./emsdk install latest
   ./emsdk activate latest
   source ./emsdk_env.sh
   ```

2. **Install SCons:**
   ```bash
   pip install scons
   ```

3. **Build the Engine:**
   ```bash
   git clone https://github.com/Stellarium/stellarium-web-engine.git
   cd stellarium-web-engine
   make js
   ```

4. **Copy Built Files:**
   - Copy `stellarium-web-engine.js` and `stellarium-web-engine.wasm` to your project
   - Reference example in `apps/simple-html/` directory

## Option 3: Use Pre-built Version (If Available)

Check GitHub releases for pre-built `.js` and `.wasm` files that can be used directly.

## Recommendation

For now, **keep the iframe approach** but improve it:
- Better error handling
- Loading states
- Enhanced controls
- Better mobile support

If you need full control later, we can build the Web Engine.

