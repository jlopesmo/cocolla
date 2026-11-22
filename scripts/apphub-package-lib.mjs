// Shared build + verification helpers for the Cocolla static export used by the
// LopesMoreno App Hub (docs/decisions/0009-app-hub-static-export.md). No runtime
// dependency: Node built-ins only. Used by scripts/package-apphub.mjs and tests.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const APPHUB_BASE = "/apps/projects/cocolla/";

/** Runs `vite build` for apps/web with the given export options. */
export function viteBuild({ base, outDir, sourcemap }) {
  const vite = path.join(repo, "node_modules/vite/bin/vite.js");
  const r = spawnSync(process.execPath, [vite, "build", "--config", "apps/web/vite.config.ts", "--logLevel", "warn"], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(base === undefined ? {} : { COCOLLA_BASE: base }),
      ...(sourcemap === undefined ? {} : { COCOLLA_SOURCEMAP: String(sourcemap) }),
      COCOLLA_OUT_DIR: outDir,
    },
  });
  return { ok: r.status === 0, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

export function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// Mirror of the App Hub package audit (any dot-part naming server code/config, hidden
// names, unsafe characters). The App Hub re-audits on the server; this fails early.
const SERVER_FILE_RE = /\.(php\d*|phtml|pht|phar|phps|inc|cgi|fcgi|pl|py|rb|sh|bash|asp|aspx|jsp|shtml|shtm|stm|ini|htaccess|htpasswd)(\.|$)/i;
const UNSAFE_NAME_RE = /[\x00-\x1f\x7f\\%]|[ .]$/;

/**
 * Verifies a built web output. Returns a list of problems (empty = OK).
 * opts.base: expected public base; opts.package: true for an App Hub package
 * (app.json + icon required, no source maps / TypeScript / env files).
 */
export function verifyOutput(dir, { base, package: isPackage = false }) {
  const problems = [];
  const files = walk(dir).map((f) => path.relative(dir, f).split(path.sep).join("/"));
  const has = (rel) => files.includes(rel);
  if (!has("index.html")) problems.push("missing index.html");

  for (const rel of files) {
    for (const seg of rel.split("/")) {
      if (seg.startsWith(".")) problems.push(`${rel}: hidden name`);
      if (SERVER_FILE_RE.test(seg) || ["web.config", "httpd.conf", "nginx.conf"].includes(seg.toLowerCase())) problems.push(`${rel}: server-side code/config name`);
      if (UNSAFE_NAME_RE.test(seg)) problems.push(`${rel}: unsafe characters in name`);
    }
    if (isPackage) {
      if (rel.endsWith(".map")) problems.push(`${rel}: source map in a public package`);
      if (/\.(tsx?|mts|cts)$/.test(rel)) problems.push(`${rel}: TypeScript source in a public package`);
      if (/(^|\/)(\.env|package(-lock)?\.json|node_modules)(\/|$)/.test(rel)) problems.push(`${rel}: development file in a public package`);
    }
  }

  // Every root-relative URL in index.html must be under the base and exist in the output.
  if (has("index.html")) {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      const url = m[1];
      if (url.startsWith("data:") || /^https?:\/\//.test(url)) continue;
      if (!url.startsWith(base)) { problems.push(`index.html: ${url} is outside base ${base}`); continue; }
      const rel = decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]);
      if (!has(rel)) problems.push(`index.html: ${url} does not exist in the output`);
    }
  }

  // The image-conversion worker must be a real bundled chunk (regression: the raw .ts
  // source was once inlined as a data:video/mp2t URL and could not run in production).
  const js = files.filter((f) => f.endsWith(".js"));
  const worker = js.find((f) => /(^|\/)image-conversion\.worker-[^/]+\.js$/.test(f));
  if (!worker) problems.push("no bundled image-conversion worker chunk");
  let workerReferenced = false;
  for (const f of js) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    if (text.includes("data:video/mp2t")) problems.push(`${f}: TypeScript inlined as a data: URL`);
    // The worker must be loaded by an absolute URL under the base.
    if (worker && text.includes(`${base}${worker}`)) workerReferenced = true;
    // Static imports between chunks must resolve inside the output.
    for (const m of text.matchAll(/\bimport\s*(?:[^'"`;]*?\bfrom\s*)?["'`](\.{1,2}\/[^"'`]+|\/[^"'`]+)["'`]/g)) {
      const spec = m[1];
      const target = spec.startsWith("/") ? (spec.startsWith(base) ? spec.slice(base.length) : null) : path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
      if (target === null) problems.push(`${f}: import ${spec} is outside base ${base}`);
      else if (!has(target)) problems.push(`${f}: import ${spec} does not exist in the output`);
    }
  }
  if (worker && !workerReferenced) problems.push(`no bundle loads ${worker} via ${base}${worker}`);
  // CSS url(...) references (fonts, images) must resolve too.
  for (const f of files.filter((x) => x.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      const u = m[1];
      if (u.startsWith("data:") || u.startsWith("#") || /^https?:\/\//.test(u)) continue;
      const target = u.startsWith("/") ? (u.startsWith(base) ? u.slice(base.length) : null) : path.posix.normalize(path.posix.join(path.posix.dirname(f), u.split(/[?#]/)[0]));
      if (target === null || !has(target)) problems.push(`${f}: url(${u}) does not resolve under ${base}`);
    }
  }

  if (isPackage) {
    if (!has("app.json")) problems.push("missing app.json");
    else {
      let meta = null;
      try { meta = JSON.parse(fs.readFileSync(path.join(dir, "app.json"), "utf8")); } catch { problems.push("app.json is not valid JSON"); }
      if (meta) {
        if (meta.id !== "cocolla") problems.push("app.json id must be cocolla");
        if (typeof meta.name !== "string" || meta.name.length < 1 || meta.name.length > 80) problems.push("app.json name");
        if (typeof meta.description === "string" && [...meta.description].length > 280) problems.push("app.json description > 280");
        if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(meta.version ?? "")) problems.push("app.json version must be semver");
        if (!["alpha", "beta", "stable", "deprecated", "example"].includes(meta.status)) problems.push("app.json status");
        if (meta.icon && !has(meta.icon)) problems.push(`app.json icon ${meta.icon} missing`);
        if ((meta.entry ?? "index.html") !== "index.html") problems.push("app.json entry must be index.html");
      }
    }
  }
  return problems;
}
