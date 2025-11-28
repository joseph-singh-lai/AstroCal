# Build script for Stellarium Web Engine
# This script sets up the build environment and builds the engine

Write-Host "=== Stellarium Web Engine Build Setup ===" -ForegroundColor Cyan

# Check if emsdk exists
$emsdkPath = ".\emsdk"
if (-not (Test-Path $emsdkPath)) {
    Write-Host "Cloning Emscripten SDK..." -ForegroundColor Yellow
    git clone https://github.com/emscripten-core/emsdk.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to clone emsdk" -ForegroundColor Red
        exit 1
    }
}

# Check if stellarium-web-engine exists
$stellariumPath = ".\stellarium-web-engine"
if (-not (Test-Path $stellariumPath)) {
    Write-Host "Cloning Stellarium Web Engine..." -ForegroundColor Yellow
    git clone https://github.com/Stellarium/stellarium-web-engine.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to clone stellarium-web-engine" -ForegroundColor Red
        exit 1
    }
}

# Setup emsdk
Write-Host "Setting up Emscripten SDK..." -ForegroundColor Yellow
Push-Location $emsdkPath
.\emsdk install latest
.\emsdk activate latest
$env:EMSDK = (Resolve-Path .).Path
$env:EMSDK_NODE = "$env:EMSDK\node\14.15.5_64bit\bin\node.exe"
$env:EMSDK_PYTHON = "$env:EMSDK\python\3.9.2_64bit\python.exe"
$env:PATH = "$env:EMSDK;$env:EMSDK\upstream\emscripten;$env:EMSDK\node\14.15.5_64bit\bin;$env:EMSDK\python\3.9.2_64bit;$env:PATH"
Pop-Location

# Check for SCons
Write-Host "Checking for SCons..." -ForegroundColor Yellow
$sconsCheck = python -c "import SCons" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing SCons..." -ForegroundColor Yellow
    pip install scons
}

# Build stellarium-web-engine
Write-Host "Building Stellarium Web Engine..." -ForegroundColor Yellow
Push-Location $stellariumPath
make js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Copy built files to project
Write-Host "Copying built files..." -ForegroundColor Yellow
$staticJsPath = "$stellariumPath\html\static\js"
if (Test-Path $staticJsPath) {
    New-Item -ItemType Directory -Force -Path ".\stellarium-build" | Out-Null
    Copy-Item "$staticJsPath\stellarium-web-engine.js" -Destination ".\stellarium-build\" -Force
    Copy-Item "$staticJsPath\stellarium-web-engine.wasm" -Destination ".\stellarium-build\" -Force
    Write-Host "Build complete! Files copied to .\stellarium-build\" -ForegroundColor Green
} else {
    Write-Host "Warning: Built files not found in expected location" -ForegroundColor Yellow
    Write-Host "Please check: $staticJsPath" -ForegroundColor Yellow
}

Write-Host "=== Build Complete ===" -ForegroundColor Green

