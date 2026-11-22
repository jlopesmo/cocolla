#!/usr/bin/env node
// Builds the Cocolla static package for the LopesMoreno App Hub
// (docs/decisions/0009-app-hub-static-export.md). It never uploads anything.
//
//   npm run package:apphub
//
// Output: dist/apphub/cocolla/ (git-ignored), served by the App Hub at
// /apps/projects/cocolla/. Upload the FOLDER to the App Hub's protected apps_dir
// (e.g. apphub-staging-apps/cocolla/, outside public_html) for Passcode testing.
// Contents: index.html, assets/ (JS, CSS, worker), app.json, icon.svg. No source
// maps, TypeScript, environment files or dependencies. Fails (exit 1) on any
// verification problem.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { APPHUB_BASE, repo, verifyOutput, viteBuild, walk } from "./apphub-package-lib.mjs";

const outRoot = path.join(repo, "dist", "apphub");
const out = path.join(outRoot, "cocolla");
fs.rmSync(outRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

const build = viteBuild({ base: APPHUB_BASE, outDir: out, sourcemap: false });
if (!build.ok) { console.error(build.output); process.exit(1); }

const git = (...args) => spawnSync("git", ["-c", `safe.directory=${repo.split(path.sep).join("/")}`, ...args], { cwd: repo, encoding: "utf8" }).stdout.trim();
const sha = git("rev-parse", "--short=7", "HEAD") || "unknown";
const dirty = git("status", "--porcelain", "--", "apps", "packages", "scripts", "package.json", "package-lock.json") !== "";
const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));

// app.json: App Hub metadata (unknown fields are ignored there). The version is
// the package version plus the source commit, so the deployed build is traceable.
fs.writeFileSync(path.join(out, "app.json"), JSON.stringify({
  id: "cocolla",
  name: "Cocolla",
  description: "Cross-stitch pattern editor: draw, recolor, rotate and convert images into editable full-cross patterns. Runs entirely in your browser; save and reopen work with JSON export/import.",
  version: `${pkg.version}-${sha}${dirty ? ".dirty" : ""}`,
  status: "alpha",
  icon: "icon.svg",
  entry: "index.html",
  tags: ["embroidery", "cross-stitch", "editor"],
  spa: true,
}, null, 2) + "\n");

// icon.svg: the same mark as the editor favicon (index.html data: URI), as a file.
fs.writeFileSync(path.join(out, "icon.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#24312b"/>' +
  '<path d="M19 19 45 45M45 19 19 45" stroke="white" stroke-width="6" stroke-linecap="round"/></svg>\n');

const problems = verifyOutput(out, { base: APPHUB_BASE, package: true });
const files = walk(out);
const rel = (f) => path.relative(out, f).split(path.sep).join("/");
const sums = files.sort().map((f) => `${crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")}  ${rel(f)}`);
fs.writeFileSync(path.join(outRoot, "SHA256SUMS.txt"), sums.join("\n") + "\n");
const size = files.reduce((n, f) => n + fs.statSync(f).size, 0);
fs.writeFileSync(path.join(outRoot, "UPLOAD.txt"), [
  "Cocolla App Hub package (static; no server code, no database, no credentials)",
  `source commit: ${sha}${dirty ? " (working tree had uncommitted changes)" : ""}`,
  `built: ${new Date().toISOString()}`,
  "",
  "Upload the FOLDER dist/apphub/cocolla/ (with its assets/ sub-folder) as:",
  "  STAGING (Passcode test): /home/<account>/domains/lopesmoreno.com/apphub-staging-apps/cocolla/",
  "  (outside public_html; that is the App Hub's protected apps_dir)",
  "Served at: https://apphub-staging.lopesmoreno.com/apps/projects/cocolla/",
  "Do not upload UPLOAD.txt or SHA256SUMS.txt.",
  "",
].join("\n"));

console.log(`cocolla package: dist/apphub/cocolla (${files.length} files, ${(size / 1024).toFixed(1)} KiB), version ${pkg.version}-${sha}${dirty ? ".dirty" : ""}`);
for (const f of files.sort()) console.log(`  ${rel(f).padEnd(48)} ${fs.statSync(f).size} B`);
if (problems.length) {
  console.error("\nPACKAGE REJECTED:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("checks: OK (base paths, assets present, bundled worker, no source maps/TypeScript/dev files, App Hub-safe names, app.json valid)");
