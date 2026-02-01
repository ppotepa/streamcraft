param(
    [switch]$Watch
)

$ErrorActionPreference = "Stop"

function Write-Section($message) {
    Write-Host "" 
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host $message -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Section "Building StreamCraft Frontend"

$designerUiPath = Join-Path $root "Bits\Designer\ui"
$sc2UiPath = Join-Path $root "Bits\Games\Sc2\ui"

if (-not (Test-Path $designerUiPath)) {
    throw "Designer UI path not found: $designerUiPath"
}

if (-not (Test-Path $sc2UiPath)) {
    throw "SC2 UI path not found: $sc2UiPath"
}

if ($Watch) {
    Write-Host "Starting Designer UI in watch mode..." -ForegroundColor Yellow
    Push-Location $designerUiPath
    try {
        npm run dev
    }
    finally {
        Pop-Location
    }
    return
}

Write-Host "Building Designer UI..." -ForegroundColor Yellow
Push-Location $designerUiPath
try {
    npm run build
}
finally {
    Pop-Location
}

Write-Host "Building SC2 UI..." -ForegroundColor Yellow
Push-Location $sc2UiPath
try {
    npm run build
}
finally {
    Pop-Location
}

Write-Host "Frontend build completed." -ForegroundColor Green
