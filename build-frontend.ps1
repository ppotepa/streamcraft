param(
    [switch]$Watch
)

$ErrorActionPreference = "Stop"

function Write-Section($message) {
    Write-Host "" 
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host $message -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Section "Building StreamCraft Frontend"

function Get-LatestWriteTimeUtc($path, $excludeRegex) {
    if (-not (Test-Path $path)) { return [DateTime]::MinValue }
    $files = Get-ChildItem -Path $path -Recurse -File -Force | Where-Object {
        $_.FullName -notmatch $excludeRegex
    }
    if (-not $files) { return [DateTime]::MinValue }
    return ($files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc
}

function Test-UiNeedsBuild($uiDir) {
    $distDir = Join-Path $uiDir "dist"
    if (-not (Test-Path $distDir)) { return $true }
    $exclude = '\\(dist|node_modules)\\'
    $latestSource = Get-LatestWriteTimeUtc $uiDir $exclude
    $latestDist = Get-LatestWriteTimeUtc $distDir '\\node_modules\\'
    return $latestSource -gt $latestDist
}

$bitsPath = Join-Path $root "Bits"
if (-not (Test-Path $bitsPath)) {
    throw "Bits path not found: $bitsPath"
}

if ($Watch) {
    $designerUiPath = Join-Path $root "Bits\Designer\ui"
    if (-not (Test-Path $designerUiPath)) {
        throw "Designer UI path not found: $designerUiPath"
    }
    Write-Host "Starting Designer UI in watch mode..." -ForegroundColor Yellow
    Push-Location $designerUiPath
    try {
        npm run dev
    }
    finally {
        Pop-Location
    }
    return
}

Write-Host "Building UI packages (if changed)..." -ForegroundColor Yellow

$uiPackageJsons = Get-ChildItem -Path $bitsPath -Filter "package.json" -Recurse -File | Where-Object {
    $_.FullName -match '\\ui\\package.json$'
}

foreach ($packageJson in $uiPackageJsons) {
    $uiDir = Split-Path -Path $packageJson.FullName -Parent
    $relativePath = $packageJson.FullName.Substring($root.Length + 1)

    if (-not (Test-UiNeedsBuild $uiDir)) {
        Write-Host "Skipping UI package: $relativePath (no changes)" -ForegroundColor DarkGray
        continue
    }

    Write-Host "Building UI package: $relativePath" -ForegroundColor Cyan
    Push-Location $uiDir
    try {
        if (-not (Test-Path (Join-Path $uiDir "node_modules"))) {
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

# Build scripts at bit root if present
$buildScripts = Get-ChildItem -Path $bitsPath -Recurse -File | Where-Object {
    $_.Name -in @("build.js", "build.ts")
}

foreach ($script in $buildScripts) {
    $scriptDir = Split-Path -Path $script.FullName -Parent
    $relativePath = $script.FullName.Substring($root.Length + 1)
    Write-Host "Running bit build script: $relativePath" -ForegroundColor Cyan
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
        Write-Host "✓ Bit build completed" -ForegroundColor Green
    }
    catch {
        Pop-Location
        throw
    }
    Pop-Location
}

Write-Host "Frontend build completed." -ForegroundColor Green
