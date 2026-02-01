#!/usr/bin/env pwsh
# Build script for StreamCraft solution

param(
    [string]$Configuration = "Debug",
    [switch]$Restore
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Building StreamCraft Solution" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$solutionPath = Join-Path $PSScriptRoot "streamcraft.sln"

function Get-LatestWriteTimeUtc($path, $excludeRegex) {
    if (-not (Test-Path $path)) { return [DateTime]::MinValue }
    $files = Get-ChildItem -Path $path -Recurse -File -Force | Where-Object {
        $_.FullName -notmatch $excludeRegex
    }
    if (-not $files) { return [DateTime]::MinValue }
    return ($files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc
}

function Get-LatestSourceWriteTimeUtc($root) {
    $exclude = '\\(bin|obj|dist|node_modules)\\'
    $files = Get-ChildItem -Path $root -Recurse -File -Force | Where-Object {
        $_.FullName -notmatch $exclude -and @(
            ".cs", ".csproj", ".sln", ".json", ".props", ".targets", ".xml"
        ) -contains $_.Extension.ToLower()
    }
    if (-not $files) { return [DateTime]::MinValue }
    return ($files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc
}

function Test-DotNetNeedsBuild($outputDll, $root) {
    if (-not (Test-Path $outputDll)) { return $true }
    $latestSource = Get-LatestSourceWriteTimeUtc $root
    $outputTime = (Get-Item $outputDll).LastWriteTimeUtc
    return $latestSource -gt $outputTime
}

function Test-UiNeedsBuild($uiDir) {
    $distDir = Join-Path $uiDir "dist"
    if (-not (Test-Path $distDir)) { return $true }
    $exclude = '\\(dist|node_modules)\\'
    $latestSource = Get-LatestWriteTimeUtc $uiDir $exclude
    $latestDist = Get-LatestWriteTimeUtc $distDir '\\node_modules\\'
    return $latestSource -gt $latestDist
}

if (-not (Test-Path $solutionPath)) {
    Write-Host "Error: Solution file not found at $solutionPath" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Cleaning solution and removing build artifacts..." -ForegroundColor Yellow

    dotnet clean $solutionPath --configuration $Configuration
    if ($LASTEXITCODE -ne 0) {
        throw "Clean failed with exit code $LASTEXITCODE"
    }

    $foldersToClean = Get-ChildItem -Path $PSScriptRoot -Include bin,obj -Recurse -Directory -Force | Where-Object {
        $path = $_.FullName
        $path -notmatch '\\node_modules\\' -and $path -notmatch '/node_modules/'
    }

    foreach ($folder in $foldersToClean) {
        Write-Host "  Removing: $($folder.FullName)" -ForegroundColor DarkGray
        Remove-Item $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host "✓ Clean completed successfully!" -ForegroundColor Green
    Write-Host ""

    Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
    dotnet restore $solutionPath
    if ($LASTEXITCODE -ne 0) {
        throw "Restore failed with exit code $LASTEXITCODE"
    }
    Write-Host "✓ Restore completed successfully!" -ForegroundColor Green
    Write-Host ""

    Write-Host "Building solution ($Configuration)..." -ForegroundColor Yellow
    Write-Host ""

    $buildArgs = @("build", $solutionPath, "--configuration", $Configuration, "-v", "minimal", "--no-restore")

    dotnet @buildArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Build failed: $_" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    exit 1
}
