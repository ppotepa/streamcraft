using Microsoft.AspNetCore.Http;
using System.Diagnostics;
using System.Text.Json;
using Core.Bits;
using Core.Bits.Templates;

namespace Engine.Templates;

/// <summary>
/// Template for system monitoring bits (CPU, memory, disk, etc.)
/// </summary>
public class SystemMonitorTemplate : IBitTemplate
{
    public string TemplateId => "system-monitor";
    public string TemplateName => "System Monitor";
    public string TemplateDescription => "Monitor system resources like CPU, memory, disk usage, and processes";
    public string Category => "System";
    public string Icon => "📊";

    public IReadOnlyList<BitConfigurationSection> GetConfigurationSchema()
    {
        return new[]
        {
            new BitConfigurationSection(
                id: "monitoring",
                title: "Monitoring Settings",
                description: "Configure what to monitor",
                fields: new[]
                {
                    new BitConfigurationField(
                        key: "MonitorCpu",
                        label: "Monitor CPU",
                        type: "checkbox",
                        defaultValue: "true",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "MonitorMemory",
                        label: "Monitor Memory",
                        type: "checkbox",
                        defaultValue: "true",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "MonitorDisk",
                        label: "Monitor Disk",
                        type: "checkbox",
                        defaultValue: "true",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "SampleInterval",
                        label: "Sample Interval (ms)",
                        type: "number",
                        description: "How often to sample system metrics",
                        defaultValue: "1000",
                        required: false
                    )
                })
        };
    }

    public IBit CreateBit(BitDefinition definition)
    {
        return new DynamicBit(
            definition,
            this,
            HandleSystemMonitorRequestAsync,
            HandleSystemMonitorUIAsync
        );
    }

    public ValidationResult Validate(BitDefinition definition)
    {
        return ValidationResult.Success();
    }

    private async Task HandleSystemMonitorRequestAsync(HttpContext httpContext, BitDefinition definition, IBitContext? context)
    {
        var monitorCpu = definition.Configuration.GetValueOrDefault("MonitorCpu")?.ToString()?.ToLower() == "true";
        var monitorMemory = definition.Configuration.GetValueOrDefault("MonitorMemory")?.ToString()?.ToLower() == "true";
        var monitorDisk = definition.Configuration.GetValueOrDefault("MonitorDisk")?.ToString()?.ToLower() == "true";

        var result = new Dictionary<string, object>
        {
            ["timestamp"] = DateTime.UtcNow,
            ["hostname"] = Environment.MachineName,
            ["osVersion"] = Environment.OSVersion.ToString()
        };

        if (monitorCpu)
        {
            using var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            cpuCounter.NextValue(); // First call always returns 0
            await Task.Delay(100);
            result["cpu"] = new
            {
                usagePercent = Math.Round(cpuCounter.NextValue(), 2),
                processorCount = Environment.ProcessorCount
            };
        }

        if (monitorMemory)
        {
            var process = Process.GetCurrentProcess();
            var totalMemory = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
            var usedMemory = process.WorkingSet64;

            result["memory"] = new
            {
                totalBytes = totalMemory,
                totalMB = Math.Round(totalMemory / 1024.0 / 1024.0, 2),
                usedBytes = usedMemory,
                usedMB = Math.Round(usedMemory / 1024.0 / 1024.0, 2),
                usagePercent = Math.Round((double)usedMemory / totalMemory * 100, 2)
            };
        }

        if (monitorDisk)
        {
            var drives = DriveInfo.GetDrives()
                .Where(d => d.IsReady)
                .Select(d => new
                {
                    name = d.Name,
                    type = d.DriveType.ToString(),
                    totalBytes = d.TotalSize,
                    totalGB = Math.Round(d.TotalSize / 1024.0 / 1024.0 / 1024.0, 2),
                    freeBytes = d.AvailableFreeSpace,
                    freeGB = Math.Round(d.AvailableFreeSpace / 1024.0 / 1024.0 / 1024.0, 2),
                    usagePercent = Math.Round((1 - (double)d.AvailableFreeSpace / d.TotalSize) * 100, 2)
                })
                .ToList();

            result["disks"] = drives;
        }

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(
            JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true })
        );
    }

    private async Task HandleSystemMonitorUIAsync(HttpContext httpContext, BitDefinition definition, IBitContext? context)
    {
        httpContext.Response.ContentType = "text/html";
        await httpContext.Response.WriteAsync($@"
<!DOCTYPE html>
<html>
<head>
    <title>{definition.Name} - System Monitor</title>
    <style>
        body {{ font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: #e0e0e0; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #4fc3f7; }}
        .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }}
        .metric {{ background: #2d2d2d; padding: 20px; border-radius: 8px; border-left: 4px solid #4fc3f7; }}
        .metric h3 {{ margin-top: 0; color: #4fc3f7; }}
        .value {{ font-size: 2em; font-weight: bold; color: #fff; }}
        .label {{ opacity: 0.7; font-size: 0.9em; }}
        .progress {{ background: #1a1a1a; height: 10px; border-radius: 5px; overflow: hidden; margin: 10px 0; }}
        .progress-bar {{ background: linear-gradient(90deg, #4fc3f7, #00e676); height: 100%; transition: width 0.3s; }}
    </style>
</head>
<body>
    <div class='container'>
        <h1>📊 {definition.Name}</h1>
        <div class='metrics' id='metrics'>Loading...</div>
    </div>
    <script>
        async function updateMetrics() {{
            try {{
                const response = await fetch('{definition.Route}');
                const data = await response.json();
                
                let html = '';
                
                if (data.cpu) {{
                    html += `
                        <div class='metric'>
                            <h3>CPU Usage</h3>
                            <div class='value'>${{data.cpu.usagePercent}}%</div>
                            <div class='progress'>
                                <div class='progress-bar' style='width: ${{data.cpu.usagePercent}}%'></div>
                            </div>
                            <div class='label'>${{data.cpu.processorCount}} processors</div>
                        </div>
                    `;
                }}
                
                if (data.memory) {{
                    html += `
                        <div class='metric'>
                            <h3>Memory Usage</h3>
                            <div class='value'>${{data.memory.usedMB}} MB</div>
                            <div class='progress'>
                                <div class='progress-bar' style='width: ${{data.memory.usagePercent}}%'></div>
                            </div>
                            <div class='label'>${{data.memory.totalMB}} MB total</div>
                        </div>
                    `;
                }}
                
                if (data.disks) {{
                    data.disks.forEach(disk => {{
                        html += `
                            <div class='metric'>
                                <h3>Disk: ${{disk.name}}</h3>
                                <div class='value'>${{disk.freeGB}} GB</div>
                                <div class='progress'>
                                    <div class='progress-bar' style='width: ${{disk.usagePercent}}%'></div>
                                </div>
                                <div class='label'>${{disk.totalGB}} GB total (${{disk.type}})</div>
                            </div>
                        `;
                    }});
                }}
                
                document.getElementById('metrics').innerHTML = html;
            }} catch (error) {{
                document.getElementById('metrics').innerHTML = '<div class=""metric"">Error: ' + error.message + '</div>';
            }}
        }}
        
        updateMetrics();
        setInterval(updateMetrics, 2000);
    </script>
</body>
</html>");
    }
}
