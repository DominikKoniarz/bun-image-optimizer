import { sql } from "drizzle-orm";
import { rm } from "node:fs/promises";
import path from "node:path";
import { db } from "../../src/drizzle";
import { redis } from "../../src/redis";
import { getAvailablePort } from "../helpers/utils";

const testDataDir = path.join(process.cwd(), ".test-data");

export const cleanTestState = async () => {
    await Promise.all([
        db.execute(sql`TRUNCATE TABLE images`),
        redis.send("FLUSHDB", []),
        rm(testDataDir, { recursive: true, force: true }),
    ]);
};

export const getTestConfig = async () => {
    return {
        dataDir: testDataDir,
        port: await getAvailablePort(5000),
    };
};
