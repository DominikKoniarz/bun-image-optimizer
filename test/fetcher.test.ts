import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchSourceImage } from "../src/fetcher";
import { createMockHttpServer, mockServerRoutes } from "./mocks";
import { getAvailablePort } from "./utils";

let mockServer: ReturnType<typeof createMockHttpServer>;

beforeAll(async () => {
    mockServer = createMockHttpServer(await getAvailablePort(6000));
});

describe("fetchSourceImage", () => {
    test("returns error when invalid url", async () => {
        const result = await fetchSourceImage("xd");

        expect(result.error).toBeString();
        expect(result.error?.length).toBeGreaterThan(0);
    });

    test("returns error when not found", async () => {
        const result = await fetchSourceImage(
            `${mockServer.url.href}${mockServerRoutes.NOT_FOUND}`,
        );

        expect(result.error).toBeString();
        expect(result.error?.length).toBeGreaterThan(0);
    });

    test("returns error when invalid content type", async () => {
        const result = await fetchSourceImage(
            `${mockServer?.url.href}${mockServerRoutes.PLAIN_TEXT}`,
        );

        expect(result.error).toBeString();
        expect(result.error?.length).toBeGreaterThan(0);
    });

    test("returns arrayBuffer when valid url", async () => {
        const result = await fetchSourceImage(
            `${mockServer?.url.href}${mockServerRoutes.SOURCE_IMAGE}`,
        );

        expect(result.error).toBeNull();
        expect(result.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    });
});

afterAll(() => {
    mockServer.stop();
});
