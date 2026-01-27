#!/usr/bin/env pwsh
# Build script for SC2 UI and backend

Write-Host "Building UI..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\Bits\Sc2\Sc2\ui"
npm run build
Pop-Location

Write-Host "Building .NET backend..." -ForegroundColor Cyan
dotnet build -c Debug

Write-Host "Build complete!" -ForegroundColor Green
