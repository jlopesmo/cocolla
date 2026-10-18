import { convertImagePixels, type ImagePixelSource } from "../core/image-conversion.js";
import type {
  ImageConversionWorkerRequest,
  ImageConversionWorkerResponse,
} from "../core/image-worker-contract.js";

interface WorkerPort {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ImageConversionWorkerRequest>) => void,
  ): void;
  postMessage(message: ImageConversionWorkerResponse, transfer?: readonly Transferable[]): void;
}

const port = self as unknown as WorkerPort;
let source: ImagePixelSource | null = null;

port.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "source") {
    source = {
      width: message.width,
      height: message.height,
      data: message.pixels,
    };
    return;
  }
  try {
    if (source === null) {
      throw new Error("No decoded image is loaded.");
    }
    const started = performance.now();
    const result = convertImagePixels(source, message.options);
    const response: ImageConversionWorkerResponse = {
      type: "result",
      requestId: message.requestId,
      result,
      elapsedMs: performance.now() - started,
    };
    port.postMessage(response, [result.colorIndices.buffer]);
  } catch (error) {
    port.postMessage({
      type: "error",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : "Image conversion failed.",
    });
  }
});
