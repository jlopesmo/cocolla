#!/usr/bin/env node
// Headless-Chrome functional check of a served Cocolla build (e.g. the App Hub package
// behind the real PHP gate). Node built-ins only (DevTools protocol over WebSocket).
//
//   node scripts/apphub-browser-check.mjs <app-url> [--cookie name=value] [--browser <chrome.exe>]
//   APPHUB_PASSCODE=<passcode> node scripts/apphub-browser-check.mjs https://<hub>/apps/projects/cocolla/
//     (App Hub Passcode app: unlocks first; the passcode is read from the environment only)
//
// Verifies: the editor loads with no failed request, console error or request outside
// the app's base path; drawing places stitches; Export JSON produces a valid document;
// Import JSON restores it; Import image converts through the Web Worker; reload and an
// SPA deep link work. Nothing is persisted; no server API or database is used.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const appUrl = args.find((a) => /^https?:\/\//.test(a));
if (!appUrl || !appUrl.endsWith("/")) { console.error("usage: apphub-browser-check.mjs <app-url ending in /> [--cookie name=value]"); process.exit(2); }
const app = new URL(appUrl);
const browser = opt("--browser") ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((p) => fs.existsSync(p));
if (!browser) { console.error("no Chrome/Edge found (--browser)"); process.exit(2); }

