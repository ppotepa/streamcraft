namespace Engine.Models;

public class HeartRateResponse
{
    public bool Success { get; set; }
    public int Bpm { get; set; }
    public DateTime Timestamp { get; set; }
}
