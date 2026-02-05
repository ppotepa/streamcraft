using System.Reflection;
using System.Text;

namespace StreamCraft.Core.DataSources;

public sealed record DataSourceCategoryInfo(
    string CategoryId,
    string CategoryLabel,
    string? SubcategoryId,
    string? SubcategoryLabel);

public static class DataSourceCategoryResolver
{
    public static DataSourceCategoryInfo Resolve(IDataSource source)
    {
        var info = ResolveInternal(source);
        return info;
    }

    public static void Validate(IDataSource source)
    {
        ResolveInternal(source);
    }

    private static DataSourceCategoryInfo ResolveInternal(IDataSource source)
    {
        if (source == null)
        {
            throw new InvalidOperationException("Data source cannot be null.");
        }

        var type = source.GetType();
        var implemented = type.GetInterfaces()
            .Where(i => i != typeof(IDataSource))
            .ToArray();

        var categoryInterfaces = implemented
            .Where(i => typeof(IDataSource).IsAssignableFrom(i))
            .Where(i => i.GetCustomAttribute<DataSourceCategoryAttribute>() != null)
            .ToList();

        var derivedCategoryInterfaces = implemented
            .Where(i => categoryInterfaces.Any(ci => ci != i && ci.IsAssignableFrom(i)))
            .ToList();

        if (derivedCategoryInterfaces.Count > 0)
        {
            var names = string.Join(", ", derivedCategoryInterfaces.Select(i => i.Name));
            throw new InvalidOperationException(
                $"Data source '{type.Name}' uses a derived category interface ({names}). " +
                "Only one level of IDataSource category interfaces is allowed.");
        }

        if (categoryInterfaces.Count == 0)
        {
            throw new InvalidOperationException(
                $"Data source '{type.Name}' does not implement a category interface with [Category] attribute.");
        }

        if (categoryInterfaces.Count > 1)
        {
            var names = string.Join(", ", categoryInterfaces.Select(i => i.Name));
            throw new InvalidOperationException(
                $"Data source '{type.Name}' implements multiple category interfaces ({names}). Only one is allowed.");
        }

        var categoryInterface = categoryInterfaces[0];
        var categoryAttribute = categoryInterface.GetCustomAttribute<DataSourceCategoryAttribute>();
        var categoryId = ToKebabCase(StripInterfaceName(categoryInterface.Name));
        var categoryLabel = categoryAttribute?.Label ?? ToTitleCase(categoryId);

        var subCategoryAttribute = type.GetCustomAttribute<DataSourceCategoryAttribute>(inherit: false);
        var subcategoryLabel = subCategoryAttribute?.Label;
        var subcategoryId = !string.IsNullOrWhiteSpace(subcategoryLabel)
            ? ToKebabCase(subcategoryLabel)
            : source.CategoryId;

        return new DataSourceCategoryInfo(categoryId, categoryLabel, subcategoryId, subcategoryLabel);
    }

    private static string StripInterfaceName(string name)
    {
        var trimmed = name;
        if (trimmed.StartsWith("I", StringComparison.Ordinal) && trimmed.Length > 1)
        {
            trimmed = trimmed[1..];
        }
        if (trimmed.EndsWith("DataSource", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[..^"DataSource".Length];
        }
        return trimmed;
    }

    private static string ToKebabCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var builder = new StringBuilder();
        var prevWasDash = false;

        foreach (var ch in value.Trim())
        {
            if (char.IsLetterOrDigit(ch))
            {
                if (char.IsUpper(ch) && builder.Length > 0 && !prevWasDash)
                {
                    builder.Append('-');
                }
                builder.Append(char.ToLowerInvariant(ch));
                prevWasDash = false;
            }
            else
            {
                if (!prevWasDash && builder.Length > 0)
                {
                    builder.Append('-');
                    prevWasDash = true;
                }
            }
        }

        return builder.ToString().Trim('-');
    }

    private static string ToTitleCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return value;
        var parts = value.Split('-', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" ", parts.Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
    }
}