let fails = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { fails++; console.log(`FAIL  ${m}`); };
const check = (c, m) => (c ? pass(m) : fail(m));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── tiny PNG encoder (RGBA, filter 0) for the image-import test ──
function png(width, height, pixel) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const o = y * (width * 4 + 1) + 1 + x * 4; const [r, g, b] = pixel(x, y); raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cocolla-browser-"));
const profile = path.join(tmp, "profile");
const imagePath = path.join(tmp, "stripes.png");
fs.writeFileSync(imagePath, png(24, 16, (x, y) => (x < 8 ? [200, 30, 40] : x < 16 ? [30, 90, 200] : y < 8 ? [250, 220, 40] : [20, 20, 20])));
const chrome = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`,
  "--remote-debugging-port=0", "--window-size=1440,1000", "about:blank"], { stdio: "ignore" });

async function main() {
  let port = null;
  for (let i = 0; i < 100 && !port; i++) { try { port = fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
  if (!port) throw new Error("Chrome did not start");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
    else for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  const waitFor = async (expression, label, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await evaluate(expression).catch(() => false)) return true; await sleep(100); }
    throw new Error(`timeout waiting for ${label}`);
  };

  // ── event capture ──
  const failed = [], errors = [], outside = [];
  listeners.push((m) => {
    if (m.method === "Network.requestWillBeSent") {
      const u = m.params.request.url;
      if (!/^(data|blob):/.test(u) && !(u.startsWith(app.origin + app.pathname))) outside.push(u);
    }
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) failed.push(`${m.params.response.status} ${m.params.response.url}`);
    if (m.method === "Network.loadingFailed" && !m.params.canceled) failed.push(`failed ${m.params.errorText}`);
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(m.params.entry.text);
    if (m.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
  });
  await send("Network.enable"); await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable"); await send("DOM.enable");
  let cookie = opt("--cookie");
  // App Hub Passcode app: unlock with APPHUB_PASSCODE (env only; never printed) to get the
  // app-scoped cookie, exactly as the unlock page does.
  if (!cookie && process.env.APPHUB_PASSCODE) {
    const id = app.pathname.match(/^\/apps\/projects\/([a-z0-9-]+)\/$/)?.[1];
    if (!id) throw new Error("APPHUB_PASSCODE needs an /apps/projects/<id>/ URL");
    const r = await fetch(`${app.origin}/api/apphub/unlock.php`, {
      method: "POST", headers: { "content-type": "application/json", origin: app.origin },
      body: JSON.stringify({ id, passcode: process.env.APPHUB_PASSCODE }),
    });
    const sc = r.headers.getSetCookie().find((c) => c.startsWith(`apphub_app_${id.replace(/-/g, "_")}=`));
    check(r.status === 200 && Boolean(sc), `App Hub unlock (${r.status}${r.status === 401 ? ": wrong passcode" : r.status === 429 ? ": rate limited, wait 15 min" : ""})`);
    if (!sc) throw new Error("App Hub unlock failed");
    if (app.protocol === "https:") check(/;\s*Secure/i.test(sc) && /HttpOnly/i.test(sc), "unlock cookie Secure + HttpOnly");
    cookie = sc.split(";")[0];
  }
  if (cookie) { const [name, ...v] = cookie.split("="); await send("Network.setCookie", { name, value: v.join("="), url: app.href, path: app.pathname, ...(app.protocol === "https:" ? { secure: true } : {}), httpOnly: true }); }

  // Capture exported blobs without triggering real downloads.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__blobs = []; const oc = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { if (b && b.type === 'application/json') window.__blobs.push(b); return oc(b); };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) return; return click.call(this); };` });

  const canvasReady = `!!document.querySelector('[aria-label="Interactive stitching canvas"]')`;
  const stitches = `(() => { const s = [...document.querySelectorAll('div > span')].find(e => e.textContent === 'Stitches'); return s ? Number(s.nextElementSibling.textContent.replace(/[^0-9]/g, '')) : -1 })()`;
  const clickButton = (text, scope = "document") => evaluate(`(() => { const b = [...${scope}.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(text)} && !e.disabled); if (!b) return false; b.click(); return true })()`);
  const setFile = async (selector, file) => {
    const { root } = await send("DOM.getDocument", { depth: -1, pierce: true });
    const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`no ${selector}`);
    await send("DOM.setFileInputFiles", { nodeId, files: [file] });
  };

  // 1. load
  await send("Page.navigate", { url: app.href });
  await waitFor(canvasReady, "editor canvas");
  await sleep(500);
  pass(`editor loads at ${app.pathname}`);
  check((await evaluate("document.title")) === "Cocolla Pattern Editor", "page title");
  const assets = await evaluate(`[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e => e.src || e.href)`);
  if (assets.some((u) => u.includes("/@vite/client"))) {
    // Vite dev server: unbundled /src modules, no hashed assets/ folder.
    check(assets.every((u) => u.startsWith(app.origin + app.pathname)), `dev server: modules loaded under ${app.pathname} (${assets.length})`);
  } else {
    check(assets.length >= 2 && assets.every((u) => u.startsWith(app.origin + app.pathname + "assets/")), `JS/CSS loaded from ${app.pathname}assets/ (${assets.length})`);
  }
  check(await evaluate(`getComputedStyle(document.body).fontFamily.length > 0 && document.styleSheets.length > 0`), "stylesheet applied");

  // 2. draw
  const before = await evaluate(stitches);
  const rect = await evaluate(`(() => { const r = document.querySelector('[aria-label="Interactive stitching canvas"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 12; i++) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x + i * 6, y: rect.y, button: "left", buttons: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x + 72, y: rect.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(300);
  const drawn = await evaluate(stitches);
  check(drawn > before, `drawing places stitches (${before} → ${drawn})`);

  // 3. export JSON
  check(await clickButton("Export JSON"), "Export JSON clicked");
  await waitFor(`window.__blobs.length > 0`, "exported JSON blob");
  const exported = await evaluate(`window.__blobs.at(-1).text()`);
  let doc = null;
  try { doc = JSON.parse(exported); } catch { /* below */ }
  check(doc && Array.isArray(doc.stitches) && doc.stitches.length === drawn, `exported JSON is a pattern document with ${doc?.stitches?.length} stitches`);
  const exportPath = path.join(tmp, "exported.json");
  fs.writeFileSync(exportPath, exported);

  // 4. new blank pattern, then import JSON restores the export
  check(await clickButton("New pattern"), "New pattern opened");
  await waitFor(`!!document.querySelector('#new-pattern-title')`, "new-pattern dialog");
  check(await clickButton("Create pattern"), "blank pattern created");
  await waitFor(`${stitches} === 0`, "blank pattern");
  await setFile('input[type=file][accept*="json"]', exportPath);
  await waitFor(`${stitches} === ${drawn}`, "imported stitches");
  pass(`Import JSON restores the exported pattern (${drawn} stitches)`);

  // 5. image import through the Web Worker
  check(await clickButton("Import image"), "Import image opened");
  await waitFor(`!!document.querySelector('#image-import-title')`, "image dialog");
  await setFile('input[type=file][accept^="image/"]', imagePath);
  await waitFor(`[...document.querySelectorAll('.image-import-dialog button')].some(b => b.textContent.trim() === 'Create pattern' && !b.disabled)`, "worker conversion result", 20000);
  pass("Web Worker converted the image (preview ready)");
  await clickButton("Create pattern", "document.querySelector('.image-import-dialog')");
  await sleep(300);
  if (await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Replace pattern')`)) await clickButton("Replace pattern");
  await waitFor(`!document.querySelector('#image-import-title') && ${stitches} > 0 && ${stitches} !== ${drawn}`, "image-based pattern applied");
  pass(`image-based pattern applied (${await evaluate(stitches)} stitches)`);

  // 6. reload and deep link
  await send("Page.reload", { ignoreCache: true });
  await sleep(300);
  await waitFor(canvasReady, "editor after reload");
  pass("browser refresh reloads the editor");
  await send("Page.navigate", { url: new URL("some/deep/link?x=1", app.href).href });
  await sleep(300);
  await waitFor(canvasReady, "editor at a deep link");
  pass("SPA deep link loads the editor");

  check(failed.length === 0, `no failed requests${failed.length ? `: ${[...new Set(failed)].join(", ")}` : ""}`);
  check(errors.length === 0, `no console errors${errors.length ? `: ${[...new Set(errors)].slice(0, 5).join(" | ")}` : ""}`);
  check(outside.length === 0, `no request outside ${app.pathname} (no server API, no CDN, no other site paths)${outside.length ? `: ${[...new Set(outside)].join(", ")}` : ""}`);
  ws.close();
}

try { await main(); } catch (e) { fail(e.message); } finally {
  chrome.kill();
  await sleep(500);
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
console.log(`\n${fails ? `${fails} FAIL` : "ALL PASS"}`);
process.exitCode = fails ? 1 : 0;
