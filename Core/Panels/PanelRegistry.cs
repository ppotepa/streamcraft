namespace Core.Panels;

public interface IPanelRegistry
{
    void RegisterPanel(IPanel panel);
    IPanel? GetPanel(string panelId);
    IReadOnlyList<IPanel> GetAllPanels();
    object GetCompositeSnapshot();
}

public class PanelRegistry : IPanelRegistry
{
    private readonly Dictionary<string, IPanel> _panels = new(StringComparer.OrdinalIgnoreCase);

    public void RegisterPanel(IPanel panel)
    {
        _panels[panel.Id] = panel;
    }

    public IPanel? GetPanel(string panelId)
    {
        _panels.TryGetValue(panelId, out var panel);
        return panel;
    }

    public IReadOnlyList<IPanel> GetAllPanels()
    {
        return _panels.Values.ToList();
    }

    public object GetCompositeSnapshot()
    {
        var panels = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        foreach (var panel in _panels.Values)
        {
            panels[panel.Id] = panel.GetStateSnapshot();
        }

        return panels;
    }
}
