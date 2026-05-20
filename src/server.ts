import { fetchSourceImage } from "./fetcher";
import {
    parseImageQuality,
    parseImageSourceUrl,
    parseImageWidth,
} from "./parser";

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

                    const imageResponse = await fetchSourceImage(parsedUrl.url);

                    if (imageResponse.error !== null) {
                        return Response.json(
                            { error: imageResponse.error }, // TODO: update this
                            { status: 403 },
                        );
                    }

                    const { width } = parsedWidth;
                    const { quality } = parsedQuality;

                    const image = new Bun.Image(imageResponse.arrayBuffer)
                        .resize(width)
                        .webp({ quality });

                    return new Response(image, {
                        status: 200,
                        headers: {
                            "Content-Type": "image/webp",
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
