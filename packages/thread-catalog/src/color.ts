export interface LabColor {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

const HEX_COLOR = /^#[0-9A-F]{6}$/u;

const multiplyMatrix = (
  matrix: readonly (readonly [number, number, number])[],
  vector: readonly [number, number, number],
): [number, number, number] => {
  const row0 = matrix[0];
  const row1 = matrix[1];
  const row2 = matrix[2];
  if (row0 === undefined || row1 === undefined || row2 === undefined) {
    throw new RangeError("A color conversion matrix must contain three rows.");
  }
  return [
    row0[0] * vector[0] + row0[1] * vector[1] + row0[2] * vector[2],
    row1[0] * vector[0] + row1[1] * vector[1] + row1[2] * vector[2],
    row2[0] * vector[0] + row2[1] * vector[1] + row2[2] * vector[2],
  ];
};

const SRGB_TO_XYZ_D65: readonly (readonly [number, number, number])[] = [
  [0.4123907992659595, 0.35758433938387796, 0.1804807884018343],
  [0.21263900587151036, 0.7151686787677559, 0.07219231536073371],
  [0.01933081871559185, 0.11919477979462599, 0.9505321522496607],
];

const D65_TO_D50: readonly (readonly [number, number, number])[] = [
  [1.0479298208405488, 0.022946793341019088, -0.05019222954313557],
  [0.029627815688159344, 0.990434484573249, -0.01707382502938514],
  [-0.009243058152591178, 0.015055144896577895, 0.7518742814281371],
];

const D50_WHITE: readonly [number, number, number] = [
  0.9642956764295677,
  1,
  0.8251046025104601,
];

const linearizeSrgb = (component: number): number =>
  component <= 0.04045
    ? component / 12.92
    : ((component + 0.055) / 1.055) ** 2.4;

const labComponent = (value: number): number => {
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  return value > epsilon ? Math.cbrt(value) : (kappa * value + 16) / 116;
};

export const normalizeSrgbHex = (value: string): string => {
  const normalized = value.toUpperCase();
  if (!HEX_COLOR.test(normalized)) {
    throw new RangeError("An sRGB color must use #RRGGBB notation.");
  }
  return normalized;
};

export const srgbHexToLab = (value: string): LabColor => {
  const hex = normalizeSrgbHex(value);
  const channels: [number, number, number] = [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ];
  const linear: [number, number, number] = [
    linearizeSrgb(channels[0]),
    linearizeSrgb(channels[1]),
    linearizeSrgb(channels[2]),
  ];
  const xyzD65 = multiplyMatrix(SRGB_TO_XYZ_D65, linear);
  const xyzD50 = multiplyMatrix(D65_TO_D50, xyzD65);
  const x = labComponent(xyzD50[0] / D50_WHITE[0]);
  const y = labComponent(xyzD50[1] / D50_WHITE[1]);
  const z = labComponent(xyzD50[2] / D50_WHITE[2]);
  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
};

const degrees = (radians: number): number => radians * 180 / Math.PI;
const radians = (angle: number): number => angle * Math.PI / 180;
const hueDegrees = (b: number, a: number): number => {
  const value = degrees(Math.atan2(b, a));
  return value < 0 ? value + 360 : value;
};

export const deltaE2000 = (reference: LabColor, sample: LabColor): number => {
  const chroma1 = Math.hypot(reference.a, reference.b);
  const chroma2 = Math.hypot(sample.a, sample.b);
  const meanChroma = (chroma1 + chroma2) / 2;
  const meanChroma7 = meanChroma ** 7;
  const adjustment = 0.5 * (
    1 - Math.sqrt(meanChroma7 / (meanChroma7 + 25 ** 7))
  );
  const adjustedA1 = (1 + adjustment) * reference.a;
  const adjustedA2 = (1 + adjustment) * sample.a;
  const adjustedChroma1 = Math.hypot(adjustedA1, reference.b);
  const adjustedChroma2 = Math.hypot(adjustedA2, sample.b);
  const hue1 = hueDegrees(reference.b, adjustedA1);
  const hue2 = hueDegrees(sample.b, adjustedA2);

  const lightnessDifference = sample.l - reference.l;
  const chromaDifference = adjustedChroma2 - adjustedChroma1;
  const hueRawDifference = hue2 - hue1;
  let hueDifference = 0;
  if (adjustedChroma1 * adjustedChroma2 !== 0) {
    if (Math.abs(hueRawDifference) <= 180) {
      hueDifference = hueRawDifference;
    } else if (hueRawDifference > 180) {
      hueDifference = hueRawDifference - 360;
    } else {
      hueDifference = hueRawDifference + 360;
    }
  }
  const adjustedHueDifference = 2 * Math.sqrt(
    adjustedChroma1 * adjustedChroma2,
  ) * Math.sin(radians(hueDifference / 2));

  const meanLightness = (reference.l + sample.l) / 2;
  const meanAdjustedChroma = (adjustedChroma1 + adjustedChroma2) / 2;
  let meanHue = hue1 + hue2;
  if (adjustedChroma1 * adjustedChroma2 !== 0) {
    if (Math.abs(hueRawDifference) <= 180) {
      meanHue = (hue1 + hue2) / 2;
    } else if (hue1 + hue2 < 360) {
      meanHue = (hue1 + hue2 + 360) / 2;
    } else {
      meanHue = (hue1 + hue2 - 360) / 2;
    }
  }

  const hueWeight = 1
    - 0.17 * Math.cos(radians(meanHue - 30))
    + 0.24 * Math.cos(radians(2 * meanHue))
    + 0.32 * Math.cos(radians(3 * meanHue + 6))
    - 0.2 * Math.cos(radians(4 * meanHue - 63));
  const lightnessOffset = meanLightness - 50;
  const lightnessWeight = 1 + 0.015 * lightnessOffset ** 2 /
    Math.sqrt(20 + lightnessOffset ** 2);
  const chromaWeight = 1 + 0.045 * meanAdjustedChroma;
  const hueScale = 1 + 0.015 * meanAdjustedChroma * hueWeight;
  const rotationAngle = 30 * Math.exp(-(((meanHue - 275) / 25) ** 2));
  const meanAdjustedChroma7 = meanAdjustedChroma ** 7;
  const chromaRotation = 2 * Math.sqrt(
    meanAdjustedChroma7 / (meanAdjustedChroma7 + 25 ** 7),
  );
  const rotation = -Math.sin(radians(2 * rotationAngle)) * chromaRotation;

  const lightnessTerm = lightnessDifference / lightnessWeight;
  const chromaTerm = chromaDifference / chromaWeight;
  const hueTerm = adjustedHueDifference / hueScale;
  return Math.sqrt(
    lightnessTerm ** 2 +
    chromaTerm ** 2 +
    hueTerm ** 2 +
    rotation * chromaTerm * hueTerm,
  );
};
