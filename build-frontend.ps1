param(
    [switch]$Watch
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

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

& (Join-Path $root "build-fe.ps1")
exit $LASTEXITCODE
