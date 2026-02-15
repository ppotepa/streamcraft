using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;

namespace StreamCraft.Core.Events.EventRules;

public sealed class JsonElementFieldSelectorProvider : IEventFieldSelectorProvider<JsonElement>
{
    private static readonly MethodInfo ResolveFieldValueMethod = typeof(JsonElementFieldSelectorProvider)
        .GetMethod(nameof(ResolveFieldValue), BindingFlags.Static | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException("ResolveFieldValue method not found.");

    private readonly IReadOnlyDictionary<EventFieldId, string> _fieldPaths;

    public JsonElementFieldSelectorProvider(IReadOnlyDictionary<EventFieldId, string> fieldPaths)
    {
        _fieldPaths = fieldPaths;
    }

    public bool TryGetSelector(EventFieldId fieldId, out LambdaExpression selector)
    {
        if (!_fieldPaths.TryGetValue(fieldId, out var path) || string.IsNullOrWhiteSpace(path))
        {
            selector = null!;
            return false;
        }

        var parameter = Expression.Parameter(typeof(JsonElement), "payload");
        var body = Expression.Call(
            ResolveFieldValueMethod,
            parameter,
            Expression.Constant(path));

        selector = Expression.Lambda<Func<JsonElement, object?>>(body, parameter);
        return true;
    }

    private static object? ResolveFieldValue(JsonElement payload, string path)
    {
        return JsonPayloadHelpers.TryResolve(payload, path, out var value)
            ? JsonPayloadHelpers.ToScalarValue(value)
            : null;
    }
}

