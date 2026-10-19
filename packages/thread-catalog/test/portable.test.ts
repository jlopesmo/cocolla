import assert from "node:assert/strict";
import test from "node:test";

import type {
  PortableThreadCatalogV1,
  ThreadCatalogDescriptor,
} from "../../contracts/src/index.js";
import {
  MAX_CATALOG_FILE_BYTES,
  parsePortableThreadCatalogJson,
  parseThreadCatalogCsv,
  serializePortableThreadCatalog,
  type CsvThreadCatalogMetadata,
} from "../src/index.js";

const descriptor: ThreadCatalogDescriptor = {
  id: "user.sample-floss",
  brand: "Sample maker",
  line: "Cotton line",
  version: "2026-10",
  attribution: {
    sourceName: "Licensed personal spreadsheet",
    sourceUrl: "https://example.test/source",
    publisher: "Sample publisher",
    retrievedAt: "2026-10-18",
    licenseName: null,
    licenseUrl: null,
    redistribution: "unknown",
    notes: "User-supplied approximate display colors.",
  },
};

const metadata: CsvThreadCatalogMetadata = {
  descriptor,
  rightsConfirmation: {
    statementVersion: 1,
    confirmed: true,
    confirmedAt: "2026-10-18T20:00:00.000Z",
  },
};

const validCatalog = (): PortableThreadCatalogV1 => ({
  format: "cocolla.thread-catalog",
  formatVersion: 1,
  descriptor,
  rightsConfirmation: metadata.rightsConfirmation,
  products: [
    {
      id: "user.sample-floss:a-1",
      catalogId: "user.sample-floss",
      manufacturerCode: "A-1",
      name: "Night",
      color: { colorSpace: "srgb", value: "#010203", provenance: "user-supplied" },
    },
    {
      id: "user.sample-floss:b2",
      catalogId: "user.sample-floss",
      manufacturerCode: "B2",
      name: "Cloud",
      color: { colorSpace: "srgb", value: "#F0F1F2", provenance: "user-supplied" },
    },
  ],
});

test("CSV import handles UTF-8 BOM, CRLF, quoted commas, escaped quotes, and embedded lines", () => {
  const csv = new TextEncoder().encode(
    '\uFEFFcode,name,hex,unused\r\nA-1,"Night, blue",#010203,keep\r\nB2,"Cloud ""soft""\nshade",#f0f1f2,keep\r\n',
  );
  const result = parseThreadCatalogCsv(csv, metadata);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.catalog.products.length, 2);
  assert.equal(result.catalog.products[0]?.name, "Night, blue");
  assert.equal(result.catalog.products[1]?.name, 'Cloud "soft"\nshade');
  assert.equal(result.catalog.products[1]?.color.value, "#F0F1F2");
  assert.equal(result.catalog.products[0]?.id, "user.sample-floss:a-1");
  assert.ok(result.diagnostics.some((item) => item.code === "unknown-header" && item.severity === "warning"));
});

test("portable JSON serialization is canonical and round trips deterministically", () => {
  const catalog = validCatalog();
  const reversed = { ...catalog, products: [...catalog.products].reverse() };
  const canonical = serializePortableThreadCatalog(catalog);
  assert.equal(serializePortableThreadCatalog(reversed), canonical);
  const parsed = parsePortableThreadCatalogJson(canonical);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(serializePortableThreadCatalog(parsed.catalog), canonical);
  assert.deepEqual(parsed.catalog.descriptor.attribution, catalog.descriptor.attribution);
  assert.deepEqual(parsed.catalog.rightsConfirmation, catalog.rightsConfirmation);
});

test("portable JSON rejects unsupported formats, versions, and unknown fields", () => {
  const catalog = validCatalog();
  const badFormat = parsePortableThreadCatalogJson(JSON.stringify({ ...catalog, format: "other" }));
  const future = parsePortableThreadCatalogJson(JSON.stringify({ ...catalog, formatVersion: 2 }));
  const unknown = parsePortableThreadCatalogJson(JSON.stringify({ ...catalog, surprise: true }));
  assert.equal(badFormat.ok, false);
  assert.ok(badFormat.diagnostics.some((item) => item.code === "unsupported-format"));
  assert.equal(future.ok, false);
  assert.ok(future.diagnostics.some((item) => item.code === "unsupported-version"));
  assert.equal(unknown.ok, false);
  assert.ok(unknown.diagnostics.some((item) => item.code === "unknown-field"));
});

