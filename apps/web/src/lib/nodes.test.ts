import { describe, expect, test } from "vitest";
import { createNode, isTextLikeType } from "@/lib/nodes";

describe("node factory", () => {
  test("create text node with default props", () => {
    const node = createNode("text");
    expect(node.type).toBe("text");
    expect(node.props.content).toBeTruthy();
  });

  test("text like helper", () => {
    expect(isTextLikeType("button")).toBe(true);
    expect(isTextLikeType("table")).toBe(false);
  });
});
