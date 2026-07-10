import { eq } from "drizzle-orm";
import { cacheImage, fetchCachedImage } from "./cache";
import { db } from "./drizzle";
import { images } from "./schema";
import type { Image } from "./types";

export const fetchImage = async (cacheKey: string): Promise<Image | null> => {
    const cached = await fetchCachedImage(cacheKey);

    if (cached) {
        return cached;
    }

    const image = await db.query.images.findFirst({
        where: eq(images.cacheKey, cacheKey),
    });

    return image ?? null;
};

export const createImage = async (
    cacheKey: string,
    sourceUrl: string,
    width: number,
    quality: number,
) => {
    const [image] = await db
        .insert(images)
        .values({
            cacheKey,
            sourceUrl,
            width,
            quality,
        })
        .returning({
            cacheKey: images.cacheKey,
            sourceUrl: images.sourceUrl,
            width: images.width,
            quality: images.quality,
            createdAt: images.createdAt,
            updatedAt: images.updatedAt,
        });

    if (!image) {
        throw new Error("Failed to insert image into database");
    }

    await cacheImage(image);

    return image;
};
