# Fix: SCons Can't Find Emscripten Tool

## The Error

```
scons: *** No tool module 'emscripten' found in ...
```

This means SCons can't find the Emscripten build tools.

## Solution 1: Set Environment Variables Before Running SCons

The environment variables need to be set in the **same PowerShell session** where you run scons.

From the `stellarium-web-engine` directory:

```powershell
# Set the paths correctly
$emsdkPath = "C:\Users\Admin\Desktop\AstroCal\emsdk"
$emscriptenPath = Join-Path $emsdkPath "upstream\emscripten"

# Set environment variables
$env:EMSDK = $emsdkPath
$env:EMSCRIPTEN = $emscriptenPath
$env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath
$env:PATH = "$emscriptenPath;$emsdkPath;$env:PATH"

# Verify
echo $env:EMSCRIPTEN_TOOL_PATH
# Should show: C:\Users\Admin\Desktop\AstroCal\emsdk\upstream\emscripten

# Now run scons
scons target=js
```

## Solution 2: Use emsdk_env.bat First

Make sure you've activated emsdk environment:

```powershell
# From project root
cd emsdk
.\emsdk_env.bat
cd ..\stellarium-web-engine

# Set the tool path explicitly
$env:EMSCRIPTEN_TOOL_PATH = "C:\Users\Admin\Desktop\AstroCal\emsdk\upstream\emscripten"
$env:EMSDK = "C:\Users\Admin\Desktop\AstroCal\emsdk"
$env:EMSCRIPTEN = $env:EMSCRIPTEN_TOOL_PATH

# Now run scons
scons target=js
```

## Solution 3: Check if Emscripten is Installed

First, verify emscripten exists:

```powershell
Test-Path "C:\Users\Admin\Desktop\AstroCal\emsdk\upstream\emscripten\emcc.bat"
```

If this returns `False`, you need to install emscripten first:

```powershell
cd C:\Users\Admin\Desktop\AstroCal\emsdk
.\emsdk install latest
.\emsdk activate latest
.\emsdk_env.bat
```

## Solution 4: Use Full Paths in SConstruct

If the above doesn't work, you might need to modify the SConstruct file, but this is more complex. Try solutions 1-3 first.

## Complete Working Sequence

```powershell
# 1. Go to emsdk and activate
cd C:\Users\Admin\Desktop\AstroCal\emsdk
.\emsdk activate latest
.\emsdk_env.bat

# 2. Set environment variables explicitly
$env:EMSDK = "C:\Users\Admin\Desktop\AstroCal\emsdk"
$env:EMSCRIPTEN = "$env:EMSDK\upstream\emscripten"
$env:EMSCRIPTEN_TOOL_PATH = $env:EMSCRIPTEN
$env:PATH = "$env:EMSCRIPTEN;$env:EMSDK;$env:PATH"

# 3. Verify emcc exists
Test-Path "$env:EMSCRIPTEN\emcc.bat"
# Should return True

# 4. Go to stellarium directory
cd ..\stellarium-web-engine

# 5. Verify environment is still set
echo $env:EMSCRIPTEN_TOOL_PATH

# 6. Build
scons target=js
```

## Key Points

- Environment variables only last for the current PowerShell session
- You must set them BEFORE running scons
- The path must point to `emsdk\upstream\emscripten`, NOT `stellarium-web-engine\upstream\emscripten`
- Make sure emscripten is actually installed (check for `emcc.bat`)

