import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
} from "bun:test";
import { getImageCacheKey } from "../../src/cache";
import { fetchImage } from "../../src/db-queries";
import { startServer } from "../../src/server";
import { createMockHttpServer, mockServerRoutes } from "../helpers/mocks";
import { getAvailablePort } from "../helpers/utils";
import { cleanTestState } from "./cleanup";

let server: ReturnType<typeof startServer>;
let mockServer: ReturnType<typeof createMockHttpServer>;

beforeAll(async () => {
    server = startServer(await getAvailablePort(5000));
    mockServer = createMockHttpServer(await getAvailablePort(6000));
});

beforeEach(async () => {
    await cleanTestState();
});

describe("/image", () => {
    test("returns 400 when url is invalid", async () => {
        const response = await fetch(
            `${server.url.href}image?w=100&q=100&url=xdxd`,
        );

        expect(response.status).toBe(400);
    });

    test("returns 400 when width is invalid", async () => {
        const response = await fetch(
            `${server.url.href}image?w=xdxd&q=100&url=https://example.com`,
        );

        expect(response.status).toBe(400);
    });

    test("returns 400 when quality is invalid", async () => {
        const response = await fetch(
            `${server.url.href}image?w=100&q=xdxd&url=https://example.com`,
        );

        expect(response.status).toBe(400);
    });

    test("returns 403 when source url returns invalid content type", async () => {
        const response = await fetch(
            `${server.url.href}image?w=100&q=100&url=${new URL(mockServerRoutes.PLAIN_TEXT, mockServer.url).href}`,
        );

        expect(response.status).toBe(403);
    });

    test("returns optimized webp image", async () => {
        const sourceUrl = new URL(mockServerRoutes.SOURCE_IMAGE, mockServer.url)
            .href;
        const width = 100;
        const quality = 80;

        const response = await fetch(
            `${server.url.href}image?w=${width}&q=${quality}&url=${encodeURIComponent(sourceUrl)}`,
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/webp");

        const body = await response.arrayBuffer();
        expect(body.byteLength).toBeGreaterThan(0);

        const imageFile = new Bun.Image(body);
        const metadata = await imageFile.metadata();

        expect(metadata.width).toBe(width);

        // make sure the image is saved to the database
        const cacheKey = getImageCacheKey(sourceUrl, width, quality);
        const imageData = await fetchImage(cacheKey);

        expect(imageData).not.toBeNull();
        expect(imageData?.sourceUrl).toBe(sourceUrl);
        expect(imageData?.width).toBe(width);
        expect(imageData?.quality).toBe(quality);
    });
});

afterAll(() => {
    server.stop();
    mockServer.stop();
});
