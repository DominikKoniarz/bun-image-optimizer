import { drizzle } from "drizzle-orm/bun-sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { schema } from "./schema";

// export const db = drizzle({ connection: {
//   url: process.env.DATABASE_URL,
//   authToken: process.env.DATABASE_AUTH_TOKEN
// }});

// create .data directory if it doesn't exist
if (!existsSync(".data")) {
    mkdirSync(".data");
}

export const db = drizzle(".data/db.sqlite", {
    schema,
});
