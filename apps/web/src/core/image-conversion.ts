export const MIN_IMAGE_PATTERN_DIMENSION = 1;
export const MAX_IMAGE_PATTERN_DIMENSION = 500;
export const MAX_IMAGE_PATTERN_STITCHES = 100_000;
export const MIN_IMAGE_PATTERN_COLORS = 2;
export const MAX_IMAGE_PATTERN_COLORS = 32;
export const TRANSPARENT_ALPHA_THRESHOLD = 16;

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ImagePixelSource {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface ImageConversionOptions {
  readonly width: number;
  readonly height: number;
  readonly maxColors: number;
  readonly dither: boolean;
}

export interface ImageConversionResult {
  readonly width: number;
  readonly height: number;
  readonly palette: readonly RgbColor[];
  readonly colorIndices: Int16Array;
  readonly stitchCount: number;
}

interface HistogramColor extends RgbColor {
  readonly key: number;
  readonly count: number;
}

interface ColorBox {
  readonly colors: readonly HistogramColor[];
  readonly count: number;
  readonly ranges: readonly [number, number, number];
}

const clampInteger = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

export const validateImageConversionOptions = (
  options: ImageConversionOptions,
): void => {
  if (
    !Number.isSafeInteger(options.width) ||
    !Number.isSafeInteger(options.height) ||
    options.width < MIN_IMAGE_PATTERN_DIMENSION ||
    options.height < MIN_IMAGE_PATTERN_DIMENSION ||
    options.width > MAX_IMAGE_PATTERN_DIMENSION ||
    options.height > MAX_IMAGE_PATTERN_DIMENSION
  ) {
    throw new RangeError(
      `Image patterns must be ${String(MIN_IMAGE_PATTERN_DIMENSION)}–${String(MAX_IMAGE_PATTERN_DIMENSION)} cells per side.`,
    );
  }
  if (options.width * options.height > MAX_IMAGE_PATTERN_STITCHES) {
    throw new RangeError(
      `Image patterns cannot exceed ${MAX_IMAGE_PATTERN_STITCHES.toLocaleString("en-US")} cells.`,
    );
  }
  if (
    !Number.isSafeInteger(options.maxColors) ||
    options.maxColors < MIN_IMAGE_PATTERN_COLORS ||
    options.maxColors > MAX_IMAGE_PATTERN_COLORS
  ) {
    throw new RangeError(
      `Palette size must be ${String(MIN_IMAGE_PATTERN_COLORS)}–${String(MAX_IMAGE_PATTERN_COLORS)} colors.`,
    );
  }
};

export const lockedImagePatternDimensions = (
  sourceWidth: number,
  sourceHeight: number,
  value: number,
  changedAxis: "width" | "height",
): { readonly width: number; readonly height: number } => {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new RangeError("Source image dimensions must be positive.");
  }
  const requested = clampInteger(
    value,
    MIN_IMAGE_PATTERN_DIMENSION,
    MAX_IMAGE_PATTERN_DIMENSION,
  );
  let width = changedAxis === "width"
    ? requested
    : Math.max(1, Math.round(requested * sourceWidth / sourceHeight));
  let height = changedAxis === "height"
    ? requested
    : Math.max(1, Math.round(requested * sourceHeight / sourceWidth));
  const sideScale = Math.min(
    1,
    MAX_IMAGE_PATTERN_DIMENSION / width,
    MAX_IMAGE_PATTERN_DIMENSION / height,
  );
  width = Math.max(1, Math.floor(width * sideScale));
  height = Math.max(1, Math.floor(height * sideScale));
  const cellScale = Math.min(
    1,
    Math.sqrt(MAX_IMAGE_PATTERN_STITCHES / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * cellScale)),
    height: Math.max(1, Math.floor(height * cellScale)),
  };
};

export const defaultImagePatternDimensions = (
  sourceWidth: number,
  sourceHeight: number,
): { readonly width: number; readonly height: number } =>
  sourceWidth >= sourceHeight
    ? lockedImagePatternDimensions(sourceWidth, sourceHeight, 80, "width")
    : lockedImagePatternDimensions(sourceWidth, sourceHeight, 80, "height");

