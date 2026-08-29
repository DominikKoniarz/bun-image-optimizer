import { coerce, z } from "zod/mini";
import { type AppError, appError } from "./errors";

const urlSchema = z.url({
    protocol: new RegExp("^(http|https)$"), // http or https
    error: "Valid URL is required",
});
// Search params are strings; plain z.number() rejects them—coerce turns "640" into 640 first.
const widthSchema = coerce
    .number({
        error: "Width must be a number",
    })
    .check(
        z.minimum(1, {
            error: "Width must be at least 1",
        }),
    );
const qualitySchema = coerce
    .number({
        error: "Quality must be a number",
    })
    .check(
        z.minimum(1, {
            error: "Quality must be at least 1",
        }),
        z.maximum(100, {
            error: "Quality must be less than or equal to 100",
        }),
    );

type ParsedImageSourceURLResult =
    | {
          valid: true;
          url: string;
          error: null;
      }
    | {
          valid: false;
          url: null;
          error: AppError;
      };

export const parseImageSourceUrl = (
    searchParams: URLSearchParams,
): ParsedImageSourceURLResult => {
    const url = searchParams.get("url");

    const urlResult = urlSchema.safeParse(url);

    if (!urlResult.success) {
        return {
            valid: false,
            url: null,
            error: appError(
                "INVALID_URL",
                urlResult.error.issues.at(0)?.message ?? "Validation failed",
            ),
        };
    }

    return {
        valid: true,
        url: urlResult.data,
        error: null,
    };
};

type ParsedImageWidthResult =
    | {
          valid: true;
          width: number;
          error: null;
      }
    | {
          valid: false;
          width: null;
          error: AppError;
      };

export const parseImageWidth = (
    searchParams: URLSearchParams,
): ParsedImageWidthResult => {
    const width = searchParams.get("w");

    const widthResult = widthSchema.safeParse(width);

    if (!widthResult.success) {
        return {
            valid: false,
            width: null,
            error: appError(
                "INVALID_WIDTH",
                widthResult.error.issues.at(0)?.message ?? "Validation failed",
            ),
        };
    }

    return {
        valid: true,
        width: widthResult.data,
        error: null,
    };
};

type ParsedImageQualityResult =
    | {
          valid: true;
          quality: number;
          error: null;
      }
    | {
          valid: false;
          quality: null;
          error: AppError;
      };

export const parseImageQuality = (
    searchParams: URLSearchParams,
): ParsedImageQualityResult => {
    const quality = searchParams.get("q");

    const qualityResult = qualitySchema.safeParse(quality);

    if (!qualityResult.success) {
        return {
            valid: false,
            quality: null,
            error: appError(
                "INVALID_QUALITY",
                qualityResult.error.issues.at(0)?.message ??
                    "Validation failed",
            ),
        };
    }

    return {
        valid: true,
        quality: qualityResult.data,
        error: null,
    };
};
