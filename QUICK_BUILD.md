# Quick Build Guide

## Easiest Method: Use the Batch File

```cmd
build-simple.bat
```

Just double-click it or run it from command prompt. It handles everything automatically.

## Manual Method (Step by Step)

### Step 1: Navigate to emsdk directory

```powershell
cd C:\Users\Admin\Desktop\AstroCal\emsdk
```

### Step 2: Activate emsdk

```powershell
python emsdk.py activate latest
.\emsdk_env.bat
```

### Step 3: Set environment variables

**Option A: Use the setup script (easiest)**
```powershell
.\..\SETUP_ENV.ps1
```

**Option B: Set manually (correct syntax)**
```powershell
$emsdkPath = Get-Location
$emscriptenPath = Join-Path $emsdkPath "upstream\emscripten"
$env:EMSDK = $emsdkPath
$env:EMSCRIPTEN = $emscriptenPath
$env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath
$env:PATH = "$emscriptenPath;$emsdkPath;$env:PATH"
```

**Note:** `Join-Path` needs TWO arguments:
- First: the parent path (current directory)
- Second: the child path ("upstream\emscripten")

### Step 4: Navigate to stellarium directory

```powershell
cd ..\stellarium-web-engine
```

### Step 5: Build

```powershell
scons target=js
```

## All-in-One Command (After activating emsdk)

From the `emsdk` directory:

```powershell
$env:EMSCRIPTEN_TOOL_PATH = "$(Get-Location)\upstream\emscripten"; $env:EMSDK = Get-Location; $env:EMSCRIPTEN = $env:EMSCRIPTEN_TOOL_PATH; $env:PATH = "$env:EMSCRIPTEN;$env:EMSDK;$env:PATH"; cd ..\stellarium-web-engine; scons target=js
```

## Troubleshooting

### Error: "The filename, directory name, or volume label syntax is incorrect"

This happens when `Join-Path` is used incorrectly. Make sure you provide TWO arguments:

**Wrong:**
```powershell
$env:EMSCRIPTEN_TOOL_PATH = Join-Path (Get-Location)
```

**Correct:**
```powershell
$env:EMSCRIPTEN_TOOL_PATH = Join-Path (Get-Location) "upstream\emscripten"
```

### Error: "EMSCRIPTEN_TOOL_PATH not found"

Make sure you're in the `emsdk` directory when setting the variable, and that `upstream\emscripten` exists.

### Verify Environment

Check if variables are set:
```powershell
echo $env:EMSCRIPTEN_TOOL_PATH
echo $env:EMSDK
```

Both should show paths, not be empty.