export const boundedImagePatternDimensions = (
  width: number,
  height: number,
  changedAxis: "width" | "height",
): { readonly width: number; readonly height: number } => {
  const boundedWidth = clampInteger(
    width,
    MIN_IMAGE_PATTERN_DIMENSION,
    MAX_IMAGE_PATTERN_DIMENSION,
  );
  const boundedHeight = clampInteger(
    height,
    MIN_IMAGE_PATTERN_DIMENSION,
    MAX_IMAGE_PATTERN_DIMENSION,
  );
  if (boundedWidth * boundedHeight <= MAX_IMAGE_PATTERN_STITCHES) {
    return { width: boundedWidth, height: boundedHeight };
  }
  return changedAxis === "width"
    ? {
        width: boundedWidth,
        height: Math.max(1, Math.floor(MAX_IMAGE_PATTERN_STITCHES / boundedWidth)),
      }
    : {
        width: Math.max(1, Math.floor(MAX_IMAGE_PATTERN_STITCHES / boundedHeight)),
        height: boundedHeight,
      };
};

const assertPixelSource = (source: ImagePixelSource): void => {
  if (
    !Number.isSafeInteger(source.width) ||
    !Number.isSafeInteger(source.height) ||
    source.width <= 0 ||
    source.height <= 0 ||
    source.data.length !== source.width * source.height * 4
  ) {
    throw new RangeError("Decoded image pixels do not match their dimensions.");
  }
};

const downsample = (
  source: ImagePixelSource,
  targetWidth: number,
  targetHeight: number,
): Uint8ClampedArray => {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY0 = Math.floor(targetY * source.height / targetHeight);
    const sourceY1 = Math.max(
      sourceY0 + 1,
      Math.ceil((targetY + 1) * source.height / targetHeight),
    );
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX0 = Math.floor(targetX * source.width / targetWidth);
      const sourceX1 = Math.max(
        sourceX0 + 1,
        Math.ceil((targetX + 1) * source.width / targetWidth),
      );
      let red = 0;
      let green = 0;
      let blue = 0;
      let samples = 0;
      let visible = false;
      for (let sourceY = sourceY0; sourceY < sourceY1; sourceY += 1) {
        for (let sourceX = sourceX0; sourceX < sourceX1; sourceX += 1) {
          const sourceIndex = (sourceY * source.width + sourceX) * 4;
          const alphaByte = source.data[sourceIndex + 3] ?? 0;
          const alpha = alphaByte / 255;
          visible ||= alphaByte >= TRANSPARENT_ALPHA_THRESHOLD;
          red += (source.data[sourceIndex] ?? 0) * alpha + 255 * (1 - alpha);
          green += (source.data[sourceIndex + 1] ?? 0) * alpha + 255 * (1 - alpha);
          blue += (source.data[sourceIndex + 2] ?? 0) * alpha + 255 * (1 - alpha);
          samples += 1;
        }
      }
      const targetIndex = (targetY * targetWidth + targetX) * 4;
      output[targetIndex] = Math.round(red / samples);
      output[targetIndex + 1] = Math.round(green / samples);
      output[targetIndex + 2] = Math.round(blue / samples);
      output[targetIndex + 3] = visible ? 255 : 0;
    }
  }
  return output;
};

const makeColorBox = (colors: readonly HistogramColor[]): ColorBox => {
  let minimumRed = 255;
  let maximumRed = 0;
  let minimumGreen = 255;
  let maximumGreen = 0;
  let minimumBlue = 255;
  let maximumBlue = 0;
  let count = 0;
  for (const color of colors) {
    minimumRed = Math.min(minimumRed, color.r);
    maximumRed = Math.max(maximumRed, color.r);
    minimumGreen = Math.min(minimumGreen, color.g);
    maximumGreen = Math.max(maximumGreen, color.g);
    minimumBlue = Math.min(minimumBlue, color.b);
    maximumBlue = Math.max(maximumBlue, color.b);
    count += color.count;
  }
  return {
    colors,
    count,
    ranges: [
      maximumRed - minimumRed,
      maximumGreen - minimumGreen,
      maximumBlue - minimumBlue,
    ],
  };
};

