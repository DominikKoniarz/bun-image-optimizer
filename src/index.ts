import { memoryUsage } from "node:process";
import sharp from "sharp";
import { fetchSourceImage } from "./fetcher";
import {
    parseImageQuality,
    parseImageSourceUrl,
    parseImageWidth,
} from "./parser";

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

                const imageResponse = await fetchSourceImage(parsedUrl.url);

                if (imageResponse.error || !imageResponse.arrayBuffer) {
                    return Response.json(
                        { error: imageResponse.error }, // TODO: update this
                        { status: 400 },
                    );
                }

                const { width } = parsedWidth;
                const { quality } = parsedQuality;

                const out = sharp(imageResponse.arrayBuffer)
                    .resize(width)
                    .webp({ quality });

                return new Response(out, {
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
});

console.log(`Server is listening: ${server.url}`);

setInterval(() => {
    // get memory usage in MB
    // clear the console
    console.clear();
    console.log(memoryUsage().heapTotal / 1024 / 1024, "MB");
}, 150);

// {
//     code: 23,
//     INDEX_SIZE_ERR: 1,
//     DOMSTRING_SIZE_ERR: 2,
//     HIERARCHY_REQUEST_ERR: 3,
//     WRONG_DOCUMENT_ERR: 4,
//     INVALID_CHARACTER_ERR: 5,
//     NO_DATA_ALLOWED_ERR: 6,
//     NO_MODIFICATION_ALLOWED_ERR: 7,
//     NOT_FOUND_ERR: 8,
//     NOT_SUPPORTED_ERR: 9,
//     INUSE_ATTRIBUTE_ERR: 10,
//     INVALID_STATE_ERR: 11,
//     SYNTAX_ERR: 12,
//     INVALID_MODIFICATION_ERR: 13,
//     NAMESPACE_ERR: 14,
//     INVALID_ACCESS_ERR: 15,
//     VALIDATION_ERR: 16,
//     TYPE_MISMATCH_ERR: 17,
//     SECURITY_ERR: 18,
//     NETWORK_ERR: 19,
//     ABORT_ERR: 20,
//     URL_MISMATCH_ERR: 21,
//     QUOTA_EXCEEDED_ERR: 22,
//     TIMEOUT_ERR: 23,
//     INVALID_NODE_TYPE_ERR: 24,
//     DATA_CLONE_ERR: 25
//   }
