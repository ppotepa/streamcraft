namespace Core.Bits;

/// <summary>
/// Indicates that a bit requires user configuration before it can be used.
/// If configuration is missing, requests will be redirected to the config page.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class RequiresConfigurationAttribute : Attribute
{
}
