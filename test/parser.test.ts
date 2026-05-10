import { describe, expect, test } from "bun:test";
import { readFromParams } from "../src/parser";

describe("readFromParams", () => {
    describe("url", () => {
        test("null when missing", () => {
            const { url } = readFromParams(new URLSearchParams({}));

            expect(url).toBeNull();
        });

        test("null when malformed", () => {
            const { url } = readFromParams(
                new URLSearchParams({ url: "xd" }),
            );

            expect(url).toBeNull();
        });

        test("null when not http(s)", () => {
            const { url } = readFromParams(
                new URLSearchParams({ url: "xd://123.com" }),
            );

            expect(url).toBeNull();
        });

        test("https string when valid", () => {
            const { url } = readFromParams(
                new URLSearchParams({ url: "https://example.com/path" }),
            );

            expect(url).toBe("https://example.com/path");
        });

        test("http string when valid", () => {
            const { url } = readFromParams(
                new URLSearchParams({ url: "http://example.com" }),
            );

            expect(url).toBe("http://example.com");
        });
    });

    describe("width (w)", () => {
        test("null when missing", () => {
            const { width } = readFromParams(new URLSearchParams({}));

            expect(width).toBeNull();
        });

        test("null when <= 0", () => {
            const { width } = readFromParams(
                new URLSearchParams({ w: "0" }),
            );

            expect(width).toBeNull();
        });

        test("null when negative", () => {
            const { width } = readFromParams(
                new URLSearchParams({ w: "-1" }),
            );

            expect(width).toBeNull();
        });

        test("null when not a number", () => {
            const { width } = readFromParams(
                new URLSearchParams({ w: "abc" }),
            );

            expect(width).toBeNull();
        });

        test("positive integer string parses", () => {
            const { width } = readFromParams(
                new URLSearchParams({ w: "640" }),
            );

            expect(width).toBe(640);
        });
    });

    describe("quality (q)", () => {
        test("null when missing", () => {
            const { quality } = readFromParams(new URLSearchParams({}));

            expect(quality).toBeNull();
        });

        test("null when <= 0", () => {
            const { quality } = readFromParams(
                new URLSearchParams({ q: "0" }),
            );

            expect(quality).toBeNull();
        });

        test("null when > 100", () => {
            const { quality } = readFromParams(
                new URLSearchParams({ q: "101" }),
            );

            expect(quality).toBeNull();
        });

        test("null when not a number", () => {
            const { quality } = readFromParams(
                new URLSearchParams({ q: "high" }),
            );

            expect(quality).toBeNull();
        });

        test("1 and 100 inclusive", () => {
            expect(
                readFromParams(new URLSearchParams({ q: "1" })).quality,
            ).toBe(1);
            expect(
                readFromParams(new URLSearchParams({ q: "100" })).quality,
            ).toBe(100);
        });
    });

    describe("combined", () => {
        test("parses valid url, w, and q together", () => {
            const params = new URLSearchParams({
                url: "https://cdn.example.com/img.png",
                w: "800",
                q: "85",
            });
            const { url, width, quality } = readFromParams(params);

            expect(url).toBe("https://cdn.example.com/img.png");
            expect(width).toBe(800);
            expect(quality).toBe(85);
        });
    });
});
