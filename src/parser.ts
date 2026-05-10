import { coerce, z } from "zod/mini";

const urlSchema = z.url({
    protocol: new RegExp("^(http|https)$"), // http or https
});
// Search params are strings; plain z.number() rejects them—coerce turns "640" into 640 first.
const widthSchema = coerce.number().check(z.minimum(1));
const qualitySchema = coerce.number().check(z.minimum(1), z.maximum(100));

export const readFromParams = (searchParams: URLSearchParams) => {
    const url = searchParams.get("url");
    const width = searchParams.get("w");
    const quality = searchParams.get("q");

    return {
        url: urlSchema.safeParse(url).data ?? null,
        width: widthSchema.safeParse(width).data ?? null,
        quality: qualitySchema.safeParse(quality).data ?? null,
    };
};
