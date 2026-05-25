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
