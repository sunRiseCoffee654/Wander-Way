import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("resolves conflicting Tailwind utilities in favour of the last value", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });

  it("keeps conditional and non-conflicting classes", () => {
    expect(cn("text-sm", false && "hidden", "font-semibold")).toBe(
      "text-sm font-semibold",
    );
  });
});
