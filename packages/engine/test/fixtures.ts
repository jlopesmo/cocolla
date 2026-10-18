import type {
  PatternColorV1,
  PatternDocument,
  StitchElementV1,
} from "../src/index.js";
import {
  DEFAULT_UNITS_PER_FABRIC_CELL,
  createPatternDocument,
} from "../src/index.js";

export const black: PatternColorV1 = {
  id: "color-black",
  name: "Black",
  rgb: "#000000",
  symbol: "X",
  threadProductId: null,
};

export const red: PatternColorV1 = {
  id: "color-red",
  name: "Red",
  rgb: "#FF0000",
  symbol: "R",
  threadProductId: null,
};

export const makeDocument = (
  widthCells = 20,
  heightCells = 20,
): PatternDocument =>
  createPatternDocument({
    id: "pattern-test",
    name: "Test pattern",
    width: widthCells * DEFAULT_UNITS_PER_FABRIC_CELL,
    height: heightCells * DEFAULT_UNITS_PER_FABRIC_CELL,
    layers: [{ id: "layer-main", name: "Main", order: 0 }],
    colors: [black, red],
  });

export const fullCross = (
  id: string,
  xCell: number,
  yCell: number,
  colorId = black.id,
): StitchElementV1 => ({
  id,
  technique: { key: "full-cross", version: 1 },
  layerId: "layer-main",
  colorId,
  geometry: {
    anchor: {
      x: xCell * DEFAULT_UNITS_PER_FABRIC_CELL,
      y: yCell * DEFAULT_UNITS_PER_FABRIC_CELL,
    },
    data: {},
  },
  elementRevision: 0,
});

export const makeDenseDocument = (count: number): PatternDocument => {
  const widthCells = Math.ceil(Math.sqrt(count));
  const heightCells = Math.ceil(count / widthCells);
  const base = makeDocument(widthCells, heightCells);
  const stitches = Array.from({ length: count }, (_, index) =>
    fullCross(
      `stitch-${String(index).padStart(10, "0")}`,
      index % widthCells,
      Math.floor(index / widthCells),
      index % 2 === 0 ? black.id : red.id,
    ),
  );
  return { ...base, stitches };
};
