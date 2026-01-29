# Test the templates API
Write-Host "Testing Template System API" -ForegroundColor Green

# Test 1: List all templates
Write-Host "`n1. GET /api/templates - List all available templates" -ForegroundColor Cyan
try {
    $templates = Invoke-RestMethod -Uri 'http://localhost:5000/api/templates' -Method Get
    Write-Host "Success! Found $($templates.Count) templates:" -ForegroundColor Green
    $templates | ForEach-Object {
        Write-Host "  - $($_.templateId): $($_.templateName)" -ForegroundColor Yellow
        Write-Host "    Category: $($_.category), Icon: $($_.icon)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: Get specific template details
Write-Host "`n2. GET /api/templates/api-explorer - Get template details" -ForegroundColor Cyan
try {
    $template = Invoke-RestMethod -Uri 'http://localhost:5000/api/templates/api-explorer' -Method Get
    Write-Host "Success! Template: $($template.templateName)" -ForegroundColor Green
    Write-Host "Schema fields:" -ForegroundColor Yellow
    $template.configurationSchema.PSObject.Properties | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Value)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 3: List dynamic bits (should be empty initially)
Write-Host "`n3. GET /api/bits/dynamic - List dynamic bits" -ForegroundColor Cyan
try {
    $bits = Invoke-RestMethod -Uri 'http://localhost:5000/api/bits/dynamic' -Method Get
    Write-Host "Success! Found $($bits.Count) dynamic bits" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 4: Create a new dynamic bit
Write-Host "`n4. POST /api/bits/dynamic - Create new API Explorer bit" -ForegroundColor Cyan
$newBit = @{
    templateId = "api-explorer"
    name = "GitHub API"
    description = "Browse GitHub API"
    route = "/github-api"
    configuration = @{
        ApiUrl = "https://api.github.com/users/octocat"
        RefreshInterval = "10"
    }
} | ConvertTo-Json

try {
    $created = Invoke-RestMethod -Uri 'http://localhost:5000/api/bits/dynamic' -Method Post -Body $newBit -ContentType 'application/json'
    Write-Host "Success! Created bit: $($created.name) (ID: $($created.id))" -ForegroundColor Green
    Write-Host "Route: $($created.route)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nAll tests complete!" -ForegroundColor Green
