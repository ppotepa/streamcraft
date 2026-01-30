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
    private readonly object _lock = new();
    private readonly Dictionary<string, IPanel> _subscriptions = new(StringComparer.OrdinalIgnoreCase);

    public event Action<IPanel>? PanelUpdated;

    public void RegisterPanel(IPanel panel)
    {
        lock (_lock)
        {
            if (_subscriptions.TryGetValue(panel.Id, out var existing))
            {
                existing.StateUpdated -= HandlePanelUpdated;
                _subscriptions.Remove(panel.Id);
            }

            _panels[panel.Id] = panel;
            panel.StateUpdated += HandlePanelUpdated;
            _subscriptions[panel.Id] = panel;
        }
    }

    public IPanel? GetPanel(string panelId)
    {
        lock (_lock)
        {
            _panels.TryGetValue(panelId, out var panel);
            return panel;
        }
    }

    public IReadOnlyList<IPanel> GetAllPanels()
    {
        lock (_lock)
        {
            return _panels.Values.ToList();
        }
    }

    public object GetCompositeSnapshot()
    {
        lock (_lock)
        {
            var panels = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            foreach (var panel in _panels.Values)
            {
                panels[panel.Id] = panel.GetStateSnapshot();
            }

            return panels;
        }
    }

    private void HandlePanelUpdated(IPanel panel)
    {
        PanelUpdated?.Invoke(panel);
    }
}
