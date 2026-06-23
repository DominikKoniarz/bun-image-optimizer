import { describe, expect, test } from "bun:test";
import crypto from "node:crypto";
import { getImageCacheKey } from "../src/cache";

describe("getImageCacheKey", () => {
    test("returns correct cache key", () => {
        const url = "https://example.com/image.jpg";
        const width = 640;
        const quality = 80;

        const expectedCacheKey = crypto
            .createHash("sha256")
            .update(`${url}-${width}-${quality}`)
            .digest("hex");

        const cacheKey = getImageCacheKey(url, width, quality);
        expect(cacheKey).toBe(expectedCacheKey);
    });
});
