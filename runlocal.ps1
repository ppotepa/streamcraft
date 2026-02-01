#!/usr/bin/env pwsh
# Run StreamCraft application locally

param(
    [string]$Configuration = "Debug",
    [switch]$Build,
    [switch]$NoBuild,
    [switch]$Watch
)

$ErrorActionPreference = "Stop"
Clear-Host;

# If Watch mode is enabled, delegate to runlocalwatch.ps1
if ($Watch) {
    $watchScript = Join-Path $PSScriptRoot "runlocalwatch.ps1"
    if (-not (Test-Path $watchScript)) {
        Write-Host "Error: runlocalwatch.ps1 not found at $watchScript" -ForegroundColor Red
        exit 1
    }
    
    $watchArgs = @()
    if ($Configuration) { $watchArgs += "-Configuration", $Configuration }
    if ($Build) { $watchArgs += "-Build" }
    if ($NoBuild) { $watchArgs += "-NoBuild" }
    
    & $watchScript @watchArgs
    exit $LASTEXITCODE
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Running StreamCraft Locally" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$appProjectPath = Join-Path $PSScriptRoot "App\App.csproj"

if (-not (Test-Path $appProjectPath)) {
    Write-Host "Error: Project file not found at $appProjectPath" -ForegroundColor Red
    exit 1
}

try {
    if ($Build) {
        Write-Host "Building solution (frontend + backend)..." -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot "build.ps1") -Configuration $Configuration
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed with exit code $LASTEXITCODE"
        }
        Write-Host "Build completed successfully!" -ForegroundColor Green
        Write-Host ""
    }

    $uiSource = Join-Path $PSScriptRoot "UI\\static"
    $uiDest = Join-Path $PSScriptRoot "App\\bin\\$Configuration\\net8.0\\static\\ui"
    if (Test-Path $uiSource) {
        New-Item -ItemType Directory -Force -Path $uiDest | Out-Null
        Copy-Item -Path (Join-Path $uiSource "*") -Destination $uiDest -Recurse -Force
        Write-Host "✓ UI assets copied to App output" -ForegroundColor Green
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