test("portable catalogs reject invalid product identifiers, impossible dates, and empty product sets", () => {
  const invalidId = validCatalog();
  const idResult = parsePortableThreadCatalogJson(JSON.stringify({
    ...invalidId,
    products: [{ ...invalidId.products[0], id: "user.sample-floss:bad id" }],
  }));
  assert.equal(idResult.ok, false);
  assert.ok(idResult.diagnostics.some((item) => item.code === "invalid-product-id"));

  const dateResult = parsePortableThreadCatalogJson(JSON.stringify({
    ...invalidId,
    descriptor: {
      ...invalidId.descriptor,
      attribution: { ...invalidId.descriptor.attribution, retrievedAt: "2026-99-99" },
    },
  }));
  assert.equal(dateResult.ok, false);
  assert.ok(dateResult.diagnostics.some((item) => item.code === "invalid-date"));

  const emptyResult = parsePortableThreadCatalogJson(JSON.stringify({ ...invalidId, products: [] }));
  assert.equal(emptyResult.ok, false);
  assert.ok(emptyResult.diagnostics.some((item) => item.code === "empty-catalog"));

  const reservedResult = parsePortableThreadCatalogJson(JSON.stringify({
    ...invalidId,
    descriptor: { ...invalidId.descriptor, id: "cocolla" },
  }));
  assert.equal(reservedResult.ok, false);
  assert.ok(reservedResult.diagnostics.some((item) => item.code === "invalid-catalog-id"));
});

test("CSV validation reports row-level duplicate, identifier, color, and record errors atomically", () => {
  const csv = "code,name,hex\nA 1,Invalid code,#010203\nB2,Bad color,#XYZXYZ\nB2,Duplicate,#FFFFFF\nC3,Too,many,fields\n";
  const result = parseThreadCatalogCsv(csv, metadata);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === "invalid-product-code" && item.row === 2));
  assert.ok(result.diagnostics.some((item) => item.code === "invalid-color" && item.row === 3));
  assert.ok(result.diagnostics.some((item) => item.code === "duplicate-product-code" && item.row === 4));
  assert.ok(result.diagnostics.some((item) => item.code === "malformed-record" && item.row === 5));
});

test("catalog imports require metadata and explicit rights confirmation", () => {
  const unconfirmed = parseThreadCatalogCsv("code,name,hex\nA1,Name,#010203\n", {
    descriptor: { ...descriptor, brand: "" },
    rightsConfirmation: {
      statementVersion: 1,
      confirmed: true,
      confirmedAt: "not-a-time",
    },
  });
  assert.equal(unconfirmed.ok, false);
  assert.ok(unconfirmed.diagnostics.some((item) => item.code === "missing-metadata"));
  assert.ok(unconfirmed.diagnostics.some((item) => item.code === "invalid-timestamp"));

  const json = validCatalog() as unknown as Record<string, unknown>;
  json.rightsConfirmation = { statementVersion: 1, confirmed: false, confirmedAt: "2026-10-18T20:00:00.000Z" };
  const jsonResult = parsePortableThreadCatalogJson(JSON.stringify(json));
  assert.equal(jsonResult.ok, false);
  assert.ok(jsonResult.diagnostics.some((item) => item.code === "rights-confirmation-required"));
});

test("catalog imports enforce the 5 MiB and 10,000-product limits", () => {
  const oversized = new Uint8Array(MAX_CATALOG_FILE_BYTES + 1);
  const sizeResult = parsePortableThreadCatalogJson(oversized);
  assert.equal(sizeResult.ok, false);
  assert.equal(sizeResult.diagnostics[0]?.code, "file-too-large");

  const rows = ["code,name,hex"];
  for (let index = 0; index <= 10_000; index += 1) rows.push(`P${String(index)},Product ${String(index)},#010203`);
  const countResult = parseThreadCatalogCsv(rows.join("\n"), metadata);
  assert.equal(countResult.ok, false);
  assert.ok(countResult.diagnostics.some((item) => item.code === "too-many-products"));
});
