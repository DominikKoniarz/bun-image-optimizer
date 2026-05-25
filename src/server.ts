import { eq } from "drizzle-orm";
import path from "node:path";
import { getImageCacheKey } from "./cache";
import { db } from "./drizzle";
import { fetchSourceImage } from "./fetcher";
import {
    parseImageQuality,
    parseImageSourceUrl,
    parseImageWidth,
} from "./parser";
import { images } from "./schema";

export const startServer = (port?: number) => {
    return Bun.serve({
        routes: {
            "/test": {
                GET: () => {
                    const file = Bun.file(
                        path.join(
                            import.meta.dir,
                            "..",
                            "test",
                            "assets",
                            "dave-meckler-0ltzud5qqYc-unsplash.jpg",
                        ),
                    );

                    return new Response(file.stream(), {
                        headers: {
                            "Content-Type": file.type,
                        },
                    });
                },
            },
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

                    const foundImage = await db.query.images.findFirst({
                        where: eq(images.cacheKey, cacheKey),
                    });

                    if (foundImage && (await Bun.file(imagePath).exists())) {
                        const file = Bun.file(imagePath);

                        return new Response(file.stream(), {
                            headers: {
                                "Content-Type": file.type,
                                "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                                "Cache-Control":
                                    "no-cache, no-store, must-revalidate", // TODO: to be changed
                            },
                        });
                    }

                    const imageResponse = await fetchSourceImage(parsedUrl.url);

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

                    await Bun.write(imagePath, await optimizedImage.toBuffer());

                    if (foundImage) {
                        await db
                            .update(images)
                            .set({
                                updatedAt: new Date(),
                            })
                            .where(eq(images.cacheKey, cacheKey));
                    } else {
                        await db.insert(images).values({
                            cacheKey,
                            sourceUrl: parsedUrl.url,
                            width,
                            quality,
                        });
                    }

                    return new Response(optimizedImage, {
                        headers: {
                            "Content-Type": "image/webp",
                            "Content-Disposition": `attachment; filename="${optimizedImageName}"`,
                            "Cache-Control":
                                "no-cache, no-store, must-revalidate", // TODO: to be changed
                        },
                    });
                },
            },
        },
        fetch() {
            return new Response("Not Found", { status: 404 });
        },
        port,
    });
};
