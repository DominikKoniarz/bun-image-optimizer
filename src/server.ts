import path from "node:path";
import { getImageCacheKey } from "./cache";
import {
    IMAGE_PROCESSING_MAX_WAIT_MS,
    IMAGE_PROCESSING_POLL_INTERVAL_MS,
} from "./config";
import { createImage, fetchImage } from "./db-queries";
import { fetchSourceImage } from "./fetcher";
import { Lock } from "./lock";
import {
    parseImageQuality,
    parseImageSourceUrl,
    parseImageWidth,
} from "./parser";
import { redis } from "./redis";

export const startServer = (port?: number) => {
    return Bun.serve({
        routes: {
            "/image": {
                GET: async (req) => {
                    const { searchParams } = new URL(req.url);

                    const parsedUrl = parseImageSourceUrl(searchParams);
                    const parsedWidth = parseImageWidth(searchParams);
                    const parsedQuality = parseImageQuality(searchParams);

                    if (!parsedUrl.valid) {
                        return Response.json(
                            { error: parsedUrl.error },
                            { status: 400 },
                        );
                    }

                    if (!parsedWidth.valid) {
                        return Response.json(
                            { error: parsedWidth.error },
                            { status: 400 },
                        );
                    }

                    if (!parsedQuality.valid) {
                        return Response.json(
                            { error: parsedQuality.error },
                            { status: 400 },
                        );
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

                    const imageDirPath = path.join(".data", "images", cacheKey);
                    const imagePath = path.join(
                        imageDirPath,
                        optimizedImageName,
                    );

                    const image = await fetchImage(cacheKey);

                    // TODO: do we want to check if the file exists?
                    // (await Bun.file(imagePath).exists()
                    if (image) {
                        const file = Bun.file(imagePath);

                        return new Response(file, {
                            headers: {
                                "Content-Type": file.type,
                                "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                                "Cache-Control":
                                    "no-cache, no-store, must-revalidate", // TODO: to be changed
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
                                return Response.json(
                                    { error: imageResponse.error }, // TODO: update this
                                    { status: 403 },
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

                            await createImage(
                                cacheKey,
                                parsedUrl.url,
                                width,
                                quality,
                            );

                            return new Response(optimizedImage, {
                                headers: {
                                    "Content-Type": "image/webp",
                                    "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                                    "Cache-Control":
                                        "no-cache, no-store, must-revalidate", // TODO: to be changed
                                },
                            });
                        } finally {
                            await lock.release();
                        }
                    } else {
                        const startedAt = Date.now();

                        while (
                            Date.now() - startedAt <
                            IMAGE_PROCESSING_MAX_WAIT_MS
                        ) {
                            const image = await fetchImage(cacheKey);

                            if (image) {
                                const file = Bun.file(imagePath);

                                return new Response(file, {
                                    headers: {
                                        "Content-Type": file.type,
                                        "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                                        "Cache-Control":
                                            "no-cache, no-store, must-revalidate", // TODO: to be changed
                                    },
                                });
                            }

                            await Bun.sleep(IMAGE_PROCESSING_POLL_INTERVAL_MS);
                        }

                        return Response.json(
                            {
                                error: "Request timed out while waiting for the resource to be processed",
                            },
                            { status: 408 },
                        );
                    }
                },
            },
        },
        fetch() {
            return new Response("Not Found", { status: 404 });
        },
        port,
    });
};
