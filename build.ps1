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

if (-not (Test-Path $solutionPath)) {
    Write-Host "Error: Solution file not found at $solutionPath" -ForegroundColor Red
    exit 1
}

try {
    # Always clean before building
    Write-Host "Cleaning solution and removing build artifacts..." -ForegroundColor Yellow
    
    # Clean solution
    dotnet clean $solutionPath --configuration $Configuration
    if ($LASTEXITCODE -ne 0) {
        throw "Clean failed with exit code $LASTEXITCODE"
    }
    
    # Remove all bin, obj, dist folders (excluding node_modules and subdirectories)
    $foldersToClean = Get-ChildItem -Path $PSScriptRoot -Include bin,obj,dist -Recurse -Directory -Force | Where-Object {
        $path = $_.FullName
        $path -notmatch '\\node_modules\\' -and $path -notmatch '/node_modules/'
    }
    
    foreach ($folder in $foldersToClean) {
        Write-Host "  Removing: $($folder.FullName)" -ForegroundColor DarkGray
        Remove-Item $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "✓ Clean completed successfully!" -ForegroundColor Green
    Write-Host ""

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

    # Always restore NuGet packages after cleaning
    Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
    dotnet restore $solutionPath
    if ($LASTEXITCODE -ne 0) {
        throw "Restore failed with exit code $LASTEXITCODE"
    }
    Write-Host "✓ Restore completed successfully!" -ForegroundColor Green
    Write-Host ""

    # Build bits that have build.js
    Write-Host "Checking for bits with custom build scripts..." -ForegroundColor Yellow
    $bitsPath = Join-Path $PSScriptRoot "Bits"
    if (Test-Path $bitsPath) {
        # Find all build.js files recursively in Bits folder
        $buildScripts = Get-ChildItem -Path $bitsPath -Filter "build.js" -Recurse -File
        foreach ($buildJs in $buildScripts) {
            $scriptDir = Split-Path -Path $buildJs.FullName -Parent
            $relativePath = $buildJs.FullName.Substring($PSScriptRoot.Length + 1)
            
            Write-Host "Building bit UI: $relativePath" -ForegroundColor Cyan
            Push-Location $scriptDir
            try {
                node build.js
                if ($LASTEXITCODE -ne 0) {
                    throw "Bit build failed for $relativePath"
                }
                Write-Host "✓ Bit UI built successfully" -ForegroundColor Green
            }
            catch {
                Pop-Location
                throw
            }
            Pop-Location
        }
    }
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
