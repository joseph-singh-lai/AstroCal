# Build Troubleshooting Guide

## Common Errors and Solutions

### Error: `KeyError: 'EMSCRIPTEN_TOOL_PATH'`

**Problem:** The SConstruct file requires `EMSCRIPTEN_TOOL_PATH` environment variable.

**Solution:**
1. Make sure emsdk is properly installed and activated
2. The build script should set this automatically, but if it doesn't:

```powershell
cd emsdk
.\emsdk activate latest
.\emsdk_env.bat
cd ..\stellarium-web-engine
$env:EMSCRIPTEN_TOOL_PATH = "$env:EMSDK\upstream\emscripten"
scons target=js
```

### Error: `make: command not found`

**Problem:** Windows doesn't have `make` by default.

**Solution:** Use `scons` directly instead:
```powershell
scons target=js
```

### Error: `scons: command not found`

**Problem:** SCons is not installed.

**Solution:**
```powershell
pip install scons
```

### Error: `emcc: command not found`

**Problem:** Emscripten is not in PATH.

**Solution:**
```powershell
cd emsdk
.\emsdk activate latest
.\emsdk_env.bat
# Then run scons from stellarium-web-engine directory
```

### Manual Build Steps (If Script Fails)

1. **Install and activate emsdk:**
   ```powershell
   cd emsdk
   .\emsdk install latest
   .\emsdk activate latest
   .\emsdk_env.bat
   ```

2. **Set environment variables:**
   ```powershell
   $env:EMSDK = (Resolve-Path .).Path
   $env:EMSCRIPTEN = "$env:EMSDK\upstream\emscripten"
   $env:EMSCRIPTEN_TOOL_PATH = "$env:EMSCRIPTEN"
   $env:PATH = "$env:EMSCRIPTEN;$env:EMSDK;$env:PATH"
   ```

3. **Build:**
   ```powershell
   cd ..\stellarium-web-engine
   scons target=js
   ```

### Verify Environment

Check if environment is set correctly:
```powershell
echo $env:EMSDK
echo $env:EMSCRIPTEN_TOOL_PATH
emcc --version
```

All should return values without errors.

### Alternative: Use WSL (Windows Subsystem for Linux)

If Windows build continues to fail, consider using WSL:

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

