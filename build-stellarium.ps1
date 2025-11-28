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

# Install and activate emsdk
.\emsdk install latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: emsdk install may have issues, continuing..." -ForegroundColor Yellow
}

.\emsdk activate latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: emsdk activate may have issues, continuing..." -ForegroundColor Yellow
}

# Get the emsdk path
$emsdkRoot = (Resolve-Path .).Path
$emscriptenPath = Join-Path $emsdkRoot "upstream\emscripten"

# Set required Emscripten environment variables
$env:EMSDK = $emsdkRoot
$env:EMSCRIPTEN = $emscriptenPath
$env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath

# Add to PATH
$env:PATH = "$emscriptenPath;$emsdkRoot;$env:PATH"

# Try to run emsdk_env.bat to get additional environment variables
if (Test-Path ".\emsdk_env.bat") {
    Write-Host "Activating emsdk environment..." -ForegroundColor Cyan
    # Source the batch file to get environment variables
    cmd /c ".\emsdk_env.bat && set" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Verify emcc is available
$emccPath = Join-Path $emscriptenPath "emcc.bat"
if (Test-Path $emccPath) {
    Write-Host "Emscripten found at: $emscriptenPath" -ForegroundColor Green
} else {
    Write-Host "Warning: emcc.bat not found at expected location" -ForegroundColor Yellow
    Write-Host "Expected: $emccPath" -ForegroundColor Yellow
}

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

# Verify Emscripten environment is set
if (-not $env:EMSCRIPTEN_TOOL_PATH) {
    Write-Host "Setting Emscripten environment variables..." -ForegroundColor Yellow
    $emsdkRoot = (Resolve-Path $emsdkPath).Path
    $emscriptenPath = Join-Path $emsdkRoot "upstream\emscripten"
    $env:EMSDK = $emsdkRoot
    $env:EMSCRIPTEN = $emscriptenPath
    $env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath
    $env:PATH = "$emscriptenPath;$emsdkRoot;$env:PATH"
}

Write-Host "EMSCRIPTEN_TOOL_PATH: $env:EMSCRIPTEN_TOOL_PATH" -ForegroundColor Cyan
Write-Host "EMSDK: $env:EMSDK" -ForegroundColor Cyan

# Build using scons (not make - Windows doesn't have make)
Write-Host "Running scons to build JavaScript version..." -ForegroundColor Yellow
Write-Host "This may take 10-30 minutes depending on your system..." -ForegroundColor Cyan

# Try different scons command variations
$buildSuccess = $false

# Method 1: scons target=js
Write-Host "Trying: scons target=js" -ForegroundColor Cyan
scons target=js 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $buildSuccess = $true
}

# Method 2: scons js (if target=js doesn't work)
if (-not $buildSuccess) {
    Write-Host "Trying: scons js" -ForegroundColor Cyan
    scons js 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $buildSuccess = $true
    }
}

# Method 3: Just scons (builds default target)
if (-not $buildSuccess) {
    Write-Host "Trying: scons (default target)" -ForegroundColor Cyan
    scons 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $buildSuccess = $true
    }
}

if (-not $buildSuccess) {
    Write-Host "Error: Build failed with all methods" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Emscripten is properly installed and activated" -ForegroundColor Yellow
    Write-Host "  2. SCons is installed (pip install scons)" -ForegroundColor Yellow
    Write-Host "  3. Try building manually: cd stellarium-web-engine && scons target=js" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
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

