import * as core from "@actions/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./main";

vi.mock("@actions/core");

describe("main function", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should output the message correctly", async () => {
    const message = "TEST_MESSAGE";

    vi.spyOn(core, "getInput").mockReturnValue(message);

    await main();

    expect(core.info).toHaveBeenCalledWith(message);
    expect(core.setOutput).toHaveBeenCalledWith("message", message);
  });

  it("should call core.setFailed when an error occurs", async () => {
    const errorMessage = "SOMETHING_WRONG";

    vi.spyOn(core, "getInput").mockImplementation(() => {
      throw new Error(errorMessage);
    });

    await main();

    expect(core.setFailed).toHaveBeenCalledWith(errorMessage);
  });
});
