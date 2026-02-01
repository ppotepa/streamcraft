namespace Core.Designer.Layouts;

public sealed class OverlayLayoutSummary
{
    public OverlayLayoutSummary(string layoutId, string name, DateTime updatedAtUtc)
    {
        LayoutId = layoutId;
        Name = name;
        UpdatedAtUtc = updatedAtUtc;
    }

    public string LayoutId { get; }
    public string Name { get; }
    public DateTime UpdatedAtUtc { get; }
}
