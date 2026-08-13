import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accountsTable = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  ownerType: text("owner_type", { enum: ["anime", "person", "organization"] }).notNull(),
  ownerId: text("owner_id").notNull(),
  platform: text("platform").notNull(),
  handle: text("handle"),
  url: text("url").notNull().unique(),
  verified: integer("verified", { mode: "boolean" }).notNull(),
  monitorMode: text("monitor_mode", { enum: ["api", "rss", "page", "local", "disabled"] }).notNull(),
  verificationSourceUrl: text("verification_source_url"),
  verifiedAt: text("verified_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
