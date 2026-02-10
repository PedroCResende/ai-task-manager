import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // 👇 ESSENCIAL para OAuth
  openId: text("open_id").notNull().unique(),

  name: text("name"),
  email: text("email"),

  // OAuth não usa senha
  passwordHash: text("password_hash"),

  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});


/* TASKS */
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending"), // pending | completed
  priority: text("priority").default("medium"), // low | medium | high
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});
