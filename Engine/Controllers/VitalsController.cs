using Microsoft.AspNetCore.Mvc;
using Engine.Models;
using Infrastructure;
using HttpPostAttribute = Engine.Attributes.HttpPostAttribute;
using RouteAttribute = Engine.Attributes.RouteAttribute;
using EnableCorsAttribute = Engine.Attributes.EnableCorsAttribute;

namespace Engine.Controllers;

[Route("/hr")]
[EnableCors]
public class VitalsController : BaseController
{
    [HttpPost]
    public IActionResult PostHeartRate([FromQuery] HeartRateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponse { Error = "Invalid or missing 'bpm' parameter" });
        }

        var timestamp = DateTime.UtcNow;
        VitalsService.Instance.AddHeartRateSample(request.Bpm, timestamp);

        LogInformation("Heart rate update received: {Bpm} BPM at {Timestamp}", request.Bpm, timestamp);

        return Ok(new HeartRateResponse
        {
            Success = true,
            Bpm = request.Bpm,
            Timestamp = timestamp
        });
    }
}
