import type {
  PortableThreadCatalogV1,
  ThreadCatalogAttribution,
  ThreadCatalogDescriptor,
  ThreadCatalogRightsConfirmation,
  ThreadProduct,
} from "../../contracts/src/index.js";

import { normalizeSrgbHex } from "./color.js";

export const PORTABLE_THREAD_CATALOG_FORMAT = "cocolla.thread-catalog";
export const PORTABLE_THREAD_CATALOG_VERSION = 1;
export const MAX_CATALOG_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CATALOG_PRODUCTS = 10_000;

const CATALOG_ID = /^[a-z0-9][a-z0-9._-]{2,63}$/u;
const PRODUCT_CODE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const PRODUCT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const MAX_TEXT_LENGTH = 256;

export type CatalogImportSeverity = "error" | "warning";

export interface CatalogImportDiagnostic {
  readonly code: string;
  readonly severity: CatalogImportSeverity;
  readonly message: string;
  readonly row?: number;
  readonly field?: string;
}

export type CatalogImportResult =
  | {
      readonly ok: true;
      readonly catalog: PortableThreadCatalogV1;
      readonly diagnostics: readonly CatalogImportDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly CatalogImportDiagnostic[];
    };

export interface CsvThreadCatalogMetadata {
  readonly descriptor: ThreadCatalogDescriptor;
  readonly rightsConfirmation: ThreadCatalogRightsConfirmation;
}

const error = (
  code: string,
  message: string,
  location: { readonly row?: number; readonly field?: string } = {},
): CatalogImportDiagnostic => ({ code, severity: "error", message, ...location });

const warning = (
  code: string,
  message: string,
  location: { readonly row?: number; readonly field?: string } = {},
): CatalogImportDiagnostic => ({ code, severity: "warning", message, ...location });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: string): string => value.trim().normalize("NFC");

const hasControlCharacters = (value: string): boolean => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value);

const normalizedCode = (value: string): string => normalizeText(value).toUpperCase();

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const inputBytes = (input: string | Uint8Array): number =>
  typeof input === "string" ? new TextEncoder().encode(input).byteLength : input.byteLength;

const decodeInput = (input: string | Uint8Array): string => {
  const decoded = typeof input === "string"
    ? input
    : new TextDecoder("utf-8", { fatal: true }).decode(input);
  return decoded.startsWith("\uFEFF") ? decoded.slice(1) : decoded;
};

const cloneAttribution = (value: ThreadCatalogAttribution): ThreadCatalogAttribution => ({ ...value });

const cloneDescriptor = (value: ThreadCatalogDescriptor): ThreadCatalogDescriptor => ({
  ...value,
  attribution: cloneAttribution(value.attribution),
});

const cloneProduct = (value: ThreadProduct): ThreadProduct => ({
  ...value,
  color: { ...value.color },
});

const cloneCatalog = (value: PortableThreadCatalogV1): PortableThreadCatalogV1 => ({
  format: PORTABLE_THREAD_CATALOG_FORMAT,
  formatVersion: PORTABLE_THREAD_CATALOG_VERSION,
  descriptor: cloneDescriptor(value.descriptor),
  rightsConfirmation: { ...value.rightsConfirmation },
  products: value.products.map(cloneProduct),
});

const recordUnknownKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
  diagnostics: CatalogImportDiagnostic[],
): void => {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      diagnostics.push(error("unknown-field", `Unknown ${field} field: ${key}.`, { field: `${field}.${key}` }));
    }
  }
};

const validateText = (
  value: unknown,
  field: string,
  diagnostics: CatalogImportDiagnostic[],
  options: { readonly nullable?: boolean; readonly required?: boolean } = {},
): string | null => {
  if (value === null && options.nullable === true) return null;
  if (typeof value !== "string") {
    diagnostics.push(error("invalid-text", `${field} must be a string${options.nullable === true ? " or null" : ""}.`, { field }));
    return null;
  }
  const normalized = normalizeText(value);
  if (options.required === true && normalized.length === 0) {
    diagnostics.push(error("missing-metadata", `${field} is required.`, { field }));
  }
  if (normalized.length > MAX_TEXT_LENGTH || hasControlCharacters(normalized)) {
    diagnostics.push(error("invalid-text", `${field} contains unsupported characters or is too long.`, { field }));
  }
  return normalized;
};

