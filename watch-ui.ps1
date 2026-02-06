#!/usr/bin/env pwsh
# Interactive helper to run a single UI bit in Vite watch mode (no backend)

param(
    [int]$StartPort = 5173,
    [string]$BackendUrl,
    [switch]$NoInstall
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
    if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) { return "npm.cmd" }
    if (Get-Command "npm" -ErrorAction SilentlyContinue) { return "npm" }
    throw "npm is not installed or not in PATH. Please install Node.js."
}

function Test-PortFree {
    param([int]$Port)

    $listeners = @()
    try {
        $l4 = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $l4.Start()
        $listeners += $l4

        $l6 = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::IPv6Loopback, $Port)
        $l6.Server.DualMode = $true
        $l6.Start()
        $listeners += $l6

        return $true
    }
    catch {
        return $false
    }
    finally {
        foreach ($l in $listeners) {
            try { $l.Stop() } catch { }
        }
    }
}

function Kill-PortListeners {
    param([int]$Port, [int]$MaxRetries = 5)

    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        try {
            $pids = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
            if (-not $pids) {
                if ($attempt -gt 1) {
                    Write-Host "  Port ${Port} is now free." -ForegroundColor Green
                }
                return $true
            }

            if ($attempt -eq 1) {
                Write-Host "Killing process(es) using port ${Port}: $($pids -join ', ')" -ForegroundColor Yellow
            }

            foreach ($pid in $pids) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                    Write-Host "  Killed PID $pid" -ForegroundColor DarkGray
                }
                catch {
                    Write-Host "  Failed to kill PID $pid (attempt $attempt)" -ForegroundColor DarkYellow
                }
            }
            Start-Sleep -Milliseconds 1000
        }
        catch { }
    }

    Write-Host "  WARNING: Could not free port ${Port} after $MaxRetries attempts" -ForegroundColor Red
    return $false
}

function Get-NextFreePort {
    param([int]$StartPort = 5173)
    $port = $StartPort
    while ($true) {
        if (Test-PortFree -Port $port) { return $port }
        $port++
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
            if ($bitManifest -and $bitManifest.id) { $bitId = $bitManifest.id }
        }
        catch { }
    }

    if ([string]::IsNullOrWhiteSpace($bitId)) {
        $bitId = Split-Path $bitDir -Leaf
    }

    return $bitId
}

function Get-UiPackageJsons {
    param([string]$Root)
    $bitsPath = Join-Path $Root "Bits"
    if (-not (Test-Path $bitsPath)) { return @() }

    return Get-ChildItem -Path $bitsPath -Recurse -Filter "package.json" -File |
        Where-Object { $_.FullName -match '\\ui\\package.json$' } |
        Sort-Object FullName
}

function Ensure-UiDependencies {
    param([string]$UiDir, [string]$DisplayName)
    if ($NoInstall) { return }
    if (-not (Test-Path (Join-Path $UiDir "node_modules"))) {
        Write-Host "Installing UI dependencies: $DisplayName" -ForegroundColor Yellow
        $npmCmd = Get-NpmCommand
        Push-Location $UiDir
        try {
            & $npmCmd install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed for $DisplayName" }
        }
        finally { Pop-Location }
    }
}

function Select-UiPackage {
    param([object[]]$Packages)
    if ($Packages.Count -eq 0) { return $null }

    $selected = 0
    while ($true) {
        Clear-Host
        Write-Section "Select a UI bit to watch"
        Write-Host "Use Up/Down arrows to select, Enter to run. Press a number to pick directly." -ForegroundColor DarkGray
        Write-Host ""
        for ($i = 0; $i -lt $Packages.Count; $i++) {
            $prefix = if ($i -eq $selected) { ">" } else { " " }
            $color = if ($i -eq $selected) { "Yellow" } else { "Gray" }
            $num = $i + 1
            $label = "[{0}] {1} ({2})" -f $num, $Packages[$i].BitId, $Packages[$i].RelativePath
            Write-Host ("{0} {1}" -f $prefix, $label) -ForegroundColor $color
        }

        $key = [Console]::ReadKey($true)
        switch ($key.Key) {
            "UpArrow"   { if ($selected -gt 0) { $selected-- } }
            "DownArrow" { if ($selected -lt ($Packages.Count - 1)) { $selected++ } }
            "Enter"     { return $Packages[$selected] }
            "Escape"    { return $null }
            default {
                $digit = [int]::TryParse($key.KeyChar, [ref]0)
                if ([int]::TryParse($key.KeyChar, [ref]$null)) {
                    $index = [int]$key.KeyChar - [int]'1'
                    if ($index -ge 0 -and $index -lt $Packages.Count) { return $Packages[$index] }
                }
            }
        }
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$uiPackages = Get-UiPackageJsons -Root $root

if ($uiPackages.Count -eq 0) {
    Write-Host "No UI packages found under Bits/**/ui." -ForegroundColor Red
    exit 1
}

$choices = @()
foreach ($pkg in $uiPackages) {
    $uiDir = Split-Path -Path $pkg.FullName -Parent
    $choices += [pscustomobject]@{
        BitId        = (Resolve-BitId -UiDir $uiDir).ToLowerInvariant()
        UiDir        = $uiDir
        RelativePath = $pkg.FullName.Substring($root.Length + 1)
    }
}

$selection = Select-UiPackage -Packages $choices
if (-not $selection) {
    Write-Host "Cancelled." -ForegroundColor DarkGray
    exit 0
}

$npmCmd = Get-NpmCommand
Ensure-UiDependencies -UiDir $selection.UiDir -DisplayName $selection.RelativePath
$port = Get-NextFreePort -StartPort $StartPort
$route = "/{0}/ui/" -f $selection.BitId

Write-Section "Starting Vite for $($selection.BitId)"
Write-Host "Directory : $($selection.UiDir)" -ForegroundColor Gray

# Kill any process using the target port
$portFreed = Kill-PortListeners -Port $port
if (-not $portFreed) {
    Write-Host "Unable to free port $port. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "Route      : $route" -ForegroundColor Gray
Write-Host "Port       : $port" -ForegroundColor Gray
if ($BackendUrl) { 
    Write-Host "Backend URL: $BackendUrl (exported as VITE_BACKEND_URL)" -ForegroundColor Gray 
}
else {
    Write-Host "Backend URL: none (proxy disabled, standalone UI mode)" -ForegroundColor DarkGray
}
Write-Host ""

$previousBackend = $env:VITE_BACKEND_URL
if ($BackendUrl) { $env:VITE_BACKEND_URL = $BackendUrl }

Push-Location $selection.UiDir
try {
    Write-Host "Press Ctrl+C to stop the dev server." -ForegroundColor Yellow
    & $npmCmd run dev -- --host --port $port --strictPort
}
finally {
    Pop-Location
    if ($BackendUrl) { $env:VITE_BACKEND_URL = $previousBackend }
}
