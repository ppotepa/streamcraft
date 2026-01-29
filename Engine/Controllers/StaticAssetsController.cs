using Microsoft.AspNetCore.Mvc;
using HttpGetAttribute = Engine.Attributes.HttpGetAttribute;
using RouteAttribute = Engine.Attributes.RouteAttribute;

namespace Engine.Controllers;

public class StaticAssetsController : BaseController
{
    [Route("/styles")]
    [HttpGet]
    public IActionResult GetStyles()
    {
        var themesPath = Path.Combine(AppContext.BaseDirectory, "themes.html");
        if (!System.IO.File.Exists(themesPath))
        {
            return NotFound("themes.html not found.");
        }

        return PhysicalFile(themesPath, "text/html");
    }

    [Route("/")]
    [HttpGet]
    public IActionResult GetRoot()
    {
        // Return simple landing page or redirect to bit UI builder in the future
        return Content("StreamCraft Engine - Bit routes available at /debug, /plugins, etc.", "text/plain");
    }
}
