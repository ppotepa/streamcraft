namespace Core.Bits;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class BitRouteAttribute : Attribute
{
    public string Route { get; }

    public BitRouteAttribute(string route)
    {
        if (string.IsNullOrWhiteSpace(route))
        {
            throw new ArgumentException("Route cannot be null or empty", nameof(route));
        }

        if (!route.StartsWith("/"))
        {
            throw new ArgumentException("Route must start with '/'", nameof(route));
        }

        Route = route;
    }
}