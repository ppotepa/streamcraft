namespace Core.Ui.Extensions;

public sealed record UiFormNode
{
    public string Type { get; init; } = "element";
    public Dictionary<string, object?>? Props { get; init; }
    public List<object?>? Children { get; init; }
}

public static class UiForm
{
    public static UiFormNode Node(string type, Dictionary<string, object?>? props = null, params object?[] children)
    {
        return new UiFormNode
        {
            Type = string.IsNullOrWhiteSpace(type) ? "element" : type,
            Props = props,
            Children = children?.Length > 0 ? children.ToList() : null
        };
    }

    public static UiFormNode Element(string tag, Dictionary<string, object?>? props = null, params object?[] children)
    {
        var nextProps = props != null
            ? new Dictionary<string, object?>(props)
            : new Dictionary<string, object?>();
        nextProps["tag"] = string.IsNullOrWhiteSpace(tag) ? "div" : tag;
        return Node("element", nextProps, children);
    }
}
