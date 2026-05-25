import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "sqlite", // 'mysql' | 'sqlite' | 'turso'
    schema: "./src/schema.ts",
    out: "./migrations",
    dbCredentials: {
        url: ".data/db.sqlite",
    },
});
