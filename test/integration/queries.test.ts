import { beforeEach, describe, expect, test } from "bun:test";
import { fetchCachedImage } from "../../src/cache";
import { db } from "../../src/drizzle";
import { createImage, fetchImage } from "../../src/queries";
import { images } from "../../src/schema";
import { cleanTestState } from "./cleanup";

const sampleImage = {
    cacheKey: "abc123",
    sourceUrl: "https://example.com/photo.jpg",
    width: 100,
    quality: 80,
};

beforeEach(async () => {
    await cleanTestState();
});

describe("createImage", () => {
    test("populates redis cache", async () => {
        const { cacheKey, sourceUrl, width, quality } = sampleImage;

        const image = await createImage(cacheKey, sourceUrl, width, quality);

        const cached = await fetchCachedImage(cacheKey);

        expect(cached).not.toBeNull();
        expect(cached).toMatchObject(image);
    });
});

describe("fetchImage", () => {
    test("returns cached image when redis is warm", async () => {
        const { cacheKey, sourceUrl, width, quality } = sampleImage;

        await createImage(cacheKey, sourceUrl, width, quality);

        const fetched = await fetchImage(cacheKey);
        const fromCache = await fetchCachedImage(cacheKey);

        expect(fetched).not.toBeNull();
        expect(fromCache).not.toBeNull();
        expect(fromCache).toMatchObject(fetched ?? {});
    });

    test("falls back to database on cache miss", async () => {
        const { cacheKey, sourceUrl, width, quality } = sampleImage;

        const [inserted] = await db
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

        expect(inserted).toBeDefined();
        expect(await fetchCachedImage(cacheKey)).toBeNull();

        const fetched = await fetchImage(cacheKey);

        expect(fetched).not.toBeNull();
        expect(fetched).toMatchObject(inserted ?? {});
    });
});
