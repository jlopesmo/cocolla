// Regression tests for the configurable web build and the App Hub static export
// (docs/decisions/0009-app-hub-static-export.md). They run real `vite build`s into
// temporary folders; nothing under dist/ is touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { APPHUB_BASE, verifyOutput, viteBuild, walk } from "../apphub-package-lib.mjs";

const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `cocolla-${name}-`));
const names = (dir) => walk(dir).map((f) => path.relative(dir, f).split(path.sep).join("/"));

test("default build is unchanged: base /, source maps on, worker bundled as a chunk", () => {
  const out = tmp("default");
  try {
    const r = viteBuild({ outDir: out });
    assert.ok(r.ok, r.output);
    assert.deepEqual(verifyOutput(out, { base: "/" }), []);
    const files = names(out);
    assert.ok(files.some((f) => f.endsWith(".js.map")), "source maps stay on by default");
    assert.ok(files.some((f) => /^assets\/image-conversion\.worker-[^/]+\.js$/.test(f)), "worker chunk emitted");
    const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
    assert.match(html, /src="\/assets\/index-[^"]+\.js"/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("App Hub build resolves every asset and the worker under /apps/projects/cocolla/", () => {
  const out = tmp("apphub");
  try {
    const r = viteBuild({ base: APPHUB_BASE, outDir: out, sourcemap: false });
    assert.ok(r.ok, r.output);
    assert.deepEqual(verifyOutput(out, { base: APPHUB_BASE }), []);
    const files = names(out);
    assert.equal(files.some((f) => f.endsWith(".map")), false, "no source maps");
    const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
    assert.equal(/(?:src|href)="\/assets\//.test(html), false, "no root-relative /assets/ URL left");
    const main = files.find((f) => /^assets\/index-[^/]+\.js$/.test(f));
    const js = fs.readFileSync(path.join(out, main), "utf8");
    assert.ok(js.includes(`${APPHUB_BASE}assets/image-conversion.worker-`), "worker URL under the base");
    assert.equal(js.includes("data:video/mp2t"), false, "worker source not inlined");
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("invalid base and source-map values are rejected", () => {
  for (const [opts, why] of [
    [{ base: "apps/projects/cocolla/" }, "relative base"],
    [{ base: "/apps/projects/cocolla" }, "no trailing slash"],
    [{ base: "/apps/../x/" }, "dot segment"],
    [{ base: "/", sourcemap: "maybe" }, "bad sourcemap flag"],
  ]) {
    const out = tmp("bad");
    try {
      const r = viteBuild({ ...opts, outDir: out });
      assert.equal(r.ok, false, why);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  }
});

test("the verifier catches broken packages (mutation check)", () => {
  const dir = tmp("broken");
  try {
    const w = (rel, s) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), s); };
    w("index.html", '<script src="/assets/index-x.js"></script><link href="/apps/projects/cocolla/assets/missing.css">');
    w("assets/index-x.js", 'const u=new URL("data:video/mp2t;base64,AA==");import "./gone.js";');
    w("assets/index-x.js.map", "{}");
    w("assets/.htaccess", "RewriteEngine Off");
    w("assets/run.php.js", "");
    w("src/App.tsx", "");
    w("app.json", JSON.stringify({ id: "other", name: "x", version: "1", status: "nope", icon: "none.svg" }));
    const problems = verifyOutput(dir, { base: APPHUB_BASE, package: true }).join("\n");
    for (const expected of [
      /\/assets\/index-x\.js is outside base/, /missing\.css does not exist/, /no bundled image-conversion worker chunk/,
      /TypeScript inlined as a data: URL/, /import \.\/gone\.js does not exist/, /source map in a public package/,
      /\.htaccess: hidden name/, /run\.php\.js: server-side code/, /TypeScript source in a public package/,
      /app\.json id must be cocolla/, /version must be semver/, /app\.json status/, /icon none\.svg missing/,
    ]) assert.match(problems, expected);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
