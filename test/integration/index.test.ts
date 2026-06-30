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
import {
    createMockHttpServer,
    getSlowImageRequestCount,
    mockServerRoutes,
    resetSlowImageRequestCount,
} from "../helpers/mocks";
import { expectAppError, getAvailablePort } from "../helpers/utils";
import { cleanTestState } from "./cleanup";

let server: ReturnType<typeof startServer>;
let mockServer: ReturnType<typeof createMockHttpServer>;

beforeAll(async () => {
    server = startServer(await getAvailablePort(5000));
    mockServer = createMockHttpServer(await getAvailablePort(6000));
});

beforeEach(async () => {
    resetSlowImageRequestCount();

    await cleanTestState();
});

describe("/image", () => {
    test("returns 400 when url is invalid", async () => {
        const response = await fetch(
            `${server.url.href}image?w=100&q=100&url=xdxd`,
        );

        expect(response.status).toBe(400);
        const body = (await response.json()) as { error: unknown };
        expectAppError(body.error, "INVALID_URL");
    });

    test("returns 400 when width is invalid", async () => {
        const response = await fetch(
            `${server.url.href}image?w=xdxd&q=100&url=https://example.com`,
        );

        expect(response.status).toBe(400);
        const body = (await response.json()) as { error: unknown };
        expectAppError(body.error, "INVALID_WIDTH");
    });

    test("returns 400 when quality is invalid", async () => {
        const response = await fetch(
            `${server.url.href}image?w=100&q=xdxd&url=https://example.com`,
        );

        expect(response.status).toBe(400);
        const body = (await response.json()) as { error: unknown };
        expectAppError(body.error, "INVALID_QUALITY");
    });

    test("returns 403 when source url returns invalid content type", async () => {
        const response = await fetch(
            `${server.url.href}image?w=100&q=100&url=${new URL(mockServerRoutes.PLAIN_TEXT, mockServer.url).href}`,
        );

        expect(response.status).toBe(403);
        const body = (await response.json()) as { error: unknown };
        expectAppError(body.error, "SOURCE_UNSUPPORTED_CONTENT_TYPE");
    });

    test("concurrent requests wait when image is being processed", async () => {
        const width = 500;
        const quality = 80;

        const requestUrl = `${server.url.href}image?w=${width}&q=${quality}&url=${new URL(mockServerRoutes.SOURCE_IMAGE_SLOW, mockServer.url).href}`;

        const firstRequest = fetch(requestUrl);
        const secondRequest = fetch(requestUrl);
        const thirdRequest = fetch(requestUrl);

        const [firstResponse, secondResponse, thirdResponse] =
            await Promise.all([firstRequest, secondRequest, thirdRequest]);

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(thirdResponse.status).toBe(200);
        expect(getSlowImageRequestCount()).toBe(1);
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
    void server.stop();
    void mockServer.stop();
});
