# Quick environment setup script
# Run this from the emsdk directory

Write-Host "Setting up Emscripten environment..." -ForegroundColor Cyan

# Get current directory (should be emsdk)
$emsdkPath = Get-Location
$emscriptenPath = Join-Path $emsdkPath "upstream\emscripten"

Write-Host "EMSDK path: $emsdkPath" -ForegroundColor Yellow
Write-Host "Emscripten path: $emscriptenPath" -ForegroundColor Yellow

# Set environment variables
$env:EMSDK = $emsdkPath
$env:EMSCRIPTEN = $emscriptenPath
$env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath
$env:PATH = "$emscriptenPath;$emsdkPath;$env:PATH"

Write-Host ""
Write-Host "Environment variables set:" -ForegroundColor Green
Write-Host "  EMSDK = $env:EMSDK" -ForegroundColor Green
Write-Host "  EMSCRIPTEN_TOOL_PATH = $env:EMSCRIPTEN_TOOL_PATH" -ForegroundColor Green
Write-Host ""

# Verify emcc exists
$emccPath = Join-Path $emscriptenPath "emcc.bat"
if (Test-Path $emccPath) {
    Write-Host "✓ emcc.bat found" -ForegroundColor Green
} else {
    Write-Host "✗ emcc.bat not found at: $emccPath" -ForegroundColor Red
    Write-Host "Make sure emsdk is properly installed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Now you can run: cd ..\stellarium-web-engine" -ForegroundColor Cyan
Write-Host "Then run: scons target=js" -ForegroundColor Cyan

