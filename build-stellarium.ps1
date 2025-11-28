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

# Use scons directly instead of make (Windows doesn't have make by default)
# Check if we're in emsdk environment
if (-not $env:EMSDK) {
    Write-Host "Activating Emscripten environment..." -ForegroundColor Yellow
    Push-Location $emsdkPath
    .\emsdk activate latest
    .\emsdk_env.bat
    Pop-Location
}

# Build using scons
Write-Host "Running scons to build JavaScript version..." -ForegroundColor Yellow
scons target=js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed. Trying alternative build method..." -ForegroundColor Yellow
    # Try with explicit emscripten path
    $emccPath = Join-Path $emsdkPath "upstream\emscripten\emcc.bat"
    if (Test-Path $emccPath) {
        $env:PATH = "$emsdkPath\upstream\emscripten;$env:PATH"
        scons target=js
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Build failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Pop-Location

# Copy built files to project
Write-Host "Copying built files..." -ForegroundColor Yellow
$staticJsPath = "$stellariumPath\html\static\js"
$buildPath = "$stellariumPath\build"

# Check multiple possible locations for built files
$possibleLocations = @(
    "$staticJsPath",
    "$buildPath\html\static\js",
    "$stellariumPath\html\js",
    "$stellariumPath\build\js"
)

$foundFiles = $false
foreach ($location in $possibleLocations) {
    if (Test-Path $location) {
        Write-Host "Checking location: $location" -ForegroundColor Cyan
        $jsFile = Get-ChildItem -Path $location -Filter "stellarium-web-engine.js" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        $wasmFile = Get-ChildItem -Path $location -Filter "stellarium-web-engine.wasm" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($jsFile -and $wasmFile) {
            New-Item -ItemType Directory -Force -Path ".\stellarium-build" | Out-Null
            Copy-Item $jsFile.FullName -Destination ".\stellarium-build\stellarium-web-engine.js" -Force
            Copy-Item $wasmFile.FullName -Destination ".\stellarium-build\stellarium-web-engine.wasm" -Force
            Write-Host "Build complete! Files copied to .\stellarium-build\" -ForegroundColor Green
            Write-Host "  - stellarium-web-engine.js" -ForegroundColor Green
            Write-Host "  - stellarium-web-engine.wasm" -ForegroundColor Green
            $foundFiles = $true
            break
        }
    }
}

if (-not $foundFiles) {
    Write-Host "Warning: Built files not found in expected locations" -ForegroundColor Yellow
    Write-Host "Searched in:" -ForegroundColor Yellow
    foreach ($location in $possibleLocations) {
        Write-Host "  - $location" -ForegroundColor Yellow
    }
    Write-Host "`nPlease check the build output or try building manually:" -ForegroundColor Yellow
    Write-Host "  cd stellarium-web-engine" -ForegroundColor Cyan
    Write-Host "  scons target=js" -ForegroundColor Cyan
}

Write-Host "=== Build Complete ===" -ForegroundColor Green

