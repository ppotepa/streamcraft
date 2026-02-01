import { describe, expect, it } from "vitest";
import { parseStyleString, resolveStyle } from "../core/style";

describe("style helpers", () => {
    it("parses style strings into camelCase props", () => {
        const style = parseStyleString("background-color: red; font-size: 12px;");
        expect(style).toEqual({ backgroundColor: "red", fontSize: "12px" });
    });

    it("merges dock/anchor/layout with inline style", () => {
        const style = resolveStyle({
            dock: "top",
            layout: { gap: "6px" },
            style: "padding: 8px;"
        });
        expect(style?.position).toBe("absolute");
        expect(style?.top).toBe(0);
        expect(style?.gap).toBe("6px");
        expect(style?.padding).toBe("8px");
    });
});