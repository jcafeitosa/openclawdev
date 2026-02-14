import { describe, it, expect } from "vitest";
import { getRoleSpecificGuidance } from "./collaboration-prompts.js";

describe("Delegation Prompts Logic", () => {
  it("should include delegation protocol for CTO", () => {
    const guidance = getRoleSpecificGuidance("cto");
    expect(guidance).toContain("TASK DELEGATION PROTOCOL");
    expect(guidance).toContain("MAXIMUM 6 sub-tasks");
  });

  it("should include delegation protocol for Product Manager", () => {
    const guidance = getRoleSpecificGuidance("product-manager");
    expect(guidance).toContain("TASK DELEGATION PROTOCOL");
  });

  it("should include delegation protocol for Architects", () => {
    const guidance = getRoleSpecificGuidance("backend-architect");
    expect(guidance).toContain("TASK DELEGATION PROTOCOL");
  });

  it("should include delegation protocol for Leads", () => {
    // "frontend-lead" isn't in the specific map, so it falls to default + dynamic check
    const guidance = getRoleSpecificGuidance("frontend-lead");
    expect(guidance).toContain("TASK DELEGATION PROTOCOL");
    // Should still have default content
    expect(guidance).toContain("As a specialist");
  });

  it("should NOT include delegation protocol for UX Designer", () => {
    const guidance = getRoleSpecificGuidance("ux-designer");
    expect(guidance).not.toContain("TASK DELEGATION PROTOCOL");
  });

  it("should NOT include delegation protocol for generic workers", () => {
    const guidance = getRoleSpecificGuidance("junior-developer");
    expect(guidance).not.toContain("TASK DELEGATION PROTOCOL");
  });
});