const splitColorBox = (box: ColorBox): readonly [ColorBox, ColorBox] | null => {
  if (box.colors.length < 2) {
    return null;
  }
  const axis = box.ranges[1] > box.ranges[0]
    ? (box.ranges[2] > box.ranges[1] ? 2 : 1)
    : (box.ranges[2] > box.ranges[0] ? 2 : 0);
  const sorted = [...box.colors].sort((left, right) => {
    const channelsLeft = [left.r, left.g, left.b];
    const channelsRight = [right.r, right.g, right.b];
    return (
      (channelsLeft[axis] ?? 0) - (channelsRight[axis] ?? 0) ||
      left.key - right.key
    );
  });
  const midpoint = box.count / 2;
  let running = 0;
  let splitIndex = 1;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    running += sorted[index]?.count ?? 0;
    if (running >= midpoint) {
      splitIndex = index + 1;
      break;
    }
  }
  return [
    makeColorBox(sorted.slice(0, splitIndex)),
    makeColorBox(sorted.slice(splitIndex)),
  ];
};

const averageColor = (box: ColorBox): RgbColor => {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const color of box.colors) {
    red += color.r * color.count;
    green += color.g * color.count;
    blue += color.b * color.count;
  }
  return {
    r: Math.round(red / box.count),
    g: Math.round(green / box.count),
    b: Math.round(blue / box.count),
  };
};

const createPalette = (
  pixels: Uint8ClampedArray,
  maximumColors: number,
): readonly RgbColor[] => {
  const counts = new Map<number, number>();
  for (let index = 0; index < pixels.length; index += 4) {
    if ((pixels[index + 3] ?? 0) === 0) {
      continue;
    }
    const key = ((pixels[index] ?? 0) << 16) |
      ((pixels[index + 1] ?? 0) << 8) |
      (pixels[index + 2] ?? 0);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) {
    return [{ r: 255, g: 255, b: 255 }];
  }
  const histogram = [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([key, count]) => ({
      key,
      count,
      r: (key >> 16) & 255,
      g: (key >> 8) & 255,
      b: key & 255,
    }));
  const boxes: ColorBox[] = [makeColorBox(histogram)];
  while (boxes.length < maximumColors) {
    let candidateIndex = -1;
    let candidateScore = -1;
    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index];
      if (box === undefined || box.colors.length < 2) {
        continue;
      }
      const score = Math.max(...box.ranges) * box.count;
      if (score > candidateScore) {
        candidateIndex = index;
        candidateScore = score;
      }
    }
    if (candidateIndex < 0) {
      break;
    }
    const candidate = boxes[candidateIndex];
    const split = candidate === undefined ? null : splitColorBox(candidate);
    if (split === null) {
      break;
    }
    boxes.splice(candidateIndex, 1, ...split);
  }
  const unique = new Map<number, RgbColor>();
  for (const box of boxes) {
    const color = averageColor(box);
    const key = (color.r << 16) | (color.g << 8) | color.b;
    unique.set(key, color);
  }
  return [...unique.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, color]) => color);
};

const nearestPaletteIndex = (
  red: number,
  green: number,
  blue: number,
  palette: readonly RgbColor[],
): number => {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < palette.length; index += 1) {
    const color = palette[index];
    if (color === undefined) {
      continue;
    }
    const distance =
      (red - color.r) ** 2 +
      (green - color.g) ** 2 +
      (blue - color.b) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
};

const assignWithoutDithering = (
  pixels: Uint8ClampedArray,
  palette: readonly RgbColor[],
): Int16Array => {
  const indices = new Int16Array(pixels.length / 4);
  indices.fill(-1);
  for (let pixelIndex = 0; pixelIndex < indices.length; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4;
    if ((pixels[sourceIndex + 3] ?? 0) === 0) {
      continue;
    }
    indices[pixelIndex] = nearestPaletteIndex(
      pixels[sourceIndex] ?? 0,
      pixels[sourceIndex + 1] ?? 0,
      pixels[sourceIndex + 2] ?? 0,
      palette,
    );
  }
  return indices;
};

