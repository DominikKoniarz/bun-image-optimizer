import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
    createdAt: integer("created_at", {
        mode: "timestamp_ms",
    })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", {
        mode: "timestamp_ms",
    })
        .notNull()
        .$onUpdate(() => new Date()),
};

export const images = sqliteTable("images", {
    cacheKey: text("cache_key").primaryKey(),
    sourceUrl: text("source_url").notNull(),
    width: integer("width").notNull(),
    quality: integer("quality").notNull(),
    ...timestamps,
});

export const schema = {
    images: images,
};
