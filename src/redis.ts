import { RedisClient } from "bun";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("REDIS_URL is not set");
}

export const redis = new RedisClient(redisUrl);
