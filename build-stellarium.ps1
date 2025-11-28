# Build script for Stellarium Web Engine
# This script sets up the build environment and builds the engine

Write-Host "=== Stellarium Web Engine Build Setup ===" -ForegroundColor Cyan

# Get absolute paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) {
    $scriptDir = Get-Location
}

# Check if emsdk exists
$emsdkPath = Join-Path $scriptDir "emsdk"
if (-not (Test-Path $emsdkPath)) {
    Write-Host "Cloning Emscripten SDK..." -ForegroundColor Yellow
    Write-Host "Target directory: $emsdkPath" -ForegroundColor Cyan
    Push-Location $scriptDir
    git clone https://github.com/emscripten-core/emsdk.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to clone emsdk" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Verify emsdk was cloned
if (-not (Test-Path $emsdkPath)) {
    Write-Host "Error: emsdk directory not found after cloning: $emsdkPath" -ForegroundColor Red
    exit 1
}

# Check if stellarium-web-engine exists
$stellariumPath = Join-Path $scriptDir "stellarium-web-engine"
if (-not (Test-Path $stellariumPath)) {
    Write-Host "Cloning Stellarium Web Engine..." -ForegroundColor Yellow
    Write-Host "Target directory: $stellariumPath" -ForegroundColor Cyan
    Push-Location $scriptDir
    git clone https://github.com/Stellarium/stellarium-web-engine.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to clone stellarium-web-engine" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Verify stellarium-web-engine was cloned
if (-not (Test-Path $stellariumPath)) {
    Write-Host "Error: stellarium-web-engine directory not found after cloning: $stellariumPath" -ForegroundColor Red
    exit 1
}

# Setup emsdk
Write-Host "Setting up Emscripten SDK..." -ForegroundColor Yellow
Write-Host "Working directory: $emsdkPath" -ForegroundColor Cyan

if (-not (Test-Path $emsdkPath)) {
    Write-Host "Error: emsdk path does not exist: $emsdkPath" -ForegroundColor Red
    exit 1
}

Push-Location $emsdkPath

# Check if emsdk.py exists
if (-not (Test-Path ".\emsdk.py")) {
    Write-Host "Error: emsdk.py not found in $emsdkPath" -ForegroundColor Red
    Write-Host "The emsdk directory may be incomplete. Try deleting it and re-running the script." -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# Install and activate emsdk
Write-Host "Installing Emscripten SDK (this may take a while)..." -ForegroundColor Yellow
python emsdk.py install latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: emsdk install may have issues, continuing..." -ForegroundColor Yellow
}

Write-Host "Activating Emscripten SDK..." -ForegroundColor Yellow
python emsdk.py activate latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: emsdk activate may have issues, continuing..." -ForegroundColor Yellow
}

# Get the emsdk path (absolute)
$emsdkRoot = (Resolve-Path .).Path
$emscriptenPath = Join-Path $emsdkRoot "upstream\emscripten"

Write-Host "Emscripten path: $emscriptenPath" -ForegroundColor Cyan
if (-not (Test-Path $emscriptenPath)) {
    Write-Host "Warning: Emscripten path does not exist yet: $emscriptenPath" -ForegroundColor Yellow
    Write-Host "This is normal if emsdk is still installing..." -ForegroundColor Yellow
}

# Set required Emscripten environment variables BEFORE running emsdk_env.bat
$env:EMSDK = $emsdkRoot
$env:EMSCRIPTEN = $emscriptenPath
$env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath

# Add to PATH
$env:PATH = "$emscriptenPath;$emsdkRoot;$env:PATH"

# Try to run emsdk_env.bat to get additional environment variables
$emsdkEnvBat = Join-Path $emsdkRoot "emsdk_env.bat"
if (Test-Path $emsdkEnvBat) {
    Write-Host "Activating emsdk environment..." -ForegroundColor Cyan
    # Run emsdk_env.bat and capture environment variables
    $envOutput = cmd /c "`"$emsdkEnvBat`" >nul 2>&1 && set" 2>&1
    $envOutput | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $name = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$name" -Value $value
        }
    }
} else {
    Write-Host "Warning: emsdk_env.bat not found at: $emsdkEnvBat" -ForegroundColor Yellow
}

# Ensure EMSCRIPTEN_TOOL_PATH is set (required by SConstruct)
if (-not $env:EMSCRIPTEN_TOOL_PATH) {
    $env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath
    Write-Host "Manually set EMSCRIPTEN_TOOL_PATH: $emscriptenPath" -ForegroundColor Yellow
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
Write-Host "Working directory: $stellariumPath" -ForegroundColor Cyan

if (-not (Test-Path $stellariumPath)) {
    Write-Host "Error: stellarium-web-engine path does not exist: $stellariumPath" -ForegroundColor Red
    exit 1
}

Push-Location $stellariumPath

# Check if SConstruct exists
if (-not (Test-Path ".\SConstruct")) {
    Write-Host "Error: SConstruct not found in $stellariumPath" -ForegroundColor Red
    Write-Host "The stellarium-web-engine directory may be incomplete. Try deleting it and re-running the script." -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# Verify Emscripten environment is set
if (-not $env:EMSCRIPTEN_TOOL_PATH) {
    Write-Host "Setting Emscripten environment variables..." -ForegroundColor Yellow
    if (-not $emsdkRoot) {
        $emsdkRoot = (Resolve-Path $emsdkPath).Path
    }
    $emscriptenPath = Join-Path $emsdkRoot "upstream\emscripten"
    $env:EMSDK = $emsdkRoot
    $env:EMSCRIPTEN = $emscriptenPath
    $env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath
    $env:PATH = "$emscriptenPath;$emsdkRoot;$env:PATH"
}

Write-Host "Environment variables:" -ForegroundColor Cyan
Write-Host "  EMSCRIPTEN_TOOL_PATH: $env:EMSCRIPTEN_TOOL_PATH" -ForegroundColor Cyan
Write-Host "  EMSDK: $env:EMSDK" -ForegroundColor Cyan
Write-Host "  EMSCRIPTEN: $env:EMSCRIPTEN" -ForegroundColor Cyan

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
$staticJsPath = Join-Path $stellariumPath "html\static\js"
$buildPath = Join-Path $stellariumPath "build"
$buildOutputDir = Join-Path $scriptDir "stellarium-build"

# Check multiple possible locations for built files
$possibleLocations = @(
    $staticJsPath,
    (Join-Path $buildPath "html\static\js"),
    (Join-Path $stellariumPath "html\js"),
    (Join-Path $stellariumPath "build\js")
)

$foundFiles = $false
foreach ($location in $possibleLocations) {
    if (Test-Path $location) {
        Write-Host "Checking location: $location" -ForegroundColor Cyan
        $jsFile = Get-ChildItem -Path $location -Filter "stellarium-web-engine.js" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        $wasmFile = Get-ChildItem -Path $location -Filter "stellarium-web-engine.wasm" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($jsFile -and $wasmFile) {
            Write-Host "Found built files in: $($jsFile.DirectoryName)" -ForegroundColor Green
            New-Item -ItemType Directory -Force -Path $buildOutputDir | Out-Null
            Copy-Item $jsFile.FullName -Destination (Join-Path $buildOutputDir "stellarium-web-engine.js") -Force
            Copy-Item $wasmFile.FullName -Destination (Join-Path $buildOutputDir "stellarium-web-engine.wasm") -Force
            Write-Host "Build complete! Files copied to: $buildOutputDir" -ForegroundColor Green
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

