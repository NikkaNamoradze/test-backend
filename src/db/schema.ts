import { pgTable, uuid, varchar, text, timestamp, integer, boolean, date, unique } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  entryCode: varchar("entry_code", { length: 6 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const instructions = pgTable("instructions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  orderIndex: integer("order_index").notNull().unique(),
});

export const watchLogs = pgTable(
  "watch_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    instructionId: uuid("instruction_id")
      .notNull()
      .references(() => instructions.id, { onDelete: "cascade" }),
    watchedAt: timestamp("watched_at").defaultNow().notNull(),
    watchedFully: boolean("watched_fully").default(false).notNull(),
    accepted: boolean("accepted").default(false).notNull(),
    date: date("date").notNull(),
  },
  (table) => [
    unique("watch_log_unique").on(table.userId, table.instructionId, table.date),
  ]
);
