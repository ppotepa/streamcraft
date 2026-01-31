using Core.Bits;
using Core.Bits.Templates;
using Core.Diagnostics;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace Engine.Templates;

/// <summary>
/// Template for creating API explorer/browser bits
/// Allows users to query external APIs and display results
/// </summary>
public class ApiExplorerTemplate : IBitTemplate
{
    public string TemplateId => "api-explorer";
    public string TemplateName => "API Explorer";
    public string TemplateDescription => "Browse and query external REST APIs with automatic JSON formatting";
    public string Category => "API";
    public string Icon => "🌐";

    public IReadOnlyList<BitConfigurationSection> GetConfigurationSchema()
    {
        return new[]
        {
            new BitConfigurationSection(
                id: "api",
                title: "API Configuration",
                description: "Configure the external API to query",
                fields: new[]
                {
                    new BitConfigurationField(
                        key: "ApiUrl",
                        label: "API Base URL",
                        type: "url",
                        description: "The base URL of the API to explore",
                        placeholder: "https://api.example.com",
                        required: true
                    ),
                    new BitConfigurationField(
                        key: "ApiKey",
                        label: "API Key (Optional)",
                        type: "password",
                        description: "Authentication key if required",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "AuthHeader",
                        label: "Auth Header Name",
                        type: "text",
                        description: "Header name for API key (e.g., 'X-API-Key', 'Authorization')",
                        defaultValue: "X-API-Key",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "RefreshInterval",
                        label: "Auto-refresh Interval (seconds)",
                        type: "number",
                        description: "How often to refresh data (0 = manual only)",
                        defaultValue: "0",
                        required: false
                    )
                })
        };
    }

    public IBit CreateBit(BitDefinition definition)
    {
        var validation = Validate(definition);
        if (!validation.IsValid)
        {
            throw ExceptionFactory.InvalidOperation($"Invalid bit definition: {string.Join(", ", validation.Errors)}");
        }

        return new DynamicBit(
            definition,
            this,
            HandleApiRequestAsync,
            HandleApiUIAsync
        );
    }

    public ValidationResult Validate(BitDefinition definition)
    {
        var errors = new List<string>();

        if (!definition.Configuration.TryGetValue("ApiUrl", out var apiUrlObj) ||
            string.IsNullOrWhiteSpace(apiUrlObj?.ToString()))
        {
            errors.Add("ApiUrl is required");
        }
        else if (!Uri.TryCreate(apiUrlObj.ToString(), UriKind.Absolute, out _))
        {
            errors.Add("ApiUrl must be a valid URL");
        }

        if (string.IsNullOrWhiteSpace(definition.Route))
        {
            errors.Add("Route is required");
        }

        return errors.Count > 0
            ? ValidationResult.Failure(errors.ToArray())
            : ValidationResult.Success();
    }

    private async Task HandleApiRequestAsync(HttpContext httpContext, BitDefinition definition, IBitContext? context)
    {
        var apiUrl = definition.Configuration["ApiUrl"]?.ToString() ?? "";
        var apiKey = definition.Configuration.GetValueOrDefault("ApiKey")?.ToString();
        var authHeader = definition.Configuration.GetValueOrDefault("AuthHeader")?.ToString() ?? "X-API-Key";

        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                client.DefaultRequestHeaders.Add(authHeader, apiKey);
            }

            var response = await client.GetAsync(apiUrl);
            var content = await response.Content.ReadAsStringAsync();

            // Try to parse as JSON for pretty formatting
            object? jsonData = null;
            try
            {
                jsonData = JsonSerializer.Deserialize<object>(content);
            }
            catch
            {
                // Not JSON, return as-is
            }

            var result = new
            {
                success = response.IsSuccessStatusCode,
                statusCode = (int)response.StatusCode,
                timestamp = DateTime.UtcNow,
                apiUrl = apiUrl,
                data = jsonData ?? content,
                headers = response.Headers.ToDictionary(h => h.Key, h => h.Value.FirstOrDefault())
            };

            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(
                JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true })
            );
        }
        catch (Exception ex)
        {
            httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                success = false,
                error = ex.Message,
                apiUrl = apiUrl,
                timestamp = DateTime.UtcNow
            });
        }
    }

    private async Task HandleApiUIAsync(HttpContext httpContext, BitDefinition definition, IBitContext? context)
    {
        var apiUrl = definition.Configuration["ApiUrl"]?.ToString() ?? "";
        var refreshInterval = definition.Configuration.GetValueOrDefault("RefreshInterval")?.ToString() ?? "0";

        httpContext.Response.ContentType = "text/html";
        await httpContext.Response.WriteAsync($@"
<!DOCTYPE html>
<html>
<head>
    <title>{definition.Name} - API Explorer</title>
    <style>
        body {{ font-family: 'Courier New', monospace; margin: 0; padding: 20px; background: #0d1117; color: #c9d1d9; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #58a6ff; }}
        .endpoint {{ background: #161b22; padding: 15px; border-radius: 6px; border: 1px solid #30363d; margin-bottom: 20px; }}
        .response {{ background: #0d1117; padding: 15px; border-radius: 6px; border: 1px solid #30363d; white-space: pre-wrap; font-size: 12px; max-height: 600px; overflow: auto; }}
        button {{ background: #238636; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }}
        button:hover {{ background: #2ea043; }}
        .status {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
        .status.success {{ background: #238636; color: white; }}
        .status.error {{ background: #da3633; color: white; }}
    </style>
</head>
<body>
    <div class='container'>
        <h1>🌐 {definition.Name}</h1>
        <div class='endpoint'>
            <p><strong>API Endpoint:</strong> <code>{apiUrl}</code></p>
            <button onclick='fetchData()'>Refresh Data</button>
            <span id='status'></span>
        </div>
        <div class='response' id='response'>Click 'Refresh Data' to fetch API response...</div>
    </div>
    <script>
        const refreshInterval = {refreshInterval};
        
        async function fetchData() {{
            const statusEl = document.getElementById('status');
            const responseEl = document.getElementById('response');
            
            statusEl.innerHTML = '<span class=""status"">Loading...</span>';
            
            try {{
                const response = await fetch('{definition.Route}');
                const data = await response.json();
                
                responseEl.textContent = JSON.stringify(data, null, 2);
                statusEl.innerHTML = `<span class=""status success"">✓ ${{data.statusCode}}</span>`;
            }} catch (error) {{
                responseEl.textContent = 'Error: ' + error.message;
                statusEl.innerHTML = '<span class=""status error"">✗ Error</span>';
            }}
        }}
        
        // Auto-refresh if configured
        if (refreshInterval > 0) {{
            setInterval(fetchData, refreshInterval * 1000);
            fetchData(); // Initial load
        }}
    </script>
</body>
</html>");
    }
}
