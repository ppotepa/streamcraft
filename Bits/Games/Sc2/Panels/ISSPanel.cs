using Bits.Sc2.Messages;
using Core.Panels;

namespace Bits.Sc2.Panels;

public class ISSPanelState
{
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string Location { get; set; } = "Loading...";
    public int CrewCount { get; set; }
    public string Altitude { get; set; } = "~408 km";
    public long LastPositionUpdate { get; set; }
    public long LastCrewUpdate { get; set; }
}

public class ISSPanel : Panel<ISSPanelState>
{
    public override string Type => "variousPanel";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<ISSPositionData>(Sc2MessageType.ISSPositionUpdated, OnISSPositionUpdated);
        MessageBus.Subscribe<ISSCrewData>(Sc2MessageType.ISSCrewUpdated, OnISSCrewUpdated);
    }

    private void OnISSPositionUpdated(ISSPositionData data)
    {
        lock (StateLock)
        {
            State.Latitude = data.Latitude;
            State.Longitude = data.Longitude;
            State.Location = data.Location;
            State.LastPositionUpdate = data.Timestamp;
            UpdateLastModified();
        }
    }

    private void OnISSCrewUpdated(ISSCrewData data)
    {
        lock (StateLock)
        {
            State.CrewCount = data.CrewCount;
            State.LastCrewUpdate = data.Timestamp;
            UpdateLastModified();
        }
    }

    public override object GetStateSnapshot()
    {
        lock (StateLock)
        {
            return new
            {
                latitude = State.Latitude,
                longitude = State.Longitude,
                location = State.Location,
                crewCount = State.CrewCount,
                altitude = State.Altitude,
                lastPositionUpdate = State.LastPositionUpdate,
                lastCrewUpdate = State.LastCrewUpdate
            };
        }
    }
}
