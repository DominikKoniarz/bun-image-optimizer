const REGEX_SPECIALS = /[\\^$+?.()|[\]{}]/g;

const escapeRegex = (value: string): string =>
    value.replace(REGEX_SPECIALS, "\\$&");

const globSegmentToRegex = (segment: string): string => {
    let out = "";

    for (const char of segment) {
        out += char === "*" ? "[^/]*" : escapeRegex(char);
    }

    return out;
};

export const pathnamePatternIssue = (pattern: string): string | undefined => {
    if (!pattern.startsWith("/")) {
        return "Pathname must start with a slash";
    }

    const segments = pattern.split("/");

    for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];

        if (!segment?.includes("**")) {
            continue;
        }

        if (segment !== "**") {
            return "** must be a whole path segment";
        }

        if (i !== segments.length - 1) {
            return "** is only allowed at the end of the pathname";
        }
    }

    return undefined;
};

export const compilePathnamePattern = (pattern: string): RegExp => {
    const issue = pathnamePatternIssue(pattern);

    if (issue !== undefined) {
        throw new Error(issue);
    }

    const segments = pattern.split("/");
    let regex = "^";

    for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];

        if (segment === undefined) {
            continue;
        }

        if (segment === "**") {
            regex += "(?:/.*)?";
            break;
        }

        regex += `/${globSegmentToRegex(segment)}`;
    }

    regex += "$";

    return new RegExp(regex);
};

export const matchPathnamePattern = (
    pattern: string | undefined,
    pathname: string,
): boolean => {
    if (pattern === undefined) {
        return true;
    }

    return compilePathnamePattern(pattern).test(pathname);
};
