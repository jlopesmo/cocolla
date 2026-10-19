import { performance } from "node:perf_hooks";

import {
  Ciede2000ThreadColorMatcher,
  InMemoryThreadCatalogProvider,
  InMemoryThreadCatalogRepository,
  parseThreadCatalogCsv,
  serializePortableThreadCatalog,
  threadCatalogVersionKey,
  type CsvThreadCatalogMetadata,
} from "../src/index.js";

const PRODUCT_COUNT = 5_000;
const metadata: CsvThreadCatalogMetadata = {
  descriptor: {
    id: "user.benchmark-threads",
    brand: "Cocolla benchmark",
    line: "Synthetic performance fixture",
    version: "v1",
    attribution: {
      sourceName: "Generated benchmark data",
      sourceUrl: null,
      publisher: "Cocolla",
      retrievedAt: null,
      licenseName: null,
      licenseUrl: null,
      redistribution: "allowed",
      notes: "Generated locally; not a manufacturer catalog.",
    },
  },
  rightsConfirmation: {
    statementVersion: 1,
    confirmed: true,
    confirmedAt: "2026-10-18T20:00:00.000Z",
  },
};

const rows = ["code,name,hex"];
for (let index = 0; index < PRODUCT_COUNT; index += 1) {
  const channel = index % 256;
  const hex = `#${channel.toString(16).padStart(2, "0")}${((channel * 3) % 256).toString(16).padStart(2, "0")}${((channel * 7) % 256).toString(16).padStart(2, "0")}`;
  rows.push(`P${String(index).padStart(5, "0")},Generated ${String(index)},${hex}`);
}
const csv = rows.join("\n");

const startedImport = performance.now();
const parsed = parseThreadCatalogCsv(csv, metadata);
const importMs = performance.now() - startedImport;
if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join(" "));

const startedSerialize = performance.now();
const canonical = serializePortableThreadCatalog(parsed.catalog);
const serializeMs = performance.now() - startedSerialize;

const repository = new InMemoryThreadCatalogRepository();
const startedStore = performance.now();
await repository.saveCatalog(parsed.catalog);
const storeMs = performance.now() - startedStore;

const startedLoad = performance.now();
const loaded = await repository.getCatalog(threadCatalogVersionKey(parsed.catalog));
const loadMs = performance.now() - startedLoad;
if (loaded === null) throw new Error("Benchmark catalog did not reload.");

const provider = new InMemoryThreadCatalogProvider(loaded.descriptor, loaded.products);
const matcher = new Ciede2000ThreadColorMatcher();
const startedMatch = performance.now();
await matcher.match({ rgb: "#557799", limit: 10 }, provider);
const matchMs = performance.now() - startedMatch;

console.log(JSON.stringify({
  runtime: process.version,
  platform: `${process.platform}-${process.arch}`,
  note: "Single-process synthetic catalog measurement; not a service-level guarantee.",
  products: PRODUCT_COUNT,
  csvBytes: new TextEncoder().encode(csv).byteLength,
  canonicalJsonBytes: new TextEncoder().encode(canonical).byteLength,
  timingsMs: {
    csvImport: importMs,
    canonicalSerialize: serializeMs,
    inMemoryStore: storeMs,
    inMemoryReload: loadMs,
    ciede2000Match: matchMs,
  },
}, null, 2));
