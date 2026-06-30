import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchSourceImage } from "../../src/fetcher";
import { createMockHttpServer, mockServerRoutes } from "../helpers/mocks";
import { expectAppError, getAvailablePort } from "../helpers/utils";

let mockServer: ReturnType<typeof createMockHttpServer>;

beforeAll(async () => {
    mockServer = createMockHttpServer(await getAvailablePort(6000));
});

describe("fetchSourceImage", () => {
    test("returns error when invalid url", async () => {
        const result = await fetchSourceImage("xd");

        expectAppError(result.error, "SOURCE_FETCH_FAILED");
    });

    test("returns error when not found", async () => {
        const result = await fetchSourceImage(
            `${mockServer.url.href}${mockServerRoutes.NOT_FOUND}`,
        );

        expectAppError(result.error, "SOURCE_FETCH_FAILED");
    });

    test("returns error when invalid content type", async () => {
        const result = await fetchSourceImage(
            `${mockServer.url.href}${mockServerRoutes.PLAIN_TEXT}`,
        );

        expectAppError(result.error, "SOURCE_UNSUPPORTED_CONTENT_TYPE");
    });

    test("returns arrayBuffer when valid url", async () => {
        const result = await fetchSourceImage(
            `${mockServer.url.href}${mockServerRoutes.SOURCE_IMAGE}`,
        );

        expect(result.error).toBeNull();
        expect(result.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    });
});

afterAll(() => {
    void mockServer.stop();
});
