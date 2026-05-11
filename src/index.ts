import {
    parseImageQuality,
    parseImageSourceUrl,
    parseImageWidth,
} from "./parser";

const allowedImagesMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
];

const server = Bun.serve({
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

                // TODO: maybe use some default value later
                if (!parsedQuality.valid) {
                    return Response.json(
                        { error: parsedQuality.error },
                        { status: 400 },
                    );
                }

                const imageResponse = await fetch(parsedUrl.url);

                const isContentTypeAllowed = allowedImagesMimeTypes.includes(
                    imageResponse.headers.get("content-type") ?? "",
                );

                if (!isContentTypeAllowed) {
                    return Response.json(
                        { error: "Unsupported source image content type" },
                        { status: 400 },
                    );
                }

                const imageBuffer = await imageResponse.arrayBuffer();

                return new Response(imageBuffer, { status: 200 });
            },
        },
    },
    fetch() {
        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server is listening: ${server.url}`);
