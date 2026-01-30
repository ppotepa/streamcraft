using Core.State;

namespace Bits.Plugins;

internal static class PluginsBitStateStore
{
    public static IBitStateStore<PluginsBitState> Create()
    {
        return new BitStateStore<PluginsBitState>(
            new PluginsBitState(),
            state => new PluginsBitState
            {
                RequestCount = state.RequestCount
            });
    }
}
