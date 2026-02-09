import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tasks table - stores all user tasks with AI-generated metadata
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Core task fields
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Status and completion
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  completedAt: timestamp("completedAt"),
  
  // Dates
  dueDate: timestamp("dueDate"),
  suggestedTime: timestamp("suggestedTime"), // AI-suggested best time to work on task
  
  // AI-generated fields
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  category: mysqlEnum("category", ["work", "personal", "health", "finance", "learning", "social", "other"]).default("other").notNull(),
  aiAnalysis: text("aiAnalysis"), // JSON string with AI insights
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Task statistics - daily aggregated stats for productivity tracking
 */
export const taskStats = mysqlTable("taskStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  tasksCreated: int("tasksCreated").default(0).notNull(),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskStat = typeof taskStats.$inferSelect;
export type InsertTaskStat = typeof taskStats.$inferInsert;
