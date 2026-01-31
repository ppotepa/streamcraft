using Bits.Sc2.Messages;

namespace Bits.Sc2.Application.Services;

public interface IToolStatePublisher
{
    void Publish(Sc2ToolState state);
}
