namespace StreamCraft.Core.Events;

public interface IEventDiagnosticsSource
{
    EventDiagnosticsSnapshot GetSnapshot();
}
