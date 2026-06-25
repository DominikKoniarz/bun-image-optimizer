import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startServer } from "../src/server";
import { createMockHttpServer, mockServerRoutes } from "./mocks";
import { getAvailablePort } from "./utils";

let server: ReturnType<typeof startServer>;
let mockServer: ReturnType<typeof createMockHttpServer>;

beforeAll(async () => {
    server = startServer(await getAvailablePort(5000));
    mockServer = createMockHttpServer(await getAvailablePort(6000));
});

// TODO: maybe integration tests don't needed?
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

    test("returns 403 when source url returs invalid content type", async () => {
        const response = await fetch(
            `${server.url.href}image?w=100&q=100&url=${new URL(mockServerRoutes.PLAIN_TEXT, mockServer.url).href}`,
        );

        expect(response.status).toBe(403);
    });
});

afterAll(() => {
    server.stop();
    mockServer.stop();
});
