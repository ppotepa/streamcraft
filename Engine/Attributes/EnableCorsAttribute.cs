namespace Engine.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class EnableCorsAttribute : Attribute
{
    public string AllowOrigin { get; set; } = "*";
    public string AllowMethods { get; set; } = "GET, POST, OPTIONS";
    public string AllowHeaders { get; set; } = "Content-Type";
}
