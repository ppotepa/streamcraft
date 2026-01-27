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

$watchJob = $null

try {
    Write-Host "Starting in WATCH MODE - UI changes will auto-rebuild" -ForegroundColor Magenta
    Write-Host ""
    
    # Start UI watch process in background
    Write-Host "Starting UI watch process..." -ForegroundColor Yellow
    $uiWatchScript = Join-Path $PSScriptRoot "Bits\Sc2\Sc2\ui\watch.js"
    
    if (Test-Path $uiWatchScript) {
        $watchJob = Start-Job -ScriptBlock {
            param($scriptPath, $workingDir)
            Set-Location $workingDir
            node $scriptPath
        } -ArgumentList $uiWatchScript, $PSScriptRoot
        
        Write-Host "✓ UI watch started (Job ID: $($watchJob.Id))" -ForegroundColor Green
        Write-Host ""
        
        # Give watch process time to start
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Warning: watch.js not found at $uiWatchScript" -ForegroundColor Yellow
        Write-Host ""
    }
    
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
    $appJob = Start-Job -ScriptBlock {
        param($runArgs)
        dotnet @runArgs
    } -ArgumentList (,$runArgs)
    
    Write-Host "✓ Application started (Job ID: $($appJob.Id))" -ForegroundColor Green
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
    
    # Wait for the app job to complete (or be interrupted)
    Wait-Job -Job $appJob | Out-Null
    
    # Get the exit code
    $result = Receive-Job -Job $appJob
    if ($appJob.State -eq "Failed") {
        throw "Application failed"
    }
}
catch {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    
    # Clean up watch job if it exists
    if ($watchJob) {
        Write-Host "Stopping UI watch process..." -ForegroundColor Yellow
        Stop-Job -Job $watchJob -ErrorAction SilentlyContinue
        Remove-Job -Job $watchJob -ErrorAction SilentlyContinue
    }
    
    # Clean up app job if it exists
    if ($appJob) {
        Write-Host "Stopping application..." -ForegroundColor Yellow
        Stop-Job -Job $appJob -ErrorAction SilentlyContinue
        Remove-Job -Job $appJob -ErrorAction SilentlyContinue
    }
    
    exit 1
}
finally {
    # Clean up jobs on exit
    if ($watchJob) {
        Write-Host ""
        Write-Host "Stopping UI watch process..." -ForegroundColor Yellow
        Stop-Job -Job $watchJob -ErrorAction SilentlyContinue
        Remove-Job -Job $watchJob -ErrorAction SilentlyContinue
        Write-Host "✓ UI watch stopped" -ForegroundColor Green
    }
    
    if ($appJob) {
        Write-Host "Stopping application..." -ForegroundColor Yellow
        Stop-Job -Job $appJob -ErrorAction SilentlyContinue
        Remove-Job -Job $appJob -ErrorAction SilentlyContinue
        Write-Host "✓ Application stopped" -ForegroundColor Green
    }
}
