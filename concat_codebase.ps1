param(
    [string]$Output = "codebase.sources.log"
)

$includeExtensions = @(".cs", ".ts", ".tsx", ".html", ".css", ".sql", ".xml")
$excludeDirs = @("bin", "obj", ".git", "node_modules", "dist", ".vs", ".vscode", "logs")

$root = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
$outputPath = Join-Path $root $Output

if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
}

$excludedNames = $excludeDirs | ForEach-Object { $_.ToLower() }

$files = Get-ChildItem -Path $root -Recurse -File |
    Where-Object {
        ($_.FullName -split '[\\/]' | Where-Object { $excludedNames -contains $_.ToLower() }).Count -eq 0
    } |
    Where-Object { $includeExtensions -contains $_.Extension.ToLower() } |
    Sort-Object FullName

foreach ($file in $files) {
    $relative = Resolve-Path $file.FullName |
        ForEach-Object { $_.Path.Substring($root.Length).TrimStart([char]92, [char]47) }
    "===== FILE: $relative =====" | Out-File -FilePath $outputPath -Append -Encoding utf8
    Get-Content $file.FullName -Raw | Out-File -FilePath $outputPath -Append -Encoding utf8
    "`n" | Out-File -FilePath $outputPath -Append -Encoding utf8
}

Write-Host "Concatenated $($files.Count) files into $outputPath"