#!/usr/bin/env pwsh
# Watch frontend UI changes only (no backend run)

param(
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Frontend Watch Only" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$frontendScript = Join-Path $PSScriptRoot "build-frontend.ps1"
if (-not (Test-Path $frontendScript)) {
    Write-Host "Error: build-frontend.ps1 not found at $frontendScript" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Starting frontend watch..." -ForegroundColor Yellow
    Write-Host ""    
    & $frontendScript -Watch
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend watch failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    exit 1
}
