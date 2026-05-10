import { readFromParams } from "./parser";

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
                const { url, width, quality } = readFromParams(searchParams);

                if (!url) {
                    return Response.json(
                        { error: "URL is required" },
                        { status: 400 }
                    );
                }

                if (!width) {
                    return Response.json(
                        { error: "Width is required" },
                        { status: 400 }
                    );
                }

                // TODO: maybe use some default value later
                if (!quality) {
                    return Response.json(
                        { error: "Quality is required" },
                        { status: 400 }
                    );
                }

                const imageResponse = await fetch(url);

                const isContentTypeAllowed = allowedImagesMimeTypes.includes(
                    imageResponse.headers.get("content-type") ?? ""
                );

                if (!isContentTypeAllowed) {
                    return Response.json(
                        { error: "Unsupported source image content type" },
                        { status: 400 }
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
