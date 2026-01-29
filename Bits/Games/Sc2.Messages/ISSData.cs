namespace Bits.Sc2.Messages;

public class ISSPositionData
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public long Timestamp { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string Location { get; set; } = "Unknown";
}

public class ISSCrewData
{
    public int CrewCount { get; set; }
    public long Timestamp { get; set; }
}
