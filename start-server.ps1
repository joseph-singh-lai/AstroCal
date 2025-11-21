Write-Host "Starting local server for Astronomy Events Planner..." -ForegroundColor Green
Write-Host ""
Write-Host "Open your browser to: http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

# Try Python first, then Node.js
if (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server 8000
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    python3 -m http.server 8000
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    npx http-server -p 8000
} else {
    Write-Host "Error: Neither Python nor Node.js found!" -ForegroundColor Red
    Write-Host "Please install Python or Node.js to run a local server." -ForegroundColor Red
    pause
}

