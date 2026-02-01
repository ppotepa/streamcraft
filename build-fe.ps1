#!/usr/bin/env pwsh
# Build script for StreamCraft frontend

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

$bitsPath = Join-Path $root "Bits"
if (-not (Test-Path $bitsPath)) {
    throw "Bits path not found: $bitsPath"
}

Write-Host "Cleaning UI dist folders..." -ForegroundColor Yellow
$distDirs = Get-ChildItem -Path $bitsPath -Recurse -Directory -Force | Where-Object {
    $_.FullName -match '\\ui\\dist$'
}
foreach ($dir in $distDirs) {
    Write-Host "  Removing: $($dir.FullName)" -ForegroundColor DarkGray
    Remove-Item $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "✓ UI clean completed" -ForegroundColor Green
Write-Host ""

Write-Host "Building UI packages..." -ForegroundColor Yellow
$uiPackageJsons = Get-ChildItem -Path $bitsPath -Filter "package.json" -Recurse -File | Where-Object {
    $_.FullName -match '\\ui\\package.json$'
}

foreach ($packageJson in $uiPackageJsons) {
    $uiDir = Split-Path -Path $packageJson.FullName -Parent
    $relativePath = $packageJson.FullName.Substring($root.Length + 1)

    Write-Host "Building UI package: $relativePath" -ForegroundColor Cyan
    Push-Location $uiDir
    try {
        if (-not (Test-Path (Join-Path $uiDir "node_modules"))) {
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed for $relativePath"
            }
        }

        npm run build --if-present
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed for $relativePath"
        }
        Write-Host "✓ UI package built successfully" -ForegroundColor Green
    }
    catch {
        Pop-Location
        throw
    }
    Pop-Location
}

Write-Host "Frontend build completed." -ForegroundColor Green
