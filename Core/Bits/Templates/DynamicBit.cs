using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace Core.Bits.Templates;

/// <summary>
/// A bit instance created from a template and user configuration
/// Dynamically executes behavior based on template logic
/// </summary>
public class DynamicBit : IBit
{
    private readonly BitDefinition _definition;
    private readonly IBitTemplate _template;
    private readonly Func<HttpContext, BitDefinition, IBitContext?, Task> _handleRequestAsync;
    private readonly Func<HttpContext, BitDefinition, IBitContext?, Task>? _handleUIAsync;

    protected IBitContext? Context { get; private set; }

    public DynamicBit(
        BitDefinition definition,
        IBitTemplate template,
        Func<HttpContext, BitDefinition, IBitContext?, Task> handleRequestAsync,
        Func<HttpContext, BitDefinition, IBitContext?, Task>? handleUIAsync = null)
    {
        _definition = definition;
        _template = template;
        _handleRequestAsync = handleRequestAsync;
        _handleUIAsync = handleUIAsync;
    }

    public string Route => _definition.Route;
    public string Name => _definition.Name;
    public string Description => _definition.Description;
    public bool HasUserInterface => _definition.HasUserInterface;

    public BitDefinition Definition => _definition;
    public string TemplateId => _definition.TemplateId;

    public async Task HandleAsync(HttpContext httpContext)
    {
        if (!_definition.IsEnabled)
        {
            httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                error = "Bit is disabled",
                bitName = Name
            });
            return;
        }

        await _handleRequestAsync(httpContext, _definition, Context);
    }

    public async Task HandleUIAsync(HttpContext httpContext)
    {
        if (_handleUIAsync != null)
        {
            await _handleUIAsync(httpContext, _definition, Context);
        }
        else
        {
            httpContext.Response.ContentType = "text/html";
            await httpContext.Response.WriteAsync($@"
<!DOCTYPE html>
<html>
<head>
    <title>{Name}</title>
    <style>
        body {{ font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #1a1a1a; color: #e0e0e0; }}
        .container {{ max-width: 800px; margin: 0 auto; }}
        h1 {{ color: #4fc3f7; }}
        .info {{ background: #2d2d2d; padding: 20px; border-radius: 8px; border-left: 4px solid #4fc3f7; }}
        .metadata {{ margin-top: 20px; opacity: 0.7; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class='container'>
        <h1>{Name}</h1>
        <div class='info'>
            <p><strong>Description:</strong> {Description}</p>
            <p><strong>Route:</strong> <code>{Route}</code></p>
            <p><strong>Template:</strong> {_template.TemplateName}</p>
            <div class='metadata'>
                <p>Created from template • Dynamic Bit</p>
            </div>
        </div>
    </div>
</body>
</html>");
        }
    }

    public void Initialize(IBitContext context)
    {
        Context = context;
    }
}