const validateOptionalUrl = (
  value: unknown,
  field: string,
  diagnostics: CatalogImportDiagnostic[],
): string | null => {
  const normalized = validateText(value, field, diagnostics, { nullable: true });
  if (normalized !== null && !isHttpUrl(normalized)) {
    diagnostics.push(error("invalid-url", `${field} must be an HTTP(S) URL or null.`, { field }));
  }
  return normalized;
};

const readAttribution = (
  value: unknown,
  diagnostics: CatalogImportDiagnostic[],
): ThreadCatalogAttribution | null => {
  if (!isRecord(value)) {
    diagnostics.push(error("invalid-attribution", "descriptor.attribution must be an object.", { field: "descriptor.attribution" }));
    return null;
  }
  recordUnknownKeys(value, ["sourceName", "sourceUrl", "publisher", "retrievedAt", "licenseName", "licenseUrl", "redistribution", "notes"], "descriptor.attribution", diagnostics);
  const sourceName = validateText(value.sourceName, "descriptor.attribution.sourceName", diagnostics, { required: true });
  const sourceUrl = validateOptionalUrl(value.sourceUrl, "descriptor.attribution.sourceUrl", diagnostics);
  const publisher = validateText(value.publisher, "descriptor.attribution.publisher", diagnostics, { required: true });
  const retrievedAt = validateText(value.retrievedAt, "descriptor.attribution.retrievedAt", diagnostics, { nullable: true });
  const licenseName = validateText(value.licenseName, "descriptor.attribution.licenseName", diagnostics, { nullable: true });
  const licenseUrl = validateOptionalUrl(value.licenseUrl, "descriptor.attribution.licenseUrl", diagnostics);
  const notes = validateText(value.notes, "descriptor.attribution.notes", diagnostics, { nullable: true });
  const redistribution = value.redistribution;
  if (redistribution !== "allowed" && redistribution !== "restricted" && redistribution !== "unknown") {
    diagnostics.push(error("invalid-redistribution", "descriptor.attribution.redistribution must be allowed, restricted, or unknown.", { field: "descriptor.attribution.redistribution" }));
  }
  if (
    retrievedAt !== null &&
    (!/^\d{4}-\d{2}-\d{2}$/u.test(retrievedAt) || Number.isNaN(Date.parse(`${retrievedAt}T00:00:00Z`)))
  ) {
    diagnostics.push(error("invalid-date", "descriptor.attribution.retrievedAt must use YYYY-MM-DD or null.", { field: "descriptor.attribution.retrievedAt" }));
  }
  if (sourceName === null || publisher === null || (redistribution !== "allowed" && redistribution !== "restricted" && redistribution !== "unknown")) {
    return null;
  }
  return { sourceName, sourceUrl, publisher, retrievedAt, licenseName, licenseUrl, redistribution, notes };
};

const readDescriptor = (
  value: unknown,
  diagnostics: CatalogImportDiagnostic[],
): ThreadCatalogDescriptor | null => {
  if (!isRecord(value)) {
    diagnostics.push(error("invalid-descriptor", "descriptor must be an object.", { field: "descriptor" }));
    return null;
  }
  recordUnknownKeys(value, ["id", "brand", "line", "version", "attribution"], "descriptor", diagnostics);
  const id = validateText(value.id, "descriptor.id", diagnostics, { required: true });
  const brand = validateText(value.brand, "descriptor.brand", diagnostics, { required: true });
  const line = validateText(value.line, "descriptor.line", diagnostics, { required: true });
  const version = validateText(value.version, "descriptor.version", diagnostics, { required: true });
  const attribution = readAttribution(value.attribution, diagnostics);
  if (id !== null && (!CATALOG_ID.test(id) || id === "cocolla" || id.startsWith("cocolla."))) {
    diagnostics.push(error("invalid-catalog-id", "Catalog namespace must be 3–64 lowercase identifier characters and cannot use the reserved cocolla. prefix.", { field: "descriptor.id" }));
  }
  if (version !== null && (!PRODUCT_CODE.test(version) || version.length > 64)) {
    diagnostics.push(error("invalid-catalog-version", "Catalog version must be a 1–64 character stable identifier.", { field: "descriptor.version" }));
  }
  return id === null || brand === null || line === null || version === null || attribution === null
    ? null
    : { id, brand, line, version, attribution };
};

