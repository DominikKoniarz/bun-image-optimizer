import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const timestamps = {
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
};

export const images = pgTable("images", {
    cacheKey: text("cache_key").primaryKey(),
    sourceUrl: text("source_url").notNull(),
    width: integer("width").notNull(),
    quality: integer("quality").notNull(),
    ...timestamps,
});

export const schema = {
    images: images,
};
