import { describe, expect, test } from "vitest";
import {
  _buildDiffComment,
  _isBunActionComment,
  _isLockbFile,
  extractMetadata,
} from "./action";

describe("extractMetadata", () => {
  test.each([
    ['<!-- bun-diff-action: {"path": "foo"} -->', null, { path: "foo" }],
    ['<!-- bun-diff-action: {"path": "foo"} -->\n', null, { path: "foo" }],
    ['foo\n<!-- bun-diff-action: {"path": "foo"} -->', null, { path: "foo" }],
    ['<!-- bun-diff-action: {"path": "foo"} -->', "bar", { path: "bar" }],
  ])("extractMetadata(%j) = %o", (body, path, expected) => {
    expect(extractMetadata({ body, path, id: 1 })).toEqual(expected);
  });
});

describe("_isBunActionComment", () => {
  test.each([
    ["<!-- bun-diff-action: {} -->", true],
    ["<!-- bun-diff-action: {} -->\n", true],
    ["foo\n<!-- bun-diff-action: {} -->\n", true],
    ["foo<!-- bun-diff-action: {} -->\n", false],
    ["foo", false],
  ])("_isBunActionComment(%j) = %s", (body, expected) => {
    expect(_isBunActionComment({ body, path: "", id: 1 })).toBe(expected);
  });
});

describe("_buildDiffComment", () => {
  test.each([
    [
      undefined,
      "DIFF",
      { path: "foo" },
      '```diff\nDIFF\n```\n\n<!-- bun-diff-action: {"path":"foo"} -->',
    ],
    [
      "HEADER",
      "DIFF",
      { path: "foo" },
      'HEADER\n\n```diff\nDIFF\n```\n\n<!-- bun-diff-action: {"path":"foo"} -->',
    ],
  ])(
    "_buildDiffComment({header: %j, diff: %j, metadata: %j}) = %j",
    (header, diff, metadata, expected) => {
      expect(_buildDiffComment({ header, diff, metadata })).toBe(expected);
    },
  );
});

describe("_isLockbFile", () => {
  test.each([
    ["bun.lockb", true],
    ["bun.lockb/bun.lockb", true],
    ["/bun.lockb", true],
    ["foo/bun.lockb", true],
    ["foo/bar/bun.lockb", true],
    ["/foo/bun.lockb", true],
    ["/foo/bar/bun.lockb", true],

    ["bun.lock", false],
    ["bun.lockb/", false],
    ["bun.lockb/foo", false],
    ["bun.lockb/foo/bar", false],
    ["un.lockb", false],
    ["b/un.lockb", false],
    ["package-lock.json", false],
    ["yarn.lock", false],
    ["pnpm-lock.yaml", false],
  ])("_isLockbFile(%j) = %s", (path, expected) => {
    expect(_isLockbFile(path)).toBe(expected);
  });
});
