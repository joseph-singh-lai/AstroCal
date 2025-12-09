# Build Script for Stellarium Web Engine
# This script sets up the Emscripten environment and builds the engine

$ErrorActionPreference = "Stop"

Write-Host "=== Building Stellarium Web Engine ===" -ForegroundColor Cyan

# Set paths
$projectRoot = "C:\Users\Admin\Desktop\AstroCal"
$emsdkPath = Join-Path $projectRoot "emsdk"
$emscriptenPath = Join-Path $emsdkPath "upstream\emscripten"
$stellariumPath = Join-Path $projectRoot "stellarium-web-engine"

# Step 1: Verify emsdk exists
Write-Host ""
Write-Host "[1/5] Checking emsdk installation..." -ForegroundColor Yellow
if (-not (Test-Path $emsdkPath)) {
    Write-Host "ERROR: emsdk not found at $emsdkPath" -ForegroundColor Red
    exit 1
}

# Step 2: Verify emscripten is installed
Write-Host "[2/5] Checking emscripten installation..." -ForegroundColor Yellow
$emccPath = Join-Path $emscriptenPath "emcc.bat"
if (-not (Test-Path $emccPath)) {
    Write-Host "ERROR: emscripten not found. Please run:" -ForegroundColor Red
    Write-Host "  cd $emsdkPath" -ForegroundColor Yellow
    Write-Host "  .\emsdk install latest" -ForegroundColor Yellow
    Write-Host "  .\emsdk activate latest" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Emscripten found at $emscriptenPath" -ForegroundColor Green

# Step 3: Activate emsdk environment
Write-Host "[3/5] Activating emsdk environment..." -ForegroundColor Yellow
Push-Location $emsdkPath
try {
    & .\emsdk_env.bat
    Write-Host "  Emscripten environment activated" -ForegroundColor Green
} catch {
    Write-Host "  Warning: Could not run emsdk_env.bat" -ForegroundColor Yellow
}
Pop-Location

# Step 4: Set environment variables explicitly
Write-Host "[4/5] Setting environment variables..." -ForegroundColor Yellow
$env:EMSDK = $emsdkPath
$env:EMSCRIPTEN = $emscriptenPath
$env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath
$env:PATH = "$emscriptenPath;$emsdkPath;$env:PATH"

# Verify variables are set
Write-Host "  EMSDK: $env:EMSDK" -ForegroundColor Gray
Write-Host "  EMSCRIPTEN: $env:EMSCRIPTEN" -ForegroundColor Gray
Write-Host "  EMSCRIPTEN_TOOL_PATH: $env:EMSCRIPTEN_TOOL_PATH" -ForegroundColor Gray

# Verify emcc is accessible
$emccVersion = & "$emscriptenPath\emcc.bat" --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  emcc is accessible" -ForegroundColor Green
} else {
    Write-Host "  ERROR: emcc is not accessible" -ForegroundColor Red
    exit 1
}

# Step 5: Build stellarium-web-engine
Write-Host "[5/5] Building stellarium-web-engine..." -ForegroundColor Yellow
Push-Location $stellariumPath
try {
    if (-not (Test-Path $stellariumPath)) {
        Write-Host "ERROR: stellarium-web-engine directory not found at $stellariumPath" -ForegroundColor Red
        Write-Host "Please clone it first:" -ForegroundColor Yellow
        Write-Host "  git clone https://github.com/Stellarium/stellarium-web-engine.git" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "  Building with emscons (this may take 10-30 minutes)..." -ForegroundColor Cyan
    Write-Host "  Command: emscons scons mode=release -j8" -ForegroundColor Gray
    
    # Use emscons which is the Emscripten wrapper for scons
    $emsconsPath = Join-Path $emscriptenPath "emscons.py"
    & python $emsconsPath scons mode=release -j8
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=== BUILD SUCCESSFUL ===" -ForegroundColor Green
        
        # Check for output files
        $jsFile = Join-Path $stellariumPath "build\stellarium-web-engine.js"
        $wasmFile = Join-Path $stellariumPath "build\stellarium-web-engine.wasm"
        
        if (Test-Path $jsFile) {
            $jsSize = (Get-Item $jsFile).Length / 1MB
            $jsSizeRounded = [math]::Round($jsSize, 2)
            Write-Host "  stellarium-web-engine.js - $jsSizeRounded MB" -ForegroundColor Green
        }
        
        if (Test-Path $wasmFile) {
            $wasmSize = (Get-Item $wasmFile).Length / 1MB
            $wasmSizeRounded = [math]::Round($wasmSize, 2)
            Write-Host "  stellarium-web-engine.wasm - $wasmSizeRounded MB" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Copy the built files to your project" -ForegroundColor Yellow
        Write-Host "  2. Update sky-map.html to use the local engine instead of iframe" -ForegroundColor Yellow
        
    } else {
        Write-Host ""
        Write-Host "=== BUILD FAILED ===" -ForegroundColor Red
        Write-Host "Check the error messages above for details." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "=== BUILD ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
