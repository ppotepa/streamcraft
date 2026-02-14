#!/usr/bin/env pwsh
# Removes frontend build artifacts (node_modules, dist/.vite) and backend build outputs (bin/obj, artifacts)
# Run from repo root:  .\clean.ps1
param(
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Remove-Dir($path) {
    if (Test-Path $path) {
        Write-Host "Removing $path" -ForegroundColor Yellow
        if ($WhatIf) {
            return
        }
        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root
try {
    # Frontend: any ui package.json under Bits/**/ui or src/**/ui
    $uiPackages = Get-ChildItem -Path $root -Recurse -Filter package.json -File |
        Where-Object { $_.FullName -match "\\ui\\package\.json$" }

    foreach ($pkg in $uiPackages) {
        $uiDir = Split-Path $pkg.FullName -Parent
        Remove-Dir (Join-Path $uiDir "node_modules")
        Remove-Dir (Join-Path $uiDir "dist")
        Remove-Dir (Join-Path $uiDir ".vite")
        Remove-Dir (Join-Path $uiDir ".parcel-cache")
        Remove-Dir (Join-Path $uiDir "build")
    }

    # Core UI static outputs (if any)
    Remove-Dir (Join-Path $root "src/StreamCraft.UI/bin")
    Remove-Dir (Join-Path $root "src/StreamCraft.UI/obj")

    # Backend artifacts: bin/obj across solution
    $dotnetRoots = @("src", "Bits", "libs", "tests")
    foreach ($dir in $dotnetRoots) {
        $full = Join-Path $root $dir
        if (-not (Test-Path $full)) { continue }
        Get-ChildItem -Path $full -Recurse -Directory -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -in @("bin", "obj") } |
            ForEach-Object { Remove-Dir $_.FullName }
    }

    # Global artifacts folder
    Remove-Dir (Join-Path $root "artifacts")
    Remove-Dir (Join-Path $root "logs/analysis")
}
finally {
    Pop-Location
}

Write-Host "Clean completed." -ForegroundColor Green