const readRightsConfirmation = (
  value: unknown,
  diagnostics: CatalogImportDiagnostic[],
): ThreadCatalogRightsConfirmation | null => {
  if (!isRecord(value)) {
    diagnostics.push(error("rights-confirmation-required", "rightsConfirmation must be present.", { field: "rightsConfirmation" }));
    return null;
  }
  recordUnknownKeys(value, ["statementVersion", "confirmed", "confirmedAt"], "rightsConfirmation", diagnostics);
  if (value.statementVersion !== 1) {
    diagnostics.push(error("unsupported-rights-statement", "rightsConfirmation.statementVersion must be 1.", { field: "rightsConfirmation.statementVersion" }));
  }
  if (value.confirmed !== true) {
    diagnostics.push(error("rights-confirmation-required", "The user must confirm their right to use the imported data.", { field: "rightsConfirmation.confirmed" }));
  }
  const confirmedAt = validateText(value.confirmedAt, "rightsConfirmation.confirmedAt", diagnostics, { required: true });
  if (confirmedAt !== null && (!ISO_TIMESTAMP.test(confirmedAt) || Number.isNaN(Date.parse(confirmedAt)))) {
    diagnostics.push(error("invalid-timestamp", "rightsConfirmation.confirmedAt must be an ISO UTC timestamp.", { field: "rightsConfirmation.confirmedAt" }));
  }
  return value.statementVersion === 1 && value.confirmed === true && confirmedAt !== null
    ? { statementVersion: 1, confirmed: true, confirmedAt }
    : null;
};

const readProducts = (
  value: unknown,
  descriptor: ThreadCatalogDescriptor | null,
  diagnostics: CatalogImportDiagnostic[],
  rows?: readonly number[],
): readonly ThreadProduct[] => {
  if (!Array.isArray(value)) {
    diagnostics.push(error("invalid-products", "products must be an array.", { field: "products" }));
    return [];
  }
  if (value.length > MAX_CATALOG_PRODUCTS) {
    diagnostics.push(error("too-many-products", `Catalogs cannot contain more than ${String(MAX_CATALOG_PRODUCTS)} products.`, { field: "products" }));
  }
  if (value.length === 0) {
    diagnostics.push(error("empty-catalog", "Catalogs must contain at least one product.", { field: "products" }));
  }
  const products: ThreadProduct[] = [];
  const ids = new Set<string>();
  const codes = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const row = rows?.[index];
    const location = row === undefined ? { field: `products[${String(index)}]` } : { row };
    if (!isRecord(raw)) {
      diagnostics.push(error("invalid-product", "Product must be an object.", location));
      continue;
    }
    recordUnknownKeys(raw, ["id", "catalogId", "manufacturerCode", "name", "color"], `products[${String(index)}]`, diagnostics);
    const id = validateText(raw.id, `products[${String(index)}].id`, diagnostics, { required: true });
    const catalogId = validateText(raw.catalogId, `products[${String(index)}].catalogId`, diagnostics, { required: true });
    const code = validateText(raw.manufacturerCode, `products[${String(index)}].manufacturerCode`, diagnostics, { required: true });
    const name = validateText(raw.name, `products[${String(index)}].name`, diagnostics, { required: true });
    if (!isRecord(raw.color)) {
      diagnostics.push(error("invalid-color", "Product color must be an object.", { ...location, field: "color" }));
      continue;
    }
    recordUnknownKeys(raw.color, ["colorSpace", "value", "provenance"], `products[${String(index)}].color`, diagnostics);
    let colorValue: string | null = null;
    if (typeof raw.color.value === "string") {
      try {
        colorValue = normalizeSrgbHex(raw.color.value);
      } catch {
        diagnostics.push(error("invalid-color", "HEX colors must use exactly six hexadecimal digits.", { ...location, field: "hex" }));
      }
    } else {
      diagnostics.push(error("invalid-color", "HEX color is required.", { ...location, field: "hex" }));
    }
    const provenance = raw.color.provenance;
    if (raw.color.colorSpace !== "srgb" || (provenance !== "catalog" && provenance !== "measured" && provenance !== "user-supplied")) {
      diagnostics.push(error("invalid-color-metadata", "Color space must be srgb and provenance must be catalog, measured, or user-supplied.", location));
    }
    if (code !== null && !PRODUCT_CODE.test(code)) {
      diagnostics.push(error("invalid-product-code", "Product codes must be 1–64 ASCII identifier characters.", { ...location, field: "code" }));
    }
    if (
      descriptor !== null &&
      (catalogId !== descriptor.id || id === null || !PRODUCT_ID.test(id) || !id.startsWith(`${descriptor.id}:`))
    ) {
      diagnostics.push(error("invalid-product-id", `Product IDs must be qualified by ${descriptor.id}.`, { ...location, field: "id" }));
    }
    if (id !== null && ids.has(id)) diagnostics.push(error("duplicate-product-id", `Duplicate product ID: ${id}.`, location));
    if (code !== null && codes.has(normalizedCode(code))) diagnostics.push(error("duplicate-product-code", `Duplicate product code: ${code}.`, { ...location, field: "code" }));
    if (id !== null) ids.add(id);
    if (code !== null) codes.add(normalizedCode(code));
    if (
      id !== null && catalogId !== null && code !== null && name !== null && colorValue !== null &&
      raw.color.colorSpace === "srgb" &&
      (provenance === "catalog" || provenance === "measured" || provenance === "user-supplied")
    ) {
      products.push({ id, catalogId, manufacturerCode: code, name, color: { colorSpace: "srgb", value: colorValue, provenance } });
    }
  }
  return products;
};