const assignWithDithering = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  palette: readonly RgbColor[],
): Int16Array => {
  const indices = new Int16Array(width * height);
  indices.fill(-1);
  const working = new Float32Array(width * height * 3);
  const occupied = new Uint8Array(width * height);
  for (let pixelIndex = 0; pixelIndex < occupied.length; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4;
    occupied[pixelIndex] = (pixels[sourceIndex + 3] ?? 0) === 0 ? 0 : 1;
    working[pixelIndex * 3] = pixels[sourceIndex] ?? 0;
    working[pixelIndex * 3 + 1] = pixels[sourceIndex + 1] ?? 0;
    working[pixelIndex * 3 + 2] = pixels[sourceIndex + 2] ?? 0;
  }
  const distribute = (
    x: number,
    y: number,
    errorRed: number,
    errorGreen: number,
    errorBlue: number,
    weight: number,
  ): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const pixelIndex = y * width + x;
    if (occupied[pixelIndex] !== 1) {
      return;
    }
    const index = pixelIndex * 3;
    working[index] = (working[index] ?? 0) + errorRed * weight;
    working[index + 1] = (working[index + 1] ?? 0) + errorGreen * weight;
    working[index + 2] = (working[index + 2] ?? 0) + errorBlue * weight;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (occupied[pixelIndex] !== 1) {
        continue;
      }
      const index = pixelIndex * 3;
      const red = Math.min(255, Math.max(0, working[index] ?? 0));
      const green = Math.min(255, Math.max(0, working[index + 1] ?? 0));
      const blue = Math.min(255, Math.max(0, working[index + 2] ?? 0));
      const paletteIndex = nearestPaletteIndex(red, green, blue, palette);
      indices[pixelIndex] = paletteIndex;
      const chosen = palette[paletteIndex] ?? { r: 0, g: 0, b: 0 };
      const errorRed = red - chosen.r;
      const errorGreen = green - chosen.g;
      const errorBlue = blue - chosen.b;
      distribute(x + 1, y, errorRed, errorGreen, errorBlue, 7 / 16);
      distribute(x - 1, y + 1, errorRed, errorGreen, errorBlue, 3 / 16);
      distribute(x, y + 1, errorRed, errorGreen, errorBlue, 5 / 16);
      distribute(x + 1, y + 1, errorRed, errorGreen, errorBlue, 1 / 16);
    }
  }
  return indices;
};

export const convertImagePixels = (
  source: ImagePixelSource,
  options: ImageConversionOptions,
): ImageConversionResult => {
  assertPixelSource(source);
  validateImageConversionOptions(options);
  const pixels = downsample(source, options.width, options.height);
  const palette = createPalette(pixels, options.maxColors);
  const colorIndices = options.dither
    ? assignWithDithering(pixels, options.width, options.height, palette)
    : assignWithoutDithering(pixels, palette);
  let stitchCount = 0;
  for (const colorIndex of colorIndices) {
    if (colorIndex >= 0) {
      stitchCount += 1;
    }
  }
  return {
    width: options.width,
    height: options.height,
    palette,
    colorIndices,
    stitchCount,
  };
};

export const imageConversionPreviewPixels = (
  result: ImageConversionResult,
): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(result.width * result.height * 4);
  for (let pixelIndex = 0; pixelIndex < result.colorIndices.length; pixelIndex += 1) {
    const targetIndex = pixelIndex * 4;
    const paletteIndex = result.colorIndices[pixelIndex] ?? -1;
    if (paletteIndex < 0) {
      pixels[targetIndex] = 255;
      pixels[targetIndex + 1] = 255;
      pixels[targetIndex + 2] = 255;
      pixels[targetIndex + 3] = 0;
      continue;
    }
    const color = result.palette[paletteIndex] ?? { r: 0, g: 0, b: 0 };
    pixels[targetIndex] = color.r;
    pixels[targetIndex + 1] = color.g;
    pixels[targetIndex + 2] = color.b;
    pixels[targetIndex + 3] = 255;
  }
  return pixels;
};
