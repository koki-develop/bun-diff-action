import { describe, expect, test } from "vitest";
import { _isBunActionComment } from "./action";

describe("isBunActionComment", () => {
  test.each([
    ["<!-- bun-diff-action: {} -->", true],
    ["<!-- bun-diff-action: {} -->\n", true],
    ["foo\n<!-- bun-diff-action: {} -->\n", true],
    ["foo<!-- bun-diff-action: {} -->\n", false],
    ["foo", false],
  ])("should return %s", (body, expected) => {
    expect(_isBunActionComment({ body, path: "", id: 1 })).toBe(expected);
  });
});
