using System;
using System.Collections.Generic;
using System.Linq.Expressions;

namespace StreamCraft.Core.Events.EventRules;

public interface IEventFieldSelectorProvider<TEvent> where TEvent : notnull
{
    bool TryGetSelector(EventFieldId fieldId, out LambdaExpression selector);
}

public interface ITriggerExpressionBuilder
{
    Expression<Func<TEvent, bool>> Build<TEvent>(
        IReadOnlyList<RuleCondition> conditions,
        RuleMatchMode matchMode,
        IEventFieldSelectorProvider<TEvent> selectorProvider)
        where TEvent : notnull;

    Func<TEvent, bool> Compile<TEvent>(
        IReadOnlyList<RuleCondition> conditions,
        RuleMatchMode matchMode,
        IEventFieldSelectorProvider<TEvent> selectorProvider)
        where TEvent : notnull;
}
