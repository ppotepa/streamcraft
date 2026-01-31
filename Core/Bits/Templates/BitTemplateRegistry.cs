using Core.Diagnostics;

namespace Core.Bits.Templates;

/// <summary>
/// Registry for managing available bit templates
/// </summary>
public class BitTemplateRegistry
{
    private readonly Dictionary<string, IBitTemplate> _templates = new();

    public void RegisterTemplate(IBitTemplate template)
    {
        if (_templates.ContainsKey(template.TemplateId))
        {
            throw ExceptionFactory.InvalidOperation($"Template with ID '{template.TemplateId}' is already registered");
        }

        _templates[template.TemplateId] = template;
    }

    public IBitTemplate? GetTemplate(string templateId)
    {
        _templates.TryGetValue(templateId, out var template);
        return template;
    }

    public IReadOnlyList<IBitTemplate> GetAllTemplates()
    {
        return _templates.Values.ToList();
    }

    public IReadOnlyList<IBitTemplate> GetTemplatesByCategory(string category)
    {
        return _templates.Values
            .Where(t => t.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    public IReadOnlyList<string> GetCategories()
    {
        return _templates.Values
            .Select(t => t.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToList();
    }
}
