#!/usr/bin/env pwsh
# Run StreamCraft frontend in watch mode (Vite)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$designerUiPath = Join-Path $root "Bits\Designer\ui"

if (-not (Test-Path $designerUiPath)) {
    throw "Designer UI path not found: $designerUiPath"
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Running Frontend Watch Mode" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $designerUiPath
try {
    npm run dev
}
finally {
    Pop-Location
}
