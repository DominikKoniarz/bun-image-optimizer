import { eq } from "drizzle-orm";
import { db } from "./drizzle";
import { images } from "./schema";

export const fetchImage = async (cacheKey: string) => {
    const image = await db.query.images.findFirst({
        where: eq(images.cacheKey, cacheKey),
    });

    return image;
};

export const createImage = async (
    cacheKey: string,
    sourceUrl: string,
    width: number,
    quality: number,
) => {
    await db.insert(images).values({
        cacheKey,
        sourceUrl,
        width,
        quality,
    });
};
