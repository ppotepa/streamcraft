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
}
