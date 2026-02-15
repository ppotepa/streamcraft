using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;

namespace StreamCraft.Core.Events.EventRules;

public sealed class TriggerExpressionBuilder : ITriggerExpressionBuilder
{
    private static readonly MethodInfo EvaluateMethod = typeof(TriggerExpressionBuilder)
        .GetMethod(nameof(EvaluateCondition), BindingFlags.Static | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException("EvaluateCondition method not found.");

    public Expression<Func<TEvent, bool>> Build<TEvent>(
        IReadOnlyList<RuleCondition> conditions,
        RuleMatchMode matchMode,
        IEventFieldSelectorProvider<TEvent> selectorProvider)
        where TEvent : notnull
    {
        ArgumentNullException.ThrowIfNull(conditions);
        ArgumentNullException.ThrowIfNull(selectorProvider);

        var eventParameter = Expression.Parameter(typeof(TEvent), "evt");
        var conditionExpressions = new List<Expression>(conditions.Count);

        foreach (var condition in conditions)
        {
            if (!selectorProvider.TryGetSelector(condition.FieldId, out var selector))
            {
                // Unknown field cannot match at runtime.
                conditionExpressions.Add(Expression.Constant(false));
                continue;
            }

            var selectorBody = ReplaceSelectorParameter<TEvent>(selector, eventParameter);
            var actualValueAsObject = Expression.Convert(selectorBody, typeof(object));
            var evaluateCall = Expression.Call(
                EvaluateMethod,
                actualValueAsObject,
                Expression.Constant(condition.Operator),
                Expression.Constant(condition.Value, typeof(string)));

            conditionExpressions.Add(evaluateCall);
        }

        if (conditionExpressions.Count == 0)
        {
            return Expression.Lambda<Func<TEvent, bool>>(Expression.Constant(true), eventParameter);
        }

        Expression combined = conditionExpressions[0];
        for (var i = 1; i < conditionExpressions.Count; i++)
        {
            combined = matchMode == RuleMatchMode.Any
                ? Expression.OrElse(combined, conditionExpressions[i])
                : Expression.AndAlso(combined, conditionExpressions[i]);
        }

        return Expression.Lambda<Func<TEvent, bool>>(combined, eventParameter);
    }

    public Func<TEvent, bool> Compile<TEvent>(
        IReadOnlyList<RuleCondition> conditions,
        RuleMatchMode matchMode,
        IEventFieldSelectorProvider<TEvent> selectorProvider)
        where TEvent : notnull
    {
        return Build(conditions, matchMode, selectorProvider).Compile();
    }

    private static Expression ReplaceSelectorParameter<TEvent>(LambdaExpression selector, ParameterExpression eventParameter)
        where TEvent : notnull
    {
        if (selector.Parameters.Count != 1)
        {
            throw new InvalidOperationException("Selector must contain exactly one parameter.");
        }

        var expectedType = selector.Parameters[0].Type;
        if (expectedType != typeof(TEvent))
        {
            throw new InvalidOperationException($"Selector parameter type mismatch. Expected '{typeof(TEvent).Name}', got '{expectedType.Name}'.");
        }

        return new SelectorParameterReplacer(selector.Parameters[0], eventParameter).Visit(selector.Body)
            ?? throw new InvalidOperationException("Failed to replace selector parameter.");
    }

    private static bool EvaluateCondition(object? actual, RuleOperator op, string? expected)
    {
        return op switch
        {
            RuleOperator.Equals => Equals(actual, expected),
            RuleOperator.NotEquals => !Equals(actual, expected),
            RuleOperator.Contains => Contains(actual, expected),
            RuleOperator.StartsWith => StartsWith(actual, expected),
            RuleOperator.EndsWith => EndsWith(actual, expected),
            RuleOperator.GreaterThan => CompareNumbers(actual, expected, static (a, b) => a > b),
            RuleOperator.GreaterOrEqual => CompareNumbers(actual, expected, static (a, b) => a >= b),
            RuleOperator.LessThan => CompareNumbers(actual, expected, static (a, b) => a < b),
            RuleOperator.LessOrEqual => CompareNumbers(actual, expected, static (a, b) => a <= b),
            RuleOperator.IsTrue => CompareBooleans(actual, true),
            RuleOperator.IsFalse => CompareBooleans(actual, false),
            RuleOperator.IsEmpty => IsEmpty(actual),
            RuleOperator.IsNotEmpty => !IsEmpty(actual),
            _ => false
        };
    }

    private static bool Equals(object? actual, string? expected)
    {
        var left = ToScalarString(actual);
        var right = expected ?? string.Empty;
        return string.Equals(left, right, StringComparison.OrdinalIgnoreCase);
    }

    private static bool Contains(object? actual, string? expected)
    {
        var left = ToScalarString(actual);
        if (string.IsNullOrWhiteSpace(expected))
        {
            return false;
        }

        return left.Contains(expected, StringComparison.OrdinalIgnoreCase);
    }

    private static bool StartsWith(object? actual, string? expected)
    {
        var left = ToScalarString(actual);
        if (string.IsNullOrWhiteSpace(expected))
        {
            return false;
        }

        return left.StartsWith(expected, StringComparison.OrdinalIgnoreCase);
    }

    private static bool EndsWith(object? actual, string? expected)
    {
        var left = ToScalarString(actual);
        if (string.IsNullOrWhiteSpace(expected))
        {
            return false;
        }

        return left.EndsWith(expected, StringComparison.OrdinalIgnoreCase);
    }

    private static bool CompareNumbers(object? actual, string? expected, Func<decimal, decimal, bool> comparator)
    {
        if (!TryToDecimal(actual, out var left))
        {
            return false;
        }

        if (!decimal.TryParse(expected, NumberStyles.Float, CultureInfo.InvariantCulture, out var right))
        {
            return false;
        }

        return comparator(left, right);
    }

    private static bool CompareBooleans(object? actual, bool expected)
    {
        if (actual is bool b)
        {
            return b == expected;
        }

        if (actual is string s && bool.TryParse(s, out var parsed))
        {
            return parsed == expected;
        }

        return false;
    }

    private static bool IsEmpty(object? actual)
    {
        return actual switch
        {
            null => true,
            string s => string.IsNullOrWhiteSpace(s),
            _ => string.IsNullOrWhiteSpace(ToScalarString(actual))
        };
    }

    private static string ToScalarString(object? value)
    {
        return value switch
        {
            null => string.Empty,
            string s => s,
            IFormattable f => f.ToString(null, CultureInfo.InvariantCulture) ?? string.Empty,
            _ => value.ToString() ?? string.Empty
        };
    }

    private static bool TryToDecimal(object? value, out decimal result)
    {
        switch (value)
        {
            case null:
                result = default;
                return false;
            case decimal d:
                result = d;
                return true;
            case double db:
                result = (decimal)db;
                return true;
            case float f:
                result = (decimal)f;
                return true;
            case int i:
                result = i;
                return true;
            case long l:
                result = l;
                return true;
            case string s when decimal.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed):
                result = parsed;
                return true;
            case IConvertible c:
                try
                {
                    result = c.ToDecimal(CultureInfo.InvariantCulture);
                    return true;
                }
                catch
                {
                    result = default;
                    return false;
                }
            default:
                result = default;
                return false;
        }
    }

    private sealed class SelectorParameterReplacer : ExpressionVisitor
    {
        private readonly ParameterExpression _from;
        private readonly ParameterExpression _to;

        public SelectorParameterReplacer(ParameterExpression from, ParameterExpression to)
        {
            _from = from;
            _to = to;
        }

        protected override Expression VisitParameter(ParameterExpression node)
        {
            return node == _from ? _to : base.VisitParameter(node);
        }
    }
}
