using System;
using System.Globalization;
using System.Text.Json;

namespace StreamCraft.Core.Events.EventRules;

public static class JsonPayloadHelpers
{
    public static bool TryConvertToJsonElement(object? payload, out JsonElement element)
    {
        if (payload is null)
        {
            using var doc = JsonDocument.Parse("null");
            element = doc.RootElement.Clone();
            return true;
        }

        if (payload is JsonElement json)
        {
            element = json.Clone();
            return true;
        }

        if (payload is string str)
        {
            try
            {
                using var doc = JsonDocument.Parse(str);
                element = doc.RootElement.Clone();
                return true;
            }
            catch
            {
                try
                {
                    using var fallback = JsonDocument.Parse(JsonSerializer.Serialize(new { value = str }));
                    element = fallback.RootElement.Clone();
                    return true;
                }
                catch
                {
                    element = default;
                    return false;
                }
            }
        }

        try
        {
            var serialized = JsonSerializer.Serialize(payload, payload.GetType());
            using var doc = JsonDocument.Parse(serialized);
            element = doc.RootElement.Clone();
            return true;
        }
        catch
        {
            element = default;
            return false;
        }
    }

    public static bool TryResolve(JsonElement element, string path, out JsonElement value)
    {
        var current = element;
        var segments = path.Split('.', StringSplitOptions.RemoveEmptyEntries);
        foreach (var rawSegment in segments)
        {
            if (!TryResolveSegment(current, rawSegment, out var next) || next is null)
            {
                value = default;
                return false;
            }

            current = next.Value;
        }

        value = current;
        return true;
    }

    public static object? ToScalarValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var l)
                ? l
                : element.TryGetDouble(out var d)
                    ? d
                    : element.ToString(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.ToString()
        };
    }

    private static bool TryResolveSegment(JsonElement element, string segment, out JsonElement? value)
    {
        value = null;
        if (segment.Length == 0)
        {
            return false;
        }

        if (segment[0] == '[')
        {
            if (!TryResolveArray(element, segment, out var result))
            {
                return false;
            }

            value = result;
            return true;
        }

        var propertyName = segment;
        var indexStart = segment.IndexOf('[');
        if (indexStart >= 0)
        {
            propertyName = segment[..indexStart];
        }

        if (!element.TryGetProperty(propertyName, out var property))
        {
            return false;
        }

        if (indexStart >= 0)
        {
            var arraySegment = segment[indexStart..];
            return TryResolveArray(property, arraySegment, out value);
        }

        value = property;
        return true;
    }

    private static bool TryResolveArray(JsonElement element, string segment, out JsonElement? value)
    {
        value = null;
        if (element.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        if (segment.Length < 3 || segment[0] != '[' || !segment.EndsWith(']'))
        {
            return false;
        }

        var indexText = segment[1..^1];
        if (!int.TryParse(indexText, NumberStyles.Integer, CultureInfo.InvariantCulture, out var index))
        {
            return false;
        }

        if (index < 0 || index >= element.GetArrayLength())
        {
            return false;
        }

        value = element[index];
        return true;
    }
}

