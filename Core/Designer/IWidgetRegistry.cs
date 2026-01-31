namespace Core.Designer;

public interface IWidgetRegistry
{
    IReadOnlyList<WidgetDefinition> GetAll();
    void Register(WidgetDefinition widget);
    void RegisterRange(IEnumerable<WidgetDefinition> widgets);
}
