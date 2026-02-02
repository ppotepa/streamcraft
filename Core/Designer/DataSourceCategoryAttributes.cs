namespace Core.Designer;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public sealed class CategoryAttribute : Attribute
{
    public CategoryAttribute(string id)
    {
        Id = id ?? string.Empty;
    }

    public string Id { get; }
}

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public sealed class SubCategoryAttribute : Attribute
{
    public SubCategoryAttribute(string id)
    {
        Id = id ?? string.Empty;
    }

    public string Id { get; }
}
