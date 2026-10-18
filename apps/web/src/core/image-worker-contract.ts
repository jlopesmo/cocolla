import type {
  ImageConversionOptions,
  ImageConversionResult,
} from "./image-conversion.js";

export type ImageConversionWorkerRequest =
  | {
      readonly type: "source";
      readonly width: number;
      readonly height: number;
      readonly pixels: Uint8ClampedArray;
    }
  | {
      readonly type: "convert";
      readonly requestId: number;
      readonly options: ImageConversionOptions;
    };

export type ImageConversionWorkerResponse =
  | {
      readonly type: "result";
      readonly requestId: number;
      readonly result: ImageConversionResult;
      readonly elapsedMs: number;
    }
  | {
      readonly type: "error";
      readonly requestId: number;
      readonly message: string;
    };

export const acceptCurrentConversionResult = <Result>(
  currentRequestId: number,
  previous: Result | null,
  responseRequestId: number,
  result: Result,
): Result | null => responseRequestId === currentRequestId ? result : previous;
