#!/usr/bin/env pwsh
# Run StreamCraft with a simple menu (prebuilt or watch)

param(
    [string]$Mode = "menu",
    [string]$Configuration = "Debug",
    [switch]$NoBuild
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

function Get-NpmScripts {
    param([string]$PackageJsonPath)
    try {
        $pkg = Get-Content $PackageJsonPath -Raw | ConvertFrom-Json
        return $pkg.scripts
    }
    catch {
        return $null
    }
}

function Get-UiDistMappings {
    param(
        [System.IO.FileInfo[]]$Packages,
        [string]$Root,
        [string]$Configuration
    )

    $mappings = @()
    foreach ($packageJson in $Packages) {
        $uiDir = Split-Path -Path $packageJson.FullName -Parent
        $bitDir = Split-Path -Path $uiDir -Parent
        $bitJsonPath = Join-Path $bitDir "bit.json"
        $bitId = $null

        if (Test-Path $bitJsonPath) {
            try {
                $bitManifest = Get-Content $bitJsonPath -Raw | ConvertFrom-Json
                if ($bitManifest -and $bitManifest.id) {
                    $bitId = $bitManifest.id
                }
            }
            catch {
            }
        }

        if ([string]::IsNullOrWhiteSpace($bitId)) {
            $bitId = Split-Path $bitDir -Leaf
        }

        $source = Join-Path $uiDir "dist"
        $destination = Join-Path $Root ("src/StreamCraft.App/bin/{0}/net8.0/bits/{1}/ui/dist" -f $Configuration, $bitId)
        $mappings += [pscustomobject]@{
            Source = $source
            Destination = $destination
            BitId = $bitId
        }
    }

    return $mappings
}

function Sync-UiDist {
    param([object[]]$Mappings)

    foreach ($mapping in $Mappings) {
        $source = $mapping.Source
        $destination = $mapping.Destination
        if (-not (Test-Path $source)) {
            continue
        }

        New-Item -ItemType Directory -Force -Path $destination | Out-Null
        Copy-Item -Path (Join-Path $source "*") -Destination $destination -Recurse -Force -ErrorAction SilentlyContinue
    }
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

function Start-UiWatchers {
    param([System.IO.FileInfo[]]$Packages, [string]$Root)
    $processes = @()
    if ($Packages.Count -eq 0) {
        Write-Host "No UI packages found under Bits/**/ui." -ForegroundColor DarkGray
        return $processes
    }

    foreach ($packageJson in $Packages) {
        $uiDir = Split-Path -Path $packageJson.FullName -Parent
        $relativePath = $packageJson.FullName.Substring($Root.Length + 1)
        $scripts = Get-NpmScripts -PackageJsonPath $packageJson.FullName
        if (-not $scripts -or -not $scripts.build) {
            Write-Host "Skipping UI package (no build script): $relativePath" -ForegroundColor DarkGray
            continue
        }
        Ensure-UiDependencies -UiDir $uiDir -DisplayName $relativePath

        Write-Host "Watching UI package: $relativePath" -ForegroundColor Cyan
        $process = Start-Process -FilePath "npm" -ArgumentList @("run", "build", "--", "--watch") -WorkingDirectory $uiDir -PassThru
        if ($process) {
            $processes += $process
        }
    }

    return $processes
}

function Select-MenuMode {
    $menu = @(
        @{ Mode = "current"; Label = "Run current build (no build)" },
        @{ Mode = "prebuilt"; Label = "Run prebuilt (build solution + UI dist)" },
        @{ Mode = "watch"; Label = "Run watch (backend + UI watch builds)" },
        @{ Mode = "exit"; Label = "Exit" }
    )

    $selected = 0
    while ($true) {
        Clear-Host
        Write-Section "StreamCraft Run Menu"
        Write-Host "Use Up/Down arrows to select, Enter to confirm." -ForegroundColor DarkGray
        Write-Host ""
        for ($i = 0; $i -lt $menu.Count; $i++) {
            $prefix = if ($i -eq $selected) { ">" } else { " " }
            $color = if ($i -eq $selected) { "Yellow" } else { "Gray" }
            Write-Host ("{0} {1}" -f $prefix, $menu[$i].Label) -ForegroundColor $color
        }

        $key = [Console]::ReadKey($true)
        switch ($key.Key) {
            "UpArrow" {
                if ($selected -gt 0) { $selected-- }
            }
            "DownArrow" {
                if ($selected -lt ($menu.Count - 1)) { $selected++ }
            }
            "Enter" {
                return $menu[$selected].Mode
            }
            "Escape" {
                return "exit"
            }
        }
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$appProjectPath = Join-Path $root "src\StreamCraft.App\StreamCraft.App.csproj"
$solutionPath = Join-Path $root "StreamCraft.sln"

if ($Mode -match '^-?\d+$') {
    switch ($Mode) {
        { $_ -in @("1", "-1") } { $Mode = "current"; break }
        { $_ -in @("2", "-2") } { $Mode = "prebuilt"; break }
        { $_ -in @("3", "-3") } { $Mode = "watch"; break }
        default { $Mode = "menu"; break }
    }
}

if (-not (Test-Path $appProjectPath)) {
    Write-Host "Error: Project file not found at $appProjectPath" -ForegroundColor Red
    exit 1
}

if ($Mode -eq "menu") {
    $Mode = Select-MenuMode
}

if ($Mode -eq "exit") {
    Write-Host "Exiting." -ForegroundColor DarkGray
    exit 0
}

try {
    if ($Mode -eq "current") {
        Write-Section "Running StreamCraft Backend (Current Build)"
        Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Gray
        Write-Host ""
        dotnet run --project $appProjectPath --configuration $Configuration --no-build
        if ($LASTEXITCODE -ne 0) {
            throw "Application exited with code $LASTEXITCODE"
        }
    }
    elseif ($Mode -eq "prebuilt") {
        Write-Section "Building UI Packages"
        $uiPackages = Get-UiPackageJsons -Root $root
        Build-UiProjects -Packages $uiPackages -Root $root

        if (-not $NoBuild) {
            Write-Section "Building Solution"
            dotnet build $solutionPath --configuration $Configuration
            if ($LASTEXITCODE -ne 0) {
                throw "Solution build failed."
            }
        }

        $syncMappings = Get-UiDistMappings -Packages $uiPackages -Root $root -Configuration $Configuration
        Sync-UiDist -Mappings $syncMappings

        Write-Section "Running StreamCraft Backend"
        Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Gray
        Write-Host ""
        dotnet run --project $appProjectPath --configuration $Configuration --no-build
        if ($LASTEXITCODE -ne 0) {
            throw "Application exited with code $LASTEXITCODE"
        }
    }
    elseif ($Mode -eq "watch") {
        Write-Section "Starting UI Watch Builds"
        $uiPackages = Get-UiPackageJsons -Root $root
        $uiProcesses = Start-UiWatchers -Packages $uiPackages -Root $root

        $syncMappings = Get-UiDistMappings -Packages $uiPackages -Root $root -Configuration $Configuration

        if (-not $NoBuild) {
            Write-Section "Building Backend"
            dotnet build $appProjectPath --configuration $Configuration
            if ($LASTEXITCODE -ne 0) {
                throw "Backend build failed."
            }
        }

        Sync-UiDist -Mappings $syncMappings
        $syncJob = $null
        if ($syncMappings.Count -gt 0) {
            $syncJob = Start-Job -ArgumentList @($syncMappings) -ScriptBlock {
                param($mappings)
                while ($true) {
                    foreach ($mapping in $mappings) {
                        $source = $mapping.Source
                        $destination = $mapping.Destination
                        if (-not (Test-Path $source)) {
                            continue
                        }
                        New-Item -ItemType Directory -Force -Path $destination | Out-Null
                        Copy-Item -Path (Join-Path $source "*") -Destination $destination -Recurse -Force -ErrorAction SilentlyContinue
                    }
                    Start-Sleep -Seconds 2
                }
            }
        }

        Write-Section "Running StreamCraft Backend"
        Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Gray
        Write-Host ""
        try {
            dotnet run --project $appProjectPath --configuration $Configuration --no-build
            if ($LASTEXITCODE -ne 0) {
                throw "Application exited with code $LASTEXITCODE"
            }
        }
        finally {
            if ($syncJob) {
                try {
                    Stop-Job $syncJob -Force | Out-Null
                    Remove-Job $syncJob -Force | Out-Null
                }
                catch {
                }
            }
            if ($uiProcesses.Count -gt 0) {
                Write-Host ""
                Write-Host "Stopping UI watch builds..." -ForegroundColor Yellow
                foreach ($proc in $uiProcesses) {
                    try {
                        if (-not $proc.HasExited) {
                            Stop-Process -Id $proc.Id -Force
                        }
                    }
                    catch {
                    }
                }
            }
        }
    }
    else {
        throw "Unknown mode: $Mode"
    }
}
catch {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    exit 1
}
