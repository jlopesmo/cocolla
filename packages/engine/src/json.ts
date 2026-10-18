import type { JsonObject, JsonValue } from "../../contracts/src/index.js";

export const cloneJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneJsonValue(child)]),
    ) as JsonObject;
  }
  return value;
};

export const cloneJsonObject = (value: JsonObject): JsonObject =>
  cloneJsonValue(value) as JsonObject;
