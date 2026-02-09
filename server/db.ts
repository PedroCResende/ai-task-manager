import { eq, and, desc, sql, like, or, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, taskStats, Task, InsertTask, TaskStat, InsertTaskStat } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ TASK OPERATIONS ============

export async function createTask(task: InsertTask): Promise<Task> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values(task);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(tasks).where(eq(tasks.id, insertId)).limit(1);
  return created[0];
}

export async function getTaskById(taskId: number, userId: number): Promise<Task | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function getUserTasks(
  userId: number,
  filters?: {
    status?: Task["status"];
    priority?: Task["priority"];
    category?: Task["category"];
    search?: string;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  }
): Promise<Task[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(tasks.userId, userId)];

  if (filters?.status) {
    conditions.push(eq(tasks.status, filters.status));
  }
  if (filters?.priority) {
    conditions.push(eq(tasks.priority, filters.priority));
  }
  if (filters?.category) {
    conditions.push(eq(tasks.category, filters.category));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(tasks.title, `%${filters.search}%`),
        like(tasks.description, `%${filters.search}%`)
      )!
    );
  }
  if (filters?.dueDateFrom) {
    conditions.push(gte(tasks.dueDate, filters.dueDateFrom));
  }
  if (filters?.dueDateTo) {
    conditions.push(lte(tasks.dueDate, filters.dueDateTo));
  }

  return db.select().from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));
}

export async function updateTask(
  taskId: number,
  userId: number,
  updates: Partial<Omit<InsertTask, "id" | "userId" | "createdAt">>
): Promise<Task | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  return getTaskById(taskId, userId);
}

export async function deleteTask(taskId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  return result[0].affectedRows > 0;
}

export async function completeTask(taskId: number, userId: number): Promise<Task | undefined> {
  return updateTask(taskId, userId, {
    status: "completed",
    completedAt: new Date(),
  });
}

// ============ STATISTICS OPERATIONS ============

export async function getTaskStats(userId: number, days: number = 30): Promise<TaskStat[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  return db.select().from(taskStats)
    .where(and(
      eq(taskStats.userId, userId),
      gte(taskStats.date, fromDate)
    ))
    .orderBy(desc(taskStats.date));
}

export async function updateDailyStats(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Count tasks created today
  const createdResult = await db.select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      gte(tasks.createdAt, today),
      lte(tasks.createdAt, tomorrow)
    ));

  // Count tasks completed today
  const completedResult = await db.select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.status, "completed"),
      gte(tasks.completedAt, today),
      lte(tasks.completedAt, tomorrow)
    ));

  const tasksCreated = Number(createdResult[0]?.count || 0);
  const tasksCompleted = Number(completedResult[0]?.count || 0);

  // Upsert daily stats
  await db.insert(taskStats)
    .values({
      userId,
      date: today,
      tasksCreated,
      tasksCompleted,
    })
    .onDuplicateKeyUpdate({
      set: {
        tasksCreated,
        tasksCompleted,
      },
    });
}

export async function getProductivityMetrics(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Total tasks
  const totalResult = await db.select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  // Completed tasks
  const completedResult = await db.select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "completed")));

  // Pending tasks
  const pendingResult = await db.select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "pending")));

  // Tasks by priority
  const byPriorityResult = await db.select({
    priority: tasks.priority,
    count: sql<number>`count(*)`
  })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .groupBy(tasks.priority);

  // Tasks by category
  const byCategoryResult = await db.select({
    category: tasks.category,
    count: sql<number>`count(*)`
  })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .groupBy(tasks.category);

  // Overdue tasks
  const overdueResult = await db.select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.status, "pending"),
      lte(tasks.dueDate, new Date())
    ));

  return {
    total: Number(totalResult[0]?.count || 0),
    completed: Number(completedResult[0]?.count || 0),
    pending: Number(pendingResult[0]?.count || 0),
    overdue: Number(overdueResult[0]?.count || 0),
    byPriority: byPriorityResult.reduce((acc, item) => {
      acc[item.priority] = Number(item.count);
      return acc;
    }, {} as Record<string, number>),
    byCategory: byCategoryResult.reduce((acc, item) => {
      acc[item.category] = Number(item.count);
      return acc;
    }, {} as Record<string, number>),
  };
}
