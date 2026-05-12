import { describe, expect, test } from "bun:test";
import {
    parseImageQuality,
    parseImageSourceUrl,
    parseImageWidth,
} from "../src/parser";

describe("parseImageSourceUrl", () => {
    test("invalid when missing", () => {
        const parsedUrl = parseImageSourceUrl(new URLSearchParams({}));

        expect(parsedUrl.valid).toBeFalse();
        expect(parsedUrl.error).toBeString();
        expect(parsedUrl.url).toBeNull();
    });

    test("invalid when malformed", () => {
        const parsedUrl = parseImageSourceUrl(
            new URLSearchParams({ url: "xd" }),
        );

        expect(parsedUrl.valid).toBeFalse();
        expect(parsedUrl.error).toBeString();
        expect(parsedUrl.url).toBeNull();
    });

    test("invalid when not http(s)", () => {
        const parsedUrl = parseImageSourceUrl(
            new URLSearchParams({ url: "xd://123.com" }),
        );

        expect(parsedUrl.valid).toBeFalse();
        expect(parsedUrl.error).toBeString();
        expect(parsedUrl.url).toBeNull();
    });

    test("https string when valid", () => {
        const parsedUrl = parseImageSourceUrl(
            new URLSearchParams({ url: "https://example.com/path" }),
        );

        expect(parsedUrl.valid).toBeTrue();
        expect(parsedUrl.error).toBeNull();
        expect(parsedUrl.url).toBe("https://example.com/path");
    });

    test("http string when valid", () => {
        const parsedUrl = parseImageSourceUrl(
            new URLSearchParams({ url: "http://example.com" }),
        );

        expect(parsedUrl.valid).toBeTrue();
        expect(parsedUrl.error).toBeNull();
        expect(parsedUrl.url).toBe("http://example.com");
    });
});

describe("parseImageWidth", () => {
    test("invalid when missing", () => {
        const parsedWidth = parseImageWidth(new URLSearchParams({}));

        expect(parsedWidth.valid).toBeFalse();
        expect(parsedWidth.error).toBeString();
        expect(parsedWidth.width).toBeNull();
    });

    test("invalid when <= 0", () => {
        const parsedWidth = parseImageWidth(new URLSearchParams({ w: "0" }));

        expect(parsedWidth.valid).toBeFalse();
        expect(parsedWidth.error).toBeString();
        expect(parsedWidth.width).toBeNull();
    });

    test("invalid when negative", () => {
        const parsedWidth = parseImageWidth(new URLSearchParams({ w: "-1" }));

        expect(parsedWidth.valid).toBeFalse();
        expect(parsedWidth.error).toBeString();
        expect(parsedWidth.width).toBeNull();
    });

    test("invalid when not a number", () => {
        const parsedWidth = parseImageWidth(new URLSearchParams({ w: "abc" }));

        expect(parsedWidth.valid).toBeFalse();
        expect(parsedWidth.error).toBeString();
        expect(parsedWidth.width).toBeNull();
    });

    test("positive integer string parses", () => {
        const parsedWidth = parseImageWidth(new URLSearchParams({ w: "640" }));

        expect(parsedWidth.valid).toBeTrue();
        expect(parsedWidth.error).toBeNull();
        expect(parsedWidth.width).toBe(640);
    });
});

describe("parseImageQuality", () => {
    test("invalid when missing", () => {
        const parsedQuality = parseImageQuality(new URLSearchParams({}));

        expect(parsedQuality.valid).toBeFalse();
        expect(parsedQuality.error).toBeString();
        expect(parsedQuality.quality).toBeNull();
    });

    test("invalid when <= 0", () => {
        const parsedQuality = parseImageQuality(
            new URLSearchParams({ q: "0" }),
        );

        expect(parsedQuality.valid).toBeFalse();
        expect(parsedQuality.error).toBeString();
        expect(parsedQuality.quality).toBeNull();
    });

    test("invalid when > 100", () => {
        const parsedQuality = parseImageQuality(
            new URLSearchParams({ q: "101" }),
        );

        expect(parsedQuality.valid).toBeFalse();
        expect(parsedQuality.error).toBeString();
        expect(parsedQuality.quality).toBeNull();
    });

    test("invalid when not a number", () => {
        const parsedQuality = parseImageQuality(
            new URLSearchParams({ q: "high" }),
        );

        expect(parsedQuality.valid).toBeFalse();
        expect(parsedQuality.error).toBeString();
        expect(parsedQuality.quality).toBeNull();
    });

    test("1 and 100 inclusive", () => {
        expect(parseImageQuality(new URLSearchParams({ q: "1" })).quality).toBe(
            1,
        );
        expect(
            parseImageQuality(new URLSearchParams({ q: "100" })).quality,
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

        const parsedUrl = parseImageSourceUrl(params);
        const parsedWidth = parseImageWidth(params);
        const parsedQuality = parseImageQuality(params);

        expect(parsedUrl.valid).toBeTrue();
        expect(parsedUrl.error).toBeNull();
        expect(parsedUrl.url).toBe("https://cdn.example.com/img.png");

        expect(parsedWidth.valid).toBeTrue();
        expect(parsedWidth.error).toBeNull();
        expect(parsedWidth.width).toBe(800);

        expect(parsedQuality.valid).toBeTrue();
        expect(parsedQuality.error).toBeNull();
        expect(parsedQuality.quality).toBe(85);
    });
});
