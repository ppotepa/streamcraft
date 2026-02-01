import { describe, expect, it, beforeEach } from "vitest";
import { xmlToFormNode } from "../xmlView";
import { clearDiagnostics, getDiagnostics } from "../core/diagnostics";

describe("xml view parser", () => {
    beforeEach(() => {
        clearDiagnostics();
    });

    it("parses a simple view tree", () => {
        const node = xmlToFormNode(`<?xml version="1.0"?>
<Form>
  <Window title="Test">
    <Text>Hello</Text>
  </Window>
</Form>`);

        expect(node.type).toBe("window");
        expect(node.props?.title).toBe("Test");
        expect(node.children?.length).toBe(1);
    });

    it("coerces JSON values", () => {
        const node = xmlToFormNode(`<?xml version="1.0"?>
<Form>
  <ListBox items='["A","B"]' />
</Form>`);
        expect(node.props?.items).toEqual(["A", "B"]);
    });

    it("adds diagnostics on unknown tags", () => {
        xmlToFormNode(`<?xml version="1.0"?>
<Form>
  <UnknownWidget />
</Form>`);
        const diagnostics = getDiagnostics();
        expect(diagnostics.some((entry) => entry.message.includes("Unknown XML control tag"))).toBe(true);
    });
});