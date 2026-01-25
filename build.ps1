#!/usr/bin/env pwsh
# Build script for StreamCraft solution

param(
    [string]$Configuration = "Debug",
    [switch]$Clean,
    [switch]$Restore
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Building StreamCraft Solution" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$solutionPath = Join-Path $PSScriptRoot "StreamCraft.sln"

if (-not (Test-Path $solutionPath)) {
    Write-Host "Error: Solution file not found at $solutionPath" -ForegroundColor Red
    exit 1
}

try {
    # Install npm dependencies at root level (npm workspaces)
    Write-Host "Installing npm dependencies (workspaces)..." -ForegroundColor Yellow
    if (Test-Path (Join-Path $PSScriptRoot "package.json")) {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
        Write-Host "✓ npm dependencies installed" -ForegroundColor Green
        Write-Host ""
    }

    if ($Clean) {
        Write-Host "Cleaning solution..." -ForegroundColor Yellow
        dotnet clean $solutionPath --configuration $Configuration
        if ($LASTEXITCODE -ne 0) {
            throw "Clean failed with exit code $LASTEXITCODE"
        }
        Write-Host "Clean completed successfully!" -ForegroundColor Green
        Write-Host ""
    }

    if ($Restore) {
        Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
        dotnet restore $solutionPath
        if ($LASTEXITCODE -ne 0) {
            throw "Restore failed with exit code $LASTEXITCODE"
        }
        Write-Host "Restore completed successfully!" -ForegroundColor Green
        Write-Host ""
    }

    # Build bits that have build.js
    Write-Host "Checking for bits with custom build scripts..." -ForegroundColor Yellow
    $bitsPath = Join-Path $PSScriptRoot "Bits"
    if (Test-Path $bitsPath) {
        $bitDirs = Get-ChildItem -Path $bitsPath -Directory
        foreach ($bitDir in $bitDirs) {
            $buildScriptCandidates = @(
                (Join-Path $bitDir.FullName "ui\build.js")
                (Join-Path $bitDir.FullName "build.js")
            )

            $buildJs = $buildScriptCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
            if ($null -ne $buildJs) {
                $scriptDir = Split-Path -Path $buildJs -Parent
                $relativeScript = $buildJs
                if ($buildJs.StartsWith($bitDir.FullName, [StringComparison]::OrdinalIgnoreCase)) {
                    $relativeScript = $buildJs.Substring($bitDir.FullName.Length)
                    $relativeScript = $relativeScript -replace '^[\\/]+', ''
                }
                if ([string]::IsNullOrWhiteSpace($relativeScript)) {
                    $relativeScript = "build.js"
                }

                Write-Host "Building bit: $($bitDir.Name) [$relativeScript]" -ForegroundColor Cyan
                Push-Location $scriptDir
                try {
                    node build.js
                    if ($LASTEXITCODE -ne 0) {
                        throw "Bit build failed for $($bitDir.Name)"
                    }
                    Write-Host "✓ $($bitDir.Name) built successfully" -ForegroundColor Green
                }
                catch {
                    Pop-Location
                    throw
                }
                Pop-Location
            }
        }
    }
    Write-Host ""

    Write-Host "Building solution ($Configuration)..." -ForegroundColor Yellow
    Write-Host ""
    
    $buildArgs = @("build", $solutionPath, "--configuration", $Configuration, "-v", "minimal")
    if (-not $Restore) {
        $buildArgs += "--no-restore"
    }
    
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
