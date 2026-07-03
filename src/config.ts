export const IMAGE_PROCESSING_MAX_WAIT_MS = 10_000;
export const IMAGE_PROCESSING_POLL_INTERVAL_MS = 250;

export interface Config {
    dataDir: ".data" | (string & {});
    port: 3000 | (number & {});
}

const defaultConfig: Config = {
    dataDir: ".data",
    port: 3000,
};

export const getConfig = (config?: Partial<Config>): Config => {
    const finalConfig = { ...defaultConfig, ...config };

    return finalConfig;
};
