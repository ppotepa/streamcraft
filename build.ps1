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
    $appDll = Join-Path $PSScriptRoot "App\bin\$Configuration\net8.0\App.dll"
    $dotnetNeedsBuild = Test-DotNetNeedsBuild $appDll $PSScriptRoot
    if ($dotnetNeedsBuild) {
        # Clean before building when source changes are detected
        Write-Host "Cleaning solution and removing build artifacts..." -ForegroundColor Yellow

        dotnet clean $solutionPath --configuration $Configuration
        if ($LASTEXITCODE -ne 0) {
            throw "Clean failed with exit code $LASTEXITCODE"
        }

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
    } else {
        Write-Host "No .NET changes detected. Skipping clean/build." -ForegroundColor DarkGray
        Write-Host ""
    }

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

    if ($dotnetNeedsBuild) {
        Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
        dotnet restore $solutionPath
        if ($LASTEXITCODE -ne 0) {
            throw "Restore failed with exit code $LASTEXITCODE"
        }
        Write-Host "✓ Restore completed successfully!" -ForegroundColor Green
        Write-Host ""
    }

    # Build bits that have custom build steps (build.js/build.ts)
    Write-Host "Checking for bits with custom build scripts..." -ForegroundColor Yellow
    $bitsPath = Join-Path $PSScriptRoot "Bits"
    if (Test-Path $bitsPath) {
        $buildScripts = Get-ChildItem -Path $bitsPath -Recurse -File | Where-Object {
            $_.Name -in @("build.js", "build.ts")
        }

        foreach ($script in $buildScripts) {
            $scriptDir = Split-Path -Path $script.FullName -Parent
            $bitRoot = $scriptDir
            $bitName = Split-Path -Path $bitRoot -Leaf
            $relativePath = $script.FullName.Substring($PSScriptRoot.Length + 1)
            $bitOutputDll = Join-Path $bitRoot "bin\$Configuration\net8.0\$bitName.dll"
            $bitNeedsBuild = Test-DotNetNeedsBuild $bitOutputDll $bitRoot

            if (-not $bitNeedsBuild) {
                Write-Host "Skipping $relativePath (no changes)" -ForegroundColor DarkGray
                continue
            }

            Write-Host "Building bit: $relativePath" -ForegroundColor Cyan
            Push-Location $scriptDir
            try {
                if ($script.Name -eq "build.ts") {
                    node build.ts
                } else {
                    node build.js
                }
                if ($LASTEXITCODE -ne 0) {
                    throw "Bit build failed for $relativePath"
                }
                Write-Host "✓ Bit built successfully" -ForegroundColor Green
            }
            catch {
                Pop-Location
                throw
            }
            Pop-Location
        }
    }
    Write-Host ""

    # Build UI bundles that use npm (e.g., Vite/React)
    Write-Host "Checking for UI packages with npm build scripts..." -ForegroundColor Yellow
    if (Test-Path $bitsPath) {
        $uiPackageJsons = Get-ChildItem -Path $bitsPath -Filter "package.json" -Recurse -File | Where-Object {
            $_.FullName -match '\\ui\\package.json$'
        }

        foreach ($packageJson in $uiPackageJsons) {
            $uiDir = Split-Path -Path $packageJson.FullName -Parent
            $relativePath = $packageJson.FullName.Substring($PSScriptRoot.Length + 1)

            if (-not (Test-UiNeedsBuild $uiDir)) {
                Write-Host "Skipping UI package: $relativePath (no changes)" -ForegroundColor DarkGray
                continue
            }

            Write-Host "Building UI package: $relativePath" -ForegroundColor Cyan
            Push-Location $uiDir
            try {
                if ($Restore -or -not (Test-Path (Join-Path $uiDir "node_modules"))) {
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
    }
    Write-Host ""

    if ($dotnetNeedsBuild) {
        Write-Host "Building solution ($Configuration)..." -ForegroundColor Yellow
        Write-Host ""

        $buildArgs = @("build", $solutionPath, "--configuration", $Configuration, "-v", "minimal", "--no-restore")

        dotnet @buildArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed with exit code $LASTEXITCODE"
        }
    }

    # Ensure bit UI dist assets are copied into bit and app outputs
    Write-Host "Syncing bit UI static assets..." -ForegroundColor Yellow
    if (Test-Path $bitsPath) {
        $bitUiDirs = Get-ChildItem -Path $bitsPath -Filter "ui" -Recurse -Directory | Where-Object {
            Test-Path (Join-Path $_.FullName "dist")
        }

        foreach ($uiDir in $bitUiDirs) {
            $bitRoot = Split-Path -Path $uiDir.FullName -Parent
            $bitName = Split-Path -Path $bitRoot -Leaf
            $sourceDist = Join-Path $uiDir.FullName "dist"

            $bitOutput = Join-Path $bitRoot "bin\$Configuration\net8.0\ui\dist"
            $appBitOutput = Join-Path $PSScriptRoot "App\bin\$Configuration\net8.0\bits\$bitName\ui\dist"

            New-Item -ItemType Directory -Force -Path $bitOutput | Out-Null
            New-Item -ItemType Directory -Force -Path $appBitOutput | Out-Null

            Copy-Item -Path (Join-Path $sourceDist "*") -Destination $bitOutput -Recurse -Force
            Copy-Item -Path (Join-Path $sourceDist "*") -Destination $appBitOutput -Recurse -Force
        }
    }

    # Ensure core UI static assets are present in App output
    $uiSource = Join-Path $PSScriptRoot "UI\static"
    $uiDest = Join-Path $PSScriptRoot "App\bin\$Configuration\net8.0\static\ui"
    if (Test-Path $uiSource) {
        New-Item -ItemType Directory -Force -Path $uiDest | Out-Null
        Copy-Item -Path (Join-Path $uiSource "*") -Destination $uiDest -Recurse -Force
        Write-Host "✓ UI assets copied to App output" -ForegroundColor Green
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
