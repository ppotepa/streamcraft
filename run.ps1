#!/usr/bin/env pwsh
# Run StreamCraft with a simple menu (current, prebuilt, or watch with live UI dev servers)

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

function Get-NpmCommand {
    if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) {
        return "npm.cmd"
    }
    elseif (Get-Command "npm" -ErrorAction SilentlyContinue) {
        return "npm"
    }
    else {
        throw "npm is not installed or not in PATH. Please install Node.js."
    }
}

function Get-NextFreePort {
    param([int]$StartPort = 5174)
    $port = $StartPort
    while ($true) {
        $listener = $null
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
            $listener.Start()
            $listener.Stop()
            return $port
        }
        catch {
            if ($listener) { $listener.Stop() }
            $port++
        }
    }
}

function Wait-ViteReady {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 20
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

function Clear-WatchEnvironment {
    foreach ($name in @("STREAMCRAFT_WATCH_MODE", "STREAMCRAFT_VITE_PORTS")) {
        if (Test-Path "Env:$name") {
            Remove-Item "Env:$name" -ErrorAction SilentlyContinue
        }
    }
}

function Resolve-BitId {
    param([string]$UiDir)
    $bitDir = Split-Path -Path $UiDir -Parent
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

    return $bitId
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
    $nodeModules = Join-Path $UiDir "node_modules"
    $viteBin = Join-Path $UiDir "node_modules/.bin/vite"
    $needsInstall = -not (Test-Path $nodeModules) -or -not (Test-Path $viteBin)

    if ($needsInstall) {
        Write-Host "Installing UI dependencies: $DisplayName" -ForegroundColor Yellow
        $npmCmd = Get-NpmCommand
        Push-Location $UiDir
        try {
            & $npmCmd install
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

    $npmCmd = Get-NpmCommand

    foreach ($packageJson in $Packages) {
        $uiDir = Split-Path -Path $packageJson.FullName -Parent
        $relativePath = $packageJson.FullName.Substring($Root.Length + 1)
        Ensure-UiDependencies -UiDir $uiDir -DisplayName $relativePath

        Write-Host "Building UI package: $relativePath" -ForegroundColor Cyan
        Push-Location $uiDir
        try {
            & $npmCmd run build --if-present
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
    param(
        [System.IO.FileInfo[]]$Packages,
        [string]$Root,
        [string]$BackendUrl,
        [int]$PortBase = 5174
    )

    $result = [pscustomobject]@{
        Processes = @()
        PortMap   = @{}
    }

    if ($Packages.Count -eq 0) {
        Write-Host "No UI packages found under Bits/**/ui." -ForegroundColor DarkGray
        return $result
    }

    $npmCmd = Get-NpmCommand
    $nextPort = $PortBase

    foreach ($packageJson in $Packages) {
        $uiDir = Split-Path -Path $packageJson.FullName -Parent
        $relativePath = $packageJson.FullName.Substring($Root.Length + 1)
        $scripts = Get-NpmScripts -PackageJsonPath $packageJson.FullName
        if (-not $scripts -or -not $scripts.dev) {
            Write-Host "Skipping UI package (no dev script): $relativePath" -ForegroundColor DarkGray
            continue
        }

        $bitId = (Resolve-BitId -UiDir $uiDir).ToLowerInvariant()
        $port = Get-NextFreePort -StartPort $nextPort
        $nextPort = $port + 1
        $route = "/$bitId/ui"

        Ensure-UiDependencies -UiDir $uiDir -DisplayName $relativePath
        Write-Host "[$bitId] Starting Vite dev server on port ${port}: $relativePath" -ForegroundColor Cyan

        $envVars = @{ "VITE_BACKEND_URL" = $BackendUrl }
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $npmCmd, "run", "dev", "--", "--host", "--port", "$port", "--strictPort") -WorkingDirectory $uiDir -PassThru -WindowStyle Hidden -Environment $envVars
        if ($process) {
            $result.Processes += $process
            $result.PortMap[$route] = $port

            if (-not (Wait-ViteReady -Port $port -TimeoutSeconds 20)) {
                Write-Host "[WARN] Vite dev server for $bitId did not become ready on port $port" -ForegroundColor Yellow
                try {
                    if (-not $process.HasExited) {
                        Stop-Process -Id $process.Id -Force
                    }
                }
                catch {
                }
                $result.Processes = @($result.Processes | Where-Object { $_.Id -ne $process.Id })
                $null = $result.PortMap.Remove($route)
            }
        }
        else {
            Write-Host "[WARN] Failed to start Vite dev server for $bitId" -ForegroundColor Yellow
        }
    }

    return $result
}

function Select-UiWatchTargets {
    param(
        [System.IO.FileInfo[]]$Packages,
        [string]$Root
    )

    $candidates = @()
    foreach ($packageJson in $Packages) {
        $scripts = Get-NpmScripts -PackageJsonPath $packageJson.FullName
        if (-not $scripts -or -not $scripts.dev) { continue }

        $uiDir = Split-Path -Path $packageJson.FullName -Parent
        $bitId = (Resolve-BitId -UiDir $uiDir)
        $relativePath = $packageJson.FullName.Substring($Root.Length + 1)
        $candidates += [pscustomobject]@{
            Package = $packageJson
            BitId = $bitId
            Path = $relativePath
        }
    }

    if ($candidates.Count -eq 0) {
        Write-Host "No UI bits with a dev script were found." -ForegroundColor Yellow
        return @()
    }

    Write-Section "Select UI bits to start in watch mode"
    for ($i = 0; $i -lt $candidates.Count; $i++) {
        $entry = $candidates[$i]
        Write-Host ("[{0}] {1} ({2})" -f ($i + 1), $entry.BitId, $entry.Path) -ForegroundColor Cyan
    }
    Write-Host "" 
    Write-Host "Enter numbers separated by commas to start specific bits." -ForegroundColor Gray
    Write-Host "Press Enter for all, or 0 to cancel." -ForegroundColor Gray
    $selection = Read-Host "Your choice"

    if ([string]::IsNullOrWhiteSpace($selection)) {
        return $candidates | ForEach-Object { $_.Package }
    }

    if ($selection.Trim() -eq "0") {
        return @()
    }

    $selectedIndexes = @()
    foreach ($part in $selection.Split(",")) {
        $trimmed = $part.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
        $number = 0
        if ([int]::TryParse($trimmed, [ref]$number)) {
            if ($number -ge 1 -and $number -le $candidates.Count) {
                $selectedIndexes += ($number - 1)
            }
        }
    }

    if ($selectedIndexes.Count -eq 0) {
        Write-Host "No valid selections; starting none." -ForegroundColor Yellow
        return @()
    }

    return $selectedIndexes | Sort-Object -Unique | ForEach-Object { $candidates[$_].Package }
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
        Clear-WatchEnvironment
        Write-Section "Running StreamCraft Backend (Current Build)"
        Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Gray
        Write-Host ""
        dotnet run --project $appProjectPath --configuration $Configuration --no-build
        if ($LASTEXITCODE -ne 0) {
            throw "Application exited with code $LASTEXITCODE"
        }
    }
    elseif ($Mode -eq "prebuilt") {
        Clear-WatchEnvironment
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
        $backendUrl = "http://localhost:5000"

        Write-Section "Starting UI Watch (Vite dev servers)"
        $uiPackages = Get-UiPackageJsons -Root $root
        $selectedUiPackages = Select-UiWatchTargets -Packages $uiPackages -Root $root
        $watchInfo = Start-UiWatchers -Packages $selectedUiPackages -Root $root -BackendUrl $backendUrl -PortBase 5174

        $envPortMap = $watchInfo.PortMap.GetEnumerator() | ForEach-Object { "{0}={1}" -f $_.Key.Trim(), $_.Value }
        $env:STREAMCRAFT_VITE_PORTS = ($envPortMap -join ";")

        # Persist watch map for tooling/diagnostics
        $watchDir = Join-Path $root "artifacts/watch"
        New-Item -ItemType Directory -Force -Path $watchDir | Out-Null
        $watchMapPath = Join-Path $watchDir "watch-map.json"
        $backendBase = $backendUrl.TrimEnd('/')
        $mapPayload = @()
        foreach ($entry in $watchInfo.PortMap.GetEnumerator()) {
            $route = $entry.Key.TrimEnd('/')
            $port = $entry.Value
            $mapPayload += [pscustomobject]@{
                bitId = ($route -replace '^/', '' -replace '/ui$', '')
                route = $route + '/'
                proxyUrl = "$backendBase$route/"
                devUrl = "http://localhost:$port$route/"
                port = $port
            }
        }
        $mapPayload | ConvertTo-Json -Depth 4 | Set-Content -Path $watchMapPath -Encoding UTF8

        if ($watchInfo.PortMap.Count -gt 0) {
            Write-Host "" 
            Write-Host "Vite dev servers (proxied through backend):" -ForegroundColor Green
            foreach ($entry in $watchInfo.PortMap.GetEnumerator()) {
                $route = $entry.Key.TrimEnd('/') + "/"
                $port = $entry.Value
                Write-Host (" - {0} -> http://localhost:{1}{0}" -f $route, $port) -ForegroundColor Yellow
            }
            Write-Host "" 
        }
        else {
            Write-Host "No UI dev servers started (no ui/package.json with dev script)." -ForegroundColor DarkGray
        }

        Write-Section "Running StreamCraft Backend (watch)"
        Write-Host "Press Ctrl+C to stop all watch processes" -ForegroundColor Gray
        Write-Host "Backend: $backendUrl" -ForegroundColor Yellow
        Write-Host "Watch page: $backendUrl/watches" -ForegroundColor Yellow
        Write-Host ""

        try {
            $env:ASPNETCORE_URLS = $backendUrl
            $env:STREAMCRAFT_WATCH_MODE = "1"
            dotnet watch run --project $appProjectPath --configuration $Configuration --no-hot-reload
            if ($LASTEXITCODE -ne 0) {
                throw "Application exited with code $LASTEXITCODE"
            }
        }
        finally {
            if ($watchInfo.Processes.Count -gt 0) {
                Write-Host "" 
                Write-Host "Stopping UI dev servers..." -ForegroundColor Yellow
                foreach ($proc in $watchInfo.Processes) {
                    try {
                        if (-not $proc.HasExited) {
                            Stop-Process -Id $proc.Id -Force
                        }
                    }
                    catch {
                    }
                }
            }

            Clear-WatchEnvironment
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
