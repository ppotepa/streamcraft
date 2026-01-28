using System.ComponentModel.DataAnnotations;

namespace Engine.Models;

public class HeartRateRequest
{
    [Required]
    [Range(30, 250, ErrorMessage = "BPM must be between 30 and 250")]
    public int Bpm { get; set; }
}