const validateCatalogValue = (value: unknown): CatalogImportResult => {
  const diagnostics: CatalogImportDiagnostic[] = [];
  if (!isRecord(value)) return { ok: false, diagnostics: [error("invalid-document", "Catalog JSON must contain an object.")] };
  if (value.format !== PORTABLE_THREAD_CATALOG_FORMAT) {
    diagnostics.push(error("unsupported-format", `Catalog format must be ${PORTABLE_THREAD_CATALOG_FORMAT}.`, { field: "format" }));
  }
  if (value.formatVersion !== PORTABLE_THREAD_CATALOG_VERSION) {
    diagnostics.push(error("unsupported-version", `Catalog format version ${String(value.formatVersion)} is unsupported.`, { field: "formatVersion" }));
  }
  recordUnknownKeys(value, ["format", "formatVersion", "descriptor", "rightsConfirmation", "products"], "catalog", diagnostics);
  const descriptor = readDescriptor(value.descriptor, diagnostics);
  const rightsConfirmation = readRightsConfirmation(value.rightsConfirmation, diagnostics);
  const products = readProducts(value.products, descriptor, diagnostics);
  if (diagnostics.some((item) => item.severity === "error") || descriptor === null || rightsConfirmation === null) {
    return { ok: false, diagnostics };
  }
  const sorted = [...products].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  return {
    ok: true,
    catalog: cloneCatalog({
      format: PORTABLE_THREAD_CATALOG_FORMAT,
      formatVersion: PORTABLE_THREAD_CATALOG_VERSION,
      descriptor,
      rightsConfirmation,
      products: sorted,
    }),
    diagnostics,
  };
};

const parseTextInput = (
  input: string | Uint8Array,
): { readonly text: string } | { readonly diagnostics: readonly CatalogImportDiagnostic[] } => {
  if (inputBytes(input) > MAX_CATALOG_FILE_BYTES) {
    return { diagnostics: [error("file-too-large", "Catalog files cannot exceed 5 MiB.")] };
  }
  try {
    return { text: decodeInput(input) };
  } catch {
    return { diagnostics: [error("invalid-encoding", "Catalog files must be valid UTF-8.")] };
  }
};

