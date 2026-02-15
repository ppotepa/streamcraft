import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";
import { buildEffectPreviewConfiguration, renderTriggerEffectPreview } from "./TriggerEffectPreview";

type TriggersTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

export const renderTriggersTab = ({ item, ctx }: TriggersTabProps) => {
    const rules = Array.isArray(item.triggerRules) ? item.triggerRules : [];
    const selectedRuleId = ctx.triggersService.getSelectedRuleId(item.id);
    const selectedRule = rules.find((rule) => rule.ruleId === selectedRuleId) ?? rules[0] ?? null;
    const selectedTemplate = selectedRule
        ? (ctx.triggersService.effectTemplates.find((entry) => entry.templateId === selectedRule.effectTemplateId) ?? null)
        : null;

    const configuration = buildEffectPreviewConfiguration(
        selectedTemplate,
        selectedRule
            ? { key: selectedRule.effectPayloadKey, value: selectedRule.effectPayloadValue }
            : null
    );

    return WF.Element("div", { className: "context-triggers-layout" },
        WF.Element("div", { className: "context-triggers-left context-window-section" },
            WF.Element(
                "div",
                { className: "context-window-note" },
                `Templates: ${ctx.triggersService.triggerTemplates.length} trigger(s), ${ctx.triggersService.effectTemplates.length} effect(s), ${ctx.triggersService.eventSources.length} source type(s).`
            ),
            item.sourceId
                ? WF.Element("div", { className: "canvas-properties-readonly" }, `Source: ${item.sourceId}`)
                : WF.Element("div", { className: "context-window-note" }, "Bind a data source first. sourceId is required."),
            rules.length > 0
                ? WF.Element("div", { className: "context-window-list" },
                    ...rules.map((rule) =>
                        WF.Element("button", {
                            key: `ctx-rule-${rule.ruleId}`,
                            className: `button context-triggers-rule-btn ${selectedRule?.ruleId === rule.ruleId ? "is-active" : ""}`.trim(),
                            onClick: () => ctx.triggersService.selectRule(item.id, rule.ruleId)
                        },
                        `${rule.triggerTemplateName} -> ${rule.effectTemplateName}`
                        )
                    ))
                : WF.Element("div", { className: "context-window-note" }, "No trigger rules assigned."),
            WF.Row(
                { Style: "justify-content: flex-end; gap: 8px;" },
                WF.Element("button", {
                    className: "button",
                    onClick: () => ctx.effectsCatalog.open(item.id)
                }, "Browse Effects"),
                WF.Element("button", {
                    className: "button",
                    disabled: !item.sourceId,
                    onClick: () => ctx.triggersService.openBuilder(item.id)
                }, "Open Advanced Builder")
            )
        ),
        WF.Element("div", { className: "context-triggers-right" },
            renderTriggerEffectPreview({
                header: "Effect Preview",
                title: selectedTemplate?.displayName ?? "No effect selected",
                subtitle: selectedTemplate
                    ? `${selectedTemplate.effectFactoryTypeName}${selectedRule ? ` · Rule: ${selectedRule.triggerTemplateName}` : ""}`
                    : null,
                status: selectedRule ? `Rule id: ${selectedRule.ruleId}` : "Create a rule to preview effect payload.",
                configuration,
                emptyNote: "Select rule to preview selected effect."
            })
        )
    );
};
