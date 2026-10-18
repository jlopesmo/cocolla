import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceDirectories = ["packages/contracts/src", "packages/engine/src"];

test("contracts and engine source import only repository-local modules", () => {
  for (const directory of sourceDirectories) {
    for (const filename of readdirSync(directory)) {
      if (!filename.endsWith(".ts")) {
        continue;
      }
      const source = readFileSync(join(directory, filename), "utf8");
      const specifiers = [
        ...source.matchAll(
          /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/gu,
        ),
      ].map((match) => match[1]);
      for (const specifier of specifiers) {
        assert.ok(
          specifier?.startsWith("."),
          `${join(directory, filename)} imports external module ${String(specifier)}`,
        );
      }
    }
  }

  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    readonly dependencies?: unknown;
  };
  assert.equal(packageJson.dependencies, undefined);
});
