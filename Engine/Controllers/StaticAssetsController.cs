using Microsoft.AspNetCore.Mvc;

namespace Engine.Controllers;

[ApiController]
[Route("")]
public class StaticAssetsController : ControllerBase
{
    [HttpGet("styles")]
    public IActionResult GetStyles()
    {
        var themesPath = Path.Combine(AppContext.BaseDirectory, "themes.html");
        if (!System.IO.File.Exists(themesPath))
        {
            return NotFound("themes.html not found.");
        }

        return PhysicalFile(themesPath, "text/html");
    }

    [HttpGet("")]
    public IActionResult GetRoot()
    {
        return Redirect("/ui/");
    }

    [HttpGet("ui")]
    [HttpGet("ui/")]
    public IActionResult GetUiRoot()
    {
        var uiPath = Path.Combine(AppContext.BaseDirectory, "static", "ui", "index.html");
        if (!System.IO.File.Exists(uiPath))
        {
            return NotFound("UI index.html not found.");
        }

        return PhysicalFile(uiPath, "text/html");
    }
}
