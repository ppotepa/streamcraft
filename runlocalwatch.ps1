#!/usr/bin/env pwsh
# Legacy alias: run frontend watch only

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "runwatch.ps1")
exit $LASTEXITCODE
