import { z } from "zod/mini";

export const IMAGE_PROCESSING_MAX_WAIT_MS = 10_000;
export const IMAGE_PROCESSING_POLL_INTERVAL_MS = 250;

const remotePatternSchema = z
    .object({
        protocol: z.string().check(z.minLength(1)),
        hostname: z.pipe(
            z.transform((val) => {
                if (typeof val !== "string") {
                    return val;
                }

                const trimmed = val.trim();

                return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
            }),
            z.hostname(),
        ),
        port: z.optional(z.number().check(z.minimum(1), z.maximum(65535))),
        // TODO: handle pathname (with wildcards */**)
        pathname: z.optional(
            z.string().check(
                z.refine((value) => value.startsWith("/"), {
                    message: "Pathname must start with a slash",
                }),
            ),
        ),
        // TODO: handle search (with wildcards)
        search: z.optional(z.string()),
    })
    .check(
        z.superRefine((val, ctx) => {
            const baseUrl = `${val.protocol}://${val.hostname}`;

            if (!z.url().safeParse(baseUrl).success) {
                ctx.addIssue({
                    code: "custom",
                    message: "Invalid base URL",
                    path: ["protocol", "hostname"],
                });
            }
        }),
    );

const remotePatternsSchema = z.array(remotePatternSchema);

type RemotePattern = z.infer<typeof remotePatternSchema>;

export interface Config {
    dataDir: ".data" | (string & {});
    port: 3000 | (number & {});
    remotePatterns: RemotePattern[];
}

const defaultConfig: Config = {
    dataDir: ".data",
    port: 3000,
    remotePatterns: [],
};

export const getConfig = (config?: Partial<Config>): Config => {
    const remotePatterns = remotePatternsSchema.parse(config?.remotePatterns);

    console.log("remotePatterns", remotePatterns);

    const finalConfig = { ...defaultConfig, ...config };

    return finalConfig;
};
