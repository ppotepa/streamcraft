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

    [Route("/sc2exp")]
    [HttpGet]
    public IActionResult GetSc2Exp()
    {
        var expIndexPath = Path.Combine(AppContext.BaseDirectory, "bits", "Sc2", "sc2exp", "index.html");
        if (!System.IO.File.Exists(expIndexPath))
        {
            return NotFound($"sc2exp index.html not found. Checked: {expIndexPath}");
        }

        return PhysicalFile(expIndexPath, "text/html");
    }

    [Route("/sc2hr")]
    [HttpGet]
    public IActionResult GetSc2Hr()
    {
        var hrIndexPath = Path.Combine(AppContext.BaseDirectory, "bits", "Sc2", "sc2hr", "index.html");
        if (!System.IO.File.Exists(hrIndexPath))
        {
            return NotFound($"sc2hr index.html not found. Checked: {hrIndexPath}");
        }

        return PhysicalFile(hrIndexPath, "text/html");
    }

    [Route("/sc2/ui/screens")]
    [HttpGet]
    public IActionResult GetSc2Screens()
    {
        var screensPath = Path.Combine(AppContext.BaseDirectory, "bits", "Sc2", "ui", "dist", "screens.html");
        if (!System.IO.File.Exists(screensPath))
        {
            return NotFound($"screens.html not found. Checked: {screensPath}");
        }

        return PhysicalFile(screensPath, "text/html");
    }

    [Route("/")]
    [HttpGet]
    public IActionResult GetRoot()
    {
        return Redirect("/sc2/ui/screens");
    }
}
