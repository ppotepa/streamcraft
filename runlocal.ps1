#!/usr/bin/env pwsh
# Run StreamCraft backend + frontend locally

param(
    [string]$Configuration = "Debug",
    [switch]$Build,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Running StreamCraft Backend + Frontend" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$appProjectPath = Join-Path $PSScriptRoot "App\App.csproj"

if (-not (Test-Path $appProjectPath)) {
    Write-Host "Error: Project file not found at $appProjectPath" -ForegroundColor Red
    exit 1
}

$watchProcess = $null
$appProcess = $null

try {
    if ($Build) {
        Write-Host "Building backend..." -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot "build.ps1") -Configuration $Configuration
        if ($LASTEXITCODE -ne 0) {
            throw "Backend build failed with exit code $LASTEXITCODE"
        }
        Write-Host "✓ Backend build completed" -ForegroundColor Green
        Write-Host ""

        Write-Host "Building frontend..." -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot "build-fe.ps1")
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed with exit code $LASTEXITCODE"
        }
        Write-Host "✓ Frontend build completed" -ForegroundColor Green
        Write-Host ""
    }

    Write-Host "Starting frontend watch server..." -ForegroundColor Yellow
    $watchProcess = Start-Process -FilePath "pwsh" -ArgumentList @(
        "-File",
        (Join-Path $PSScriptRoot "runwatch.ps1")
    ) -WorkingDirectory $PSScriptRoot -PassThru

    Write-Host "✓ Frontend watch started (PID: $($watchProcess.Id))" -ForegroundColor Green
    Write-Host ""

    Write-Host "Starting StreamCraft backend..." -ForegroundColor Yellow
    $runArgs = @("run", "--project", $appProjectPath, "--configuration", $Configuration)
    if ($NoBuild) {
        $runArgs += "--no-build"
    }

    $appProcess = Start-Process -FilePath "dotnet" -ArgumentList $runArgs -WorkingDirectory $PSScriptRoot -PassThru

    Write-Host "✓ Backend started (PID: $($appProcess.Id))" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""

    while (-not $appProcess.HasExited) {
        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    exit 1
}
finally {
    if ($watchProcess -and -not $watchProcess.HasExited) {
        Write-Host "Stopping frontend watch..." -ForegroundColor Yellow
        Stop-Process -Id $watchProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Frontend watch stopped" -ForegroundColor Green
    }

    if ($appProcess -and -not $appProcess.HasExited) {
        Write-Host "Stopping backend..." -ForegroundColor Yellow
        Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Backend stopped" -ForegroundColor Green
    }
}
