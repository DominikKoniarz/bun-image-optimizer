import superjson from "superjson";
import { getRedisCacheKey } from "./cache-key";
import { redis } from "./redis";
import type { Image } from "./types";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export const fetchCachedImage = async (
    cacheKey: string,
): Promise<Image | null> => {
    const cached = await redis.getex(
        getRedisCacheKey("image", cacheKey),
        "PX",
        CACHE_TTL_MS,
    );

    if (cached) {
        return superjson.parse<Image>(cached);
    }

    return null;
};

export const cacheImage = async (image: Image) => {
    return redis.set(
        getRedisCacheKey("image", image.cacheKey),
        superjson.stringify(image),
        "PX",
        CACHE_TTL_MS,
    );
};

export const invalidateCachedImage = async (cacheKey: string) => {
    return redis.del(getRedisCacheKey("image", cacheKey));
};
