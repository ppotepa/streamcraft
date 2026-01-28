# Node.js server with API proxy for chart.html
# Run this script and open http://localhost:8080/chart.html in your browser

$port = 8080
$url = "http://localhost:$port/chart.html"

Write-Host "Starting Node.js server with API proxy on port $port..." -ForegroundColor Green
Write-Host "Open this URL in your browser: $url" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Check if node_modules exists, install if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start Node.js server with API proxy
Start-Process "http://localhost:$port/chart.html"
node server.js
