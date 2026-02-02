namespace Core.Designer;

[AttributeUsage(AttributeTargets.Interface | AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public sealed class DataSourceCategoryAttribute : Attribute
{
    public DataSourceCategoryAttribute(string label)
    {
        Label = label ?? string.Empty;
    }

    public string Label { get; }
}