export const parsePortableThreadCatalogJson = (
  input: string | Uint8Array,
): CatalogImportResult => {
  const decoded = parseTextInput(input);
  if ("diagnostics" in decoded) return { ok: false, diagnostics: decoded.diagnostics };
  try {
    return validateCatalogValue(JSON.parse(decoded.text) as unknown);
  } catch {
    return { ok: false, diagnostics: [error("malformed-json", "Catalog JSON is malformed.")] };
  }
};

interface CsvRow {
  readonly line: number;
  readonly cells: readonly string[];
}

const parseCsvRows = (text: string): { readonly rows: readonly CsvRow[]; readonly diagnostics: readonly CatalogImportDiagnostic[] } => {
  const diagnostics: CatalogImportDiagnostic[] = [];
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let field = "";
  let state: "unquoted" | "quoted" | "after-quote" = "unquoted";
  let line = 1;
  let rowLine = 1;
  let endedWithRecordBreak = false;
  const pushField = (): void => { cells.push(field); field = ""; state = "unquoted"; };
  const pushRow = (): void => {
    pushField();
    if (cells.some((cell) => cell.length > 0)) rows.push({ line: rowLine, cells });
    cells = [];
    rowLine = line + 1;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    const isCrLf = character === "\r" && text[index + 1] === "\n";
    const isBreak = character === "\n" || character === "\r";
    if (state === "quoted") {
      if (character === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else state = "after-quote";
      } else if (isBreak) {
        field += "\n";
        if (isCrLf) index += 1;
        line += 1;
      } else field += character;
      endedWithRecordBreak = false;
      continue;
    }
    if (state === "after-quote") {
      if (character === ",") { pushField(); endedWithRecordBreak = false; continue; }
      if (isBreak) {
        pushRow();
        if (isCrLf) index += 1;
        line += 1;
        endedWithRecordBreak = true;
        continue;
      }
      diagnostics.push(error("malformed-csv", "Unexpected character after a closing quote.", { row: line }));
      state = "unquoted";
      field += character;
      endedWithRecordBreak = false;
      continue;
    }
    if (character === ",") { pushField(); endedWithRecordBreak = false; continue; }
    if (isBreak) {
      pushRow();
      if (isCrLf) index += 1;
      line += 1;
      endedWithRecordBreak = true;
      continue;
    }
    if (character === '"') {
      if (field.length === 0) state = "quoted";
      else diagnostics.push(error("malformed-csv", "Quotes must begin at the start of a CSV field.", { row: line }));
      endedWithRecordBreak = false;
      continue;
    }
    field += character;
    endedWithRecordBreak = false;
  }
  if (state === "quoted") diagnostics.push(error("malformed-csv", "CSV contains an unterminated quoted field.", { row: rowLine }));
  if (!endedWithRecordBreak && (field.length > 0 || cells.length > 0)) pushRow();
  return { rows, diagnostics };
};

export const createUserThreadProductId = (catalogId: string, code: string): string =>
  `${catalogId}:${normalizeText(code).toLowerCase()}`;

