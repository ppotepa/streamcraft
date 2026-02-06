#!/usr/bin/env pwsh
# Publish StreamCraft as a single-file app and bundle bits output.

param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64",
    [string]$Output = "",
    [switch]$SelfContained = $true,
    [switch]$NoUiBuild
)

$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Message)
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
}

function Get-UiPackageJsons {
    param([string]$Root)
    $bitsPath = Join-Path $Root "Bits"
    if (-not (Test-Path $bitsPath)) {
        return @()
    }

    return Get-ChildItem -Path $bitsPath -Recurse -Filter "package.json" -File |
        Where-Object { $_.FullName -match '\\ui\\package.json$' } |
        Sort-Object FullName
}

function Ensure-UiDependencies {
    param([string]$UiDir, [string]$DisplayName)
    if (-not (Test-Path (Join-Path $UiDir "node_modules"))) {
        Write-Host "Installing UI dependencies: $DisplayName" -ForegroundColor Yellow
        Push-Location $UiDir
        try {
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed for $DisplayName"
            }
        }
        finally {
            Pop-Location
        }
    }
}

function Build-UiProjects {
    param([System.IO.FileInfo[]]$Packages, [string]$Root)
    if ($Packages.Count -eq 0) {
        Write-Host "No UI packages found under Bits/**/ui." -ForegroundColor DarkGray
        return
    }

    foreach ($packageJson in $Packages) {
        $uiDir = Split-Path -Path $packageJson.FullName -Parent
        $relativePath = $packageJson.FullName.Substring($Root.Length + 1)
        Ensure-UiDependencies -UiDir $uiDir -DisplayName $relativePath

        Write-Host "Building UI package: $relativePath" -ForegroundColor Cyan
        Push-Location $uiDir
        try {
            npm run build --if-present
            if ($LASTEXITCODE -ne 0) {
                throw "npm run build failed for $relativePath"
            }
        }
        finally {
            Pop-Location
        }
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$appProjectPath = Join-Path $root "src\StreamCraft.App\StreamCraft.App.csproj"

if (-not (Test-Path $appProjectPath)) {
    Write-Host "Error: Project file not found at $appProjectPath" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Output)) {
    $Output = Join-Path $root ("artifacts/publish/{0}" -f $Runtime)
}

if (Test-Path $Output) {
    Write-Section "Cleaning publish output"
    Remove-Item -Recurse -Force $Output
}

if (-not $NoUiBuild) {
    Write-Section "Building UI Packages"
    $uiPackages = Get-UiPackageJsons -Root $root
    Build-UiProjects -Packages $uiPackages -Root $root
}

Write-Section "Publishing StreamCraft"

$publishArgs = @(
    "publish",
    $appProjectPath,
    "--configuration", $Configuration,
    "--runtime", $Runtime,
    "--output", $Output,
    "/p:PublishSingleFile=true",
    "/p:IncludeNativeLibrariesForSelfExtract=true",
    "/p:PublishTrimmed=false",
    "/p:DebugType=none"
)

if ($SelfContained) {
    $publishArgs += "/p:SelfContained=true"
} else {
    $publishArgs += "/p:SelfContained=false"
}

dotnet @publishArgs
if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed."
}

$bitsSource = Join-Path $root ("src/StreamCraft.App/bin/{0}/net8.0/bits" -f $Configuration)
$bitsDestination = Join-Path $Output "bits"

if (Test-Path $bitsSource) {
    Write-Section "Copying Bits Output"
    New-Item -ItemType Directory -Force -Path $bitsDestination | Out-Null
    Copy-Item -Path (Join-Path $bitsSource "*") -Destination $bitsDestination -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Bits output not found at $bitsSource" -ForegroundColor Yellow
}

Write-Host "Publish complete: $Output" -ForegroundColor Green
