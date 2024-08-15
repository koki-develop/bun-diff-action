import { describe, expect, test } from "vitest";
import { isBunActionComment } from "./bun-diff";

describe("isBunActionComment", () => {
  test.each([
    ["<!-- bun-diff-action: {} -->", true],
    ["<!-- bun-diff-action: {} -->\n", true],
    ["foo\n<!-- bun-diff-action: {} -->\n", true],
    ["foo<!-- bun-diff-action: {} -->\n", false],
    ["foo", false],
  ])("should return %s", (body, expected) => {
    expect(isBunActionComment({ body })).toBe(expected);
  });
});
