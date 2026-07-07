import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { currentRelease, releases } from "./releases";

describe("release notes", () => {
  it("matches the deployed application version", () => {
    expect(currentRelease.version).toBe(packageJson.version);
  });

  it("keeps versions and dates in descending order", () => {
    const versions = releases.map((release) => release.version);
    const dates = releases.map((release) => release.date);
    expect(new Set(versions).size).toBe(versions.length);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("documents highlights and validation for every release", () => {
    for (const release of releases) {
      expect(release.highlights.length).toBeGreaterThan(0);
      expect(release.validation.length).toBeGreaterThan(0);
    }
  });
});
