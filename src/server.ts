import path from "node:path";
import { getImageCacheKey } from "./cache-key";
import {
    getConfig,
    IMAGE_PROCESSING_MAX_WAIT_MS,
    IMAGE_PROCESSING_POLL_INTERVAL_MS,
    type Config,
} from "./config";
import { appError, toErrorResponse } from "./errors";
import { fetchSourceImage } from "./fetcher";
import { Lock } from "./lock";
import {
    parseImageQuality,
    parseImageSourceUrl,
    parseImageWidth,
} from "./parser";
import { createImage, fetchImage, updateImage } from "./queries";
import { redis } from "./redis";

export const startServer = (config?: Partial<Config>) => {
    const { port, dataDir } = getConfig(config);

    return Bun.serve({
        routes: {
            "/image": {
                GET: async (req) => {
                    const { searchParams } = new URL(req.url);

                    const parsedUrl = parseImageSourceUrl(searchParams);
                    const parsedWidth = parseImageWidth(searchParams);
                    const parsedQuality = parseImageQuality(searchParams);

                    if (!parsedUrl.valid) {
                        return toErrorResponse(parsedUrl.error, 400);
                    }

                    if (!parsedWidth.valid) {
                        return toErrorResponse(parsedWidth.error, 400);
                    }

                    if (!parsedQuality.valid) {
                        return toErrorResponse(parsedQuality.error, 400);
                    }

                    const cacheKey = getImageCacheKey(
                        parsedUrl.url,
                        parsedWidth.width,
                        parsedQuality.quality,
                    );

                    const parsedUrlPath = path.parse(parsedUrl.url);

                    const hasExtension = parsedUrlPath.ext !== "";

                    const optimizedImageName = hasExtension
                        ? `${parsedUrlPath.name}.webp`
                        : `${cacheKey}.webp`;

                    const imageDirPath = path.join(dataDir, "images", cacheKey);
                    const imagePath = path.join(
                        imageDirPath,
                        optimizedImageName,
                    );

                    const image = await fetchImage(cacheKey);

                    const file = Bun.file(imagePath);

                    const fileExists = await file.exists();

                    if (image && fileExists) {
                        return new Response(file, {
                            headers: {
                                "Content-Type": file.type,
                                "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                                "Cache-Control":
                                    "no-cache, no-store, must-revalidate", // TODO: to be changed
                                "X-Cache-Status": "HIT",
                            },
                        });
                    }

                    const lock = new Lock({
                        id: cacheKey,
                        redis: redis,
                    });

                    const acquired = await lock.acquire();

                    if (acquired) {
                        try {
                            const imageResponse = await fetchSourceImage(
                                parsedUrl.url,
                            );

                            if (imageResponse.error !== null) {
                                return toErrorResponse(
                                    imageResponse.error,
                                    403,
                                );
                            }

                            const { width } = parsedWidth;
                            const { quality } = parsedQuality;

                            const optimizedImage = new Bun.Image(
                                imageResponse.arrayBuffer,
                            )
                                .resize(width)
                                .webp({ quality });

                            await optimizedImage.write(Bun.file(imagePath));

                            // if the image is not in the database, we create it
                            // image record could still be in the database but the file could be deleted (manually)
                            if (!image) {
                                await createImage(
                                    cacheKey,
                                    parsedUrl.url,
                                    width,
                                    quality,
                                );
                            } else {
                                await updateImage(cacheKey);
                            }

                            return new Response(optimizedImage, {
                                headers: {
                                    "Content-Type": "image/webp",
                                    "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                                    "Cache-Control":
                                        "no-cache, no-store, must-revalidate", // TODO: to be changed
                                    "X-Cache-Status":
                                        image && fileExists ? "HIT" : "MISS",
                                },
                            });
                        } finally {
                            await lock.release();
                        }
                    } else {
                        const startedAt = Date.now();

                        // TODO: maybe add exponential backoff
                        while (
                            Date.now() - startedAt <
                            IMAGE_PROCESSING_MAX_WAIT_MS
                        ) {
                            const image = await fetchImage(cacheKey);

                            if (image) {
                                const file = Bun.file(imagePath);

                                // we expect the file so if there is no file we return an error
                                if (!(await file.exists())) {
                                    return toErrorResponse(
                                        appError(
                                            "OPTIMIZED_IMAGE_NOT_FOUND",
                                            "Optimized image not found",
                                        ),
                                        404,
                                    );
                                }

                                return new Response(file, {
                                    headers: {
                                        "Content-Type": file.type,
                                        "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                                        "Cache-Control":
                                            "no-cache, no-store, must-revalidate", // TODO: to be changed
                                        "X-Cache-Status": "HIT",
                                    },
                                });
                            }

                            await Bun.sleep(IMAGE_PROCESSING_POLL_INTERVAL_MS);
                        }

                        return toErrorResponse(
                            appError(
                                "PROCESSING_TIMEOUT",
                                "Request timed out while waiting for the resource to be processed",
                            ),
                            408,
                        );
                    }
                },
            },
        },
        fetch() {
            return toErrorResponse(appError("NOT_FOUND", "Not Found"), 404);
        },
        error(error) {
            console.log("An unexpected error occurred", error);

            return toErrorResponse(
                appError("INTERNAL_ERROR", "An unexpected error occurred"),
                500,
            );
        },
        port,
    });
};