export const parseThreadCatalogCsv = (
  input: string | Uint8Array,
  metadata: CsvThreadCatalogMetadata,
): CatalogImportResult => {
  const decoded = parseTextInput(input);
  if ("diagnostics" in decoded) return { ok: false, diagnostics: decoded.diagnostics };
  const parsed = parseCsvRows(decoded.text);
  const diagnostics = [...parsed.diagnostics];
  const descriptorResult = readDescriptor(metadata.descriptor, diagnostics);
  const rightsResult = readRightsConfirmation(metadata.rightsConfirmation, diagnostics);
  const [header, ...dataRows] = parsed.rows;
  if (header === undefined) diagnostics.push(error("missing-header", "CSV must contain a header row."));
  const normalizedHeaders = header?.cells.map((cell) => normalizeText(cell).toLowerCase()) ?? [];
  const headerPositions = new Map<string, number>();
  for (const [index, name] of normalizedHeaders.entries()) {
    if (headerPositions.has(name)) diagnostics.push(error("duplicate-header", `Duplicate CSV header: ${name}.`, { row: header?.line ?? 1, field: name }));
    else headerPositions.set(name, index);
    if (!["code", "name", "hex", "product_id", "color_provenance"].includes(name)) {
      diagnostics.push(warning("unknown-header", `CSV header ${name} is ignored.`, { row: header?.line ?? 1, field: name }));
    }
  }
  for (const required of ["code", "name", "hex"]) {
    if (!headerPositions.has(required)) diagnostics.push(error("missing-header", `CSV header ${required} is required.`, { row: header?.line ?? 1, field: required }));
  }
  if (dataRows.length > MAX_CATALOG_PRODUCTS) {
    diagnostics.push(error("too-many-products", `Catalogs cannot contain more than ${String(MAX_CATALOG_PRODUCTS)} products.`));
  }
  const products: Record<string, unknown>[] = [];
  const rowNumbers: number[] = [];
  if (descriptorResult !== null) {
    for (const row of dataRows.slice(0, MAX_CATALOG_PRODUCTS)) {
      if (row.cells.length !== normalizedHeaders.length) {
        diagnostics.push(error("malformed-record", `CSV row has ${String(row.cells.length)} fields; expected ${String(normalizedHeaders.length)}.`, { row: row.line }));
        continue;
      }
      const get = (name: string): string => {
        const index = headerPositions.get(name);
        return index === undefined ? "" : row.cells[index] ?? "";
      };
      const code = normalizeText(get("code"));
      const explicitId = normalizeText(get("product_id"));
      const provenanceValue = normalizeText(get("color_provenance"));
      products.push({
        id: explicitId.length === 0 ? createUserThreadProductId(descriptorResult.id, code) : explicitId,
        catalogId: descriptorResult.id,
        manufacturerCode: code,
        name: get("name"),
        color: {
          colorSpace: "srgb",
          value: get("hex"),
          provenance: provenanceValue.length === 0 ? "user-supplied" : provenanceValue,
        },
      });
      rowNumbers.push(row.line);
    }
  }
  const validatedProducts = readProducts(products, descriptorResult, diagnostics, rowNumbers);
  if (diagnostics.some((item) => item.severity === "error") || descriptorResult === null || rightsResult === null) {
    return { ok: false, diagnostics };
  }
  return {
    ok: true,
    catalog: cloneCatalog({
      format: PORTABLE_THREAD_CATALOG_FORMAT,
      formatVersion: PORTABLE_THREAD_CATALOG_VERSION,
      descriptor: descriptorResult,
      rightsConfirmation: rightsResult,
      products: [...validatedProducts].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    }),
    diagnostics,
  };
};

export const serializePortableThreadCatalog = (catalog: PortableThreadCatalogV1): string => {
  const validated = validateCatalogValue(catalog);
  if (!validated.ok) {
    throw new RangeError(validated.diagnostics.map((item) => item.message).join(" "));
  }
  const value = validated.catalog;
  return JSON.stringify({
    format: value.format,
    formatVersion: value.formatVersion,
    descriptor: {
      id: value.descriptor.id,
      brand: value.descriptor.brand,
      line: value.descriptor.line,
      version: value.descriptor.version,
      attribution: {
        sourceName: value.descriptor.attribution.sourceName,
        sourceUrl: value.descriptor.attribution.sourceUrl,
        publisher: value.descriptor.attribution.publisher,
        retrievedAt: value.descriptor.attribution.retrievedAt,
        licenseName: value.descriptor.attribution.licenseName,
        licenseUrl: value.descriptor.attribution.licenseUrl,
        redistribution: value.descriptor.attribution.redistribution,
        notes: value.descriptor.attribution.notes,
      },
    },
    rightsConfirmation: {
      statementVersion: value.rightsConfirmation.statementVersion,
      confirmed: value.rightsConfirmation.confirmed,
      confirmedAt: value.rightsConfirmation.confirmedAt,
    },
    products: value.products.map((product) => ({
      id: product.id,
      catalogId: product.catalogId,
      manufacturerCode: product.manufacturerCode,
      name: product.name,
      color: {
        colorSpace: product.color.colorSpace,
        value: product.color.value,
        provenance: product.color.provenance,
      },
    })),
  });
};

export const portableCatalogKey = (
  catalog: Pick<PortableThreadCatalogV1, "descriptor">,
): string => JSON.stringify([catalog.descriptor.id, catalog.descriptor.version]);
