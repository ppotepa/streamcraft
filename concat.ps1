param(
    [string]$Output = "codebase.log"
)

$excludeDirs = @('bin', 'obj', '.git', 'node_modules', 'dist', '.vs', '.vscode', 'logs')
$excludeExtensions = @('.dll', '.exe', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.ttf', '.woff', '.woff2', '.pdf', '.zip', '.7z', '.gz', '.tgz', '.tar', '.mp4', '.mp3', '.wav', '.ogg')

$root = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
$outputPath = Join-Path $root $Output

if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
}

$excludedNames = $excludeDirs | ForEach-Object { $_.ToLower() }

$files = Get-ChildItem -Path $root -Recurse -File |
    Where-Object {
        # Skip if any path segment is an excluded directory
        ($_.FullName -split '[\\/]' | Where-Object { $excludedNames -contains $_.ToLower() }).Count -eq 0
    } |
    Where-Object { -not ($excludeExtensions -contains $_.Extension.ToLower()) }

foreach ($file in $files) {
    $relative = Resolve-Path $file.FullName | ForEach-Object { $_.Path.Substring($root.Length).TrimStart([char]92, [char]47) }
    "===== FILE: $relative =====" | Out-File -FilePath $outputPath -Append -Encoding utf8
    Get-Content $file.FullName -Raw | Out-File -FilePath $outputPath -Append -Encoding utf8
    "`n" | Out-File -FilePath $outputPath -Append -Encoding utf8
}

Write-Host "Concatenated $($files.Count) files into $outputPath"
