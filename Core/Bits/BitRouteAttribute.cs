using Core.Diagnostics;

namespace Core.Bits;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class BitRouteAttribute : Attribute
{
    public string Route { get; }

    public BitRouteAttribute(string route)
    {
        if (string.IsNullOrWhiteSpace(route))
        {
            throw ExceptionFactory.Argument("Route cannot be null or empty", nameof(route));
        }

        if (!route.StartsWith("/"))
        {
            throw ExceptionFactory.Argument("Route must start with '/'", nameof(route));
        }

        Route = route;
    }
}
