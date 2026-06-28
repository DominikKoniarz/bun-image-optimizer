export const LockStatus = {
    ACQUIRED: "ACQUIRED",
    FREE: "FREE",
} as const;

export type LockStatus = (typeof LockStatus)[keyof typeof LockStatus];

export interface LockRetryConfig {
    attempts: number;
    delay: number;
}

export interface LockAcquireConfig {
    lease?: number;
    retry?: Partial<LockRetryConfig>;
}

export interface LockConfig {
    id: string;
    redis: RedisCommandClient;
    lease?: number;
    retry?: Partial<LockRetryConfig>;
}

export interface RedisCommandClient {
    send(command: string, args: string[]): Promise<unknown>;
}

const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_RETRY: LockRetryConfig = {
    attempts: 1,
    delay: 0,
};

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end

return 0
`;

const EXTEND_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
end

return 0
`;

export class Lock {
    readonly id: string;

    private readonly redis: RedisCommandClient;
    private readonly token = crypto.randomUUID();
    private readonly lease: number;
    private readonly retry: LockRetryConfig;

    constructor(config: LockConfig) {
        assertPositiveInteger(config.lease ?? DEFAULT_LEASE_MS, "lease");

        this.id = `lock:${config.id}`;
        this.redis = config.redis;
        this.lease = config.lease ?? DEFAULT_LEASE_MS;
        this.retry = normalizeRetry(config.retry);
    }

    async acquire(config?: LockAcquireConfig): Promise<boolean> {
        const lease = config?.lease ?? this.lease;
        const retry = normalizeRetry({
            ...this.retry,
            ...config?.retry,
        });

        assertPositiveInteger(lease, "lease");

        for (let attempt = 0; attempt < retry.attempts; attempt++) {
            if (await this.acquireOnce(lease)) {
                return true;
            }

            if (attempt < retry.attempts - 1) {
                await sleep(retry.delay);
            }
        }

        return false;
    }

    async release(): Promise<boolean> {
        const result = await this.redis.send("EVAL", [
            RELEASE_SCRIPT,
            "1",
            this.id,
            this.token,
        ]);

        return isTruthyRedisResult(result);
    }

    async extend(amt: number): Promise<boolean> {
        assertPositiveInteger(amt, "amt");

        const result = await this.redis.send("EVAL", [
            EXTEND_SCRIPT,
            "1",
            this.id,
            this.token,
            String(amt),
        ]);

        return isTruthyRedisResult(result);
    }

    async getStatus(): Promise<LockStatus> {
        const value = await this.redis.send("GET", [this.id]);
        return value === null ? LockStatus.FREE : LockStatus.ACQUIRED;
    }

    private async acquireOnce(lease: number): Promise<boolean> {
        const result = await this.redis.send("SET", [
            this.id,
            this.token,
            "NX",
            "PX",
            String(lease),
        ]);

        return result === "OK";
    }
}

const normalizeRetry = (retry?: Partial<LockRetryConfig>): LockRetryConfig => {
    const normalized = {
        attempts: retry?.attempts ?? DEFAULT_RETRY.attempts,
        delay: retry?.delay ?? DEFAULT_RETRY.delay,
    };

    assertPositiveInteger(normalized.attempts, "retry.attempts");
    assertNonNegativeInteger(normalized.delay, "retry.delay");

    return normalized;
};

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

const assertPositiveInteger = (value: number, name: string) => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
};

const assertNonNegativeInteger = (value: number, name: string) => {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${name} must be a non-negative integer`);
    }
};

const isTruthyRedisResult = (result: unknown): boolean => {
    return result === 1 || result === "1" || result === true;
};
