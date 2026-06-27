import { RedisClient } from "bun";
import { sql } from "drizzle-orm";
import { db } from "../../src/drizzle";
import { cleanTestState } from "./cleanup";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPostgres = async (timeoutMs = 30_000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            await db.execute(sql`SELECT 1`);
            return;
        } catch {
            await wait(500);
        }
    }

    throw new Error("Postgres not ready");
};

const waitForRedis = async (redisUrl: string, timeoutMs = 30_000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const redis = new RedisClient(redisUrl);
            await redis.ping();
            redis.close();
            return;
        } catch {
            await wait(500);
        }
    }

    throw new Error("Redis not ready");
};

const runMigrations = async () => {
    const proc = Bun.spawn(["bun", "run", "db:migrate"], {
        env: process.env,
        stdout: "inherit",
        stderr: "inherit",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
        throw new Error(`db:migrate failed with exit code ${exitCode}`);
    }
};

const redisUrl = process.env.REDIS_URL;

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for integration tests");
}

if (!redisUrl) {
    throw new Error("REDIS_URL is required for integration tests");
}

await waitForPostgres();
await waitForRedis(redisUrl);
await runMigrations();
await cleanTestState();
