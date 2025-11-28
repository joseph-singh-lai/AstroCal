# Building Stellarium Web Engine

## Prerequisites

1. **Python 3.7+** (for SCons)
2. **Git** (to clone repositories)
3. **Make** (usually comes with Git for Windows or can use WSL)

## Quick Build (Windows PowerShell)

Run the automated build script:

```powershell
.\build-stellarium.ps1
```

This will:
1. Clone Emscripten SDK if needed
2. Clone Stellarium Web Engine repository
3. Install and activate Emscripten
4. Install SCons
5. Build the engine
6. Copy built files to `stellarium-build/` directory

## Manual Build Steps

If the script doesn't work, follow these steps:

### 1. Install Emscripten SDK

```powershell
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
.\emsdk install latest
.\emsdk activate latest
.\emsdk_env.bat
```

### 2. Install SCons

```powershell
pip install scons
```

### 3. Clone and Build Stellarium Web Engine

```powershell
cd ..
git clone https://github.com/Stellarium/stellarium-web-engine.git
cd stellarium-web-engine
make js
```

### 4. Copy Built Files

The built files will be in `html/static/js/`:
- `stellarium-web-engine.js`
- `stellarium-web-engine.wasm`

Copy these to your project's `stellarium-build/` directory.

## Alternative: Use WSL (Windows Subsystem for Linux)

If you have WSL installed, building on Linux is often easier:

```bash
# In WSL
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

cd ..
git clone https://github.com/Stellarium/stellarium-web-engine.git
cd stellarium-web-engine
make js
```

## Build Output

After building, you should have:
- `stellarium-build/stellarium-web-engine.js` (~2-5 MB)
- `stellarium-build/stellarium-web-engine.wasm` (~5-10 MB)

These files will be integrated into `sky-map.html`.

## Troubleshooting

### "make: command not found"
- Install Make for Windows or use WSL
- Or use `scons` directly instead of `make js`

### "emsdk: command not found"
- Make sure you've activated emsdk: `.\emsdk activate latest`
- Source the environment: `.\emsdk_env.bat` (Windows) or `source ./emsdk_env.sh` (Linux)

### Build fails with memory errors
- The build requires significant RAM (4GB+ recommended)
- Close other applications
- Try building on a machine with more memory

### Python version issues
- Ensure Python 3.7+ is installed
- Check with: `python --version`

## Next Steps

After building:
1. The integration code will automatically use the built files
2. Update `sky-map.html` to use the Web Engine instead of iframe
3. Test the integration

