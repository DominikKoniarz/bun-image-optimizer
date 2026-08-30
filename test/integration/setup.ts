import { afterAll } from "bun:test";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import path from "node:path";

process.env.TESTCONTAINERS_RYUK_DISABLED = "true";

const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
const { RedisContainer } = await import("@testcontainers/redis");

const POSTGRES_IMAGE = "postgres:18-alpine";
const REDIS_IMAGE = "redis:8-alpine";

const [postgres, redisContainer] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE).start(),
    new RedisContainer(REDIS_IMAGE).start(),
]);

process.env.DATABASE_URL = postgres.getConnectionUri();
process.env.REDIS_URL = redisContainer.getConnectionUrl();

const { db } = await import("../../src/drizzle");
const { redis } = await import("../../src/redis");
const { cleanTestState } = await import("./cleanup");

await migrate(db, {
    migrationsFolder: path.join(import.meta.dir, "../../migrations"),
});
await cleanTestState();

afterAll(async () => {
    redis.close();
    await Promise.all([postgres.stop(), redisContainer.stop()]);
});
