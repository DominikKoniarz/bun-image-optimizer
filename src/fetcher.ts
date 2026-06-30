const ALLOWED_MIME_TYPE = new Set([
    "image/avif",
    "image/bmp",
    // "image/gif",
    "image/jpeg",
    "image/jpg",
    "image/png",
    // "image/svg+xml", // TODO: what about svg?
    "image/tiff",
    "image/webp",
    "image/heic",
    "image/heif",
]);

import { type AppError, appError } from "./errors";

type FetchSourceImageResult =
    | {
          error: AppError;
          arrayBuffer: null;
      }
    | {
          error: null;
          arrayBuffer: ArrayBuffer;
      };

export const fetchSourceImage = async (
    url: string,
): Promise<FetchSourceImageResult> => {
    try {
        const timeout = AbortSignal.timeout(10000);

        const response = await fetch(url, {
            signal: timeout,
        });

        if (!response.ok) {
            return {
                error: appError("SOURCE_FETCH_FAILED", "Failed to fetch source image"),
                arrayBuffer: null,
            };
        }

        const contentType = response.headers.get("Content-Type");

        // TODO: what about image/jpeg; charset=utf-8 here?
        if (!contentType || !ALLOWED_MIME_TYPE.has(contentType)) {
            return {
                error: appError(
                    "SOURCE_UNSUPPORTED_CONTENT_TYPE",
                    "Unsupported or missing image content type",
                ),
                arrayBuffer: null,
            };
        }

        return {
            error: null,
            arrayBuffer: await response.arrayBuffer(),
        };
    } catch (err) {
        if (process.env.NODE_ENV === "development") console.error(err);

        const message =
            err instanceof DOMException && err.name === "TimeoutError"
                ? "Source image fetch timed out"
                : "Failed to fetch source image";

        return {
            error: appError("SOURCE_FETCH_FAILED", message),
            arrayBuffer: null,
        };
    }
};
