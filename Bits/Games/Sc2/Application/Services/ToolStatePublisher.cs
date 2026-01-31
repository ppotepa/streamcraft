using Bits.Sc2.Messages;
using Core.Messaging;

namespace Bits.Sc2.Application.Services;

public sealed class ToolStatePublisher : IToolStatePublisher
{
    private readonly IMessageBus _messageBus;
    private string? _lastState;

    public ToolStatePublisher(IMessageBus messageBus)
    {
        _messageBus = messageBus;
    }

    public void Publish(Sc2ToolState state)
    {
        var stateName = state.ToString();
        if (string.Equals(_lastState, stateName, StringComparison.Ordinal))
        {
            return;
        }

        _lastState = stateName;
        _messageBus.Publish(Sc2MessageType.ToolStateChanged, new ToolStateChanged(state));
    }
}
