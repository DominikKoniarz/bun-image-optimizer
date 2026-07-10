import { createHash } from "crypto";

export const getImageCacheKey = (
    url: string,
    width: number,
    quality: number,
) => {
    return createHash("sha256")
        .update(`${url}-${width}-${quality}`)
        .digest("hex");
};

export const getRedisCacheKey = (type: "image" | "lock", value: string) => {
    if (type === "image") {
        return `image:${value}`;
    }

    return `lock:${value}`;
};
