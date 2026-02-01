#!/usr/bin/env pwsh
# Run StreamCraft application locally with UI watch mode and browser auto-open

param(
    [string]$Configuration = "Debug",
    [switch]$Build,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Running StreamCraft with Watch Mode" -ForegroundColor Cyan
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
    Write-Host "Starting in WATCH MODE - UI changes will auto-rebuild" -ForegroundColor Magenta
    Write-Host ""

    Write-Host "Building frontend UI (if changed)..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "build-frontend.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed with exit code $LASTEXITCODE"
    }
    Write-Host "✓ Frontend build completed" -ForegroundColor Green
    Write-Host ""

    Write-Host "Syncing bit UI assets to app output..." -ForegroundColor Yellow
    $bitsPath = Join-Path $PSScriptRoot "Bits"
    if (Test-Path $bitsPath) {
        $bitUiDirs = Get-ChildItem -Path $bitsPath -Filter "ui" -Recurse -Directory | Where-Object {
            Test-Path (Join-Path $_.FullName "dist")
        }

        foreach ($uiDir in $bitUiDirs) {
            $bitRoot = Split-Path -Path $uiDir.FullName -Parent
            $bitName = Split-Path -Path $bitRoot -Leaf
            $sourceDist = Join-Path $uiDir.FullName "dist"
            $appBitOutput = Join-Path $PSScriptRoot "App\bin\$Configuration\net8.0\bits\$bitName\ui\dist"
            New-Item -ItemType Directory -Force -Path $appBitOutput | Out-Null
            Copy-Item -Path (Join-Path $sourceDist "*") -Destination $appBitOutput -Recurse -Force
        }
    }
    Write-Host "✓ Bit UI assets synced" -ForegroundColor Green
    Write-Host ""

    if ($Build) {
        Write-Host "Building solution (frontend + backend)..." -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot "build.ps1") -Configuration $Configuration
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed with exit code $LASTEXITCODE"
        }
        Write-Host "Build completed successfully!" -ForegroundColor Green
        Write-Host ""
    }
    
    # Start frontend watch server (Vite)
    Write-Host "Starting frontend watch server..." -ForegroundColor Yellow
    $watchProcess = Start-Process -FilePath "pwsh" -ArgumentList @(
        "-File",
        (Join-Path $PSScriptRoot "build-frontend.ps1"),
        "-Watch"
    ) -WorkingDirectory $PSScriptRoot -PassThru

    Write-Host "✓ Frontend watch started (PID: $($watchProcess.Id))" -ForegroundColor Green
    Write-Host ""
    
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
    Write-Host "Watch mode active - UI rebuilds on file changes" -ForegroundColor Magenta
    Write-Host ""

    $runArgs = @("run", "--project", $appProjectPath, "--configuration", $Configuration)
    
    if ($NoBuild) {
        $runArgs += "--no-build"
    }

    # Start the application in background
    $appProcess = Start-Process -FilePath "dotnet" -ArgumentList $runArgs -WorkingDirectory $PSScriptRoot -PassThru

    Write-Host "✓ Application started (PID: $($appProcess.Id))" -ForegroundColor Green
    Write-Host ""
    
    # Wait for application to start
    Write-Host "Waiting for application to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Open browser
    Write-Host "Opening browser at http://localhost:5000/" -ForegroundColor Green
    Start-Process "http://localhost:5000/"
    Write-Host ""
    
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Gray
    Write-Host ""
    
    # Wait for the app process to complete (or be interrupted)
    while (-not $appProcess.HasExited) {
        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    
    # Clean up watch job if it exists
    if ($watchProcess -and -not $watchProcess.HasExited) {
        Write-Host "Stopping UI watch process..." -ForegroundColor Yellow
        Stop-Process -Id $watchProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Clean up app process if it exists
    if ($appProcess -and -not $appProcess.HasExited) {
        Write-Host "Stopping application..." -ForegroundColor Yellow
        Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    exit 1
}
finally {
    # Clean up jobs on exit
    if ($watchProcess -and -not $watchProcess.HasExited) {
        Write-Host ""
        Write-Host "Stopping UI watch process..." -ForegroundColor Yellow
        Stop-Process -Id $watchProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "✓ UI watch stopped" -ForegroundColor Green
    }
    
    if ($appProcess -and -not $appProcess.HasExited) {
        Write-Host "Stopping application..." -ForegroundColor Yellow
        Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Application stopped" -ForegroundColor Green
    }
}
