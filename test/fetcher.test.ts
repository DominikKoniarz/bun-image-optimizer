import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchSourceImage } from "../src/fetcher";

const PORT = 5123;

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
    const sourceImage = Bun.file(
        `${import.meta.dir}/assets/dave-meckler-0ltzud5qqYc-unsplash.jpg`,
    );

    server = Bun.serve({
        routes: {
            "/source-image": () => new Response(sourceImage),
            "/404": () => new Response("Not Found", { status: 404 }),
            "/plain-text": () =>
                new Response("text/plain", {
                    headers: {
                        "Content-Type": "text/plain",
                    },
                }),
        },
        port: PORT,
    });
});

describe("fetchSourceImage", () => {
    test("returns error when invalid url", async () => {
        const result = await fetchSourceImage("xd");

        expect(result.error).toBeString();
        expect(result.error?.length).toBeGreaterThan(0);
    });

    test("returns error when not found", async () => {
        const result = await fetchSourceImage(`http://localhost:${PORT}/404`);

        expect(result.error).toBeString();
        expect(result.error?.length).toBeGreaterThan(0);
    });

    test("returns error when invalid content type", async () => {
        const result = await fetchSourceImage(
            `http://localhost:${PORT}/plain-text`,
        );

        expect(result.error).toBeString();
        expect(result.error?.length).toBeGreaterThan(0);
    });

    test("returns arrayBuffer when valid url", async () => {
        const result = await fetchSourceImage(
            `http://localhost:${PORT}/source-image`,
        );

        expect(result.error).toBeNull();
        expect(result.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    });
});

afterAll(() => {
    server.stop();
});
