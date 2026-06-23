CREATE TABLE "images" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"width" integer NOT NULL,
	"quality" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
