import { describe, expect, test } from "bun:test";
import { getConfig } from "../../src/config";
import {
    compilePathnamePattern,
    matchPathnamePattern,
    pathnamePatternIssue,
} from "../../src/pathname";

const remote = (pathname: string) => ({
    protocol: "https",
    hostname: "example.com",
    pathname,
});

describe("pathnamePatternIssue", () => {
    test("undefined when valid", () => {
        expect(pathnamePatternIssue("/")).toBeUndefined();
        expect(pathnamePatternIssue("/images")).toBeUndefined();
        expect(pathnamePatternIssue("/images/*")).toBeUndefined();
        expect(pathnamePatternIssue("/images/*.png")).toBeUndefined();
        expect(pathnamePatternIssue("/a/*/b")).toBeUndefined();
        expect(pathnamePatternIssue("/**")).toBeUndefined();
        expect(pathnamePatternIssue("/account123/**")).toBeUndefined();
    });

    test("must start with a slash", () => {
        expect(pathnamePatternIssue("images/**")).toBe(
            "Pathname must start with a slash",
        );
    });

    test("** only as the last whole segment", () => {
        expect(pathnamePatternIssue("/a/**/b")).toBe(
            "** is only allowed at the end of the pathname",
        );
        expect(pathnamePatternIssue("/foo**")).toBe(
            "** must be a whole path segment",
        );
        expect(pathnamePatternIssue("/a/***/b")).toBe(
            "** must be a whole path segment",
        );
    });
});

describe("matchPathnamePattern", () => {
    test("omitted pattern matches any pathname", () => {
        expect(matchPathnamePattern(undefined, "/")).toBeTrue();
        expect(matchPathnamePattern(undefined, "/a/b")).toBeTrue();
    });

    test("exact path", () => {
        expect(matchPathnamePattern("/images/cat.png", "/images/cat.png")).toBe(
            true,
        );
        expect(matchPathnamePattern("/images/cat.png", "/images/dog.png")).toBe(
            false,
        );
        expect(matchPathnamePattern("/images", "/images/")).toBeFalse();
    });

    test("literal dots are not wildcards", () => {
        expect(matchPathnamePattern("/foo.bar", "/foo.bar")).toBeTrue();
        expect(matchPathnamePattern("/foo.bar", "/fooXbar")).toBeFalse();
    });

    test("* matches a single segment", () => {
        expect(matchPathnamePattern("/images/*", "/images/cat.png")).toBeTrue();
        expect(matchPathnamePattern("/images/*", "/images/")).toBeTrue();
        expect(matchPathnamePattern("/images/*", "/images/a/b")).toBeFalse();
        expect(matchPathnamePattern("/images/*", "/images")).toBeFalse();
        expect(matchPathnamePattern("/a/*/c", "/a/b/c")).toBeTrue();
        expect(matchPathnamePattern("/a/*/c", "/a/b/x/c")).toBeFalse();
    });

    test("* inside a segment", () => {
        expect(
            matchPathnamePattern("/images/*.png", "/images/cat.png"),
        ).toBeTrue();
        expect(
            matchPathnamePattern("/images/*.png", "/images/cat.jpg"),
        ).toBeFalse();
        expect(
            matchPathnamePattern("/images/*.png", "/images/a/cat.png"),
        ).toBeFalse();
        expect(matchPathnamePattern("/img-*.jpg", "/img-1.jpg")).toBeTrue();
    });

    test("multiple * segments", () => {
        expect(
            matchPathnamePattern("/images/*/xd/*", "/images/a/xd/c"),
        ).toBeTrue();
        expect(
            matchPathnamePattern("/images/*/xd/*/xd", "/images/a/xd/c/xd"),
        ).toBeTrue();
    });

    test("** matches remaining segments", () => {
        expect(matchPathnamePattern("/**", "/")).toBeTrue();
        expect(matchPathnamePattern("/**", "/a/b/c")).toBeTrue();
        expect(
            matchPathnamePattern("/account123/**", "/account123"),
        ).toBeTrue();
        expect(
            matchPathnamePattern("/account123/**", "/account123/photo.png"),
        ).toBeTrue();
        expect(
            matchPathnamePattern("/account123/**", "/account123/a/b/c"),
        ).toBeTrue();
        expect(matchPathnamePattern("/account123/**", "/other")).toBeFalse();
        expect(
            matchPathnamePattern("/account123/**", "/account1234/photo.png"),
        ).toBeFalse();
    });

    test("dotfiles match", () => {
        expect(matchPathnamePattern("/images/*", "/images/.hidden")).toBeTrue();
        expect(
            matchPathnamePattern("/images/**", "/images/.hidden/a"),
        ).toBeTrue();
    });
});

describe("compilePathnamePattern", () => {
    test("throws on invalid pattern", () => {
        expect(() => compilePathnamePattern("nope")).toThrow(
            "Pathname must start with a slash",
        );
    });
});

describe("getConfig pathname", () => {
    test("accepts wildcard pathnames", () => {
        const config = getConfig({
            remotePatterns: [remote("/images/*.png"), remote("/cdn/**")],
        });

        expect(config.remotePatterns[0]?.pathname).toBe("/images/*.png");
        expect(config.remotePatterns[1]?.pathname).toBe("/cdn/**");
    });

    test("rejects pathname without a leading slash", () => {
        expect(() =>
            getConfig({ remotePatterns: [remote("images/**")] }),
        ).toThrow("Pathname must start with a slash");
    });

    test("rejects ** in the middle", () => {
        expect(() =>
            getConfig({ remotePatterns: [remote("/a/**/b")] }),
        ).toThrow("** is only allowed at the end of the pathname");
    });
});
