#!/usr/bin/env pwsh
# Run StreamCraft application locally

param(
    [string]$Configuration = "Debug",
    [switch]$Build,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Running StreamCraft Locally" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$appProjectPath = Join-Path $PSScriptRoot "StreamCraft.App\StreamCraft.App.csproj"

if (-not (Test-Path $appProjectPath)) {
    Write-Host "Error: Project file not found at $appProjectPath" -ForegroundColor Red
    exit 1
}

try {
    if ($Build) {
        Write-Host "Building application..." -ForegroundColor Yellow
        dotnet build $appProjectPath --configuration $Configuration
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed with exit code $LASTEXITCODE"
        }
        Write-Host "Build completed successfully!" -ForegroundColor Green
        Write-Host ""
    }

    Write-Host "Starting StreamCraft application..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Gray
    Write-Host ""

    $runArgs = @("run", "--project", $appProjectPath, "--configuration", $Configuration)
    
    if ($NoBuild) {
        $runArgs += "--no-build"
    }

    dotnet @runArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "Application exited with code $LASTEXITCODE"
    }
}
catch {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    exit 1
}
