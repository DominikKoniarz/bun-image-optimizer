import { sql } from "drizzle-orm";
import { rm } from "node:fs/promises";
import path from "node:path";
import { db } from "../../src/drizzle";
import { redis } from "../../src/redis";

const imagesDataDir = path.join(process.cwd(), ".data", "images");

export const cleanTestState = async () => {
    await Promise.all([
        db.execute(sql`TRUNCATE TABLE images`),
        redis.send("FLUSHDB", []),
        rm(imagesDataDir, { recursive: true, force: true }),
    ]);
};
