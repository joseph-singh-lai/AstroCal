# Manual build helper - shows exact commands to run
# This script helps you build manually step by step

$currentDir = Get-Location
Write-Host "Current directory: $currentDir" -ForegroundColor Cyan
Write-Host ""

# Check what exists
Write-Host "=== Checking what's available ===" -ForegroundColor Cyan

$emsdkPath = Join-Path $currentDir "emsdk"
$stellariumPath = Join-Path $currentDir "stellarium-web-engine"

Write-Host "Checking emsdk..." -ForegroundColor Yellow
if (Test-Path $emsdkPath) {
    Write-Host "  ✓ emsdk found at: $emsdkPath" -ForegroundColor Green
    $emsdkPy = Join-Path $emsdkPath "emsdk.py"
    if (Test-Path $emsdkPy) {
        Write-Host "  ✓ emsdk.py found" -ForegroundColor Green
    } else {
        Write-Host "  ✗ emsdk.py NOT found" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ emsdk NOT found at: $emsdkPath" -ForegroundColor Red
    Write-Host "  Run: git clone https://github.com/emscripten-core/emsdk.git" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking stellarium-web-engine..." -ForegroundColor Yellow
if (Test-Path $stellariumPath) {
    Write-Host "  ✓ stellarium-web-engine found at: $stellariumPath" -ForegroundColor Green
    $sconstruct = Join-Path $stellariumPath "SConstruct"
    if (Test-Path $sconstruct) {
        Write-Host "  ✓ SConstruct found" -ForegroundColor Green
    } else {
        Write-Host "  ✗ SConstruct NOT found" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ stellarium-web-engine NOT found at: $stellariumPath" -ForegroundColor Red
    Write-Host "  Run: git clone https://github.com/Stellarium/stellarium-web-engine.git" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Manual Build Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Navigate to emsdk directory" -ForegroundColor Yellow
Write-Host "  cd `"$emsdkPath`"" -ForegroundColor White
Write-Host ""
Write-Host "Step 2: Activate emsdk (run this in the emsdk directory)" -ForegroundColor Yellow
Write-Host "  python emsdk.py activate latest" -ForegroundColor White
Write-Host "  .\emsdk_env.bat" -ForegroundColor White
Write-Host ""
Write-Host "Step 3: Set environment variables (run this in the emsdk directory)" -ForegroundColor Yellow
Write-Host "  `$env:EMSDK = Get-Location" -ForegroundColor White
Write-Host "  `$env:EMSCRIPTEN = Join-Path `$env:EMSDK 'upstream\emscripten'" -ForegroundColor White
Write-Host "  `$env:EMSCRIPTEN_TOOL_PATH = `$env:EMSCRIPTEN" -ForegroundColor White
Write-Host "  `$env:PATH = `"`$env:EMSCRIPTEN;`$env:EMSDK;`$env:PATH`"" -ForegroundColor White
Write-Host ""
Write-Host "Step 4: Navigate to stellarium-web-engine directory" -ForegroundColor Yellow
Write-Host "  cd `"$stellariumPath`"" -ForegroundColor White
Write-Host ""
Write-Host "Step 5: Build (run this in the stellarium-web-engine directory)" -ForegroundColor Yellow
Write-Host "  scons target=js" -ForegroundColor White
Write-Host ""
Write-Host "=== Or use this single command (after activating emsdk) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "From the project root directory, run:" -ForegroundColor Yellow
Write-Host "  cd emsdk" -ForegroundColor White
Write-Host "  python emsdk.py activate latest" -ForegroundColor White
Write-Host "  .\emsdk_env.bat" -ForegroundColor White
Write-Host "  `$env:EMSCRIPTEN_TOOL_PATH = Join-Path (Get-Location) 'upstream\emscripten'" -ForegroundColor White
Write-Host "  cd ..\stellarium-web-engine" -ForegroundColor White
Write-Host "  scons target=js" -ForegroundColor White

