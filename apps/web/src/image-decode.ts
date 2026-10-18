import {
  ImageImportError,
  MAX_IMAGE_FILE_BYTES,
  boundedDecodeDimensions,
  inspectImageBytes,
  validateImageMetadata,
  type DecodedImageSource,
} from "./core/image-file.js";

const canvasBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new ImageImportError("PREVIEW_FAILED", "Image preview could not be created."));
      else resolve(blob);
    }, "image/png");
  });

export const decodeImageFile = async (file: File): Promise<DecodedImageSource> => {
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new ImageImportError(
      "IMAGE_FILE_TOO_LARGE",
      `Images cannot exceed ${String(MAX_IMAGE_FILE_BYTES / 1024 / 1024)} MB.`,
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const metadata = inspectImageBytes(bytes);
  validateImageMetadata(metadata, file.size, file.type);
  const dimensions = boundedDecodeDimensions(metadata.width, metadata.height);
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, {
      resizeWidth: dimensions.width,
      resizeHeight: dimensions.height,
      resizeQuality: "high",
    });
    if (bitmap.width !== dimensions.width || bitmap.height !== dimensions.height) {
      throw new ImageImportError("DECODE_SIZE_MISMATCH", "Decoded image dimensions were unexpected.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      throw new ImageImportError("CANVAS_UNAVAILABLE", "The browser cannot process this image.");
    }
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
    const pixels = context.getImageData(0, 0, dimensions.width, dimensions.height).data;
    const previewUrl = URL.createObjectURL(await canvasBlob(canvas));
    return {
      ...metadata,
      fileName: file.name,
      decodedWidth: dimensions.width,
      decodedHeight: dimensions.height,
      pixels,
      previewUrl,
    };
  } catch (error) {
    if (error instanceof ImageImportError) {
      throw error;
    }
    throw new ImageImportError(
      "IMAGE_DECODE_FAILED",
      error instanceof Error ? `Image decoding failed: ${error.message}` : "Image decoding failed.",
    );
  } finally {
    bitmap?.close();
  }
};
