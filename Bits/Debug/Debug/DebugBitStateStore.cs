using Core.State;

namespace StreamCraft.Bits.Debug;

internal static class DebugBitStateStore
{
    public static IBitStateStore<DebugBitState> Create()
    {
        return new BitStateStore<DebugBitState>(
            new DebugBitState(),
            state => new DebugBitState
            {
                RequestCount = state.RequestCount
            });
    }
}
