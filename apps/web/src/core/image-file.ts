export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_SOURCE_DIMENSION = 8_192;
export const MAX_IMAGE_SOURCE_PIXELS = 25_000_000;
export const MAX_IMAGE_DECODE_DIMENSION = 1_600;
export const MAX_IMAGE_DECODE_PIXELS = 2_000_000;

export type SupportedImageFormat = "png" | "jpeg" | "webp";

export interface ImageMetadata {
  readonly format: SupportedImageFormat;
  readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
  readonly width: number;
  readonly height: number;
}

export interface DecodedImageSource extends ImageMetadata {
  readonly fileName: string;
  readonly decodedWidth: number;
  readonly decodedHeight: number;
  readonly pixels: Uint8ClampedArray;
  readonly previewUrl: string;
}

export class ImageImportError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "ImageImportError";
    this.code = code;
  }
}

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.slice(start, start + length));

const pngMetadata = (bytes: Uint8Array): ImageMetadata | null => {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    !signature.every((value, index) => bytes[index] === value) ||
    ascii(bytes, 12, 4) !== "IHDR"
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    format: "png",
    mimeType: "image/png",
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
};

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

const jpegMetadata = (bytes: Uint8Array): ImageMetadata | null => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }
  let index = 2;
  while (index + 3 < bytes.length) {
    while (index < bytes.length && bytes[index] !== 0xff) index += 1;
    while (index < bytes.length && bytes[index] === 0xff) index += 1;
    const marker = bytes[index];
    index += 1;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      continue;
    }
    if (index + 1 >= bytes.length) {
      break;
    }
    const segmentLength = ((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0);
    if (segmentLength < 2 || index + segmentLength > bytes.length) {
      break;
    }
    if (JPEG_START_OF_FRAME_MARKERS.has(marker) && segmentLength >= 7) {
      const height = ((bytes[index + 3] ?? 0) << 8) | (bytes[index + 4] ?? 0);
      const width = ((bytes[index + 5] ?? 0) << 8) | (bytes[index + 6] ?? 0);
      return { format: "jpeg", mimeType: "image/jpeg", width, height };
    }
    index += segmentLength;
  }
  throw new ImageImportError("INVALID_JPEG", "JPEG dimensions could not be read.");
};

const webpMetadata = (bytes: Uint8Array): ImageMetadata | null => {
  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    const width = 1 + (bytes[24] ?? 0) + ((bytes[25] ?? 0) << 8) + ((bytes[26] ?? 0) << 16);
    const height = 1 + (bytes[27] ?? 0) + ((bytes[28] ?? 0) << 8) + ((bytes[29] ?? 0) << 16);
    return { format: "webp", mimeType: "image/webp", width, height };
  }
  if (
    chunk === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a
  ) {
    const width = ((bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8)) & 0x3fff;
    const height = ((bytes[28] ?? 0) | ((bytes[29] ?? 0) << 8)) & 0x3fff;
    return { format: "webp", mimeType: "image/webp", width, height };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const byte0 = bytes[21] ?? 0;
    const byte1 = bytes[22] ?? 0;
    const byte2 = bytes[23] ?? 0;
    const byte3 = bytes[24] ?? 0;
    const width = 1 + byte0 + ((byte1 & 0x3f) << 8);
    const height = 1 + (byte1 >> 6) + (byte2 << 2) + ((byte3 & 0x0f) << 10);
    return { format: "webp", mimeType: "image/webp", width, height };
  }
  throw new ImageImportError("INVALID_WEBP", "WebP dimensions could not be read.");
};

export const inspectImageBytes = (bytes: Uint8Array): ImageMetadata => {
  const metadata = pngMetadata(bytes) ?? jpegMetadata(bytes) ?? webpMetadata(bytes);
  if (metadata === null) {
    throw new ImageImportError(
      "UNSUPPORTED_IMAGE_FORMAT",
      "Choose a PNG, JPEG, or WebP image.",
    );
  }
  return metadata;
};

export const validateImageMetadata = (
  metadata: ImageMetadata,
  fileSize: number,
  declaredMimeType = "",
): void => {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
    throw new ImageImportError("EMPTY_IMAGE", "The selected image is empty.");
  }
  if (fileSize > MAX_IMAGE_FILE_BYTES) {
    throw new ImageImportError(
      "IMAGE_FILE_TOO_LARGE",
      `Images cannot exceed ${String(MAX_IMAGE_FILE_BYTES / 1024 / 1024)} MB.`,
    );
  }
  if (
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(metadata.height) ||
    metadata.width <= 0 ||
    metadata.height <= 0
  ) {
    throw new ImageImportError("INVALID_IMAGE_DIMENSIONS", "Image dimensions are invalid.");
  }
  if (
    metadata.width > MAX_IMAGE_SOURCE_DIMENSION ||
    metadata.height > MAX_IMAGE_SOURCE_DIMENSION ||
    metadata.width * metadata.height > MAX_IMAGE_SOURCE_PIXELS
  ) {
    throw new ImageImportError(
      "IMAGE_DIMENSIONS_TOO_LARGE",
      `Images are limited to ${MAX_IMAGE_SOURCE_PIXELS.toLocaleString("en-US")} pixels and ${MAX_IMAGE_SOURCE_DIMENSION.toLocaleString("en-US")} pixels per side.`,
    );
  }
  if (declaredMimeType !== "" && declaredMimeType !== metadata.mimeType) {
    throw new ImageImportError(
      "IMAGE_TYPE_MISMATCH",
      "The file type does not match the image contents.",
    );
  }
};

export const boundedDecodeDimensions = (
  width: number,
  height: number,
): { readonly width: number; readonly height: number } => {
  const scale = Math.min(
    1,
    MAX_IMAGE_DECODE_DIMENSION / width,
    MAX_IMAGE_DECODE_DIMENSION / height,
    Math.sqrt(MAX_IMAGE_DECODE_PIXELS / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
};

export const imagePatternName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^.]+$/u, "").trim();
  return `${withoutExtension.length === 0 ? "Imported image" : withoutExtension} pattern`.slice(0, 120);
};
