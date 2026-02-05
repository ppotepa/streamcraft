namespace StreamCraft.Core.Designer.Layouts;

public interface IOverlayLayoutStore
{
    Task<OverlayLayoutDefinition?> GetAsync(string layoutId, CancellationToken ct);
    Task SaveAsync(OverlayLayoutDefinition layout, CancellationToken ct);
    Task<IReadOnlyList<OverlayLayoutSummary>> ListAsync(CancellationToken ct);
    Task<bool> DeleteAsync(string layoutId, CancellationToken ct);
}



